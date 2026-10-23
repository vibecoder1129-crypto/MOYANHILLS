-- MOYEN HILLS — customer accounts, orders, products, promo codes and admins
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- Saved customer details, one row per account.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  address text,
  city text,
  postcode text,
  country text default 'Latvia',
  updated_at timestamptz not null default now()
);

-- Every order placed on the site. user_id is empty for guest orders.
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  items jsonb not null,            -- [{ "name": "ART WILL TEE", "size": "M", "qty": 1, "price": 35 }]
  subtotal numeric(10, 2) not null,
  currency text not null default 'EUR',
  -- received → paid → shipped (change it in Table Editor; the customer sees it on their account page)
  status text not null default 'received' check (status in ('received', 'paid', 'shipped', 'cancelled')),
  full_name text,
  email text,
  phone text,
  address text,
  city text,
  postcode text,
  country text,
  note text
);
-- Projects created before guest orders were stored: allow an empty user_id.
alter table public.orders alter column user_id drop not null;
create index if not exists orders_created on public.orders (created_at desc);
create index if not exists orders_user_created on public.orders (user_id, created_at desc);

-- Each customer can only see and change their own rows.
alter table public.profiles enable row level security;
alter table public.orders enable row level security;

drop policy if exists "own profile: read" on public.profiles;
drop policy if exists "own profile: insert" on public.profiles;
drop policy if exists "own profile: update" on public.profiles;
create policy "own profile: read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile: insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile: update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own orders: read" on public.orders;
drop policy if exists "own orders: insert" on public.orders;
create policy "own orders: read"   on public.orders for select using (auth.uid() = user_id);
-- Customers can add an order but never change its status; only you can, from the dashboard.
create policy "own orders: insert" on public.orders for insert with check (auth.uid() = user_id and status = 'received');
-- Guests can add an order with no user_id (it is not linked to any account).
-- Nobody can read guest orders from the site; you see them in the dashboard.
drop policy if exists "guest orders: insert" on public.orders;
create policy "guest orders: insert" on public.orders for insert to anon, authenticated with check (user_id is null and status = 'received');

-- Create an empty profile automatically when someone signs up (keeps the name from Google/Apple).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =====================================================================
-- Shop management: products, promo codes and the admin page (admin.html)
-- Safe to run again after changes: it only adds what is missing.
-- =====================================================================

-- Who may use the admin page. After running this file, add yourself as the owner:
--   insert into public.admins (email, role) values ('you@example.com', 'owner');
-- then sign in on admin.html with that email (it must be confirmed) and set up
-- the two-step code it asks for. Owners can then add other admins on the admin page.
--   owner:  everything, including who is an admin
--   editor: adding, changing and deleting products, prices, stock, photos, promo codes,
--           orders and cancellations. They see the other editors, but not who the
--           owners are, and can't change who is an admin.
create table if not exists public.admins (
  email text primary key,
  added_at timestamptz not null default now()
);
-- Admins added before roles existed become owners; new ones are editors unless chosen
alter table public.admins add column if not exists role text not null default 'owner' check (role in ('owner', 'editor'));
alter table public.admins alter column role set default 'editor';
alter table public.admins enable row level security;

-- An admin is someone on the list, with a confirmed email, who signed in with
-- their password AND a code from their authenticator app (aal2). A stolen
-- password alone can't change anything.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' and exists (
    select 1 from auth.users u
    join public.admins a on lower(a.email) = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() and exists (
    select 1 from auth.users u
    join public.admins a on lower(a.email) = lower(u.email)
    where u.id = auth.uid() and a.role = 'owner'
  );
$$;
grant execute on function public.is_owner() to anon, authenticated;

-- What the admin page needs to know about whoever is signed in: on the list?
-- which role? email confirmed? two-step code done?
create or replace function public.admin_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'listed', a.email is not null, 'role', a.role,
    'confirmed', u.email_confirmed_at is not null,
    'aal2', coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
  from auth.users u left join public.admins a on lower(a.email) = lower(u.email)
  where u.id = auth.uid();
$$;
revoke execute on function public.admin_status() from public, anon;
grant execute on function public.admin_status() to authenticated;

drop policy if exists "admins: admins read" on public.admins;
drop policy if exists "admins: owners manage" on public.admins;
-- Editors only see the other editors: who the owners are stays private
create policy "admins: admins read"   on public.admins for select using (public.is_owner() or (public.is_admin() and role = 'editor'));
create policy "admins: owners manage" on public.admins for all using (public.is_owner()) with check (public.is_owner());

-- Emails are kept in lower case, and there is always at least one owner
create or replace function public.guard_admins()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    new.email := lower(trim(new.email));
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.email <> old.email)
     and not exists (select 1 from public.admins where role = 'owner' and email <> old.email) then
    raise exception 'There must always be at least one owner.';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists admins_guard on public.admins;
