-- MOYEN HILLS — privacy, EU consumer rules and extra safety checks
-- Run this AFTER schema.sql, every time you run schema.sql:
--   Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again: it only adds what is missing and replaces its own functions.
--
-- What it adds:
--   1. A secret salt for the visitor fingerprint used by the rate limits (and the
--      fingerprint is forgotten after 24 hours)
--   2. Checks on every new order: real email, name and address, and the order time
--      always set by the database
--   3. Cancellations sent from withdraw.html (the EU withdrawal button)
--   4. "Delete my account" and "Download my data" for customers (GDPR)
--   5. EU price rule: a crossed-out old price can't be higher than the lowest
--      price of the last 30 days
--   6. purge_old_records(): deletes order records once accounting law no longer
--      requires them

-- ---------------------------------------------------------------------
-- 1. Visitor fingerprint with a secret salt
-- ---------------------------------------------------------------------
-- A private schema the website API can't reach
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.secrets (
  name text primary key,
  value text not null
);
insert into private.secrets (name, value)
values ('fingerprint_salt', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

-- Same name and result type as in schema.sql (prepare_order and check_promo call it).
-- Prefers the address set by Supabase's proxy over X-Forwarded-For, which a
-- visitor can write themselves.
create or replace function public.client_hash()
returns text language sql stable security definer set search_path = public, private as $$
  select encode(sha256(convert_to(
    (select value from private.secrets where name = 'fingerprint_salt') || ':' ||
    coalesce(
      nullif(h ->> 'cf-connecting-ip', ''),
      nullif(h ->> 'x-real-ip', ''),
      nullif(trim(split_part(h ->> 'x-forwarded-for', ',', 1)), ''),
      'unknown'),
    'UTF8')), 'hex')
  from (select coalesce(current_setting('request.headers', true), '{}')::jsonb as h) r;
$$;
revoke execute on function public.client_hash() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Every new order: checked details, database time, old fingerprints forgotten
--    (runs before orders_prepare from schema.sql: triggers run in name order)
-- ---------------------------------------------------------------------
create or replace function public.check_new_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- The order time can't be set from the browser (the rate limit counts on it)
  new.created_at := now();
  new.full_name := nullif(trim(new.full_name), '');
  new.email := lower(nullif(trim(new.email), ''));
  if new.full_name is null then raise exception 'Please enter your name.'; end if;
  if new.email is null or new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(new.email) > 200 then
    raise exception 'Please enter a valid email address.';
  end if;
  if nullif(trim(new.address), '') is null or nullif(trim(new.city), '') is null
     or nullif(trim(new.country), '') is null then
    raise exception 'Please enter your delivery address.';
  end if;
  if new.phone is not null and new.phone !~ '^[0-9+()\s./-]{0,50}$' then
    raise exception 'Please check your phone number.';
  end if;
  -- Rate-limit fingerprints are only needed for 10 minutes: forget them after a day
  update public.orders set client = null where client is not null and created_at < now() - interval '1 day';
  return new;
end;
$$;
drop trigger if exists orders_0_check on public.orders;
create trigger orders_0_check before insert on public.orders for each row execute function public.check_new_order();

-- Saved account details: keep them a sensible size
create or replace function public.check_profile()
returns trigger language plpgsql set search_path = public as $$
begin
  new.full_name := left(new.full_name, 200); new.phone := left(new.phone, 50);
  new.address := left(new.address, 400); new.city := left(new.city, 100);
  new.postcode := left(new.postcode, 20); new.country := left(new.country, 100);
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profiles_check on public.profiles;
create trigger profiles_check before insert or update on public.profiles for each row execute function public.check_profile();

-- ---------------------------------------------------------------------
-- 3. Cancellations (withdraw.html). Visitors can send one; only admins can read them.
-- ---------------------------------------------------------------------
create table if not exists public.withdrawals (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  email text not null,
  order_ref text,          -- order number, as the customer typed it
  order_date date,         -- ordered or received on, if given
  items text,              -- what they cancel ("The whole order" if empty)
  handled boolean not null default false,  -- tick once refunded / sorted
  client text              -- fingerprint for the rate limit, cleared after a day
);
create index if not exists withdrawals_created on public.withdrawals (created_at desc);
alter table public.withdrawals enable row level security;
drop policy if exists "withdrawals: admin reads" on public.withdrawals;
drop policy if exists "withdrawals: admin updates" on public.withdrawals;
create policy "withdrawals: admin reads"   on public.withdrawals for select using (public.is_admin());
create policy "withdrawals: admin updates" on public.withdrawals for update using (public.is_admin()) with check (public.is_admin());
revoke insert, delete, truncate on public.withdrawals from anon, authenticated;
drop trigger if exists withdrawals_log on public.withdrawals;
create trigger withdrawals_log after update or delete on public.withdrawals for each row execute function public.log_admin_change('id');

create or replace function public.request_withdrawal(p_name text, p_email text, p_order text, p_order_date date, p_items text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  me text := public.client_hash();
  em text := lower(trim(coalesce(p_email, '')));
  new_id bigint;
begin
  if nullif(trim(p_name), '') is null then raise exception 'Please enter your name.'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 200 then raise exception 'Please enter a valid email address.'; end if;
  update public.withdrawals set client = null where client is not null and created_at < now() - interval '1 day';
  if (select count(*) from public.withdrawals where client = me and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Too many requests. Please wait a few minutes or email us.';
  end if;
  insert into public.withdrawals (user_id, full_name, email, order_ref, order_date, items, client)
  values (auth.uid(), left(trim(p_name), 200), em, left(nullif(trim(p_order), ''), 40), p_order_date,
          left(coalesce(nullif(trim(p_items), ''), 'The whole order'), 1000), me)
  returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id, 'received_at', now());
end;
$$;
revoke execute on function public.request_withdrawal(text, text, text, date, text) from public;
grant execute on function public.request_withdrawal(text, text, text, date, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Customers: download my data, delete my account
-- ---------------------------------------------------------------------
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
                from public.withdrawals w where w.user_id = auth.uid()), '[]')
  )
  where auth.uid() is not null;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- Deletes the sign-in, the saved details (profiles cascade) and unlinks orders
