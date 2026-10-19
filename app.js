/* MOYEN HILLS store
 * ---------------------------------------------------------------------------
 * Edit SETTINGS and PRODUCT below to change the price, sizes or stock.
 * Set `soldOut: true` on the product (or set every size to 0) and the site
 * shows the product photos in black and white with "SOLD OUT, DONT BE LATE".
 */
const SETTINGS = {
  currency: 'EUR',
  // New orders are emailed here (via formsubmit.co, no server needed).
  orderEmail: 'markuss.suna.veid@gmail.com',
  // New newsletter sign-ups are emailed here.
  subscribeEmail: 'moyenhills@gmail.com',
};

const PRODUCT = {
  id: 'art-will-tee',
  name: 'ART WILL TEE',
  colour: 'White',
  price: 45,
  image: 'images/flat-front.jpg',
  url: 'product.html',
  soldOut: false,
  // Pieces left per size. 0 = that size is sold out.
  stock: { S: 10, M: 10, L: 10, XL: 10 },
};

/* ------------------------------------------------------------------------- */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: SETTINGS.currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
const endpoint = (email) => `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = {
  read() { try { return JSON.parse(localStorage.getItem('mh-cart') || '[]'); } catch { return []; } },
  write(items) { try { localStorage.setItem('mh-cart', JSON.stringify(items)); } catch { /* private mode: cart lives in memory */ } },
};
let cart = store.read().filter((i) => i.id === PRODUCT.id && PRODUCT.stock[i.size] !== undefined);

const isSoldOut = () => PRODUCT.soldOut || Object.values(PRODUCT.stock).every((n) => n <= 0);
const sizeOff = (size) => isSoldOut() || PRODUCT.stock[size] <= 0;
const totalQty = () => cart.reduce((n, i) => n + i.qty, 0);
const total = () => cart.reduce((n, i) => n + i.qty * PRODUCT.price, 0);

/* Add a size to the cart; returns an error message or '' */
function addToCart(size) {
  if (sizeOff(size)) return `${size} is sold out.`;
  const line = cart.find((i) => i.size === size);
  if ((line ? line.qty : 0) >= PRODUCT.stock[size]) return `No more ${size} left.`;
  if (line) line.qty += 1; else cart.push({ id: PRODUCT.id, size, qty: 1 });
  save();
  bumpCount();
  showToast(`${PRODUCT.name} · ${PRODUCT.colour} · ${size}`);
  return '';
}

/* Product (card on home, buy box on the product page) */
function renderProduct() {
  $$('[data-price]').forEach((el) => { el.textContent = money(PRODUCT.price); });
  $$('[data-product-name]').forEach((el) => { el.textContent = PRODUCT.name; });
  const soldOut = isSoldOut();
  document.body.classList.toggle('is-soldout', soldOut);
  $$('[data-soldout-note]').forEach((el) => { el.hidden = !soldOut; });

  const quick = $('[data-quick-sizes]');
  if (quick) {
    quick.innerHTML = '';
    for (const size of Object.keys(PRODUCT.stock)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = size;
      b.disabled = sizeOff(size);
      b.setAttribute('aria-label', b.disabled ? `${size}, sold out` : `Add size ${size} to cart`);
      b.addEventListener('click', () => addToCart(size));
      quick.append(b);
    }
    $('[data-quick] p').textContent = soldOut ? 'Sold out' : 'Quick add';
  }

  const row = $('[data-sizes]');
  if (row) {
    row.innerHTML = '';
    for (const size of Object.keys(PRODUCT.stock)) {
      const label = document.createElement('label');
      label.className = 'size';
      label.innerHTML = `<input type="radio" name="size" value="${size}" ${sizeOff(size) ? 'disabled' : ''}><span>${size}</span>`;
      if (sizeOff(size)) label.title = `${size} is sold out`;
      row.append(label);
    }
    const add = $('[data-add]');
    add.disabled = soldOut;
    add.textContent = soldOut ? 'Sold out' : 'Add to cart';
  }
}

const buy = $('[data-buy]');
if (buy) {
  buy.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = $('[data-buy-msg]');
    const size = new FormData(buy).get('size');
    msg.textContent = size ? addToCart(size) : 'Choose a size first.';
  });
}

/* Toast */
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
  const count = $('[data-cart-count]');
  count.classList.add('bump');
  setTimeout(() => count.classList.remove('bump'), 350);
}

/* Cart */
const dialog = $('[data-cart]');
function save() { store.write(cart); renderCart(); }

function renderCart() {
  $$('[data-cart-count]').forEach((el) => { el.textContent = totalQty(); });
  const list = $('[data-cart-items]');
  list.innerHTML = '';
  for (const item of cart) {
    const li = document.createElement('li');
    li.className = 'cart__item';
    li.innerHTML = `
      <img src="${PRODUCT.image}" alt="" width="84" height="108">
      <div>
        <p class="cart__item-name">${PRODUCT.name}</p>
        <p class="cart__item-meta">${PRODUCT.colour} · ${item.size} · ${money(PRODUCT.price)}</p>
        <div class="qty">
          <button type="button" data-dec aria-label="One less">−</button>
          <span>${item.qty}</span>
          <button type="button" data-inc aria-label="One more">+</button>
        </div>
      </div>
      <button type="button" class="link-u" data-remove>Remove</button>`;
    li.querySelector('[data-dec]').onclick = () => { item.qty -= 1; if (item.qty < 1) cart = cart.filter((i) => i !== item); save(); };
    li.querySelector('[data-inc]').onclick = () => { if (item.qty < PRODUCT.stock[item.size]) { item.qty += 1; save(); } };
    li.querySelector('[data-remove]').onclick = () => { cart = cart.filter((i) => i !== item); save(); };
    list.append(li);
  }
  const empty = cart.length === 0;
  $('[data-cart-empty]').hidden = !empty;
  $$('[data-cart-total-row]').forEach((el) => { el.hidden = empty; });
  $('[data-checkout]').hidden = empty;
  $('[data-cart-total]').textContent = money(total());
}

function openCart() {
  hideToast();
  $('[data-cart-view]').hidden = false;
  $('[data-cart-done]').hidden = true;
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}
function closeCart() { if (dialog.open) dialog.close(); }

$$('[data-open-cart]').forEach((b) => b.addEventListener('click', openCart));
$$('[data-close-cart]').forEach((b) => b.addEventListener('click', closeCart));
dialog.addEventListener('click', (e) => { if (e.target === dialog) closeCart(); });

/* Checkout: the order is emailed to the shop owner */
$('[data-checkout]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = $('[data-checkout-msg]');
  if (!form.reportValidity() || !cart.length) return;
  const data = Object.fromEntries(new FormData(form));
  if (data._honey) return;
  const lines = cart.map((i) => `${i.qty} × ${PRODUCT.name} (${PRODUCT.colour}), size ${i.size}, ${money(i.qty * PRODUCT.price)}`).join('\n');
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  msg.textContent = 'Sending your order…';
  try {
    const res = await fetch(endpoint(SETTINGS.orderEmail), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `New order: ${totalQty()} × ${PRODUCT.name}, ${money(total())}`,
        _template: 'table',
        _replyto: data.email,
        Order: lines,
        Subtotal: money(total()),
        Name: data.name,
        Email: data.email,
        Phone: data.phone || '—',
        Address: `${data.address}, ${data.postcode} ${data.city}, ${data.country}`,
        Note: data.note || '—',
      }),
    });
    if (!res.ok) throw new Error(res.status);
    cart = [];
    save();
    form.reset();
    msg.textContent = '';
    $('[data-cart-view]').hidden = true;
    $('[data-cart-done]').hidden = false;
  } catch {
    msg.innerHTML = 'The order could not be sent. Please try again, or email it to <a href="mailto:moyenhills@gmail.com">moyenhills@gmail.com</a>.';
  } finally {
    button.disabled = false;
  }
});

/* Newsletter */
$('[data-subscribe]')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const input = form.email;
  const msg = $('[data-sub-msg]');
  const email = input.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Enter a valid email address.'; input.focus(); return; }
  const button = form.querySelector('button');
  button.disabled = true;
  msg.textContent = 'Subscribing…';
  try {
    const res = await fetch(endpoint(SETTINGS.subscribeEmail), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ _subject: 'New subscriber: MOYEN HILLS news', _template: 'table', Email: email, _replyto: email }),
    });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    msg.textContent = 'You are subscribed. News and drops come to your inbox.';
  } catch {
    msg.textContent = 'That did not go through. Please try again in a moment.';
  } finally {
    button.disabled = false;
  }
});

/* Back to top */
$$('[data-top]').forEach((b) => b.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
}));
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

renderProduct();
renderCart();
