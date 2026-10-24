-- MOYEN HILLS — low-stock alert
-- Run this AFTER notify.sql (it uses private.send_mail and the mail_shop address).
-- Dashboard → SQL Editor → New query → paste → Run. Safe to run again.
--
-- When an order takes a size down to 2 pieces or fewer, the shop inbox (mail_shop) gets an
-- email: "S: 1 left", "L: sold out". It is sent on every drop at or below 2, so the last few
-- pieces of a size each send one. Restocking, and changes an admin makes by hand, send nothing.
-- Stock is held when an order is placed, so an unpaid card order that later expires gives the
-- pieces back without another email.

create or replace function private.mail_low_stock()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  low text;
  now_stock text;
  shop text := (select value from private.secrets where name = 'mail_shop');
begin
  if shop is null or (auth.uid() is not null and public.is_admin()) then return new; end if;
  -- Sizes that went down and are now at 2 or fewer
  select string_agg(format('<li><b>%s</b>: %s</li>', private.h(n ->> 'size'),
      case when (n ->> 'stock')::int <= 0 then 'sold out' else (n ->> 'stock') || ' left' end), '' order by e.i)
    into low
    from jsonb_array_elements(new.sizes) with ordinality as e(n, i)
    join jsonb_array_elements(old.sizes) as o(s) on o.s ->> 'size' = e.n ->> 'size'
   where (e.n ->> 'stock')::int <= 2 and (e.n ->> 'stock')::int < (o.s ->> 'stock')::int;
  if low is null then return new; end if;
  select string_agg(format('%s %s', private.h(s ->> 'size'), greatest((s ->> 'stock')::int, 0)), ' · ' order by i)
    into now_stock from jsonb_array_elements(new.sizes) with ordinality as e(s, i);
  perform private.send_mail(shop, 'MOYEN HILLS',
    format('MOYEN HILLS: low stock, %s', new.name),
    format('<p><b>%s</b> is running low:</p><ul>%s</ul><p>Stock now: %s</p><p>Restock or update it on the <a href="https://moyenhillsofficial.com/admin">admin page</a>.</p>',
      private.h(new.name), low, coalesce(now_stock, '')));
  return new;
end;
$$;
revoke execute on function private.mail_low_stock() from public, anon, authenticated;

create or replace trigger products_low_stock after update of sizes on public.products
  for each row when (old.sizes is distinct from new.sizes)
  execute function private.mail_low_stock();
