-- MOYEN HILLS — card payments with Stripe
-- Run this AFTER schema.sql and privacy.sql, every time you run those two
-- (Dashboard → SQL Editor → New query → paste → Run). Safe to re-run.
--
-- How a card order works:
--   1. The cart saves the order as before (prices, promo code and stock are checked in the
--      database) with a secret pay_token, and the delivery cost from shipping_rates is added.
--   2. The create-checkout Edge Function turns that order into a Stripe Checkout page.
--   3. The stripe-webhook Edge Function hears from Stripe and marks the order paid, or cancels it
--      when the payment page runs out (30 minutes), which puts the pieces back in stock.

-- Delivery cost by country, as the customer types it in the cart ('latvia', 'lithuania', …),
-- with '*' for anywhere else. Delete the '*' row to only ship to the countries listed.
create table if not exists public.shipping_rates (
  country text primary key check (country = lower(trim(country))),
  price numeric(10, 2) not null check (price >= 0),
  label text not null default 'Delivery'   -- shown on the payment page, e.g. 'Omniva parcel locker'
);
alter table public.shipping_rates enable row level security;
drop policy if exists "shipping: everyone reads" on public.shipping_rates;
drop policy if exists "shipping: admin writes" on public.shipping_rates;
create policy "shipping: everyone reads" on public.shipping_rates for select using (true);
create policy "shipping: admin writes"   on public.shipping_rates for all using (public.is_admin()) with check (public.is_admin());
-- PLACEHOLDERS: free delivery until you put in real prices (Table Editor → shipping_rates).
insert into public.shipping_rates (country, price, label) values
  ('latvia', 0, 'Delivery in Latvia'),
  ('*', 0, 'Delivery')
on conflict (country) do nothing;

-- Payment details on each order
alter table public.orders add column if not exists shipping numeric(10, 2) not null default 0;
alter table public.orders add column if not exists pay_token uuid;          -- secret, only the buyer's browser knows it
alter table public.orders add column if not exists payment text
  check (payment in ('unpaid', 'pending', 'paid', 'failed', 'expired'));   -- empty = not a card order
alter table public.orders add column if not exists stripe_session text;
alter table public.orders add column if not exists stripe_payment text;    -- Stripe payment id (pi_…), for refunds
alter table public.orders add column if not exists paid_at timestamptz;
create unique index if not exists orders_pay_token on public.orders (pay_token);

-- New orders: payment fields can't be set from the browser, and delivery is added to the total.
-- Named so it runs after orders_prepare (triggers run in name order), which works out the total.
create or replace function public.prepare_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare rate public.shipping_rates;
begin
  new.payment := case when new.pay_token is not null then 'unpaid' end;
  new.stripe_session := null;
  new.stripe_payment := null;
  new.paid_at := null;
  select * into rate from public.shipping_rates where country = lower(trim(new.country));
  if not found then select * into rate from public.shipping_rates where country = '*'; end if;
  if not found then
    -- No rates at all yet: keep the old way (delivery agreed by email). With rates but none
    -- for this country, a card order can't go ahead.
    if new.pay_token is not null and exists (select 1 from public.shipping_rates) then
      raise exception 'Sorry, we don’t deliver to % yet. Please email us.', new.country;
    end if;
    new.shipping := 0;
  else
    new.shipping := rate.price;
  end if;
  new.total := coalesce(new.total, new.subtotal - new.discount) + new.shipping;
  return new;
end;
$$;
revoke execute on function public.prepare_payment() from public, anon, authenticated;
drop trigger if exists orders_zz_payment on public.orders;
create trigger orders_zz_payment before insert on public.orders for each row execute function public.prepare_payment();

-- Card orders whose payment page was never finished: cancel them (stock goes back).
-- Stripe closes the page after 30 minutes and tells the webhook, so this only catches orders
-- whose payment page never opened. Called by create-checkout; only the server may run it.
create or replace function public.release_unpaid_orders()
returns integer language sql security definer set search_path = public as $$
  with gone as (
    update public.orders set status = 'cancelled', payment = 'expired'
    where payment = 'unpaid' and status = 'received' and created_at < now() - interval '90 minutes'
    returning 1
  )
  select count(*)::int from gone;
$$;
revoke execute on function public.release_unpaid_orders() from public, anon, authenticated;
grant execute on function public.release_unpaid_orders() to service_role;
