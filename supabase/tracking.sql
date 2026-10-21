-- MOYEN HILLS — parcel tracking (DPD, Omniva, Latvijas Pasts, Venipak, DHL…)
-- Run this AFTER schema.sql, privacy.sql, notify.sql (and payments.sql if you use it),
-- and again whenever you run those: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again.
--
-- What it adds:
--   orders.carrier, orders.tracking_number   set on the admin page (Orders → "Shipping")
--   orders.shipped_at, orders.delivered_at   stamped when the status changes
--   a new order status, 'delivered'
--   an email to the customer, in their language, when the order ships, with the tracking
--   number and a link to the carrier's live tracking page. Sent again only if the number changes.
-- The customer also sees the carrier, number and link on account.html.

alter table public.orders add column if not exists carrier text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('received', 'paid', 'shipped', 'delivered', 'cancelled'));
alter table public.orders drop constraint if exists orders_carrier_check;
alter table public.orders add constraint orders_carrier_check
  check (carrier is null or carrier in ('dpd', 'omniva', 'latvijas_pasts', 'venipak', 'dhl', 'other'));

-- The carrier's tracking page for a parcel. Same list as CARRIERS in admin.js and auth.js.
-- Carriers without a stable public link go to 17TRACK, which finds the parcel by its number.
create or replace function private.track_url(p_carrier text, p_number text)
returns text language sql immutable as $$
  select case when coalesce(p_number, '') = '' then null
    when p_carrier = 'dpd' then 'https://tracking.dpd.de/status/en_US/parcel/' || p_number
    when p_carrier = 'dhl' then 'https://www.dhl.com/lv-en/home/tracking.html?tracking-id=' || p_number
    else 'https://t.17track.net/en#nums=' || p_number end;
$$;

create or replace function private.carrier_name(p_carrier text)
returns text language sql immutable as $$
  select case p_carrier when 'dpd' then 'DPD' when 'omniva' then 'Omniva' when 'latvijas_pasts' then 'Latvijas Pasts'
    when 'venipak' then 'Venipak' when 'dhl' then 'DHL' else null end;
$$;

-- A new order never comes with tracking from the browser
create or replace function public.orders_tracking_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  new.carrier := null; new.tracking_number := null; new.shipped_at := null; new.delivered_at := null;
  return new;
end;
$$;
drop trigger if exists orders_1_tracking on public.orders;
create trigger orders_1_tracking before insert on public.orders for each row execute function public.orders_tracking_insert();

-- Admin edits: tidy the number, stamp the dates
create or replace function public.orders_tracking_update()
returns trigger language plpgsql set search_path = public as $$
begin
  new.tracking_number := nullif(upper(regexp_replace(coalesce(new.tracking_number, ''), '\s', '', 'g')), '');
  if new.tracking_number !~ '^[A-Z0-9-]{4,40}$' then
    raise exception 'That tracking number doesn’t look right: use only letters, numbers and dashes (4 to 40).';
  end if;
  if new.tracking_number is null then new.carrier := null;
  elsif new.carrier is null then new.carrier := 'other';
  end if;
  if new.status = 'shipped' and old.status is distinct from 'shipped' then new.shipped_at := coalesce(new.shipped_at, now()); end if;
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    new.delivered_at := now(); new.shipped_at := coalesce(new.shipped_at, now());
  end if;
  return new;
end;
$$;
drop trigger if exists orders_1_tracking_update on public.orders;
create trigger orders_1_tracking_update before update on public.orders for each row execute function public.orders_tracking_update();
revoke execute on function public.orders_tracking_insert() from public, anon, authenticated;
revoke execute on function public.orders_tracking_update() from public, anon, authenticated;

-- "Your order is on its way" → the customer, in the language they used on the site
create or replace function private.mail_shipped()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  lv boolean := to_jsonb(new) ->> 'lang' = 'lv';
  hi text := private.h(split_part(new.full_name, ' ', 1));
  url text := private.track_url(new.carrier, new.tracking_number);
  carrier text := private.carrier_name(new.carrier);
  track text;
begin
  if new.tracking_number is not null then
    track := case when lv
      then format('<p>Sūtījuma numurs%s: <b>%s</b></p><p><a href="%s">Sekot sūtījumam</a></p>',
        coalesce(' (' || carrier || ')', ''), private.h(new.tracking_number), private.h(url))
      else format('<p>Tracking number%s: <b>%s</b></p><p><a href="%s">Track your parcel</a></p>',
        coalesce(' (' || carrier || ')', ''), private.h(new.tracking_number), private.h(url)) end;
  end if;
  if lv then
    perform private.send_mail(new.email, new.full_name,
      format('MOYEN HILLS: tavs pasūtījums #%s ir ceļā', new.id),
      format('<p>Sveiki, %s!</p><p>Tavs pasūtījums <b>#%s</b> ir nosūtīts%s.</p>%s<p>Sūtījuma statusu vienmēr vari redzēt arī savā kontā: <a href="https://moyenhills.com/account.html?lang=lv">moyenhills.com/account.html</a>.</p><p>MOYEN HILLS</p>',
        hi, new.id, coalesce(' ar ' || carrier, ''), coalesce(track, '')));
  else
    perform private.send_mail(new.email, new.full_name,
      format('MOYEN HILLS: your order #%s is on its way', new.id),
      format('<p>Hi %s,</p><p>Your order <b>#%s</b> has shipped%s.</p>%s<p>You can also follow it from your account: <a href="https://moyenhills.com/account.html?lang=en">moyenhills.com/account.html</a>.</p><p>MOYEN HILLS</p>',
        hi, new.id, coalesce(' with ' || carrier, ''), coalesce(track, '')));
  end if;
  return new;
end;
$$;
drop trigger if exists orders_mail_shipped on public.orders;
-- Once when a tracking number is added or changed, or once when it is marked shipped without one
create trigger orders_mail_shipped after update of status, tracking_number on public.orders
  for each row when (new.status in ('shipped', 'delivered') and (
    (new.tracking_number is not null and new.tracking_number is distinct from old.tracking_number)
    or (new.tracking_number is null and new.status = 'shipped' and old.status in ('received', 'paid'))))
  execute function private.mail_shipped();
