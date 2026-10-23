/* MOYEN HILLS — where the shop data comes from
 * Products and promo codes come from Supabase when config.js has its keys
 * (managed on admin.html), otherwise from catalog.js. Also creates the one
 * Supabase client that the cart, accounts and admin page share.
 */
(() => {
  const cfg = window.MH_CONFIG || {};
  const sb = cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;
  const catalog = window.MH_CATALOG || { settings: {}, products: [], promoCodes: [] };
  // Preview mode: changes made on admin.html before the database is connected,
  // kept in this browser only
  let draft = null;
  if (!sb) { try { draft = JSON.parse(localStorage.getItem('mh-catalog-draft')); } catch { /* none */ } }
  const local = draft ? { ...catalog, products: draft.products || [], promoCodes: draft.promoCodes || [] } : catalog;
  if (draft) console.info('Showing changes from the admin preview (this browser only).');

  // Database row → the same shape as a product in catalog.js
  const fromRow = (r) => ({
    id: r.id,
    name: r.name,
    colour: r.colour || '',
    price: Number(r.price),
    wasPrice: r.was_price == null ? null : Number(r.was_price),
    active: r.active,
    featured: r.featured,
    soldOut: r.sold_out,
    label: r.label || '',
    blurb: r.blurb || '',
    description: r.description || '',
    details: r.details || [],
    fit: r.fit || '',
    note: r.note || '',
    badge: r.badge || '',
    sizes: r.sizes || [],
    images: r.images || [],
    lv: r.lv || {},
  });

  // Latvian visitors see a product's Latvian text (catalog.js `lv`, or the admin page) where it has one
  const TEXTS = ['colour', 'label', 'blurb', 'description', 'fit', 'note', 'badge'];
  const inLanguage = (p) => {
    if (document.documentElement.lang !== 'lv' || !p.lv) return p;
    const out = { ...p };
    TEXTS.forEach((k) => { if (p.lv[k]) out[k] = p.lv[k]; });
    if (Array.isArray(p.lv.details) && p.lv.details.length) out.details = p.lv.details;
    return out;
  };

  async function loadProducts() {
    if (sb) {
      try {
        const { data, error } = await sb.from('products').select('*').eq('active', true)
          .order('sort', { ascending: true }).order('created_at', { ascending: true });
        if (error) throw error;
        if (data.length) return { products: data.map(fromRow).map(inLanguage), source: 'database' };
      } catch (err) {
        console.warn('Products not loaded from the database, using catalog.js:', err.message);
      }
    }
    return { products: local.products.filter((p) => p.active !== false).map(inLanguage), source: 'catalog' };
  }

  const normalise = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');

  // SHA-256 fingerprint of a code, for promo codes kept in catalog.js
  async function promoHash(code) {
    const bytes = new TextEncoder().encode(normalise(code));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const round2 = (n) => Math.round(n * 100) / 100;

  /* Check a promo code against a subtotal.
   * Resolves { ok: true, code, discount, label } or { ok: false, message }. */
  async function checkPromo(code, subtotal) {
    const c = normalise(code);
    if (!c) return { ok: false, message: 'Enter a promo code.' };
    if (sb) {
      const { data, error } = await sb.rpc('check_promo', { p_code: c, p_subtotal: subtotal });
      if (!error) return data;
      console.warn('Promo check failed, trying catalog.js:', error.message);
    }
    const hash = await promoHash(c);
    const p = (local.promoCodes || []).find((x) => (x.hash === hash || normalise(x.code) === c) && x.active !== false);
    if (!p) return { ok: false, message: 'That code is not valid.' };
    if (p.expires && new Date(`${p.expires}T23:59:59`) < new Date()) return { ok: false, message: 'That code has expired.' };
    if (p.minSubtotal && subtotal < p.minSubtotal) return { ok: false, message: `That code needs an order of at least €${p.minSubtotal}.` };
    const discount = p.percent ? round2(subtotal * p.percent / 100) : Math.min(Number(p.amount) || 0, subtotal);
    return { ok: true, code: c, discount, label: p.percent ? `${p.percent}% off` : `€${p.amount} off` };
  }

  window.mhPromoHash = promoHash;
  window.mhData = {
    supabase: sb,
    settings: local.settings,
    catalog: loadProducts(),
    checkPromo,
    normalise,
  };
})();
