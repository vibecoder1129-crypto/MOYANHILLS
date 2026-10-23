/* MOYEN HILLS store
 * ---------------------------------------------------------------------------
 * Products, prices, sizes and stock live in catalog.js, or on the admin page
 * (admin.html) once Supabase is connected. You shouldn't need to edit this file
 * to change what you sell.
 *
 * This file runs the shop: the product on the home page, the shop grid, the
 * product page, the cart, promo codes and checkout.
 */
const SETTINGS = window.mhData.settings;
let PRODUCTS = [];

/* ------------------------------------------------------------------------- */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Text in the visitor's language (i18n.js); English if that file is missing
const t = window.mhT || ((en, v) => (v ? en.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : en));
const tMsg = window.mhTMessage || ((m) => m);
const LV = window.mhLang === 'lv';
const money = (n) => new Intl.NumberFormat(LV ? 'lv-LV' : 'en-IE', { style: 'currency', currency: SETTINGS.currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const productUrl = (p) => `/product?id=${encodeURIComponent(p.id)}`;
// Price, with the old price crossed out when there is one
const priceHtml = (p) => (p.wasPrice > p.price
  ? `<s class="was" aria-label="${esc(t('Was {price}', { price: money(p.wasPrice) }))}">${money(p.wasPrice)}</s> ${money(p.price)}`
  : money(p.price));

const byId = (id) => PRODUCTS.find((p) => p.id === id);
const featured = () => PRODUCTS.find((p) => p.featured) || PRODUCTS[0];
const sizesOf = (p) => (p && p.sizes) || [];
const stockOf = (p, size) => sizesOf(p).find((s) => s.size === size)?.stock ?? 0;
const isSoldOut = (p) => !p || p.soldOut || sizesOf(p).every((s) => s.stock <= 0);
const sizeOff = (p, size) => isSoldOut(p) || stockOf(p, size) <= 0;

// The product this page is about: ?id= on the product page, otherwise the featured one
let current = null;

/* Images: catalog photos may carry a srcset; uploaded ones are a plain src */
function imgTag(im, { cls = '', sizes = '(max-width: 720px) 100vw, 50vw', lazy = true, alt } = {}) {
  if (!im) return '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(im.src)}"${im.srcset ? ` srcset="${esc(im.srcset)}" sizes="${sizes}"` : ''}${im.width ? ` width="${Number(im.width) || ''}" height="${Number(im.height) || ''}"` : ''} alt="${esc(alt ?? t(im.alt ?? ''))}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'}>`;
}
const smallSrc = (im) => (im?.srcset ? im.srcset.split(',')[0].trim().split(' ')[0] : im?.src || '');

/* ---------------- Cart storage ---------------- */
const store = {
  read() { try { return JSON.parse(localStorage.getItem('mh-cart') || '[]'); } catch { return []; } },
  write(items) { try { localStorage.setItem('mh-cart', JSON.stringify(items)); } catch { /* private mode: cart lives in memory */ } },
};
let cart = store.read().filter((i) => i && i.id && i.size && i.qty > 0);
let promo = null; // { code, discount, label } once a code is applied

const totalQty = () => cart.reduce((n, i) => n + i.qty, 0);
const subtotal = () => cart.reduce((n, i) => n + i.qty * (byId(i.id)?.price || 0), 0);
const discount = () => (promo ? Math.min(promo.discount, subtotal()) : 0);
const grandTotal = () => Math.max(0, subtotal() - discount());

/* Add a product in a size; returns an error message or '' */
function addToCart(p, size) {
  if (sizeOff(p, size)) return t('{size} is sold out.', { size });
  const line = cart.find((i) => i.id === p.id && i.size === size);
  if ((line ? line.qty : 0) >= stockOf(p, size)) return t('No more {size} left.', { size });
  if (line) line.qty += 1; else cart.push({ id: p.id, size, qty: 1 });
  save();
  bumpCount();
  showToast(`${p.name}${p.colour ? ` · ${p.colour}` : ''} · ${size}`);
  return '';
}

/* ---------------- Shared bits: price, name, stock, sold out ---------------- */
function renderCommon(p) {
  $$('[data-price]').forEach((el) => { el.innerHTML = p ? priceHtml(p) : ''; });
  $$('[data-product-name]').forEach((el) => { el.textContent = p?.name || ''; });
  const soldOut = isSoldOut(p);
  // Black-and-white photos on the pages about one product (home and product page)
  if ($('[data-feature], [data-pdp]')) document.body.classList.toggle('is-soldout', !!p && soldOut);
  $$('[data-soldout-note]').forEach((el) => { el.hidden = !p || !soldOut; });

  // Badge under the price: only when set on the admin page ({n} = pieces left)
  const left = sizesOf(p).reduce((n, s) => n + Math.max(0, s.stock), 0);
  $$('[data-stock-left]').forEach((el) => {
    el.hidden = !p || soldOut || !p.badge;
    $('[data-stock-text]', el).textContent = p?.badge ? p.badge.replace(/\{n\}/g, left) : '';
  });

  // Small product card in the full-screen menu
  $$('.menu__tee').forEach((a) => {
    if (!p) { a.hidden = true; return; }
    a.href = productUrl(p);
    const img = $('img', a);
    if (img && p.images[0]) { img.src = smallSrc(p.images[0]); img.removeAttribute('srcset'); }
    const name = $('b', a);
    if (name) name.textContent = p.name;
  });
}

/* Home page: the featured product */
function renderFeature(p) {
  const box = $('[data-feature]');
  if (!box) return;
  if (!p) { box.hidden = true; return; }
  const media = $('.feature__media', box);
  media.href = productUrl(p);
  media.setAttribute('aria-label', t('{name}, all photos and details', { name: p.name }));
  const [a, b] = p.images;
  media.innerHTML = imgTag(a, { cls: 'feature__img' })
    + (b ? imgTag(b, { cls: 'feature__img feature__img--alt', alt: '' }) + `<span class="feature__hint">${esc(t('Front / back'))}</span>` : '');
  $('[data-feature-label]', box).textContent = p.label || '';
  $('[data-feature-label]', box).hidden = !p.label;
  $('[data-feature-blurb]', box).textContent = p.blurb || p.description || '';
  const cta = $('.feature__cta', box);
  cta.href = productUrl(p);
}

/* Shop page: every active product */
function renderShop() {
  const grid = $('[data-shop]');
  if (!grid) return;
  if (!PRODUCTS.length) { grid.innerHTML = `<p class="shop__empty">${esc(t('New pieces are on the way. Join the Hills family below to hear first.'))}</p>`; return; }
  grid.innerHTML = PRODUCTS.map((p) => {
    const off = isSoldOut(p);
    const [a, b] = p.images;
    return `<article class="pcard${off ? ' is-soldout' : ''}" data-reveal>
      <a class="pcard__media" href="${productUrl(p)}" aria-label="${esc(p.name)}">
        ${imgTag(a, { cls: 'pcard__img', sizes: '(max-width: 720px) 50vw, 33vw' })}
        ${b ? imgTag(b, { cls: 'pcard__img pcard__img--alt', sizes: '(max-width: 720px) 50vw, 33vw', alt: '' }) : ''}
      </a>
      <h2 class="pcard__name"><a href="${productUrl(p)}">${esc(p.name)}</a></h2>
      <p class="pcard__price">${priceHtml(p)}${p.colour ? ` · ${esc(p.colour)}` : ''}</p>
      ${off ? `<p class="soldout">${esc(t('SOLD OUT, DONT BE LATE'))}</p>` : ''}
    </article>`;
  }).join('');
  $$('[data-reveal]', grid).forEach(reveal);
}

/* Product page */
function renderProductPage(p) {
  const pdp = $('[data-pdp]');
  if (!pdp) return;
  if (!p) {
    pdp.innerHTML = `<section class="pdp__missing"><h1 class="pdp__name">${esc(t('This piece is gone'))}</h1><p>${esc(t('It may have sold out or been taken down.'))}</p><a class="btn" href="/shop">${esc(t('Back to the shop'))}</a></section>`;
    return;
  }
  document.title = `${p.name} — MOYEN HILLS`;

  // Gallery
  const gal = $('[data-gallery]', pdp);
  const n = p.images.length;
  $('[data-track]', gal).innerHTML = p.images.map((im, i) => `<li class="gallery__slide" aria-label="${esc(t('{i} of {n}', { i: i + 1, n }))}">${imgTag(im, { lazy: i > 0 })}</li>`).join('');
  $('.gallery__thumbs', gal).innerHTML = n > 1 ? p.images.map((im, i) => `<button type="button" class="gallery__thumb${i ? '' : ' is-on'}" data-go="${i}" aria-label="${esc(t('Show photo {n}', { n: i + 1 }))}"><img src="${esc(smallSrc(im))}"${im.width ? ` width="${Number(im.width) || ''}" height="${Number(im.height) || ''}"` : ''} alt="" loading="lazy"></button>`).join('') : '';
  $('[data-count]', gal).innerHTML = `<span data-index>1</span> / ${n}`;
  $$('.gallery__arrow, [data-count]', gal).forEach((el) => { el.hidden = n < 2; });
  initGallery(gal);

  // Text
  const set = (sel, text) => $$(sel, pdp).forEach((el) => { el.textContent = text || ''; el.hidden = !text; });
  set('[data-desc]', p.description);
  set('[data-fit]', p.fit);
  set('[data-note]', p.note);
  const details = $('[data-details]', pdp);
  details.innerHTML = (p.details || []).map((d) => `<li>${esc(d)}</li>`).join('');
  details.hidden = !(p.details || []).length;
  $$('[data-sticky-name]').forEach((el) => { el.textContent = p.name; });

  // Sizes
  const row = $('[data-sizes]', pdp);
  row.innerHTML = '';
  for (const { size } of sizesOf(p)) {
    const label = document.createElement('label');
    label.className = 'size';
    label.innerHTML = `<input type="radio" name="size" value="${esc(size)}" ${sizeOff(p, size) ? 'disabled' : ''}><span>${esc(size)}</span>`;
    if (sizeOff(p, size)) label.title = t('{size} is sold out', { size });
    row.append(label);
  }
  const note = $('[data-size-note]', pdp);
  row.addEventListener('change', (e) => {
    const left = stockOf(p, e.target.value);
    note.textContent = left > 0 && left <= 3 ? t('Only {n} left in {size}', { n: left, size: e.target.value }) : '';
  });
  const add = $('[data-add]', pdp);
  add.disabled = isSoldOut(p);
  add.textContent = t(isSoldOut(p) ? 'Sold out' : 'Add to cart');
}

const buy = $('[data-buy]');
if (buy) {
  buy.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = $('[data-buy-msg]');
    if (!current) return;
    const size = new FormData(buy).get('size');
    if (!size) { msg.textContent = t('Choose a size first.'); return; }
    msg.textContent = addToCart(current, size) || t('Added to cart: {name}, size {size}.', { name: current.name, size });
  });
}

/* ---------------- Toast ---------------- */
let toastTimer;
function showToast(text) {
  const toast = $('[data-toast]');
  if (!toast) return;
  $('[data-toast-meta]').textContent = text;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 3500);
}
function hideToast() {
  const toast = $('[data-toast]');
  if (!toast) return;
  toast.classList.remove('is-on');
  setTimeout(() => { if (!toast.classList.contains('is-on')) toast.hidden = true; }, 400);
}
function bumpCount() {
  $('[data-bar]')?.classList.remove('is-hidden'); // bring the header back so the bag count is visible
  const count = $('[data-cart-count]');
  count.classList.add('bump');
  setTimeout(() => count.classList.remove('bump'), 350);
}

/* ---------------- Cart ---------------- */
const dialog = $('[data-cart]');
function save() { store.write(cart); renderCart(); if (promo) recheckPromo(); }

function renderCart() {
  $$('[data-cart-count]').forEach((el) => { el.textContent = totalQty(); });
  $$('[data-open-cart].bar__cart').forEach((el) => el.setAttribute('aria-label', t(totalQty() === 1 ? 'Open cart, {n} item' : 'Open cart, {n} items', { n: totalQty() })));
  if (!dialog) return;
  const list = $('[data-cart-items]');
  list.innerHTML = '';
  for (const item of cart) {
    const p = byId(item.id);
    if (!p) continue;
    const li = document.createElement('li');
    li.className = `cart__item${isSoldOut(p) ? ' is-soldout' : ''}`;
    li.innerHTML = `
      <img src="${esc(smallSrc(p.images[0]))}" alt="" width="84" height="108">
      <div>
        <p class="cart__item-name">${esc(p.name)}</p>
        <p class="cart__item-meta">${p.colour ? `${esc(p.colour)} · ` : ''}${esc(item.size)} · ${money(p.price)}</p>
        <div class="qty">
          <button type="button" data-dec aria-label="${esc(t('One less'))}">−</button>
          <span>${item.qty}</span>
          <button type="button" data-inc aria-label="${esc(t('One more'))}">+</button>
        </div>
      </div>
      <button type="button" class="link-u" data-remove>${esc(t('Remove'))}</button>`;
    li.querySelector('[data-dec]').onclick = () => { item.qty -= 1; if (item.qty < 1) cart = cart.filter((i) => i !== item); save(); };
    li.querySelector('[data-inc]').onclick = () => { if (item.qty < stockOf(p, item.size)) { item.qty += 1; save(); } };
    li.querySelector('[data-remove]').onclick = () => { cart = cart.filter((i) => i !== item); save(); };
    list.append(li);
  }
  const empty = cart.length === 0;
  $('[data-cart-empty]').hidden = !empty;
  $$('[data-cart-total-row]').forEach((el) => { el.hidden = empty; });
  $('[data-checkout]').hidden = empty;
  $('[data-cart-total]').textContent = money(subtotal());
  renderPromo();
}

function openCart() {
  hideToast();
  $('[data-cart-view]').hidden = false;
  $('[data-cart-done]').hidden = true;
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  window.mhAccount?.fillCheckout($('[data-checkout]'));
}
function closeCart() { if (dialog.open) dialog.close(); }

if (dialog) {
  $$('[data-open-cart]').forEach((b) => b.addEventListener('click', openCart));
  $$('[data-close-cart]').forEach((b) => b.addEventListener('click', closeCart));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeCart(); });
}

/* ---------------- Promo codes ---------------- */
function renderPromo() {
  const box = $('[data-promo]');
  if (!box) return;
  const empty = cart.length === 0;
  box.hidden = empty || !!promo;
  $$('[data-discount-row]').forEach((el) => { el.hidden = empty || !promo; });
  if (promo) {
    $('[data-promo-code]').textContent = `${promo.code}${promo.label ? ` · ${tMsg(promo.label)}` : ''}`;
    $('[data-discount]').textContent = `−${money(discount())}`;
    $('[data-grand-total]').textContent = money(grandTotal());
  }
}

async function applyPromo() {
  const input = $('[data-promo-input]');
  const msg = $('[data-promo-msg]');
  const btn = $('[data-promo-apply]');
  btn.disabled = true;
  msg.textContent = t('Checking…');
  msg.classList.remove('is-error');
  try {
    const res = await window.mhData.checkPromo(input.value, subtotal());
    if (!res?.ok) { msg.textContent = tMsg(res?.message || 'That code is not valid.'); msg.classList.add('is-error'); return; }
    promo = { code: res.code, discount: Number(res.discount) || 0, label: res.label || '' };
    input.value = '';
    msg.textContent = t('Code applied: you save {amount}.', { amount: money(discount()) });
    renderPromo();
  } catch {
    msg.textContent = t('Could not check the code. Please try again.');
    msg.classList.add('is-error');
  } finally {
    btn.disabled = false;
  }
}

// When the cart changes, a percentage code has to be worked out again
let recheckTimer;
function recheckPromo() {
  clearTimeout(recheckTimer);
  recheckTimer = setTimeout(async () => {
    if (!promo) return;
    if (!cart.length) { promo = null; renderPromo(); return; }
    try {
      const res = await window.mhData.checkPromo(promo.code, subtotal());
      if (res?.ok) { promo = { ...promo, discount: Number(res.discount) || 0 }; $('[data-promo-msg]').textContent = ''; }
      else { promo = null; $('[data-promo-msg]').textContent = tMsg(res?.message || 'The code no longer applies.'); }
    } catch { /* keep the code; checkout will show it */ }
    renderPromo();
  }, 250);
}

$('[data-promo-apply]')?.addEventListener('click', applyPromo);
$('[data-promo-input]')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } });
$('[data-promo-remove]')?.addEventListener('click', () => { promo = null; $('[data-promo-msg]').textContent = ''; renderPromo(); });

/* ---------------- Card payments (Stripe), once config.js turns them on ----------------
 * The order is saved first, so the database checks prices, promo code and stock, holds the
 * pieces and adds delivery. Then the create-checkout function opens a Stripe payment page for
 * exactly that order. Stripe tells the database when it is paid; an unpaid order cancels itself
 * after about 30 minutes and its pieces go back on sale. */
// (auth.js loads after this file, so don't wait for window.mhAccount here; it is there by checkout)
const cardPayments = () => !!(window.MH_CONFIG?.cardPayments && window.mhData.supabase);
let pending = null; // { token, key }: an order already saved whose payment page didn't open

async function openPayment(token) {
  const cfg = window.MH_CONFIG;
  const res = await fetch(`${cfg.supabaseUrl}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseAnonKey },
    body: JSON.stringify({ token, page: location.pathname }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(tMsg(body.error || 'The payment page could not be opened. Please try again.'));
  return body; // { url } or { paid: true }
}

function showDone(title, html) {
  $('[data-cart-view]').hidden = true;
  const done = $('[data-cart-done]');
  done.hidden = false;
  done.querySelector('.cart__done-title').textContent = t(title);
  // One paragraph in the visitor's language replaces the page's two (data-lang)
  const paras = [...done.querySelectorAll('p:not(.cart__done-title)')];
  paras.slice(1).forEach((p) => p.remove());
  paras[0].removeAttribute('data-lang');
  paras[0].innerHTML = html;
  done.querySelector('[data-pay-again]')?.remove();
}

if (cardPayments()) {
  const form = $('[data-checkout]');
  if (form) {
    form.querySelector('button[type=submit]').textContent = t('Continue to payment');
    const [legal, ...others] = form.querySelectorAll('.checkout__legal');
    others.forEach((p) => p.remove());
    legal?.removeAttribute('data-lang');
    if (legal) legal.innerHTML = t('Prices are in euro and include delivery in Latvia. You see the full total on the next page before you pay. Card payments are handled by Stripe. By ordering you accept our <a href="/terms">Terms of sale</a>. How we use your details: <a href="/privacy">Privacy policy</a>.');
  }
  // Back from the Stripe payment page
  const q = new URLSearchParams(location.search);
  const back = q.get('payment');
  if (back && dialog) {
    history.replaceState(null, '', location.pathname + location.hash);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    if (back === 'done') {
      cart = []; promo = null; save();
      showDone('Thank you, it’s paid', t('Order #{id} is paid. Stripe emails you a receipt, and we email you when it ships. Changed your mind? You can <a href="/withdraw">cancel</a> up to 14 days after it arrives.', { id: esc(q.get('order') || '') }));
    } else if (back === 'cancelled' && /^[0-9a-f-]{36}$/i.test(q.get('token') || '')) {
      const token = q.get('token');
      showDone('Payment not finished', `${esc(t('Your order is kept for about 30 minutes, then it cancels itself and nothing is charged.'))} <span data-pay-msg role="status"></span>`);
      const again = document.createElement('button');
      again.type = 'button';
      again.className = 'btn';
      again.dataset.payAgain = '';
      again.textContent = t('Pay now');
      again.onclick = async () => {
        again.disabled = true;
        try {
          const r = await openPayment(token);
          if (r.url) { location.assign(r.url); return; }
          showDone('Thank you, it’s paid', esc(t('This order is already paid. Stripe emailed you a receipt.')));
        } catch (err) {
          $('[data-pay-msg]').textContent = err.message;
          again.disabled = false;
        }
      };
      $('[data-cart-done] [data-close-cart]').before(again);
    }
  }
}

async function payByCard(order, msg) {
  const key = JSON.stringify(order);
  if (pending?.key !== key) {
    pending = null;
    const token = crypto.randomUUID();
    msg.textContent = t('Saving your order…');
    const error = await window.mhAccount.saveOrder({ ...order, pay_token: token });
    if (error) { msg.textContent = tMsg(error); msg.classList.add('is-error'); return; }
    pending = { token, key };
  }
  msg.textContent = t('Opening the payment page…');
  try {
    const r = await openPayment(pending.token);
    cart = []; promo = null; save();
    pending = null;
    if (r.url) { location.assign(r.url); return; }
    showDone('Thank you, it’s paid', esc(t('This order is already paid. Stripe emailed you a receipt.')));
  } catch (err) {
    msg.textContent = `${err.message} ${t('Your order is saved: press the button again to pay.')}`;
    msg.classList.add('is-error');
  }
}

/* ---------------- Checkout: the order is saved, and the database emails it ---------------- */
// In Latvian the country box starts as "Latvija" (the database reads it as Latvia)
if (LV) $$('[data-checkout] input[name=country]').forEach((i) => { if (i.defaultValue === 'Latvia') i.defaultValue = 'Latvija'; });
/* Phone: digits only, and as many as the chosen country code uses (national number,
 * without a leading 0). Codes not listed accept 6–15 digits. */
const PHONE_DIGITS = {
  '+371': [8, 8], '+370': [8, 8], '+372': [7, 8], '+44': [10, 10], '+1': [10, 10], '+91': [10, 10],
  '+355': [8, 9], '+376': [6, 9], '+43': [7, 13], '+375': [9, 9], '+32': [8, 9], '+387': [8, 9],
  '+359': [8, 9], '+385': [8, 9], '+357': [8, 8], '+420': [9, 9], '+45': [8, 8], '+358': [6, 11],
  '+33': [9, 9], '+49': [7, 12], '+30': [10, 10], '+36': [8, 9], '+354': [7, 7], '+353': [7, 9],
  '+39': [6, 11], '+383': [8, 9], '+423': [7, 9], '+352': [6, 11], '+356': [8, 8], '+373': [8, 8],
  '+377': [8, 9], '+382': [8, 9], '+31': [9, 9], '+389': [8, 8], '+47': [8, 8], '+48': [9, 9],
  '+351': [9, 9], '+40': [9, 9], '+7': [10, 10], '+378': [6, 10], '+381': [8, 10], '+421': [9, 9],
  '+386': [8, 8], '+34': [9, 9], '+46': [7, 10], '+41': [9, 9], '+90': [10, 10], '+380': [9, 9],
};
const cleanCode = (v) => { const d = String(v || '').replace(/\D/g, '').slice(0, 4); return d ? `+${d}` : ''; };
// The digits that count: a leading 0 (trunk prefix) is dropped, except in Italy where it belongs to the number
const nationalDigits = (v, code) => { const d = String(v || '').replace(/\D/g, ''); return code === '+39' ? d : d.replace(/^0/, ''); };
$$('[data-checkout]').forEach((form) => {
  const codeIn = form.elements.phone_code;
  const phoneIn = form.elements.phone;
  if (!codeIn || !phoneIn) return;
  phoneIn.setAttribute('inputmode', 'numeric');
  phoneIn.removeAttribute('pattern');
  codeIn.removeAttribute('pattern');
  const check = () => {
    const code = cleanCode(codeIn.value);
    const [min, max] = PHONE_DIGITS[code] || [6, 15];
    // Only digits and spaces, and no more digits than the country allows
    let kept = 0;
    const limit = max + (code !== '+39' && /^\s*0/.test(phoneIn.value) ? 1 : 0);
    const value = phoneIn.value.replace(/[^\d ]/g, '').replace(/\d/g, (d) => (++kept <= limit ? d : ''));
    if (value !== phoneIn.value) phoneIn.value = value;
    const n = nationalDigits(value, code).length;
    phoneIn.setCustomValidity(!value.trim() || (n >= min && n <= max) ? ''
      : min === max ? t('Phone numbers for {code} have {n} digits.', { code: code || '+…', n: min })
        : t('Phone numbers for {code} have {min}–{max} digits.', { code: code || '+…', min, max }));
  };
  codeIn.addEventListener('input', () => {
    const v = codeIn.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 5);
    if (v !== codeIn.value) codeIn.value = v;
    check();
  });
  phoneIn.addEventListener('input', check);
  check();
});
// Saved phone on the account page: "+", digits and spaces only
$$('[data-profile] input[name=phone]').forEach((i) => i.addEventListener('input', () => {
  const v = i.value.replace(/[^\d+ ]/g, '').replace(/(?!^)\+/g, '').slice(0, 22);
  if (v !== i.value) i.value = v;
}));