-- (orders.user_id is "on delete set null"); order records stay for accounting law.
create or replace function public.delete_my_account()
returns void language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Please sign in first.'; end if;
  if exists (select 1 from auth.users u join public.admins a on lower(a.email) = lower(u.email) where u.id = me) then
    raise exception 'This account is a shop admin. Ask an owner to remove you as an admin first.';
  end if;
  update public.withdrawals set user_id = null where user_id = me;
  delete from auth.users where id = me;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------
-- 5. EU price rule (Omnibus): the crossed-out "was" price must be the lowest
--    price charged in the 30 days before the price was reduced.
-- ---------------------------------------------------------------------
create table if not exists public.price_history (
  product_id text not null references public.products (id) on delete cascade,
  price numeric(10, 2) not null,
  at timestamptz not null default now()
);
create index if not exists price_history_product on public.price_history (product_id, at);
alter table public.price_history enable row level security;
drop policy if exists "price history: admins read" on public.price_history;
create policy "price history: admins read" on public.price_history for select using (public.is_admin());
revoke insert, update, delete, truncate on public.price_history from anon, authenticated;
-- Products that have no history yet start from their current price
insert into public.price_history (product_id, price)
select p.id, p.price from public.products p
where not exists (select 1 from public.price_history h where h.product_id = p.id);

create or replace function public.record_price()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price then
    insert into public.price_history (product_id, price) values (new.id, new.price);
  end if;
  return new;
end;
$$;
drop trigger if exists products_price_history on public.products;
create trigger products_price_history after insert or update of price on public.products for each row execute function public.record_price();

create or replace function public.check_was_price()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  since timestamptz;
  lowest numeric;
begin
  -- Only matters when an old price is shown (it is higher than the price)
  if new.was_price is null or new.was_price <= new.price then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'A new product can’t show an old price yet: EU rules need it to have been sold at that price first. Leave “old price” empty.';
  end if;
  if new.price is not distinct from old.price and new.was_price is not distinct from old.was_price then return new; end if;
  -- When did the reduction start? Now, if the price changes now; otherwise when the current price was set.
  since := case when new.price is distinct from old.price then now()
    else coalesce((select max(at) from public.price_history where product_id = new.id and price = new.price), now()) end;
  select min(x.price) into lowest from (
    select h.price from public.price_history h
      where h.product_id = new.id and h.at >= since - interval '30 days' and h.at < since
    union all
    (select h.price from public.price_history h
      where h.product_id = new.id and h.at < since - interval '30 days' order by h.at desc limit 1)
    union all
    select old.price where new.price is distinct from old.price
  ) x;
  if lowest is not null and new.was_price > lowest then
    raise exception 'The old price can be at most €% — the lowest price of the 30 days before the reduction (EU price rules).',
      trim(to_char(lowest, 'FM999999990.99'), '.');
  end if;
  return new;
end;
$$;
drop trigger if exists products_was_price on public.products;
create trigger products_was_price before insert or update on public.products for each row execute function public.check_was_price();

-- ---------------------------------------------------------------------
-- 6. Retention: delete order records and cancellations older than accounting
--    law needs. Run it yourself about once a year in the SQL Editor, e.g.
--      select public.purge_old_records(5);
--    (deletes everything from before 1 January, 5 full years ago)
-- ---------------------------------------------------------------------
create or replace function public.purge_old_records(p_years integer)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  cutoff timestamptz;
  n_orders integer;
  n_withdrawals integer;
begin
  if p_years is null or p_years < 1 then raise exception 'Give the number of years to keep, e.g. 5.'; end if;
  cutoff := date_trunc('year', now()) - make_interval(years => p_years);
  delete from public.withdrawals where created_at < cutoff;
  get diagnostics n_withdrawals = row_count;
  delete from public.orders where created_at < cutoff;
  get diagnostics n_orders = row_count;
  return jsonb_build_object('deleted_before', cutoff, 'orders', n_orders, 'cancellations', n_withdrawals);
end;
$$;
revoke execute on function public.purge_old_records(integer) from public, anon, authenticated;
