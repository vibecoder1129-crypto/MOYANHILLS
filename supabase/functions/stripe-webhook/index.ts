// MOYEN HILLS — stripe-webhook
// Stripe calls this when a payment page is paid, fails or runs out. It marks the order paid,
// or cancels it (which puts the pieces back in stock).
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…, from the webhook you add in Stripe).
// Deploy with "Verify JWT" OFF: Stripe can't sign in, it proves itself with the signature instead.
// In Stripe → Developers → Webhooks, send these events to this function's address:
//   checkout.session.completed, checkout.session.async_payment_succeeded,
//   checkout.session.async_payment_failed, checkout.session.expired
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { httpClient: Stripe.createFetchHttpClient() });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const crypto = Stripe.createSubtleCryptoProvider();

const cents = (n: number | string) => Math.round(Number(n) * 100);
const paymentId = (s: Stripe.Checkout.Session) => (typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id) ?? null;

async function markPaid(order: Record<string, any>, s: Stripe.Checkout.Session) {
  if (order.payment === 'paid') return; // Stripe can send an event twice
  const note = s.amount_total !== cents(order.total)
    ? `Paid ${(s.amount_total ?? 0) / 100} EUR but the order total is ${order.total} EUR: check in Stripe.`
    : order.status === 'cancelled'
      ? 'Paid after the order was cancelled: refund it in Stripe, the pieces are back on sale.'
      : null;
  if (note) console.error(`Order ${order.id}: ${note}`);
  const { error } = await db.from('orders').update({
    payment: 'paid',
    paid_at: new Date().toISOString(),
    stripe_payment: paymentId(s),
    // A cancelled order stays cancelled (its stock is already back); everything else becomes paid
    ...(order.status === 'received' ? { status: 'paid' } : {}),
    ...(note ? { note: `${order.note ? `${order.note}\n` : ''}[Payment] ${note}`.slice(0, 2000) } : {}),
  }).eq('id', order.id);
  if (error) throw error;
}

async function markUnpaid(order: Record<string, any>, s: Stripe.Checkout.Session, payment: 'failed' | 'expired') {
  // Only the order's current payment page counts, and never undo a payment
  if (order.payment === 'paid' || order.stripe_session !== s.id) return;
  const { error } = await db.from('orders').update({
    payment,
    ...(order.status === 'received' ? { status: 'cancelled' } : {}),
  }).eq('id', order.id);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, req.headers.get('Stripe-Signature') ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '', undefined, crypto);
  } catch (err) {
    console.warn('Bad signature:', (err as Error).message);
    return new Response('Bad signature', { status: 400 });
  }

  if (!event.type.startsWith('checkout.session.')) return new Response('ignored');
  const s = event.data.object as Stripe.Checkout.Session;
  const id = Number(s.metadata?.order_id ?? s.client_reference_id);
  if (!id) return new Response('not ours'); // a payment made some other way
  const { data: order, error } = await db.from('orders').select('*').eq('id', id).maybeSingle();
  if (error) return new Response('db error', { status: 500 }); // Stripe tries again later
  if (!order) { console.warn(`Order ${id} not found for ${s.id}`); return new Response('no order'); }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        if (s.payment_status === 'paid' || s.payment_status === 'no_payment_required') await markPaid(order, s);
        else if (order.payment === 'unpaid') {
          // A bank payment that takes a few days: keep the pieces until Stripe says yes or no
          await db.from('orders').update({ payment: 'pending', stripe_payment: paymentId(s) }).eq('id', id);
        }
        break;
      case 'checkout.session.async_payment_succeeded':
        await markPaid(order, s);
        break;
      case 'checkout.session.async_payment_failed':
        await markUnpaid(order, s, 'failed');
        break;
      case 'checkout.session.expired':
        await markUnpaid(order, s, 'expired');
        break;
    }
  } catch (err) {
    console.error(`Order ${id}, ${event.type}:`, (err as Error).message);
    return new Response('error', { status: 500 });
  }
  return new Response('ok');
});