$('[data-checkout]')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = $('[data-checkout-msg]');
  const lines = cart.map((i) => ({ item: i, p: byId(i.id) })).filter((l) => l.p);
  form.elements.phone?.dispatchEvent(new Event('input')); // re-check a phone filled in from the account
  if (!form.reportValidity() || !lines.length) return;
  const data = Object.fromEntries(new FormData(form));
  if (data._honey) return;
  // Join country code and number: "+371 20 000 000"
  const code = cleanCode(data.phone_code);
  const number = nationalDigits(data.phone, code);
  data.phone = number ? `${code ? code + ' ' : ''}${number}` : '';
  const text = lines.map(({ item, p }) => `${item.qty} × ${p.name}${p.colour ? ` (${p.colour})` : ''}, size ${item.size}, ${money(item.qty * p.price)}`).join('\n');
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  msg.textContent = t('Sending your order…');
  const order = {
    items: lines.map(({ item, p }) => ({ id: p.id, name: p.name, colour: p.colour, size: item.size, qty: item.qty, price: p.price })),
    subtotal: subtotal(),
    promo_code: promo?.code || null,
    discount: discount(),
    total: grandTotal(),
    currency: SETTINGS.currency,
    lang: LV ? 'lv' : 'en', // the language of the order emails
    full_name: data.name, email: data.email, phone: data.phone || null,
    address: data.address, city: data.city, postcode: data.postcode, country: data.country, note: data.note || null,
  };
  if (cardPayments()) {
    msg.classList.remove('is-error');
    try { await payByCard(order, msg); } finally { button.disabled = false; }
    return;
  }
  const subject = `New order: ${totalQty()} item${totalQty() === 1 ? '' : 's'}, ${money(grandTotal())}`;
  const address = `${data.address}, ${data.postcode} ${data.city}, ${data.country}`;
  const promoText = promo ? `${promo.code} (−${money(discount())})` : '—';
  try {
    // Save the order in Supabase. The database then emails it to the shop and a copy
    // to the buyer (supabase/notify.sql), so no email is sent from the browser.
    const saved = await (window.mhAccount?.recordOrder(order) ?? Promise.resolve(false));
    if (!saved) throw new Error('not delivered');
    cart = [];
    promo = null;
    save();
    form.reset();
    msg.textContent = '';
    $('[data-promo-msg]') && ($('[data-promo-msg]').textContent = '');
    $('[data-cart-view]').hidden = true;
    $('[data-cart-done]').hidden = false;
  } catch {
    // Nothing reached the shop: let the buyer send the order themselves, already written out.
    const mail = `mailto:${SETTINGS.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `${text}\nSubtotal: ${money(subtotal())}\nPromo code: ${promoText}\nTotal: ${money(grandTotal())}\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || '—'}\nAddress: ${address}\nNote: ${data.note || '—'}`)}`;
    msg.innerHTML = t('The order could not be sent. Please try again, or <a href="{mail}">email the order to {email}</a>.', { mail: esc(mail), email: esc(SETTINGS.contactEmail) });
  } finally {
    button.disabled = false;
  }
});

