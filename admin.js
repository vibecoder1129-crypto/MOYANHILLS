/* MOYEN HILLS — admin page
 * Manage products, prices, stock, photos, promo codes and orders.
 * With Supabase connected, everything is saved in the database, and the
 * database itself checks that the signed-in person is on the admins list
 * (see supabase/schema.sql). Without it, the page runs in preview mode:
 * changes are kept in this browser and can be downloaded as a new catalog.js.
 */
(() => {
  const sb = window.mhData?.supabase || null;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n) => '€' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
  const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const say = (el, text, bad = false) => { if (!el) return; el.textContent = text || ''; el.classList.toggle('is-bad', !!bad); };

  const views = $$('[data-view]');
  const show = (name) => views.forEach((v) => { v.hidden = v.dataset.view !== name; });

  console.log('%cMOYEN HILLS%c designed & built by Archit Gajjar', 'font-weight:700', 'font-weight:400');

  let products = [];
  let promos = [];

  /* ---------- Where changes are saved ---------- */
  const remote = sb && {
    products: () => sb.from('products').select('*').order('sort').order('created_at'),
    async saveProduct(row, id, since) {
      // An edit only saves over the version that was opened, so stock taken by an
      // order in the meantime isn't put back by an old copy of the sizes
      const r = id
        ? await sb.from('products').update(row).eq('id', id).eq('updated_at', since).select('id')
        : await sb.from('products').insert(row);
      if (r.error) return r;
      if (id && !r.data?.length) {
        return { error: { message: 'This product changed while you had it open (an order may have come in). Close it, open it again and redo your change.' } };
      }
      // Only one product is on the home page at a time
      if (row.featured) return sb.from('products').update({ featured: false }).neq('id', row.id).eq('featured', true);
      return r;
    },
    deleteProduct: (id) => sb.from('products').delete().eq('id', id),
    promos: () => sb.from('promo_codes').select('*').order('created_at', { ascending: false }),
    savePromo: (row, code) => (code ? sb.from('promo_codes').update(row).eq('code', code) : sb.from('promo_codes').insert(row)),
    deletePromo: (code) => sb.from('promo_codes').delete().eq('code', code),
    async upload(photo, path) {
      const { error } = await sb.storage.from('products').upload(path, photo.blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      return { src: sb.storage.from('products').getPublicUrl(path).data.publicUrl };
    },
    orders: () => sb.from('orders').select('*').order('created_at', { ascending: false }).limit(1000),
    setStatus: (id, status) => sb.from('orders').update({ status }).eq('id', id),
    setTracking: (id, row) => sb.from('orders').update(row).eq('id', id),
  };

  /* Preview mode: a draft of catalog.js kept in this browser (data.js shows it in the shop) */
  const DRAFT = 'mh-catalog-draft';
  const base = window.MH_CATALOG || { settings: {}, products: [], promoCodes: [] };
  const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT)); } catch { return null; } };
  let draft = readDraft() || { products: structuredClone(base.products), promoCodes: structuredClone(base.promoCodes || []) };
  const writeDraft = () => {
    try { localStorage.setItem(DRAFT, JSON.stringify(draft)); return { error: null }; }
    catch { return { error: { message: 'This browser is out of space for the preview. Download catalog.js, or use smaller photos.' } }; }
  };
  const toRow = (p, i) => ({
    id: p.id, name: p.name, colour: p.colour || null, price: p.price, was_price: p.wasPrice ?? null,
    active: p.active !== false, featured: !!p.featured, sold_out: !!p.soldOut, sort: p.sort ?? i * 10,
    label: p.label, blurb: p.blurb, description: p.description, details: p.details || [], fit: p.fit, note: p.note, badge: p.badge || null,
    sizes: p.sizes || [], images: p.images || [], lv: p.lv || {},
  });
  const fromRow = (r) => ({
    id: r.id, name: r.name, colour: r.colour || '', price: r.price, wasPrice: r.was_price ?? null,
    active: r.active, featured: r.featured, soldOut: r.sold_out, sort: r.sort,
    label: r.label || '', blurb: r.blurb || '', description: r.description || '', details: r.details,
    fit: r.fit || '', note: r.note || '', badge: r.badge || '', sizes: r.sizes, images: r.images,
    ...(Object.keys(r.lv || {}).length ? { lv: r.lv } : {}),
  });
  const promoToRow = (c) => ({
    _key: c.code || c.hash, code: c.code || null, hash: c.hash, percent: c.percent ?? null, amount: c.amount ?? null,
    min_subtotal: c.minSubtotal || 0, max_uses: c.maxUses ?? null, uses: 0,
    expires_at: c.expires ? new Date(`${c.expires}T23:59:59`).toISOString() : null, active: c.active !== false, note: c.note || null,
  });
  const promoFromRow = (r, old) => ({
    ...(r.code ? { code: r.code } : { hash: old?.hash }),
    ...(r.percent != null ? { percent: r.percent } : { amount: r.amount }),
    ...(r.min_subtotal ? { minSubtotal: r.min_subtotal } : {}),
    ...(r.max_uses != null ? { maxUses: r.max_uses } : {}),
    ...(r.expires_at ? { expires: r.expires_at.slice(0, 10) } : {}),
    active: r.active,
    ...(r.note ? { note: r.note } : {}),
  });
  const ok = (data = null) => Promise.resolve({ data, error: null });
  const local = {
    products: () => ok(draft.products.map(toRow).sort((a, b) => a.sort - b.sort)),
    saveProduct(row, id) {
      const p = fromRow(row);
      if (p.featured) draft.products.forEach((x) => { if (x.id !== p.id) x.featured = false; });
      const i = draft.products.findIndex((x) => x.id === (id || p.id));
      if (i >= 0) draft.products[i] = p; else draft.products.push(p);
      draft.products.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      return Promise.resolve(writeDraft());
    },
    deleteProduct(id) { draft.products = draft.products.filter((x) => x.id !== id); return Promise.resolve(writeDraft()); },
    promos: () => ok(draft.promoCodes.map(promoToRow)),
    savePromo(row, key) {
      const i = draft.promoCodes.findIndex((c) => (c.code || c.hash) === key);
      const c = promoFromRow(row, draft.promoCodes[i]);
      if (i >= 0) draft.promoCodes[i] = c; else draft.promoCodes.unshift(c);
      return Promise.resolve(writeDraft());
    },
    deletePromo(key) { draft.promoCodes = draft.promoCodes.filter((c) => (c.code || c.hash) !== key); return Promise.resolve(writeDraft()); },
    // Shown from the browser for now; downloaded as a file with catalog.js
    upload: async (photo, path) => ({ src: photo.dataUrl, file: `images/${path.replace(/\//g, '-')}` }),
    orders: () => ok([]),
    setStatus: () => ok(),
    setTracking: () => ok(),
  };
  const api = remote || local;

  /* ---------- Sign in ---------- */
  const who = $('[data-who]');
  const signOut = $('[data-signout]');

  let role = 'owner';   // 'owner' or 'editor'; preview mode acts as owner
  let myEmail = '';
  let shownFor = '';    // whose admin is on screen

  async function route() {
    if (!sb) {
      show('app');
      $('[data-preview]').hidden = false;
      $('[data-tab="log"]').hidden = true;
      $('[data-tab="admins"]').hidden = true;
      loadStats(); loadProducts(); loadPromos(); loadOrders(); loadWithdrawals();
      return;
    }
    shownFor = '';
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { who.textContent = ''; signOut.hidden = true; show('signin'); return; }
    myEmail = session.user.email;
    who.textContent = myEmail;
    signOut.hidden = false;
    const { data: st, error } = await sb.rpc('admin_status');
    if (error || !st || !st.listed || !st.confirmed) { show('denied'); return; }
    if (!st.aal2) { startMfa(); return; }
    role = st.role;
    who.textContent = `${myEmail} · ${role === 'owner' ? 'Owner' : 'Editor'}`;
    $$('[data-owner-only]').forEach((el) => { el.hidden = role !== 'owner'; });
    $$('[data-editor-only]').forEach((el) => { el.hidden = role === 'owner'; });
    show('app');
    shownFor = myEmail;
    loadStats(); loadProducts(); loadPromos(); loadOrders(); loadWithdrawals(); loadLog(); loadAdmins();
  }

  /* ---------- Two-step code (authenticator app) ---------- */
  const mfaForm = $('[data-mfa-form]');
  const mfaMsg = $('[data-mfa-msg]');
  let factorId = null;

  // Sign-in fires more than one auth event, so this can be asked to start twice at once
  let mfaStarting = null;
  function startMfa() {
    // Already showing a code to scan or type: keep it (the browser also fires
    // "signed in" when you come back to the tab, which must not make a new QR code)
    if (factorId && !$('[data-view="mfa"]').hidden) return Promise.resolve();
    mfaStarting ||= runMfa().finally(() => { mfaStarting = null; });
    return mfaStarting;
  }
  async function runMfa() {
    show('mfa');
    say(mfaMsg, '');
    mfaForm.reset();
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) { say(mfaMsg, error.message, true); return; }
    const ready = data.totp.find((f) => f.status === 'verified');
    $('[data-mfa-setup]').hidden = !!ready;
    $('[data-mfa-ask]').hidden = !ready;
    $('[data-mfa-title]').textContent = ready ? 'Enter your code' : 'Set up the two-step code';
    if (ready) { factorId = ready.id; mfaForm.code.focus(); return; }
    // Clear any half-finished setup, then start a new one
    for (const f of data.all.filter((x) => x.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: f.id });
    const en = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `MOYEN HILLS admin ${new Date().toISOString().slice(0, 19)}`, issuer: 'MOYEN HILLS' });
    if (en.error) { say(mfaMsg, en.error.message, true); return; }
    factorId = en.data.id;
    $('[data-mfa-qr]').src = en.data.totp.qr_code;
    $('[data-mfa-secret]').textContent = en.data.totp.secret;
    mfaForm.code.focus();
  }

  if (sb) mfaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = mfaForm.code.value.replace(/\D/g, '');
    if (code.length !== 6 || !factorId) { say(mfaMsg, 'Type the 6-digit code from the app.', true); return; }
    say(mfaMsg, 'Checking…');
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) { say(mfaMsg, 'That code didn’t work. Codes change every 30 seconds; try the newest one.', true); mfaForm.code.select(); return; }
    say(mfaMsg, '');
    factorId = null;
    route();
  });

  /* Sign out after 30 minutes without using the page */
  if (sb) {
    let idle;
    const nudge = () => {
      clearTimeout(idle);
      idle = setTimeout(async () => {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;
        await sb.auth.signOut();
        say($('[data-signin-msg]'), 'You were signed out after 30 minutes without activity.');
      }, 30 * 60 * 1000);
    };
    ['pointerdown', 'keydown', 'scroll'].forEach((ev) => addEventListener(ev, nudge, { passive: true }));
    nudge();
  }

  if (sb) $('[data-signin]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const msg = $('[data-signin-msg]');
    say(msg, 'Signing in…');
    const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    if (error) { say(msg, error.message, true); return; }
    say(msg, '');
    route();
  });
  $('[data-google]').hidden = !window.MH_CONFIG?.providers?.google;
  if (sb) $('[data-google]').addEventListener('click', async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } });
    if (error) say($('[data-signin-msg]'), error.message, true);
  });
  if (sb) {
    signOut.addEventListener('click', async () => { await sb.auth.signOut(); route(); });
    // "Signed in" also fires when the tab gets focus again: only a different person reloads the page.
    // setTimeout: Supabase calls can't be made from inside this callback.
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && session?.user.email !== shownFor)) setTimeout(route);
    });
  }

  /* ---------- Tabs ---------- */
  $$('[data-tab]').forEach((tab) => tab.addEventListener('click', () => {
    $$('[data-tab]').forEach((t) => { const on = t === tab; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
    $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
  }));

  $$('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

  /* ---------- Products ---------- */
  const productList = $('[data-products]');
  const pDialog = $('[data-product-dialog]');
  const pForm = $('[data-product-form]');
  const pMsg = $('[data-pe-msg]');
  const sizesEl = $('[data-sizes]');
  const photosEl = $('[data-photos]');
  let editing = null;   // id of the product being edited, null for a new one
  let editingSince = null; // its updated_at when it was opened
  let photos = [];

  async function loadProducts() {
    productList.innerHTML = '<li class="adm__empty">Loading…</li>';
    const { data, error } = await api.products();
    if (error) { productList.innerHTML = `<li class="adm__empty is-bad">${esc(error.message)}</li>`; return; }
    products = data;
    if (!data.length) { productList.innerHTML = '<li class="adm__empty">No products yet. Press “New product” to add one.</li>'; return; }
    productList.innerHTML = data.map((p) => {
      const stock = (p.sizes || []).reduce((n, s) => n + (Number(s.stock) || 0), 0);
      const img = p.images?.[0]?.src;
      const tags = [
        !p.active && '<span class="adm__pill">Hidden</span>',
        p.featured && '<span class="adm__pill adm__pill--ink">Home page</span>',
        (p.sold_out || !stock) && '<span class="adm__pill adm__pill--bad">Sold out</span>',
      ].filter(Boolean).join('');
      return `<li class="adm__row">
        <button type="button" class="adm__rowbtn" data-edit="${esc(p.id)}">
          <span class="adm__thumb">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</span>
          <span class="adm__rowmain"><b>${esc(p.name)}</b><span class="adm__muted">${esc(p.colour || '')}${p.colour ? ' · ' : ''}${stock} in stock</span></span>
          <span class="adm__tags">${tags}</span>
          <span class="adm__price">${eur(p.price)}</span>
        </button>
      </li>`;
    }).join('');
  }
  productList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-edit]');
    if (b) openProduct(products.find((p) => p.id === b.dataset.edit));
  });
  $('[data-new-product]').addEventListener('click', () => openProduct(null));

  function sizeRow(s = { size: '', stock: 0 }) {
    const li = document.createElement('li');
    li.className = 'adm__size';
    li.innerHTML = `<label>Size<input name="s_size" value="${esc(s.size)}" placeholder="M" required></label>
      <label>Stock<input name="s_stock" type="number" min="0" step="1" value="${Number(s.stock) || 0}"></label>
      <span class="adm__order"><button type="button" class="adm__icon" data-up aria-label="Move up">↑</button><button type="button" class="adm__icon" data-down aria-label="Move down">↓</button><button type="button" class="adm__icon" data-remove aria-label="Remove size">✕</button></span>`;
    return li;
  }
  $('[data-add-size]').addEventListener('click', () => { const r = sizeRow(); sizesEl.append(r); $('input', r).focus(); });

  // Up / down / remove for size rows (DOM order is the saved order)
  sizesEl.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    if (e.target.closest('[data-up]') && li.previousElementSibling) li.previousElementSibling.before(li);
    if (e.target.closest('[data-down]') && li.nextElementSibling) li.nextElementSibling.after(li);
    if (e.target.closest('[data-remove]')) li.remove();
  });

  function renderPhotos() {
    if (!photos.length) { photosEl.innerHTML = '<li class="adm__empty">No photos yet.</li>'; return; }
    photosEl.innerHTML = photos.map((ph, i) => `<li class="adm__photo" data-i="${i}">
      <img src="${esc(ph.src)}" alt="">
      <label>Description <span class="adm__hint">For screen readers</span><input data-alt value="${esc(ph.alt || '')}" placeholder="Front, laid flat"></label>
      <span class="adm__order">${i === 0 ? '<span class="adm__pill adm__pill--ink">Main</span>' : ''}<button type="button" class="adm__icon" data-up aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="adm__icon" data-down aria-label="Move down" ${i === photos.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="adm__icon" data-remove aria-label="Remove photo">✕</button></span>
    </li>`).join('');
  }
  photosEl.addEventListener('input', (e) => {
    if (!e.target.matches('[data-alt]')) return;
    photos[Number(e.target.closest('li').dataset.i)].alt = e.target.value;
  });
  photosEl.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-i]');
    if (!li) return;
    const i = Number(li.dataset.i);
    const swap = (a, b) => { [photos[a], photos[b]] = [photos[b], photos[a]]; };
    if (e.target.closest('[data-up]') && i > 0) swap(i, i - 1);
    else if (e.target.closest('[data-down]') && i < photos.length - 1) swap(i, i + 1);
    else if (e.target.closest('[data-remove]')) photos.splice(i, 1);
    else return;
    renderPhotos();
  });

  // Shrink a photo to at most 1600px on the long side, as a JPEG
  function shrink(file, max = 1600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * k);
        const h = Math.round(img.naturalHeight * k);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(img.src);
        const dataUrl = sb ? '' : c.toDataURL('image/jpeg', 0.82);
        c.toBlob((blob) => (blob ? resolve({ blob, dataUrl, width: w, height: h }) : reject(new Error('Could not read that photo.'))), 'image/jpeg', 0.86);
      };
      img.onerror = () => reject(new Error(`${file.name} is not a photo the browser can open.`));
      img.src = URL.createObjectURL(file);
    });
  }

  $('[data-upload]').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    const msg = $('[data-upload-msg]');
    const folder = editing || slugify(pForm.name.value) || 'new';
    for (const [n, file] of files.entries()) {
      say(msg, `Uploading ${n + 1} of ${files.length}…`);
      try {
        const photo = await shrink(file, sb ? 1600 : 1200);
        const path = `${folder}/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, '')) || 'photo'}.jpg`;
        const saved = await api.upload(photo, path);
        photos.push({ ...saved, width: photo.width, height: photo.height, alt: '' });
        renderPhotos();
      } catch (err) {
        say(msg, err.message, true);
        return;
      }
    }
    say(msg, files.length ? 'Uploaded. Add a short description to each, then press Save.' : '');
  });

  // Link name follows the product name until it is saved once
  pForm.name.addEventListener('input', () => {
    if (editing || pForm.id.dataset.touched) return;
    pForm.id.value = slugify(pForm.name.value);
    $('[data-slug-preview]').textContent = pForm.id.value || '…';
  });
  pForm.id.addEventListener('input', () => {
    pForm.id.dataset.touched = '1';
    $('[data-slug-preview]').textContent = pForm.id.value || '…';
  });

  function openProduct(p) {
    editing = p ? p.id : null;
    editingSince = p?.updated_at ?? null;
    pForm.reset();
    delete pForm.id.dataset.touched;
    say(pMsg, '');
    say($('[data-upload-msg]'), '');
    $('[data-pe-title]').textContent = p ? p.name : 'New product';
    const v = p || {
      name: '', id: '', price: '', colour: '', active: true, featured: false, sold_out: false,
      sort: products.length ? Math.max(...products.map((x) => x.sort || 0)) + 10 : 0,
      label: '', blurb: '', description: '', details: [], fit: '', note: 'Pre-made. Please allow 1–3 days for order fulfilling.',
      sizes: ['S', 'M', 'L', 'XL'].map((size) => ({ size, stock: 0 })), images: [],
    };
    for (const k of ['name', 'id', 'price', 'was_price', 'colour', 'sort', 'label', 'blurb', 'description', 'fit', 'note', 'badge']) pForm[k].value = v[k] ?? '';
    for (const k of ['active', 'featured', 'sold_out']) pForm[k].checked = !!v[k];
    pForm.details.value = (v.details || []).join('\n');
    // Latvian text (products.lv in the database, `lv` in catalog.js)
    const lv = v.lv || {};
    for (const k of LV_TEXTS) pForm[`lv_${k}`].value = lv[k] || '';
    pForm.lv_details.value = (lv.details || []).join('\n');
    pForm.id.readOnly = !!p;
    $('[data-slug-preview]').textContent = v.id || '…';
    sizesEl.replaceChildren(...(v.sizes || []).map(sizeRow));
    photos = (v.images || []).map((x) => ({ ...x }));
    renderPhotos();
    $('[data-delete-product]').hidden = !p;
    pDialog.showModal();
    pForm.name.focus();
  }

  // The Latvian boxes as one object; empty boxes are left out (the English shows there)
  const LV_TEXTS = ['colour', 'label', 'blurb', 'description', 'fit', 'note', 'badge'];
  function lvText() {
    const lv = {};
    for (const k of LV_TEXTS) { const v = pForm[`lv_${k}`].value.trim(); if (v) lv[k] = v; }
    const details = pForm.lv_details.value.split('\n').map((s) => s.trim()).filter(Boolean);
    if (details.length) lv.details = details;
    return lv;
  }

  pForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = pForm.id.value.trim();
    const price = Number(pForm.price.value);
    if (!pForm.name.value.trim()) { say(pMsg, 'Give the product a name.', true); pForm.name.focus(); return; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) { say(pMsg, 'The link name can only use small letters, numbers and dashes.', true); pForm.id.focus(); return; }
    if (!editing && products.some((p) => p.id === id)) { say(pMsg, 'Another product already uses that link name.', true); pForm.id.focus(); return; }
    if (pForm.price.value === '' || !(price >= 0)) { say(pMsg, 'Enter a price.', true); pForm.price.focus(); return; }
    const sizes = $$('li', sizesEl).map((li) => ({ size: $('[name=s_size]', li).value.trim(), stock: Math.max(0, parseInt($('[name=s_stock]', li).value, 10) || 0) }))
      .filter((s) => s.size);
    if (new Set(sizes.map((s) => s.size.toUpperCase())).size !== sizes.length) { say(pMsg, 'Each size can only be listed once.', true); return; }
    if (!sizes.length) { say(pMsg, 'Add at least one size.', true); return; }
    if (pForm.active.checked && !photos.length) { say(pMsg, 'Add at least one photo before showing it in the shop.', true); return; }

    const row = {
      id,
      name: pForm.name.value.trim(),
      colour: pForm.colour.value.trim() || null,
      price: Math.round(price * 100) / 100,
      was_price: pForm.was_price.value === '' ? null : Math.round(Number(pForm.was_price.value) * 100) / 100,
      active: pForm.active.checked,
      featured: pForm.featured.checked,
      sold_out: pForm.sold_out.checked,
      sort: parseInt(pForm.sort.value, 10) || 0,
      label: pForm.label.value.trim() || null,
      blurb: pForm.blurb.value.trim() || null,
      description: pForm.description.value.trim() || null,
      details: pForm.details.value.split('\n').map((s) => s.trim()).filter(Boolean),
      fit: pForm.fit.value.trim() || null,
      note: pForm.note.value.trim() || null,
      badge: pForm.badge.value.trim() || null,
      sizes,
      images: photos.map((ph) => ({ ...ph, alt: (ph.alt || '').trim() || pForm.name.value.trim() })),
      lv: lvText(),
      updated_at: new Date().toISOString(),
    };
    say(pMsg, 'Saving…');
    const { error } = await api.saveProduct(row, editing, editingSince);
    if (error) { say(pMsg, error.message, true); return; }
    pDialog.close();
    loadProducts();
  });

  $('[data-delete-product]').addEventListener('click', async () => {
    if (!editing) return;
    if (!confirm('Delete this product for good? To take it off the shop but keep it, untick “Show in the shop” instead.')) return;
    const { error } = await api.deleteProduct(editing);
    if (error) { say(pMsg, error.message, true); return; }
    pDialog.close();
    loadProducts();
  });

  /* ---------- Promo codes ---------- */
  const promoList = $('[data-promos]');
  const cDialog = $('[data-promo-dialog]');
  const cForm = $('[data-promo-form]');
  const cMsg = $('[data-pc-msg]');
  let editingCode = null;

  const promoLabel = (c) => (c.percent != null ? `${Number(c.percent)}% off` : `${eur(c.amount)} off`);

  async function loadPromos() {
    promoList.innerHTML = '<li class="adm__empty">Loading…</li>';
    const { data, error } = await api.promos();
    if (error) { promoList.innerHTML = `<li class="adm__empty is-bad">${esc(error.message)}</li>`; return; }
    promos = data;
    if (!data.length) { promoList.innerHTML = '<li class="adm__empty">No promo codes yet. Press “New code” to make one.</li>'; return; }
    const now = new Date();
    promoList.innerHTML = data.map((c) => {
      const expired = c.expires_at && new Date(c.expires_at) < now;
      const used = c.max_uses != null && c.uses >= c.max_uses;
      const state = !c.active ? '<span class="adm__pill">Off</span>'
        : expired ? '<span class="adm__pill adm__pill--bad">Expired</span>'
        : used ? '<span class="adm__pill adm__pill--bad">Used up</span>'
        : '<span class="adm__pill adm__pill--ok">Live</span>';
      const bits = [
        sb ? `Used ${c.uses}${c.max_uses != null ? ` of ${c.max_uses}` : ''}` : c.max_uses != null && `max ${c.max_uses} uses (counted once the database is connected)`,
        Number(c.min_subtotal) > 0 && `orders from ${eur(c.min_subtotal)}`,
        c.expires_at && `until ${new Date(c.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        c.note,
      ].filter(Boolean).map(esc).join(' · ');
      return `<li class="adm__row">
        <button type="button" class="adm__rowbtn" data-code="${esc(c._key ?? c.code)}">
          <span class="adm__rowmain"><b class="adm__code">${c.code ? esc(c.code) : 'Hidden code <span class="adm__hint">saved in catalog.js</span>'}</b><span class="adm__muted">${bits}</span></span>
          <span class="adm__tags">${state}</span>
          <span class="adm__price">${esc(promoLabel(c))}</span>
        </button>
      </li>`;
    }).join('');
  }
  promoList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-code]');
    if (b) openPromo(promos.find((c) => (c._key ?? c.code) === b.dataset.code));
  });
  $('[data-new-promo]').addEventListener('click', () => openPromo(null));
  cForm.code.addEventListener('input', () => { cForm.code.value = cForm.code.value.toUpperCase().replace(/\s+/g, ''); });

  function openPromo(c) {
    editingCode = c ? c._key ?? c.code : null;
    cForm.reset();
    say(cMsg, '');
    $('[data-pc-title]').textContent = c ? c.code || 'Hidden code' : 'New promo code';
    cForm.code.value = c ? c.code || 'HIDDEN' : '';
    cForm.code.readOnly = !!c;
    cForm.kind.value = c && c.amount != null ? 'amount' : 'percent';
    cForm.value.value = c ? Number(c.percent ?? c.amount) : '';
    cForm.min_subtotal.value = c && Number(c.min_subtotal) ? Number(c.min_subtotal) : '';
    cForm.max_uses.value = c?.max_uses ?? '';
    cForm.expires_at.value = c?.expires_at ? c.expires_at.slice(0, 10) : '';
    cForm.note.value = c?.note || '';
    cForm.active.checked = c ? c.active : true;
    $('[data-delete-promo]').hidden = !c;
    cDialog.showModal();
    (c ? cForm.value : cForm.code).focus();
  }

  cForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const old = editingCode && promos.find((c) => (c._key ?? c.code) === editingCode);
    const code = old ? old.code : cForm.code.value.trim().toUpperCase();
    const value = Number(cForm.value.value);
    const percent = cForm.kind.value === 'percent';
    if (!old && !/^[A-Z0-9_-]+$/.test(code)) { say(cMsg, 'Codes can use letters, numbers, - and _ only.', true); cForm.code.focus(); return; }
    if (!old && promos.some((c) => c.code === code)) { say(cMsg, 'That code already exists.', true); return; }
    if (!(value > 0) || (percent && value > 100)) { say(cMsg, percent ? 'Enter a percentage between 1 and 100.' : 'Enter how many euros off.', true); cForm.value.focus(); return; }
    const maxUses = cForm.max_uses.value === '' ? null : parseInt(cForm.max_uses.value, 10);
    if (maxUses !== null && !(maxUses > 0)) { say(cMsg, 'Max uses must be 1 or more, or empty for unlimited.', true); return; }
    const row = {
      code,
      percent: percent ? value : null,
      amount: percent ? null : Math.round(value * 100) / 100,
      min_subtotal: Number(cForm.min_subtotal.value) || 0,
      max_uses: maxUses,
      // The code works until the end of the chosen day
      expires_at: cForm.expires_at.value ? new Date(`${cForm.expires_at.value}T23:59:59`).toISOString() : null,
      note: cForm.note.value.trim() || null,
      active: cForm.active.checked,
    };
    say(cMsg, 'Saving…');
    const { error } = await api.savePromo(row, editingCode);
    if (error) { say(cMsg, error.message, true); return; }
    cDialog.close();
    loadPromos();
  });

  $('[data-delete-promo]').addEventListener('click', async () => {
    if (!editingCode) return;
    if (!confirm(`Delete ${editingCode}? Customers won't be able to use it any more.`)) return;
    const { error } = await api.deletePromo(editingCode);
    if (error) { say(cMsg, error.message, true); return; }
    cDialog.close();
    loadPromos();
  });

  /* ---------- Orders ---------- */
  const orderList = $('[data-orders]');
  const STATUSES = ['received', 'paid', 'shipped', 'delivered', 'cancelled'];
  // Parcel carriers. Same list as supabase/tracking.sql and auth.js.
  const CARRIERS = { dpd: 'DPD', omniva: 'Omniva', latvijas_pasts: 'Latvijas Pasts', venipak: 'Venipak', dhl: 'DHL', other: 'Other' };
  const trackUrl = (c, n) => (c === 'dpd' ? `https://tracking.dpd.de/status/en_US/parcel/${encodeURIComponent(n)}`
    : c === 'dhl' ? `https://www.dhl.com/lv-en/home/tracking.html?tracking-id=${encodeURIComponent(n)}`
    : `https://t.17track.net/en#nums=${encodeURIComponent(n)}`);
  const shortDay = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  // Card orders (Stripe). Only ship ones that say "Card: paid".
  const PAYMENT = { unpaid: 'Card: not paid yet', pending: 'Card: bank payment on its way', paid: 'Card: paid', failed: 'Card: payment failed', expired: 'Card: never paid' };

  const orderQ = $('[data-order-q]');
  const orderFilter = $('[data-order-filter]');
  const orderCount = $('[data-order-count]');
  let allOrders = [];
  // Which orders each choice in the "Which orders" menu shows
  const SHOW = {
    all: () => true,
    toship: (o) => isSale(o) && !['shipped', 'delivered'].includes(o.status),
    shipped: (o) => o.status === 'shipped',
    delivered: (o) => o.status === 'delivered',
    unpaid: (o) => o.status !== 'cancelled' && !isSale(o),
    cancelled: (o) => o.status === 'cancelled',
  };
  function shownOrders() {
    const raw = orderQ.value.trim().toLowerCase();
    const q = raw.replace(/\s/g, '');
    const show = SHOW[orderFilter.value] || SHOW.all;
    // "#12" finds order 12 only; anything else searches name, email, phone, tracking number, city and promo code
    const hit = /^#\d+$/.test(q) ? (o) => String(o.id) === q.slice(1)
      : (o) => [o.id, o.full_name, o.email, o.phone, o.tracking_number, o.city, o.promo_code]
        .some((v) => v != null && String(v).toLowerCase().replace(/\s/g, '').includes(q));
    return allOrders.filter((o) => show(o) && (!q || hit(o)));
  }

  async function loadOrders() {
    orderList.innerHTML = '<li class="adm__empty">Loading…</li>';
    orderCount.textContent = '';
    const { data, error } = await api.orders();
    if (error) { orderList.innerHTML = `<li class="adm__empty is-bad">${esc(error.message)}</li>`; return; }
    allOrders = data || [];
    renderOrders();
  }
  function renderOrders() {
    if (!allOrders.length) { orderList.innerHTML = `<li class="adm__empty">${sb ? 'No orders yet.' : 'Orders show here once the database is connected. Until then they arrive by email.'}</li>`; return; }
    const list = shownOrders();
    orderCount.textContent = list.length === allOrders.length ? `${list.length} order${list.length === 1 ? '' : 's'}` : `${list.length} of ${allOrders.length} orders`;
    if (!list.length) { orderList.innerHTML = '<li class="adm__empty">No orders match.</li>'; return; }
    orderList.innerHTML = list.map((o) => {
      const items = (o.items || []).map((i) => `${esc(i.qty)} × ${esc(i.name)} (${esc(i.size)})`).join(', ');
      const when = new Date(o.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const addr = [o.address, o.postcode, o.city, o.country].filter(Boolean).map(esc).join(', ');
      return `<li class="adm__row adm__order-row">
        <div class="adm__rowmain">
          <b>#${o.id} · ${esc(o.full_name || 'No name')}</b>
          <span>${items}</span>
          <span class="adm__muted">${when} · <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>${o.phone ? ` · ${esc(o.phone)}` : ''}</span>
          ${addr ? `<span class="adm__muted">${addr}</span>` : ''}
          ${o.note ? `<span class="adm__muted">Note: ${esc(o.note)}</span>` : ''}
          ${o.status === 'cancelled' ? '' : `<form class="adm__track" data-track="${o.id}" data-was="${esc(o.status)}">
            <select name="carrier" aria-label="Carrier for order ${o.id}">${Object.entries(CARRIERS).map(([k, v]) => `<option value="${k}" ${k === (o.carrier || 'dpd') ? 'selected' : ''}>${v}</option>`).join('')}</select>
            <input name="number" value="${esc(o.tracking_number || '')}" placeholder="Tracking number" aria-label="Tracking number for order ${o.id}" autocomplete="off" spellcheck="false" maxlength="60">
            <button type="submit" class="btn btn--line">${o.tracking_number ? 'Update' : 'Save & mark shipped'}</button>
          </form>`}
          ${o.tracking_number ? `<span class="adm__muted">${esc(CARRIERS[o.carrier] || 'Parcel')} <a href="${esc(trackUrl(o.carrier, o.tracking_number))}" target="_blank" rel="noopener">${esc(o.tracking_number)} ↗</a>${o.shipped_at ? ` · shipped ${shortDay(o.shipped_at)}` : ''}${o.delivered_at ? ` · delivered ${shortDay(o.delivered_at)}` : ''}</span>` : ''}
          ${o.track_status && !o.delivered_at ? `<span class="adm__muted">Live: <b>${esc(o.track_status.replace(/([a-z])([A-Z])/g, '$1 $2'))}</b>${o.track_event?.text ? ` · ${esc([o.track_event.time ? shortDay(o.track_event.time) : '', o.track_event.place, o.track_event.text].filter(Boolean).join(' · '))}` : ''}</span>` : ''}
        </div>
        <div class="adm__orderside">
          <span class="adm__price">${eur(o.total ?? o.subtotal)}</span>
          ${o.promo_code ? `<span class="adm__muted">${esc(o.promo_code)} −${eur(o.discount)}</span>` : ''}
          ${Number(o.shipping) > 0 ? `<span class="adm__muted">incl. delivery ${eur(o.shipping)}</span>` : ''}
          ${o.payment ? `<span class="adm__muted${o.payment === 'paid' ? '' : ' is-bad'}">${PAYMENT[o.payment] || esc(o.payment)}</span>` : ''}
          <select data-status="${o.id}" aria-label="Status of order ${o.id}" ${o.status === 'cancelled' && sb ? 'disabled title="Cancelled orders stay cancelled"' : ''}>${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select>
        </div>
      </li>`;
    }).join('');
  }
  orderList.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-status]');
    if (!sel) return;
    if (sel.value === 'cancelled' && !confirm('Cancel this order? Its pieces go back into stock.')) { loadOrders(); return; }
    sel.disabled = true;
    const { error } = await api.setStatus(Number(sel.dataset.status), sel.value);
    sel.disabled = false;
    if (error) { alert(error.message); loadOrders(); return; }
    const o = allOrders.find((x) => x.id === Number(sel.dataset.status));
    if (o) o.status = sel.value;
    if (sel.value === 'cancelled') { loadProducts(); loadOrders(); }
  });
  // Tracking number: saving it marks the order shipped and emails the customer (supabase/tracking.sql)
  orderList.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-track]');
    if (!form) return;
    e.preventDefault();
    const number = form.elements.number.value.replace(/\s/g, '').toUpperCase();
    if (number && !/^[A-Z0-9-]{4,40}$/.test(number)) { alert('That tracking number doesn’t look right: use only letters, numbers and dashes.'); return; }
    if (!number && !confirm('Remove the tracking number from this order?')) return;
    const row = { carrier: number ? form.elements.carrier.value : null, tracking_number: number || null };
    if (number && ['received', 'paid'].includes(form.dataset.was)) row.status = 'shipped';
    const btn = form.querySelector('button');
    btn.disabled = true;
    const { error } = await api.setTracking(Number(form.dataset.track), row);
    btn.disabled = false;
    if (error) { alert(/tracking/.test(error.message) ? error.message : `Could not save the tracking number: ${error.message}. Has supabase/tracking.sql been run?`); return; }
    loadOrders();
  });
  $('[data-reload-orders]').addEventListener('click', loadOrders);
  orderQ.addEventListener('input', renderOrders);
  orderFilter.addEventListener('change', renderOrders);

  // Download the orders shown (search and filter applied) as a spreadsheet file, e.g. for the accountant
  $('[data-export-orders]').addEventListener('click', () => {
    const list = shownOrders();
    if (!list.length) { alert('No orders to export.'); return; }
    const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    const num = (n) => (n == null || n === '' ? '' : Number(n).toFixed(2));
    const cols = [
      ['Order', (o) => o.id], ['Date', (o) => day(o.created_at)], ['Status', (o) => o.status], ['Payment', (o) => o.payment || ''],
      ['Name', (o) => o.full_name], ['Email', (o) => o.email], ['Phone', (o) => o.phone],
      ['Address', (o) => o.address], ['Postcode', (o) => o.postcode], ['City', (o) => o.city], ['Country', (o) => o.country],
      ['Items', (o) => (o.items || []).map((i) => `${i.qty} x ${i.name} (${i.size})`).join('; ')], ['Pieces', pieces],
      ['Subtotal EUR', (o) => num(o.subtotal)], ['Promo code', (o) => o.promo_code], ['Discount EUR', (o) => num(o.discount)],
      ['Delivery EUR', (o) => num(o.shipping)], ['Total EUR', (o) => num(o.total ?? o.subtotal)],
      ['Carrier', (o) => CARRIERS[o.carrier] || ''], ['Tracking number', (o) => o.tracking_number],
      ['Shipped', (o) => day(o.shipped_at)], ['Delivered', (o) => day(o.delivered_at)],
    ];
    // Quote every cell; a leading = + - @ is neutralised so a spreadsheet never runs it as a formula
    const cell = (v) => { let t = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t)) t = `'${t}`; return `"${t.replace(/"/g, '""')}"`; };
    const csv = [cols.map(([h]) => cell(h)).join(','), ...list.map((o) => cols.map(([, f]) => cell(f(o))).join(','))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `moyen-hills-orders-${day(new Date())}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ---------- Overview: sales and stock ---------- */
  const statsEl = $('[data-stats]');
  // A sale = an order that was paid and not cancelled (card orders say payment "paid";
  // older orders without card payment count once marked paid, shipped or delivered).
  const isSale = (o) => o.status !== 'cancelled'
    && (o.payment ? o.payment === 'paid' : ['paid', 'shipped', 'delivered'].includes(o.status));
  const pieces = (o) => (o.items || []).reduce((n, i) => n + (Number(i.qty) || 0), 0);
  const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };

  async function loadStats() {
    statsEl.innerHTML = '<p class="adm__empty">Loading…</p>';
    const [{ data: orders, error }, { data: prods }] = await Promise.all([api.orders(), api.products()]);
    if (error) { statsEl.innerHTML = `<p class="adm__empty is-bad">${esc(error.message)}</p>`; return; }
    if (!sb) { statsEl.innerHTML = '<p class="adm__empty">Sales show here once the database is connected.</p>'; return; }
    const sales = (orders || []).filter(isSale);
    const sum = (list) => list.reduce((n, o) => n + Number(o.total ?? o.subtotal ?? 0), 0);
    const now = Date.now();
    const since = (days) => sales.filter((o) => now - new Date(o.paid_at || o.created_at) < days * 864e5);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const thisMonth = sales.filter((o) => new Date(o.paid_at || o.created_at) >= monthStart);
    const sold = sales.reduce((n, o) => n + pieces(o), 0);
    const toShip = sales.filter((o) => !['shipped', 'delivered'].includes(o.status)).length;

    // Pieces sold per size, and what is left per size (all products together)
    const soldBy = {};
    sales.forEach((o) => (o.items || []).forEach((i) => { soldBy[i.size] = (soldBy[i.size] || 0) + (Number(i.qty) || 0); }));
    const leftBy = {};
    (prods || []).filter((p) => p.active !== false).forEach((p) => (p.sizes || []).forEach((s) => { leftBy[s.size] = (leftBy[s.size] || 0) + Math.max(0, Number(s.stock) || 0); }));
    const sizes = [...new Set([...Object.keys(leftBy), ...Object.keys(soldBy)])];
    const left = Object.values(leftBy).reduce((a, b) => a + b, 0);

    // Sales per day, last 14 days
    const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + i); return d; });
    const perDay = days.map((d) => sum(sales.filter((o) => dayKey(o.paid_at || o.created_at) === dayKey(d))));
    const top = Math.max(...perDay, 1);

    const tile = (label, value, sub = '') => `<div class="stat"><span class="stat__label">${label}</span><b class="stat__value">${value}</b>${sub ? `<span class="adm__muted">${sub}</span>` : ''}</div>`;
    statsEl.innerHTML = `
      <div class="stats">
        ${tile('Total sales', eur(sum(sales)), `${sales.length} paid order${sales.length === 1 ? '' : 's'}`)}
        ${tile('This month', eur(sum(thisMonth)), `${thisMonth.length} order${thisMonth.length === 1 ? '' : 's'}`)}
        ${tile('Last 7 days', eur(sum(since(7))), `${since(7).length} order${since(7).length === 1 ? '' : 's'}`)}
        ${tile('Pieces sold', sold, sales.length ? `avg. order ${eur(sum(sales) / sales.length)}` : '')}
        ${tile('To ship', toShip, toShip ? 'paid, not shipped yet' : 'all sent')}
        ${tile('Pieces left', left, 'in stock, all sizes')}
      </div>
      <section class="adm__card stats__box">
        <h2 class="stats__h">Sales, last 14 days</h2>
        <div class="bars" role="img" aria-label="Sales per day for the last 14 days">
          ${days.map((d, i) => `<div class="bars__col" title="${shortDay(d)}: ${eur(perDay[i])}"><span class="bars__bar" data-h="${Math.round((perDay[i] / top) * 100)}"></span><span class="bars__day">${d.getDate()}</span></div>`).join('')}
        </div>
      </section>
      <section class="adm__card stats__box">
        <h2 class="stats__h">By size</h2>
        <table class="stats__table">
          <thead><tr><th>Size</th><th>Sold</th><th>Left</th></tr></thead>
          <tbody>${sizes.map((s) => `<tr><td>${esc(s)}</td><td>${soldBy[s] || 0}</td><td class="${(leftBy[s] || 0) === 0 ? 'is-bad' : ''}">${leftBy[s] || 0}</td></tr>`).join('')}</tbody>
        </table>
      </section>
      <p class="adm__muted">Counts paid orders only; cancelled and unpaid ones are left out. Refunds made in Stripe are not subtracted.</p>`;
    // Bar heights set from script: the page's CSP blocks inline style attributes
    $$('.bars__bar', statsEl).forEach((b) => b.style.setProperty('--h', `${b.dataset.h}%`));
  }
  $('[data-reload-stats]').addEventListener('click', loadStats);

  /* ---------- Cancellations (sent on withdraw.html) ---------- */
  const wdList = $('[data-withdrawals]');
  const wdCount = $('[data-wd-count]');
  const day = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  async function loadWithdrawals() {
    if (!sb) { wdList.innerHTML = '<li class="adm__empty">Cancellations show here once the database is connected. Until then they arrive by email.</li>'; return; }
    wdList.innerHTML = '<li class="adm__empty">Loading…</li>';
    const { data, error } = await sb.from('withdrawals').select('id, created_at, full_name, email, order_ref, order_date, items, handled')
      .order('created_at', { ascending: false }).limit(200);
    if (error) { wdList.innerHTML = `<li class="adm__empty is-bad">${esc(error.message)}</li>`; return; }
    const open = data.filter((w) => !w.handled).length;
    wdCount.hidden = !open;
    wdCount.textContent = open;
    if (!data.length) { wdList.innerHTML = '<li class="adm__empty">No cancellations yet.</li>'; return; }
    wdList.innerHTML = data.map((w) => {
      const sent = new Date(w.created_at);
      const when = sent.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const due = day(sent.getTime() + 14 * 864e5);
      return `<li class="adm__row adm__order-row">
        <div class="adm__rowmain">
          <b>Order ${esc(w.order_ref || '(no number)')} · ${esc(w.full_name)}</b>
          <span>${esc(w.items || 'The whole order')}</span>
          <span class="adm__muted">Sent ${when} · <a href="mailto:${esc(w.email)}">${esc(w.email)}</a>${w.order_date ? ` · ordered/received ${day(w.order_date)}` : ''}</span>
          ${w.handled ? '' : `<span class="adm__muted">Items due back by ${due}</span>`}
        </div>
        <div class="adm__orderside">
          <label class="adm__check"><input type="checkbox" data-wd-handled="${w.id}" ${w.handled ? 'checked' : ''}> Sorted</label>
        </div>
      </li>`;
    }).join('');
  }
  wdList.addEventListener('change', async (e) => {
    const box = e.target.closest('[data-wd-handled]');
    if (!box) return;
    box.disabled = true;
    const { error } = await sb.from('withdrawals').update({ handled: box.checked }).eq('id', Number(box.dataset.wdHandled));
    if (error) alert(error.message);
    loadWithdrawals();
  });
  $('[data-reload-wd]').addEventListener('click', loadWithdrawals);

  /* ---------- Admins (owners manage; editors see the other editors) ---------- */
  const adminList = $('[data-admins]');
  const adminsMsg = $('[data-admins-msg]');

  async function loadAdmins() {
    const { data, error } = await sb.from('admins').select('*').order('added_at');
    if (error) { adminList.innerHTML = `<li class="adm__empty is-bad">${esc(error.message)}</li>`; return; }
    const added = (a) => `Added ${new Date(a.added_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${a.email === myEmail.toLowerCase() ? ' · you' : ''}`;
    // Editors get a plain list (the database only returns editors to them)
    if (role !== 'owner') {
      adminList.innerHTML = data.map((a) => `<li class="adm__row adm__adminrow">
        <span class="adm__rowmain"><b>${esc(a.email)}</b><span class="adm__muted">${added(a)}</span></span>
        <span class="adm__pill">Editor</span>
      </li>`).join('');
      return;
    }
    adminList.innerHTML = data.map((a) => `<li class="adm__row adm__adminrow">
      <span class="adm__rowmain"><b>${esc(a.email)}</b><span class="adm__muted">${added(a)}</span></span>
      <select data-admin-role="${esc(a.email)}" aria-label="Role of ${esc(a.email)}">
        <option value="owner" ${a.role === 'owner' ? 'selected' : ''}>Owner</option>
        <option value="editor" ${a.role === 'editor' ? 'selected' : ''}>Editor</option>
      </select>
      <button type="button" class="adm__icon" data-admin-remove="${esc(a.email)}" aria-label="Remove ${esc(a.email)}">✕</button>
    </li>`).join('');
  }
  if (sb) {
    adminList.addEventListener('change', async (e) => {
      const sel = e.target.closest('[data-admin-role]');
      if (!sel) return;
      const { error } = await sb.from('admins').update({ role: sel.value }).eq('email', sel.dataset.adminRole);
      say(adminsMsg, error ? error.message : 'Saved.', !!error);
      loadAdmins();
      if (!error && sel.dataset.adminRole === myEmail.toLowerCase()) route();
    });
    adminList.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-admin-remove]');
      if (!b) return;
      if (!confirm(`Remove ${b.dataset.adminRemove} as an admin?`)) return;
      const { error } = await sb.from('admins').delete().eq('email', b.dataset.adminRemove);
      say(adminsMsg, error ? error.message : 'Removed.', !!error);
      loadAdmins();
    });
    $('[data-add-admin]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const { error } = await sb.from('admins').insert({ email: f.email.value.trim().toLowerCase(), role: f.role.value });
      if (error) { say(adminsMsg, /duplicate/.test(error.message) ? 'That email is already an admin.' : error.message, true); return; }
      say(adminsMsg, 'Added. They sign in on this page with that email and set up their own two-step code.');
      f.reset();
      loadAdmins();
    });
  }

  /* ---------- Change log ---------- */
  const logList = $('[data-log]');
  const WHAT = { products: 'product', promo_codes: 'promo code', orders: 'order', admins: 'admin' };
  const VERB = { insert: 'added', update: 'changed', delete: 'deleted' };
  const short = (v) => { const t = typeof v === 'string' ? v : JSON.stringify(v); return t && t.length > 60 ? `${t.slice(0, 57)}…` : t ?? 'empty'; };

  async function loadLog() {
    if (!sb) return;
    const { data, error } = await sb.from('admin_log').select('*').order('at', { ascending: false }).limit(200);
    if (error) { logList.innerHTML = `<li class="adm__empty is-bad">${esc(error.message)}</li>`; return; }
    if (!data.length) { logList.innerHTML = '<li class="adm__empty">No changes yet.</li>'; return; }
    logList.innerHTML = data.map((l) => {
      const [op, table] = l.action.split(' ');
      const changes = op === 'update' && l.changes
        ? Object.entries(l.changes).map(([k, v]) => `${esc(k.replace(/_/g, ' '))}: ${esc(short(v.from))} → ${esc(short(v.to))}`).join('<br>')
        : '';
      return `<li class="adm__row adm__logrow">
        <span class="adm__rowmain">
          <b>${esc(l.email || 'Unknown')} ${VERB[op] || esc(op)} ${WHAT[table] || esc(table)} ${esc(l.target || '')}</b>
          ${changes ? `<span class="adm__muted">${changes}</span>` : ''}
        </span>
        <span class="adm__muted adm__when">${new Date(l.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </li>`;
    }).join('');
  }
  $('[data-reload-log]').addEventListener('click', loadLog);

  /* ---------- Preview mode: download / undo ---------- */
  const save = (name, blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  async function downloadCatalog() {
    const msg = $('[data-preview-msg]');
    const photosToSave = [];
    const products = draft.products.map((p) => ({
      ...p,
      images: (p.images || []).map((im) => {
        if (!im.file) return im;
        photosToSave.push(im);
        const { file, ...rest } = im;
        return { ...rest, src: file };
      }),
    }));
    // Codes are saved as a fingerprint, so they can't be read from the page source
    const promoCodes = await Promise.all(draft.promoCodes.map(async ({ code, ...c }) => (code ? { hash: await window.mhPromoHash(code), ...c } : c)));
    let head = '';
    try { head = (await (await fetch('catalog.js', { cache: 'no-store' })).text()).split('window.MH_CATALOG')[0]; } catch { /* keep it short */ }
    const text = `${head || '/* MOYEN HILLS — shop catalog (made on admin.html) */\n'}window.MH_CATALOG = ${JSON.stringify({ settings: base.settings, products, promoCodes }, null, 2)};\n`;
    save('catalog.js', new Blob([text], { type: 'text/javascript' }));
    for (const im of photosToSave) save(im.file.replace('images/', ''), await (await fetch(im.src)).blob());
    say(msg, photosToSave.length
      ? `Downloaded catalog.js and ${photosToSave.length} photo${photosToSave.length > 1 ? 's' : ''}. Put catalog.js in the website folder and the photos in its images folder.`
      : 'Downloaded catalog.js. Put it in the website folder in place of the old one.');
  }

  if (!sb) {
    $('[data-download]').addEventListener('click', () => downloadCatalog().catch((err) => say($('[data-preview-msg]'), err.message, true)));
    $('[data-discard]').addEventListener('click', () => {
      if (!confirm('Undo every change made in preview mode and go back to what catalog.js says?')) return;
      try { localStorage.removeItem(DRAFT); } catch { /* nothing saved */ }
      draft = { products: structuredClone(base.products), promoCodes: structuredClone(base.promoCodes || []) };
      say($('[data-preview-msg]'), 'Back to catalog.js.');
      loadProducts();
      loadPromos();
    });
  }

  route();
})();
