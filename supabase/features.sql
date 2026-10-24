-- MOYEN HILLS — gift notes, "notify me when it's back", reviews with photos
-- Run this AFTER notify.sql, tracking.sql and low-stock.sql (it uses private.send_mail,
-- private.h, the mail_shop address and public.log_admin_change).
-- Dashboard → SQL Editor → New query → paste → Run. Safe to run again.

-- ---------------------------------------------------------------------
-- 1. Gift note: a short message the buyer adds at checkout, printed and put in the parcel.
--    It shows on the admin page and in the order emails (notify.sql).
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists gift_note text;

create or replace function public.orders_gift_note()
returns trigger language plpgsql set search_path = public as $$
begin
  new.gift_note := left(nullif(btrim(new.gift_note), ''), 300);
  return new;
end;
$$;
revoke execute on function public.orders_gift_note() from public, anon, authenticated;
create or replace trigger orders_0_gift_note before insert or update of gift_note on public.orders
  for each row execute function public.orders_gift_note();

-- ---------------------------------------------------------------------
-- 2. "Notify me when it's back": an email per sold-out size. When an admin puts stock back
--    into that size, everyone waiting gets one email. Only admins can read the list.
--    Emails are deleted 30 days after the alert went out.
-- ---------------------------------------------------------------------
create table if not exists public.stock_alerts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  product_id text not null references public.products (id) on delete cascade,
  size text not null,
  email text not null,
  lang text not null default 'en',
  notified_at timestamptz,
  client text,              -- fingerprint for the rate limit, cleared after a day
  unique (product_id, size, email)
);
alter table public.stock_alerts enable row level security;
drop policy if exists "stock alerts: admin reads" on public.stock_alerts;
drop policy if exists "stock alerts: admin deletes" on public.stock_alerts;
create policy "stock alerts: admin reads"   on public.stock_alerts for select using (public.is_admin());
create policy "stock alerts: admin deletes" on public.stock_alerts for delete using (public.is_admin());
revoke insert, update, truncate on public.stock_alerts from anon, authenticated;

create or replace function public.request_stock_alert(p_product text, p_size text, p_email text, p_lang text default 'en')
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  me text := public.client_hash();
  em text := lower(trim(coalesce(p_email, '')));
  p public.products;