/* ---------------- Newsletter ---------------- */
$('[data-subscribe]')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const input = form.email;
  const msg = $('[data-sub-msg]');
  const email = input.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = t('Enter a valid email address.'); input.focus(); return; }
  const button = form.querySelector('button');
  button.disabled = true;
  msg.textContent = t('Joining…');
  // Brevo form (double opt-in): Brevo emails a link to confirm the address
  if (SETTINGS.newsletterForm) {
    const body = new FormData();
    body.append('EMAIL', email);
    body.append('email_address_check', ''); // Brevo's own bot trap, must stay empty
    body.append('locale', LV ? 'lv' : 'en');
    try {
      const res = await fetch(`${SETTINGS.newsletterForm}?isAjax=1`, { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || res.status);
      form.reset();
      msg.textContent = t('Almost there: check your inbox and tap the link to confirm. Didn’t get it within a few minutes? Check your spam or promotions folder.');
    } catch (err) {
      if (err instanceof TypeError) {
        // Brevo could not be reached from the page: send the form the plain way, in a new tab
        const f = document.createElement('form');
        f.method = 'POST';
        f.action = SETTINGS.newsletterForm;
        f.target = '_blank';
        f.hidden = true;
        for (const [k, v] of body) f.append(Object.assign(document.createElement('input'), { type: 'hidden', name: k, value: v }));
        document.body.append(f);
        f.submit();
        f.remove();
        form.reset();
        msg.textContent = t('Almost there: check your inbox and tap the link to confirm. Didn’t get it within a few minutes? Check your spam or promotions folder.');
      } else {
        msg.textContent = t('That did not go through. Check the address and try again.');
      }
    } finally {
      button.disabled = false;
    }
    return;
  }
  msg.textContent = t('Sign-ups open soon.');
  button.disabled = false;
});

