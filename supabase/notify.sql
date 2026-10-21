-- MOYEN HILLS — order and cancellation emails, sent by the database through Brevo
-- Run this AFTER schema.sql and privacy.sql (and again whenever you run those), then payments.sql:
--   Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again.
--
-- Why here and not in the browser: the browser only saves the order and the
-- database emails it, so ad blockers and network filters can't stop the email.
--
-- What it sends (from the Brevo sender below, which must be verified in Brevo):
--   new order        → the shop (order details, reply goes to the customer)
--                    → the customer (a copy of their order request)
--   new cancellation → the shop, and a dated confirmation to the customer
-- The shop's emails are in English; the customer's are in the language they used on the
-- site (orders.lang / withdrawals.lang: 'en' or 'lv').
--
-- ONE-TIME SETUP (the key never goes in this file or in the code):
--   1. Brevo → your name (top right) → SMTP & API → API keys → Generate a new API key.
--   2. Here in the SQL Editor, run this one line with your key, then delete it from the editor:
--        select vault.create_secret('xkeysib-…your key…', 'brevo_api_key');
--      To replace it later: select vault.update_secret((select id from vault.secrets where name = 'brevo_api_key'), 'new key');
--   3. Check the emails below and change them here if needed.
-- Emails are sent a few seconds after the order. If something fails, the order is
-- still saved (admin page → Orders) and the reason is in net._http_response.

create extension if not exists pg_net;

-- Who sends and who receives (change the values and run again)
insert into private.secrets (name, value) values
  ('mail_from', 'ordersmoyenhills@gmail.com'),     -- the verified Brevo sender
  ('mail_from_name', 'MOYEN HILLS'),
  ('mail_shop', 'ordersmoyenhills@gmail.com'),     -- where new orders and cancellations go
  ('mail_reply', 'moyenhills@gmail.com')           -- where customers' replies go
on conflict (name) do nothing;

-- Text made safe to put inside an email's HTML
create or replace function private.h(t text)
returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

create or replace function private.eur(n numeric)
returns text language sql immutable as $$
  select '€' || trim(trailing '.' from trim(trailing '0' from to_char(coalesce(n, 0), 'FM999999990.00')));
$$;

-- Send one email through Brevo. Never fails the order: without a key it just skips.
create or replace function private.send_mail(p_to text, p_to_name text, p_subject text, p_html text, p_reply text default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  k text;
  cfg jsonb;
begin
  begin
    select decrypted_secret into k from vault.decrypted_secrets where name = 'brevo_api_key' limit 1;
  exception when others then k := null;
  end;
  if k is null or coalesce(p_to, '') = '' then
    raise warning 'Email "%" not sent: no Brevo key in Vault yet (see supabase/notify.sql).', p_subject;
    return;
  end if;
  select jsonb_object_agg(name, value) into cfg from private.secrets where name like 'mail\_%';
  perform net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', k, 'content-type', 'application/json', 'accept', 'application/json'),
    body := jsonb_build_object(
      'sender', jsonb_build_object('email', cfg ->> 'mail_from', 'name', cfg ->> 'mail_from_name'),
      'to', jsonb_build_array(jsonb_build_object('email', p_to, 'name', left(coalesce(nullif(p_to_name, ''), p_to), 70))),
      'replyTo', jsonb_build_object('email', coalesce(p_reply, cfg ->> 'mail_reply')),
      'subject', left(p_subject, 200),
      'htmlContent', p_html)
  );
exception when others then
  raise warning 'Email "%" not sent: %', p_subject, sqlerrm;
end;
$$;

-- New order → shop (in English) + customer (in the language they used on the site)
create or replace function private.mail_new_order()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  rows_en text;
  rows_lv text;
  sums_en text;
  sums_lv text;
  who_en text;
  who_lv text;
  shop text := (select value from private.secrets where name = 'mail_shop');
  -- Card orders (supabase/payments.sql) are mailed once paid. Read through to_jsonb so this
  -- still works before payments.sql has added the columns.
  paid boolean := to_jsonb(new) ->> 'payment' = 'paid';
  delivery numeric := coalesce((to_jsonb(new) ->> 'shipping')::numeric, 0);
  lv boolean := to_jsonb(new) ->> 'lang' = 'lv';
  hi text := private.h(split_part(new.full_name, ' ', 1));
