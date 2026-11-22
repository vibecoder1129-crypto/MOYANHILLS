-- Black Friday 2026, run once in the Supabase SQL Editor (paste the contents of this file). Safe to re-run.
-- ART WILL TEE goes to €27 (old price €37 shown crossed out, badge "Black Friday −27%")
--   at 12:00 on Monday 23 November (Riga time) = 10:00 UTC,
-- and goes back to exactly what it was before (price, old price, badge)
--   at 00:00 on Monday 30 November (Riga time), i.e. when Sunday 29 November ends = 22:00 UTC on the 29th.
-- Both switches run by themselves (pg_cron, already used for parcel tracking) and then delete themselves.
-- The banner and home-page countdown (campaign.js) use the same times.
-- Don't change the tee's price in the admin during the sale: the end switch puts back the pre-sale values.
-- To cancel before the start: select cron.unschedule('bf-start'); select cron.unschedule('bf-end');
-- To end early: select private.bf_end();

create extension if not exists pg_cron;
create schema if not exists private;

create table if not exists private.sale_backup (
  product_id text primary key,
  price numeric(10, 2),
  was_price numeric(10, 2),
  badge text,
  lv jsonb,
  saved_at timestamptz not null default now()
);
revoke all on private.sale_backup from public, anon, authenticated;

create or replace function private.bf_start()
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from private.sale_backup where product_id = 'art-will-tee') then return; end if; -- already on sale
  insert into private.sale_backup (product_id, price, was_price, badge, lv)
    select id, price, was_price, badge, lv from public.products where id = 'art-will-tee';
  update public.products
     set was_price = price,          -- €37, the price of the last 30 days (EU rule)
         price = 27,
         badge = 'Black Friday −27%',
         lv = jsonb_set(coalesce(lv, '{}'), '{badge}', '"Black Friday −27%"'),
         updated_at = now()
   where id = 'art-will-tee';
end;
$$;

create or replace function private.bf_end()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.products p
     set price = b.price, was_price = b.was_price, badge = b.badge, lv = b.lv, updated_at = now()
    from private.sale_backup b
   where p.id = b.product_id;
  delete from private.sale_backup;
end;
$$;
revoke execute on function private.bf_start(), private.bf_end() from public, anon, authenticated;

-- Remove older copies of the jobs, then plan them (cron times are UTC)
select cron.unschedule(jobname) from cron.job where jobname in ('bf-start', 'bf-end');
select cron.schedule('bf-start', '0 10 23 11 *', $$select private.bf_start(); select cron.unschedule('bf-start');$$);
select cron.schedule('bf-end', '0 22 29 11 *', $$select private.bf_end(); select cron.unschedule('bf-end');$$);

-- If this file is run after the start time, start the sale straight away (and end it if it is already over)
select private.bf_start() where now() >= '2026-11-23 10:00+00' and now() < '2026-11-29 22:00+00';
select private.bf_end() where now() >= '2026-11-29 22:00+00';

-- Check: should list bf-start and bf-end
select jobname, schedule from cron.job where jobname like 'bf-%';