/* ---------------- Product gallery: swipe, arrows, thumbnails, keyboard ---------------- */
function initGallery(gal) {
  const track = $('[data-track]', gal);
  const slides = [...track.children];
  const thumbs = $$('[data-go]', gal);
  const prev = $('[data-prev]', gal);
  const next = $('[data-next]', gal);
  let at = 0;
  const go = (i) => {
    const k = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: k * track.clientWidth, behavior: reduced() ? 'auto' : 'smooth' });
  };
  const sync = () => {
    const k = Math.round(track.scrollLeft / track.clientWidth);
    if (k === at) return;
    at = k;
    const counter = $('[data-index]', gal);
    if (counter) counter.textContent = k + 1;
    thumbs.forEach((t, j) => t.classList.toggle('is-on', j === k));
    prev.disabled = k === 0;
    next.disabled = k === slides.length - 1;
  };
  let raf = 0;
  track.onscroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); };
  prev.onclick = () => go(at - 1);
  next.onclick = () => go(at + 1);
  thumbs.forEach((t) => t.addEventListener('click', () => go(Number(t.dataset.go))));
  track.onkeydown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); }
  };
  track.scrollLeft = 0;
  prev.disabled = true;
  next.disabled = slides.length < 2;
}

/* ---------------- Full-screen menu ---------------- */
const menuEl = $('[data-menu]');
if (menuEl) {
  $$('[data-open-menu]').forEach((b) => b.addEventListener('click', () => { if (menuEl.showModal) menuEl.showModal(); else menuEl.setAttribute('open', ''); }));
  $$('[data-close-menu]').forEach((b) => b.addEventListener('click', () => menuEl.close()));
  menuEl.addEventListener('click', (e) => { if (e.target.closest('a[href]')) menuEl.close(); });
}