begin
  -- The items, in English and in Latvian (Latvian colour from the product, if it has one)
  select string_agg(format('<tr><td>%s × %s%s</td><td>Size %s</td><td align="right">%s</td></tr>',
      private.h(i ->> 'qty'), private.h(i ->> 'name'),
      case when coalesce(i ->> 'colour', '') <> '' then ' (' || private.h(i ->> 'colour') || ')' else '' end,
      private.h(i ->> 'size'), private.eur((i ->> 'qty')::numeric * (i ->> 'price')::numeric)), ''),
    string_agg(format('<tr><td>%s × %s%s</td><td>Izmērs %s</td><td align="right">%s</td></tr>',
      private.h(i ->> 'qty'), private.h(i ->> 'name'),
      case when coalesce(nullif(p.lv ->> 'colour', ''), i ->> 'colour', '') <> '' then ' (' || private.h(coalesce(nullif(p.lv ->> 'colour', ''), i ->> 'colour')) || ')' else '' end,
      private.h(i ->> 'size'), private.eur((i ->> 'qty')::numeric * (i ->> 'price')::numeric)), '')
    into rows_en, rows_lv
    from jsonb_array_elements(new.items) i left join public.products p on p.id = i ->> 'id';
  sums_en := format('<tr><td colspan="2">Subtotal</td><td align="right">%s</td></tr>', private.eur(new.subtotal))
    || case when coalesce(new.discount, 0) > 0
         then format('<tr><td colspan="2">Promo code %s</td><td align="right">−%s</td></tr>', private.h(new.promo_code), private.eur(new.discount)) else '' end
    || case when delivery > 0
         then format('<tr><td colspan="2">Delivery</td><td align="right">%s</td></tr>', private.eur(delivery)) else '' end
    || format('<tr><td colspan="2"><b>Total</b></td><td align="right"><b>%s</b></td></tr>', private.eur(coalesce(new.total, new.subtotal)));
  sums_lv := format('<tr><td colspan="2">Starpsumma</td><td align="right">%s</td></tr>', private.eur(new.subtotal))
    || case when coalesce(new.discount, 0) > 0
         then format('<tr><td colspan="2">Atlaides kods %s</td><td align="right">−%s</td></tr>', private.h(new.promo_code), private.eur(new.discount)) else '' end
    || case when delivery > 0
         then format('<tr><td colspan="2">Piegāde</td><td align="right">%s</td></tr>', private.eur(delivery)) else '' end
    || format('<tr><td colspan="2"><b>Kopā</b></td><td align="right"><b>%s</b></td></tr>', private.eur(coalesce(new.total, new.subtotal)));
  who_en := format('<p>%s<br>%s<br>%s<br>%s %s, %s</p>',
    private.h(new.full_name), private.h(new.email) || coalesce(' · ' || nullif(private.h(new.phone), ''), ''),
    private.h(new.address), private.h(new.postcode), private.h(new.city), private.h(new.country));
  who_lv := who_en || case when coalesce(new.note, '') <> '' then '<p>Piezīme: ' || private.h(new.note) || '</p>' else '' end;
  who_en := who_en || case when coalesce(new.note, '') <> '' then '<p>Note: ' || private.h(new.note) || '</p>' else '' end;

  perform private.send_mail(shop, 'MOYEN HILLS orders',
    format('New %sorder #%s: %s, %s', case when paid then 'paid ' else '' end, new.id, private.eur(coalesce(new.total, new.subtotal)), left(new.full_name, 60)),
    format('<h2>New order #%s</h2>%s%s<table cellpadding="6" style="border-collapse:collapse">%s%s</table><h3>Customer</h3>%s<p>Manage it on the admin page → Orders.</p>',
      new.id, case when paid then '<p><b>Paid by card (Stripe). Ready to ship.</b></p>' else '' end,
      case when lv then '<p>The customer ordered in <b>Latvian</b>: reply in Latvian.</p>' else '' end,
      rows_en, sums_en, who_en),
    new.email);

  if lv then
    perform private.send_mail(new.email, new.full_name,
      format('MOYEN HILLS: %s #%s', case when paid then 'paldies par pasūtījumu' else 'esam saņēmuši tavu pasūtījumu' end, new.id),
      format('<p>Sveiki, %s!</p><p>Paldies! %s</p><table cellpadding="6" style="border-collapse:collapse">%s%s</table><h3>Piegādes adrese</h3>%s<p>Pārdomāji? Pasūtījumu vari atcelt 14 dienu laikā pēc tā saņemšanas: <a href="https://moyenhills.com/withdraw.html?order=%s&amp;lang=lv">moyenhills.com/withdraw.html</a>.</p><p>MOYEN HILLS</p>',
        hi,
        case when paid
          then format('Tavs pasūtījums <b>#%s</b> ir apmaksāts un apstiprināts. Šis e-pasts ir tavs apstiprinājums; maksājuma čeku Stripe atsūtīs atsevišķi. Kad pasūtījums būs nosūtīts, tev atkal uzrakstīsim.', new.id)
          else format('Esam saņēmuši tavu pasūtījuma pieprasījumu <b>#%s</b>. Drīzumā tev rakstīsim, lai to apstiprinātu, un atsūtīsim apmaksas un piegādes informāciju.', new.id) end,
        rows_lv, sums_lv, who_lv, new.id));
  else
    perform private.send_mail(new.email, new.full_name,
      format('MOYEN HILLS: %s #%s', case when paid then 'thank you for your order' else 'we received your order' end, new.id),
      format('<p>Hi %s,</p><p>Thank you! %s</p><table cellpadding="6" style="border-collapse:collapse">%s%s</table><h3>Delivery to</h3>%s<p>Changed your mind? You can cancel within 14 days of receiving your order: <a href="https://moyenhills.com/withdraw.html?order=%s&amp;lang=en">moyenhills.com/withdraw.html</a>.</p><p>MOYEN HILLS</p>',
        hi,
        case when paid
          then format('Your order <b>#%s</b> is paid and confirmed. This email is your confirmation; Stripe sends the payment receipt separately. We’ll email you again when it ships.', new.id)
          else format('We received your order request <b>#%s</b>. We’ll email you shortly to confirm it, with payment and delivery details.', new.id) end,
        rows_en, sums_en, who_en, new.id));
  end if;
  return new;