create trigger admins_guard before insert or update or delete on public.admins for each row execute function public.guard_admins();

-- Products (the same fields as catalog.js)
create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- used in the link: product.html?id=…
  name text not null,
  colour text,
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,     -- false = hidden from the shop
  featured boolean not null default false,  -- shown on the home page
  sold_out boolean not null default false,
  label text,
  blurb text,
  description text,
  details jsonb not null default '[]',      -- ["100% cotton", "MADE IN LATVIA"]
  fit text,
  note text,
  sizes jsonb not null default '[]',        -- [{"size": "S", "stock": 10}, …] in display order
  images jsonb not null default '[]',       -- [{"src": "…", "alt": "…"}, …] the first is the main photo
  sort integer not null default 0,          -- lower numbers show first
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Latvian text for the Latvian site: {"colour", "label", "blurb", "description", "details", "fit", "note"};
-- anything left out shows in English. Edited on the admin page.
alter table public.products add column if not exists lv jsonb not null default '{}';
alter table public.products enable row level security;
drop policy if exists "products: shop reads" on public.products;
drop policy if exists "products: admin writes" on public.products;
drop policy if exists "products: admin adds" on public.products;
drop policy if exists "products: admin changes" on public.products;
drop policy if exists "products: owner deletes" on public.products;
drop policy if exists "products: admin deletes" on public.products;
create policy "products: shop reads"      on public.products for select using (active or public.is_admin());
create policy "products: admin adds"      on public.products for insert with check (public.is_admin());
create policy "products: admin changes"   on public.products for update using (public.is_admin()) with check (public.is_admin());
create policy "products: admin deletes"   on public.products for delete using (public.is_admin());

-- Promo codes. Private: the website can only ask "is this code valid?" through check_promo().
alter table public.products add column if not exists was_price numeric(10, 2) check (was_price >= 0); -- old price, shown crossed out
alter table public.products add column if not exists badge text check (char_length(badge) <= 60); -- badge under the price, empty = none; {n} = pieces left

create table if not exists public.promo_codes (
  code text primary key check (code = upper(code) and code ~ '^[A-Z0-9_-]+$'),
  percent numeric(5, 2) check (percent > 0 and percent <= 100),  -- e.g. 10 = 10% off
  amount numeric(10, 2) check (amount > 0),                      -- or a fixed amount off, in euros
  min_subtotal numeric(10, 2) not null default 0,
  max_uses integer check (max_uses > 0),                         -- empty = unlimited
  uses integer not null default 0,
  expires_at timestamptz,                                         -- empty = never
  active boolean not null default true,
  note text,                                                      -- who it's for
  created_at timestamptz not null default now(),
  check ((percent is null) <> (amount is null))
);
alter table public.promo_codes enable row level security;
drop policy if exists "promo codes: admin" on public.promo_codes;
create policy "promo codes: admin" on public.promo_codes for all using (public.is_admin()) with check (public.is_admin());