/* ---------------- Phone buy bar on the product page ---------------- */
const sticky = $('[data-sticky]');
if (sticky && 'IntersectionObserver' in window && $('[data-add]')) {
  const addBtn = $('[data-add]');
  const stickyBtn = $('[data-sticky-add]');
  const io = new IntersectionObserver(([en]) => {
    const on = !en.isIntersecting && en.boundingClientRect.top < 0 && !isSoldOut(current);
    sticky.classList.toggle('is-on', on);
    sticky.setAttribute('aria-hidden', String(!on));
    stickyBtn.tabIndex = on ? 0 : -1;
  });
  io.observe(addBtn);
  stickyBtn.addEventListener('click', () => {
    const form = $('[data-buy]');
    if (new FormData(form).get('size')) { form.requestSubmit(); return; }
    $('[data-sizes]').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    $('[data-buy-msg]').textContent = t('Choose a size first.');
  });
}

/* ---------------- Motion: header clear over the landing photo, solid after; hides on scroll down ---------------- */
const bar = $('[data-bar]');
const landing = $('.landing');
if (bar) {
  let lastY = scrollY; let ticking = false; let hidden = false;
  const update = () => {
    const y = scrollY;
    bar.classList.toggle('is-solid', !landing || y > landing.offsetHeight - bar.offsetHeight);
    const hide = y > lastY && y > 300 && !(dialog && dialog.open) && !(menuEl && menuEl.open);
    if (hide !== hidden || hide !== bar.classList.contains('is-hidden')) { hidden = hide; bar.classList.toggle('is-hidden', hide); }
    lastY = y; ticking = false;
  };
  update();
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
}