begin
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 200 then raise exception 'Please enter a valid email address.'; end if;
  select * into p from public.products where id = p_product and active;
  if not found or not exists (select 1 from jsonb_array_elements(p.sizes) s where s ->> 'size' = p_size) then
    raise exception 'That size is not available.';
  end if;
  update public.stock_alerts set client = null where client is not null and created_at < now() - interval '1 day';
  if (select count(*) from public.stock_alerts where client = me and created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'Too many requests. Please wait a few minutes.';
  end if;
  insert into public.stock_alerts (product_id, size, email, lang, client)
  values (p.id, p_size, em, case when p_lang = 'lv' then 'lv' else 'en' end, me)
  on conflict (product_id, size, email) do update
    set notified_at = null, created_at = now(), lang = excluded.lang, client = excluded.client;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.request_stock_alert(text, text, text, text) from public;
grant execute on function public.request_stock_alert(text, text, text, text) to anon, authenticated;

-- Stock goes from 0 to more than 0 in a size → email everyone waiting for it
create or replace function private.mail_back_in_stock()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  a record;
  url text := 'https://moyenhillsofficial.com/product?id=' || new.id;
begin
  delete from public.stock_alerts where notified_at < now() - interval '30 days';
  for a in
    select sa.* from public.stock_alerts sa
      join jsonb_array_elements(new.sizes) n(s) on n.s ->> 'size' = sa.size
      left join jsonb_array_elements(old.sizes) o(s) on o.s ->> 'size' = sa.size
     where sa.product_id = new.id and sa.notified_at is null and not new.sold_out
       and coalesce((n.s ->> 'stock')::int, 0) > 0
       and (coalesce((o.s ->> 'stock')::int, 0) <= 0 or old.sold_out)
  loop
    if a.lang = 'lv' then
      perform private.send_mail(a.email, null,
        format('MOYEN HILLS: %s izmērā %s atkal ir pieejams', new.name, a.size),
        format('<p>Labas ziņas: <b>%s</b> izmērā <b>%s</b> atkal ir pieejams.</p><p>Daudzums ir ierobežots, tāpēc nekavējies: <a href="%s">skatīt veikalā</a>.</p><p>Tu lūdzi mums par to paziņot. Šis ir vienīgais e-pasts, ko par to sūtām.</p><p>MOYEN HILLS</p>',
          private.h(new.name), private.h(a.size), private.h(url || '&lang=lv')));
    else
      perform private.send_mail(a.email, null,
        format('MOYEN HILLS: %s in %s is back', new.name, a.size),
        format('<p>Good news: <b>%s</b> in size <b>%s</b> is back in stock.</p><p>There are only a few, so don''t wait too long: <a href="%s">see it in the shop</a>.</p><p>You asked us to tell you. This is the only email we send about it.</p><p>MOYEN HILLS</p>',
          private.h(new.name), private.h(a.size), private.h(url || '&lang=en')));
    end if;
    update public.stock_alerts set notified_at = now() where id = a.id;
  end loop;
  return new;
end;
$$;
revoke execute on function private.mail_back_in_stock() from public, anon, authenticated;
create or replace trigger products_back_in_stock after update of sizes, sold_out on public.products
  for each row execute function private.mail_back_in_stock();

-- ---------------------------------------------------------------------
-- 3. Reviews with photos. Only signed-in customers with a shipped or delivered order of the
--    product can write one (one per product; writing again replaces it). Nothing shows on the
--    site until an admin approves it. Deleting the account deletes the customer's reviews.
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  product_id text not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id bigint references public.orders (id) on delete set null,
  name text not null,                  -- shown with the review (first name)
  rating int not null check (rating between 1 and 5),
  body text check (char_length(body) <= 1000),
  photo text,                          -- path in the "reviews" storage bucket
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  approved_at timestamptz,
  unique (user_id, product_id)
);
create index if not exists reviews_product on public.reviews (product_id, status, created_at desc);
alter table public.reviews enable row level security;
drop policy if exists "reviews: own read" on public.reviews;
drop policy if exists "reviews: admin reads" on public.reviews;
drop policy if exists "reviews: admin updates" on public.reviews;
drop policy if exists "reviews: admin deletes" on public.reviews;
create policy "reviews: own read"      on public.reviews for select using (auth.uid() = user_id);
create policy "reviews: admin reads"   on public.reviews for select using (public.is_admin());
create policy "reviews: admin updates" on public.reviews for update using (public.is_admin()) with check (public.is_admin());
create policy "reviews: admin deletes" on public.reviews for delete using (public.is_admin());
revoke insert, truncate on public.reviews from anon, authenticated;
create or replace trigger reviews_log after update or delete on public.reviews
  for each row execute function public.log_admin_change('id');

create or replace function public.reviews_stamp()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then new.approved_at := now(); end if;
  return new;
end;
$$;
revoke execute on function public.reviews_stamp() from public, anon, authenticated;
create or replace trigger reviews_0_stamp before update on public.reviews for each row execute function public.reviews_stamp();