-- The discount a code gives on a subtotal, or why it doesn't apply
create or replace function public.promo_result(p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c public.promo_codes;
  d numeric;
begin
  select * into c from public.promo_codes where code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  if not found or not c.active then return jsonb_build_object('ok', false, 'message', 'That code is not valid.'); end if;
  if c.expires_at is not null and c.expires_at < now() then return jsonb_build_object('ok', false, 'message', 'That code has expired.'); end if;
  if c.max_uses is not null and c.uses >= c.max_uses then return jsonb_build_object('ok', false, 'message', 'That code has been used up.'); end if;
  if coalesce(p_subtotal, 0) < c.min_subtotal then
    return jsonb_build_object('ok', false, 'message', format('That code needs an order of at least €%s.', trim(to_char(c.min_subtotal, 'FM999999990.99'), '.')));
  end if;
  d := case when c.percent is not null then round(p_subtotal * c.percent / 100, 2) else least(c.amount, p_subtotal) end;
  return jsonb_build_object(
    'ok', true, 'code', c.code, 'discount', d,
    'label', case when c.percent is not null then trim(to_char(c.percent, 'FM990.99'), '.') || '% off'
                  else '€' || trim(to_char(c.amount, 'FM999999990.99'), '.') || ' off' end);
end;
$$;
revoke execute on function public.promo_result(text, numeric) from public, anon, authenticated;

-- Who is calling, as a one-way fingerprint of their internet address (for rate limits;
-- the address itself is never stored)
create or replace function public.client_hash()
returns text language sql stable as $$
  select md5('moyen-hills:' || coalesce(
    split_part(coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'x-forwarded-for', ',', 1),
    'unknown'));
$$;
revoke execute on function public.client_hash() from public, anon, authenticated;

-- Promo code tries, so nobody can guess codes by trying thousands of them
create table if not exists public.promo_attempts (
  client text not null,
  at timestamptz not null default now()
);
create index if not exists promo_attempts_client on public.promo_attempts (client, at);
alter table public.promo_attempts enable row level security; -- no policies: not readable from the website

-- What the cart calls to check a code (at most 15 tries per 10 minutes per visitor)
drop function if exists public.check_promo(text, numeric);
create function public.check_promo(p_code text, p_subtotal numeric)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me text := public.client_hash();
begin
  delete from public.promo_attempts where at < now() - interval '1 day';
  if (select count(*) from public.promo_attempts where client = me and at > now() - interval '10 minutes') >= 15 then
    return jsonb_build_object('ok', false, 'message', 'Too many tries. Please wait a few minutes.');
  end if;
  insert into public.promo_attempts (client) values (me);
  return public.promo_result(left(p_code, 40), p_subtotal);
end;
$$;
grant execute on function public.check_promo(text, numeric) to anon, authenticated;

-- Orders: promo code, discount and total
alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists discount numeric(10, 2) not null default 0;
alter table public.orders add column if not exists total numeric(10, 2);
alter table public.orders add column if not exists client text; -- fingerprint for the order rate limit
alter table public.orders add column if not exists lang text not null default 'en'; -- the site language: 'en' or 'lv', for the emails

-- Every new order: prices come from the products table (so they can't be changed in the
-- browser), the promo code is checked again and counted, and the stock goes down.
create or replace function public.prepare_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  it record;
  p public.products;
  items jsonb := '[]';
  sub numeric := 0;
  promo jsonb;
begin
  -- At most 5 orders per 10 minutes from one visitor, so nobody can empty the stock with fake orders
  new.client := public.client_hash();
  if (select count(*) from public.orders where client = new.client and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Too many orders in a short time. Please wait a few minutes or email us.';
  end if;
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) not between 1 and 20 then
    raise exception 'The order is empty or too big.';
  end if;
  new.status := 'received';
  new.note := left(new.note, 2000);
  new.full_name := left(new.full_name, 200); new.email := left(new.email, 200); new.phone := left(new.phone, 50);
  new.address := left(new.address, 400); new.city := left(new.city, 100); new.postcode := left(new.postcode, 20); new.country := left(new.country, 100);
  new.lang := case when new.lang = 'lv' then 'lv' else 'en' end;
  -- The Latvian site starts the country box as "Latvija": store the English name the delivery prices use
  new.country := case lower(trim(new.country)) when 'latvija' then 'Latvia' when 'lietuva' then 'Lithuania'
    when 'igaunija' then 'Estonia' when 'eesti' then 'Estonia' else new.country end;
  for it in select * from jsonb_to_recordset(new.items) as x(id text, name text, colour text, size text, qty int, price numeric) loop
    if it.qty is null or it.qty not between 1 and 10 then raise exception 'Bad quantity'; end if;
    -- Only real products, in a size that exists, from stock that is there
    select * into p from public.products where id = it.id and active for update;
    if not found then raise exception 'That product is no longer available.'; end if;
    if p.sold_out or coalesce((select (s ->> 'stock')::int from jsonb_array_elements(p.sizes) s where s ->> 'size' = it.size), 0) < it.qty then
      raise exception '% in % is sold out.', p.name, it.size;
    end if;
    it.price := p.price; it.name := p.name; it.colour := p.colour;
    update public.products set sizes = (
      select coalesce(jsonb_agg(case when s ->> 'size' = it.size
        then jsonb_set(s, '{stock}', to_jsonb((s ->> 'stock')::int - it.qty)) else s end order by n), '[]')
      from jsonb_array_elements(sizes) with ordinality as e(s, n)
    ), updated_at = now() where id = it.id;
    items := items || jsonb_build_object('id', it.id, 'name', it.name, 'colour', it.colour, 'size', it.size, 'qty', it.qty, 'price', it.price);
    sub := sub + it.qty * coalesce(it.price, 0);
  end loop;
  new.items := items;
  new.subtotal := sub;
  new.discount := 0;
  if new.promo_code is not null then
    promo := public.promo_result(new.promo_code, sub);
    if (promo ->> 'ok')::boolean then
      new.promo_code := promo ->> 'code';
      new.discount := (promo ->> 'discount')::numeric;
      update public.promo_codes set uses = uses + 1 where code = new.promo_code;
    else
      new.promo_code := null;
    end if;
  end if;
  new.total := greatest(0, sub - new.discount);
  return new;
end;
$$;
drop trigger if exists orders_prepare on public.orders;
create trigger orders_prepare before insert on public.orders for each row execute function public.prepare_order();

-- A cancelled order puts its pieces back in stock. It stays cancelled: undoing that would
-- need the stock taken out again, so a new order is the way back.
create or replace function public.restock_cancelled()
returns trigger language plpgsql security definer set search_path = public as $$
declare it record;
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled order can’t be reopened: its pieces are already back in stock.';
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    for it in select * from jsonb_to_recordset(new.items) as x(id text, size text, qty int) loop
      update public.products set sizes = (
        select coalesce(jsonb_agg(case when s ->> 'size' = it.size
          then jsonb_set(s, '{stock}', to_jsonb((s ->> 'stock')::int + it.qty)) else s end order by n), '[]')
        from jsonb_array_elements(sizes) with ordinality as e(s, n)
      ), updated_at = now() where id = it.id;
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_restock on public.orders;
create trigger orders_restock after update of status on public.orders for each row execute function public.restock_cancelled();

-- The admin page sees every order and can change its status
drop policy if exists "orders: admin reads" on public.orders;
drop policy if exists "orders: admin updates" on public.orders;
create policy "orders: admin reads"   on public.orders for select using (public.is_admin());
create policy "orders: admin updates" on public.orders for update using (public.is_admin()) with check (public.is_admin());

-- Product photos uploaded on the admin page (public to view, only admins can upload)
insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict (id) do nothing;
-- Photos only, at most 8 MB each
update storage.buckets set file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'products';
drop policy if exists "product photos: admin upload" on storage.objects;
drop policy if exists "product photos: admin change" on storage.objects;
drop policy if exists "product photos: admin delete" on storage.objects;
create policy "product photos: admin upload" on storage.objects for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "product photos: admin change" on storage.objects for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "product photos: admin delete" on storage.objects for delete to authenticated using (bucket_id = 'products' and public.is_admin());

-- Change log: every change made on the admin page, who made it and when.
-- Written only by the database itself; nobody (owners included) can edit or delete entries.
create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  email text,
  action text not null,   -- e.g. "update products"
  target text,            -- the product id, promo code, order number or admin email
  changes jsonb           -- for updates: {"price": {"from": 35, "to": 30}}
);
alter table public.admin_log enable row level security;
drop policy if exists "change log: admins read" on public.admin_log;
-- Editors see what editors did, but not the owners' changes or changes to the admins list
alter table public.admin_log add column if not exists by_owner boolean not null default false;
update public.admin_log l set by_owner = true where not by_owner and exists (select 1 from public.admins a where a.email = lower(l.email) and a.role = 'owner');
drop function if exists public.is_owner_email(text);
create policy "change log: admins read" on public.admin_log for select using (
  public.is_owner() or (public.is_admin() and not by_owner and action <> all (array['insert admins', 'update admins', 'delete admins'])));
