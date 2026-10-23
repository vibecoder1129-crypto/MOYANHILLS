-- MOYEN HILLS — live parcel status from 17TRACK (run after tracking.sql)
-- The Edge Function track-parcels (supabase/functions/track-parcels) saves each shipped
-- parcel's latest status on its order; pg_cron calls it every 3 hours. Safe to re-run.
--
--   orders.track_status       17TRACK's status: InfoReceived, InTransit, OutForDelivery,
--                             AvailableForPickup, DeliveryFailure, Exception, Delivered, Expired
--   orders.track_event        the latest scan: {"time", "text", "place"}
--   orders.track_checked_at   when it was last asked

alter table public.orders add column if not exists track_status text;
alter table public.orders add column if not exists track_event jsonb;
alter table public.orders add column if not exists track_checked_at timestamptz;

-- Only the database's own timer may call the function: it sends this key, the function checks it
insert into private.secrets (name, value) values ('track_cron_key', encode(extensions.gen_random_bytes(24), 'hex'))
  on conflict (name) do nothing;

create or replace function public.track_cron_ok(p_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.secrets where name = 'track_cron_key' and value = p_key and p_key <> '');
$$;
revoke execute on function public.track_cron_ok(text) from public, anon, authenticated;
grant execute on function public.track_cron_ok(text) to service_role;

create or replace function private.poll_tracking(p_check boolean default false)
returns bigint language plpgsql security definer set search_path = '' as $$
begin
  return net.http_post(
    url := 'https://kvykvcjwqjzaepdiwydd.supabase.co/functions/v1/track-parcels',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-key', (select value from private.secrets where name = 'track_cron_key')),
    body := jsonb_build_object('check', p_check),
    timeout_milliseconds := 60000);
end;
$$;
revoke execute on function private.poll_tracking(boolean) from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('track-parcels', '17 */3 * * *', 'select private.poll_tracking()');

-- A new or changed tracking number starts with a clean status
create or replace function public.orders_track_reset()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.tracking_number is distinct from old.tracking_number then
    new.track_status := null; new.track_event := null; new.track_checked_at := null;
  end if;
  return new;
end;
$$;
create or replace trigger orders_2_track_reset before update of tracking_number on public.orders
  for each row execute function public.orders_track_reset();
revoke execute on function public.orders_track_reset() from public, anon, authenticated;