-- Photos: customers upload into a folder named after their own account id. The bucket is
-- public so approved photos can be shown; file names are random, and the site only links
-- photos of approved reviews.
insert into storage.buckets (id, name, public) values ('reviews', 'reviews', true) on conflict (id) do nothing;
update storage.buckets set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'reviews';
drop policy if exists "review photos: own upload" on storage.objects;
drop policy if exists "review photos: own or admin list" on storage.objects;
drop policy if exists "review photos: own or admin delete" on storage.objects;
create policy "review photos: own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'reviews' and (storage.foldername(name))[1] = auth.uid()::text);
-- Listing is needed to delete (and to clear a customer's photos when they delete their account)
create policy "review photos: own or admin list" on storage.objects for select to authenticated
  using (bucket_id = 'reviews' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "review photos: own or admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'reviews' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create or replace function public.submit_review(p_product text, p_rating int, p_body text, p_name text, p_photo text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, private as $$
declare
  me uuid := auth.uid();
  ord bigint;
  pname text;
  shop text := (select value from private.secrets where name = 'mail_shop');
begin
  if me is null then raise exception 'Please sign in first.'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Please choose 1 to 5 stars.'; end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Please enter your name.'; end if;
  if p_photo is not null and (p_photo !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' or split_part(p_photo, '/', 1) <> me::text) then
    raise exception 'That photo could not be used.';
  end if;
  select o.id into ord from public.orders o
   where o.user_id = me and o.status in ('shipped', 'delivered')
     and exists (select 1 from jsonb_array_elements(o.items) i where i ->> 'id' = p_product)
   order by o.created_at desc limit 1;
  if ord is null then raise exception 'You can review a piece once your order with it has been sent.'; end if;
  select name into pname from public.products where id = p_product;
  insert into public.reviews (product_id, user_id, order_id, name, rating, body, photo)
  values (p_product, me, ord, left(btrim(p_name), 40), p_rating, left(nullif(btrim(p_body), ''), 1000), p_photo)
  on conflict (user_id, product_id) do update
    set created_at = now(), order_id = excluded.order_id, name = excluded.name, rating = excluded.rating,
        body = excluded.body, photo = coalesce(excluded.photo, public.reviews.photo), status = 'pending', approved_at = null;
  if shop is not null then
    perform private.send_mail(shop, 'MOYEN HILLS',
      format('New review to approve: %s stars for %s', p_rating, coalesce(pname, p_product)),
      format('<p><b>%s</b> gave <b>%s</b> %s stars%s.</p>%s<p>Approve or hide it on the <a href="https://moyenhillsofficial.com/admin">admin page</a> (Reviews).</p>',
        private.h(left(btrim(p_name), 40)), private.h(coalesce(pname, p_product)), p_rating,
        case when p_photo is not null then ', with a photo' else '' end,
        case when nullif(btrim(p_body), '') is not null then '<p>“' || private.h(left(btrim(p_body), 1000)) || '”</p>' else '' end));
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.submit_review(text, int, text, text, text) from public, anon;
grant execute on function public.submit_review(text, int, text, text, text) to authenticated;

-- What the product page shows: approved reviews only, without who wrote them beyond the name
create or replace function public.product_reviews(p_product text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', r.name, 'rating', r.rating, 'body', r.body,
           'photo', r.photo, 'date', coalesce(r.approved_at, r.created_at)) order by coalesce(r.approved_at, r.created_at) desc), '[]')
    from (select * from public.reviews where product_id = p_product and status = 'approved'
          order by coalesce(approved_at, created_at) desc limit 50) r;
$$;
revoke execute on function public.product_reviews(text) from public;
grant execute on function public.product_reviews(text) to anon, authenticated;

-- "Download my data" now includes the customer's reviews
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('email', u.email, 'created_at', u.created_at,
                  'last_sign_in_at', u.last_sign_in_at, 'email_confirmed_at', u.email_confirmed_at)
                from auth.users u where u.id = auth.uid()),
    'profile', (select to_jsonb(p) - 'id' from public.profiles p where p.id = auth.uid()),
    'orders', coalesce((select jsonb_agg(to_jsonb(o) - 'client' - 'user_id' order by o.created_at)
                from public.orders o where o.user_id = auth.uid()), '[]'),
    'cancellations', coalesce((select jsonb_agg(to_jsonb(w) - 'client' - 'user_id' order by w.created_at)
                from public.withdrawals w where w.user_id = auth.uid()), '[]'),
    'reviews', coalesce((select jsonb_agg(to_jsonb(r) - 'user_id' order by r.created_at)
                from public.reviews r where r.user_id = auth.uid()), '[]')
  )
  where auth.uid() is not null;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