revoke insert, update, delete, truncate on public.admin_log from anon, authenticated;

create or replace function public.log_admin_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_key text;
  diff jsonb;
begin
  -- Only direct changes by a signed-in person (not stock moved by an order)
  if pg_trigger_depth() > 1 or auth.uid() is null then return coalesce(new, old); end if;
  target_key := coalesce(to_jsonb(new), to_jsonb(old)) ->> tg_argv[0];
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, jsonb_build_object('from', o.value, 'to', n.value)) into diff
    from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and key <> 'updated_at';
    if diff is null then return new; end if;
  elsif tg_op = 'INSERT' then
    diff := to_jsonb(new);
  else
    diff := to_jsonb(old);
  end if;
  insert into public.admin_log (email, action, target, changes, by_owner)
  values ((select email from auth.users where id = auth.uid()), lower(tg_op) || ' ' || tg_table_name, target_key, diff, public.is_owner());
  return coalesce(new, old);
end;
$$;
drop trigger if exists products_log on public.products;
drop trigger if exists promo_codes_log on public.promo_codes;
drop trigger if exists orders_log on public.orders;
drop trigger if exists admins_log on public.admins;
create trigger products_log    after insert or update or delete on public.products    for each row execute function public.log_admin_change('id');
create trigger promo_codes_log after insert or update or delete on public.promo_codes for each row execute function public.log_admin_change('code');
create trigger orders_log      after update or delete on public.orders                for each row execute function public.log_admin_change('id');
create trigger admins_log      after insert or update or delete on public.admins      for each row execute function public.log_admin_change('email');

