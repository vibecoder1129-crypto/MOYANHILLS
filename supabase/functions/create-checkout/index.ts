// MOYEN HILLS — create-checkout
// The cart saves the order first (the database checks prices, promo code and stock and adds
// delivery), then calls this with the order's secret pay_token. This turns that saved order into
// a Stripe Checkout page and answers with its address. Amounts always come from the database,
// never from the browser.
//
// Secrets (Supabase → Edge Functions → Secrets): STRIPE_SECRET_KEY, SITE_URL
// (e.g. https://moyenhills.com), and optionally ALLOWED_ORIGINS (more site addresses, comma
// separated, e.g. a Netlify preview). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are built in.
// Deploy with "Verify JWT" OFF: guests pay too, and the pay_token is what proves the order is theirs.
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { httpClient: Stripe.createFetchHttpClient() });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const SITE = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '');
const ORIGINS = [SITE, ...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',')].map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
const PAGE_MINUTES = 30; // Stripe's shortest: the pieces stay reserved while the page is open
const MAX_AGE_MINUTES = 60; // an order older than this can't start a new payment page

const cents = (n: number | string) => Math.round(Number(n) * 100);

function headers(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : SITE,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'Content-Type': 'application/json',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const h = headers(origin);
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: h });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!SITE || !Deno.env.get('STRIPE_SECRET_KEY')) return reply(503, { error: 'Card payments are not set up yet.' });

  let token = '';
  let back = '/';
  try {
    const body = await req.json();
    token = String(body.token ?? '');
    // The page to come back to, e.g. /product.html: a plain path on our own site only
    if (/^\/[a-z0-9_\-/]*(\.html)?$/i.test(String(body.page ?? ''))) back = body.page;
  } catch { /* bad body: handled below */ }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return reply(400, { error: 'Bad request' });
  const base = origin && ORIGINS.includes(origin) ? origin : SITE;

  // Tidy up orders whose payment page never opened, so their pieces go back in stock
  await db.rpc('release_unpaid_orders').then(({ error }) => error && console.warn('release_unpaid_orders:', error.message));

  const { data: order, error } = await db.from('orders').select('*').eq('pay_token', token).maybeSingle();
  if (error) { console.error(error.message); return reply(500, { error: 'Could not load the order. Please try again.' }); }
  if (!order) return reply(404, { error: 'Order not found.' });
  if (order.payment === 'paid' || order.payment === 'pending') return reply(200, { paid: true, order: order.id });
  if (order.status !== 'received' || order.payment !== 'unpaid') {
    return reply(410, { error: 'This order has expired and its pieces went back on sale. Please order again.' });
  }

  try {
    // Already has a payment page that is still open: send the buyer back to it
    if (order.stripe_session) {
      const s = await stripe.checkout.sessions.retrieve(order.stripe_session);
      if (s.status === 'open' && s.url) return reply(200, { url: s.url, order: order.id });
      if (s.status === 'complete') return reply(200, { paid: true, order: order.id });
      return reply(410, { error: 'This order has expired and its pieces went back on sale. Please order again.' });
    }
    if (Date.now() - new Date(order.created_at).getTime() > MAX_AGE_MINUTES * 60_000) {
      return reply(410, { error: 'This order has expired and its pieces went back on sale. Please order again.' });
    }
    if (cents(order.total) < 50) return reply(422, { error: 'This order can’t be paid by card. Please email us.' });

    // The payment page in the language the customer used on the site (orders.lang)
    const lv = order.lang === 'lv';
    const lineItems = (order.items as Array<{ name: string; colour?: string; size: string; qty: number; price: number }>).map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: 'eur',
        unit_amount: cents(i.price),
        product_data: { name: `${i.name}${i.colour ? ` (${i.colour})` : ''}, ${lv ? 'izmērs' : 'size'} ${i.size}` },
      },
    }));
    // The promo code discount, already worked out by the database, as a one-off Stripe coupon
    const discounts = Number(order.discount) > 0
      ? [{
        coupon: (await stripe.coupons.create({
          amount_off: cents(order.discount), currency: 'eur', duration: 'once', max_redemptions: 1,
          name: order.promo_code ? `Code ${order.promo_code}`.slice(0, 40) : 'Discount',
        }, { idempotencyKey: `mh-coupon-${order.id}` })).id,
      }]
      : undefined;
    let label = lv ? 'Piegāde' : 'Delivery';
    const { data: rate } = await db.from('shipping_rates').select('label')
      .in('country', [String(order.country ?? '').trim().toLowerCase(), '*']).order('country', { ascending: false }).limit(1).maybeSingle();
    if (rate?.label) label = rate.label;

    // Retries within the same minute get the same page back instead of a second one
    const minute = Math.floor(Date.now() / 60_000);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      discounts,
      shipping_options: [{
        shipping_rate_data: { type: 'fixed_amount', display_name: label, fixed_amount: { amount: cents(order.shipping ?? 0), currency: 'eur' } },
      }],
      customer_email: order.email ?? undefined,
      client_reference_id: String(order.id),
      metadata: { order_id: String(order.id) },
      payment_intent_data: { description: `MOYEN HILLS order #${order.id}`, metadata: { order_id: String(order.id) } },
      submit_type: 'pay',
      locale: lv ? 'lv' : 'auto',
      expires_at: (minute + 2 + PAGE_MINUTES) * 60, // 31–32 minutes from now
      success_url: `${base}${back}?payment=done&order=${order.id}`,
      cancel_url: `${base}${back}?payment=cancelled&token=${token}`,
    }, { idempotencyKey: `mh-checkout-${order.id}-${minute}` });

    // The total Stripe will charge must be the one the database worked out
    if (session.amount_total !== cents(order.total)) {
      console.error(`Order ${order.id}: Stripe total ${session.amount_total} ≠ order total ${cents(order.total)}`);
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      return reply(500, { error: 'Something went wrong with the price. Please email us.' });
    }
    await db.from('orders').update({ stripe_session: session.id }).eq('id', order.id).is('stripe_session', null);
    return reply(200, { url: session.url, order: order.id });
  } catch (err) {
    console.error(`Order ${order.id}:`, (err as Error).message);
    return reply(502, { error: 'The payment page could not be opened. Please try again in a moment.' });
  }
});