/* ---------------- Sections rise into view ---------------- */
const revealer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); revealer.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' })
  : null;
function reveal(el) { if (revealer) revealer.observe(el); else el.classList.add('is-in'); }
$$('[data-reveal-group]').forEach((g) => [...g.children].forEach((el, i) => el.style.setProperty('--d', `${i * 80}ms`)));
$$('[data-reveal], [data-reveal-group]').forEach(reveal);

/* ---------------- Back to top, year, credit ---------------- */
$$('[data-top]').forEach((b) => b.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
}));
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
console.log('%cMOYEN HILLS%c  Designed & built by Archit Gajjar', 'font-weight:800;letter-spacing:.1em', 'color:#888');

/* ---------------- Start: load the products, then draw everything ---------------- */
renderCart(); // the bag count shows straight away from the saved cart
window.mhData.catalog.then(({ products }) => {
  PRODUCTS = products;
  cart = cart.filter((i) => byId(i.id) && sizesOf(byId(i.id)).some((s) => s.size === i.size));
  const wanted = new URLSearchParams(location.search).get('id');
  current = $('[data-pdp]') && wanted ? byId(wanted) || null : featured() || null;
  renderCommon(current);
  renderFeature(featured());
  renderShop();
  renderProductPage(current);
  renderCart();
  document.documentElement.classList.add('is-loaded');
});
