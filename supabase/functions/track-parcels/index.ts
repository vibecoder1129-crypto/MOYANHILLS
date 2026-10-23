// MOYEN HILLS — track-parcels
// Every few hours the database (pg_cron, see supabase/live-tracking.sql) calls this. For every
// shipped order that isn't delivered yet it asks 17TRACK for the parcel's latest status and saves
// it on the order (track_status, track_event), so the account page and the admin page can show
// it. When 17TRACK says "Delivered", the order is marked delivered.
//
// Secret (Supabase → Edge Functions → Secrets): TRACK17_KEY, the 17TRACK API access key.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are built in.
// Deploy with "Verify JWT" OFF: the caller proves itself with the x-cron-key header, checked
// against private.secrets 'track_cron_key' through public.track_cron_ok().
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const KEY = Deno.env.get('TRACK17_KEY') ?? '';
const API = 'https://api.17track.net/track/v2.2';
const BATCH = 40; // 17TRACK takes up to 40 numbers per call
const MAX_AGE_DAYS = 60; // stop asking about parcels shipped longer ago than this

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function call(path: string, body: unknown) {
  const r = await fetch(`${API}/${path}`, { method: 'POST', headers: { '17token': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.code !== 0) throw new Error(`17TRACK ${path}: ${r.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data.data;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const { data: allowed } = await db.rpc('track_cron_ok', { p_key: req.headers.get('x-cron-key') ?? '' });
  if (allowed !== true) return json(401, { error: 'Not allowed' });
  if (!KEY) return json(503, { error: 'TRACK17_KEY is not set' });
  const body = await req.json().catch(() => ({}));

  try {
    // Just check that the key works and how many parcels are left this month
    if (body.check) return json(200, { ok: true, quota: await call('getquota', {}) });

    const since = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString();
    const { data: orders, error } = await db.from('orders')
      .select('id, tracking_number, track_status')
      .eq('status', 'shipped').not('tracking_number', 'is', null).gte('shipped_at', since)
      .order('shipped_at', { ascending: true }).limit(200);
    if (error) throw error;
    let updated = 0, delivered = 0;
    for (let i = 0; i < orders.length; i += BATCH) {
      const batch = orders.slice(i, i + BATCH);
      const numbers = [...new Set(batch.map((o) => o.tracking_number))].map((number) => ({ number }));
      // Registering twice is harmless (17TRACK says "already registered"); the carrier is detected from the number
      await call('register', numbers).catch((e) => console.warn(e.message));
      const info = await call('gettrackinfo', numbers);
      for (const t of info?.accepted ?? []) {
        const status: string | undefined = t.track_info?.latest_status?.status;
        const ev = t.track_info?.latest_event;
        if (!status || status === 'NotFound') continue;
        const event = ev ? { time: ev.time_iso ?? ev.time_utc ?? null, text: ev.description ?? '', place: ev.location ?? '' } : null;
        for (const o of batch.filter((x) => x.tracking_number === t.number)) {
          const row: Record<string, unknown> = { track_status: status, track_event: event, track_checked_at: new Date().toISOString() };
          if (status === 'Delivered') { row.status = 'delivered'; delivered++; }
          const { error: e } = await db.from('orders').update(row).eq('id', o.id);
          if (e) console.warn(`order ${o.id}: ${e.message}`); else updated++;
        }
      }
    }
    return json(200, { ok: true, checked: orders.length, updated, delivered });
  } catch (e) {
    console.error(e);
    return json(500, { error: String((e as Error).message ?? e) });
  }
});