end;
$$;
drop trigger if exists orders_mail on public.orders;
create trigger orders_mail after insert on public.orders for each row execute function private.mail_new_order();

-- New cancellation → shop (in English) + a dated confirmation to the customer in their language
-- (EU: on a durable medium)
create or replace function private.mail_new_withdrawal()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  shop text := (select value from private.secrets where name = 'mail_shop');
  lv boolean := to_jsonb(new) ->> 'lang' = 'lv';
  stamp text := to_char(new.created_at at time zone 'Europe/Riga', 'FMDD FMMonth YYYY, HH24:MI');
  stamp_lv text := to_char(new.created_at at time zone 'Europe/Riga', 'DD.MM.YYYY, HH24:MI');
  whole boolean := coalesce(nullif(new.items, ''), 'The whole order') = 'The whole order';
  body text;
  body_lv text;
begin
  body := format('<p>I hereby give notice that I withdraw from my contract for the sale of the following goods: %s.</p><p>Order number: %s<br>Ordered / received on: %s<br>Name: %s<br>Email: %s<br>Sent on: %s (Riga time)</p>',
    private.h(coalesce(nullif(new.items, ''), 'The whole order')), private.h(coalesce(new.order_ref, 'not given')),
    coalesce(to_char(new.order_date, 'FMDD FMMonth YYYY'), 'not given'), private.h(new.full_name), private.h(new.email), stamp);
  body_lv := format('<p>Ar šo paziņoju, ka atkāpjos no līguma par šādu preču pirkumu: %s.</p><p>Pasūtījuma numurs: %s<br>Pasūtīts / saņemts: %s<br>Vārds: %s<br>E-pasts: %s<br>Nosūtīts: %s (Rīgas laiks)</p>',
    case when whole then 'viss pasūtījums' else private.h(new.items) end, private.h(coalesce(new.order_ref, 'nav norādīts')),
    coalesce(to_char(new.order_date, 'DD.MM.YYYY'), 'nav norādīts'), private.h(new.full_name), private.h(new.email), stamp_lv);
  perform private.send_mail(shop, 'MOYEN HILLS orders',
    format('Cancellation: order %s from %s', coalesce(new.order_ref, '(no number)'), left(new.full_name, 60)),
    '<h2>Order cancelled (withdrawal)</h2>'
      || case when lv then '<p>Sent in <b>Latvian</b> (the customer got a Latvian confirmation, below):</p>' || body_lv else body end
      || '<p>See the admin page → Cancellations. The items should come back within 14 days; refund within 14 days of receiving them.</p>',
    new.email);
  if lv then
    perform private.send_mail(new.email, new.full_name,
      'MOYEN HILLS: esam saņēmuši tavu atteikumu',
      format('<p>Sveiki, %s!</p><p>Tavu atkāpšanos no līguma saņēmām %s. Šis e-pasts ir tavs apstiprinājums.</p>%s<p>Lūdzu, nosūti preces atpakaļ 14 dienu laikā. Naudu atmaksāsim 14 dienu laikā pēc preču saņemšanas, ar to pašu maksāšanas līdzekli.</p><p>MOYEN HILLS</p>',
        private.h(split_part(new.full_name, ' ', 1)), stamp_lv, body_lv));
  else
    perform private.send_mail(new.email, new.full_name,
      'MOYEN HILLS: we received your cancellation',
      format('<p>Hi %s,</p><p>We received your withdrawal on %s. This email is your confirmation.</p>%s<p>Please send the items back within 14 days. We refund you within 14 days of receiving them, to the same payment method.</p><p>MOYEN HILLS</p>',
        private.h(split_part(new.full_name, ' ', 1)), stamp, body));
  end if;
  return new;
end;
$$;
drop trigger if exists withdrawals_mail on public.withdrawals;
create trigger withdrawals_mail after insert on public.withdrawals for each row execute function private.mail_new_withdrawal();

revoke all on all functions in schema private from public, anon, authenticated;