-- Start with the ART WILL TEE (skipped if it's already there)
insert into public.products (id, name, colour, price, featured, label, blurb, description, details, fit, note, sizes, images)
values (
  'art-will-tee', 'ART WILL TEE', 'White', 35, true, 'Limited first drop',
  'The Hills family signed up early for this one. Pre-made in small numbers, screen printed on three sides, made in Latvia. When it’s gone, it’s gone.',
  'Short-sleeve t-shirt with a boxy fit, including front, back & neck label custom screen printed graphics.',
  '["100% cotton", "Cut-off style bottom", "MADE IN LATVIA"]',
  'Boxy, with short sleeves and a cut-off style bottom, so it sits wide and a little short.',
  'Pre-made. Please allow 1–3 days for order fulfilling.',
  '[{"size": "S", "stock": 10}, {"size": "M", "stock": 10}, {"size": "L", "stock": 10}, {"size": "XL", "stock": 10}]',
  '[{"src": "images/flat-front.jpg", "srcset": "images/flat-front-480.jpg 480w, images/flat-front-800.jpg 800w, images/flat-front.jpg 1002w", "width": 1002, "height": 1201, "alt": "ART WILL TEE, front, laid flat"},
    {"src": "images/flat-back.jpg", "srcset": "images/flat-back-480.jpg 480w, images/flat-back-800.jpg 800w, images/flat-back.jpg 1002w", "width": 1002, "height": 1054, "alt": "ART WILL TEE, back, laid flat"},
    {"src": "images/tee-front.jpg", "srcset": "images/tee-front-480.jpg 480w, images/tee-front-800.jpg 800w, images/tee-front.jpg 1200w", "width": 1200, "height": 1600, "alt": "Worn by a model on concrete stairs"},
    {"src": "images/front-print.jpg", "srcset": "images/front-print-480.jpg 480w, images/front-print-800.jpg 800w, images/front-print.jpg 1002w", "width": 1002, "height": 1201, "alt": "Close-up of the front print"},
    {"src": "images/back-print.jpg", "srcset": "images/back-print-480.jpg 480w, images/back-print-800.jpg 800w, images/back-print.jpg 1002w", "width": 1002, "height": 1054, "alt": "Close-up of the back print, ART WILL SAVE US ALL"},
    {"src": "images/neck-label.jpg", "srcset": "images/neck-label-480.jpg 480w, images/neck-label-800.jpg 800w, images/neck-label.jpg 1002w", "width": 1002, "height": 1054, "alt": "Printed neck label, 100% cotton"}]'
)
on conflict (id) do nothing;
