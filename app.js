/* MOYEN HILLS store
 * ---------------------------------------------------------------------------
 * Edit SETTINGS and PRODUCT below to change the price, sizes or stock.
 * Set `soldOut: true` on the product (or set every size to 0) and the page
 * shows the pictures in black and white with "SOLD OUT, DONT BE LATE".
 */
const SETTINGS = {
  currency: 'EUR',
  // New orders are emailed here (via formsubmit.co, no server needed).
  orderEmail: 'markuss.suna.veid@gmail.com',
  // New newsletter sign-ups are emailed here.
  subscribeEmail: 'moyenhills@gmail.com',
};

const PRODUCT = {
  id: 'art-will-save-us-all-tee',
  name: 'Art Will Save Us All tee',
  price: 45,
  image: 'images/tee-front.jpg',
  soldOut: false,
  // Pieces left per size. 0 = that size is sold out.
  stock: { S: 10, M: 10, L: 10, XL: 10 },
};

/* ------------------------------------------------------------------------- */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: SETTINGS.currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
const endpoint = (email) => `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;

const store = {
  read() { try { return JSON.parse(localStorage.getItem('mh-cart') || '[]'); } catch { return []; } },
  write(items) { try { localStorage.setItem('mh-cart', JSON.stringify(items)); } catch { /* private mode: cart lives in memory */ } },
};
let cart = store.read().filter((i) => i.id === PRODUCT.id && PRODUCT.stock[i.size] !== undefined);

const isSoldOut = () => PRODUCT.soldOut || Object.values(PRODUCT.stock).every((n) => n <= 0);

/* Product */
function renderProduct() {
  $$('[data-price]').forEach((el) => { el.textContent = money(PRODUCT.price); });
  const soldOut = isSoldOut();
  document.body.classList.toggle('is-soldout', soldOut);
  $('[data-soldout-note]').hidden = !soldOut;

  const row = $('[data-sizes]');
  row.innerHTML = '';
  let firstAvailable = null;
  for (const [size, left] of Object.entries(PRODUCT.stock)) {
    const label = document.createElement('label');
    label.className = 'size';
    const off = soldOut || left <= 0;
    label.innerHTML = `<input type="radio" name="size" value="${size}" ${off ? 'disabled' : ''}><span>${size}</span>`;
    if (off) label.title = `${size} is sold out`;
    if (!off && !firstAvailable) firstAvailable = label.querySelector('input');
    row.append(label);
  }
  const add = $('[data-add]');
  add.disabled = soldOut;
  add.textContent = soldOut ? 'Sold out' : 'Add to cart';
  const heroBtn = $('.hero__buy .btn');
  if (soldOut) heroBtn.textContent = 'See the tee';
}

$('[data-buy]').addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = $('[data-buy-msg]');
  const size = new FormData(e.target).get('size');
  if (!size) { msg.textContent = 'Pick a size first.'; return; }
  const line = cart.find((i) => i.size === size);
  const inCart = line ? line.qty : 0;
  if (inCart >= PRODUCT.stock[size]) { msg.textContent = `No more ${size} left.`; return; }
  if (line) line.qty += 1; else cart.push({ id: PRODUCT.id, size, qty: 1 });
  save();
  msg.textContent = `Added: ${PRODUCT.name}, size ${size}.`;
  const count = $('[data-cart-count]');
  count.classList.add('bump');
  setTimeout(() => count.classList.remove('bump'), 300);
});

/* Cart */
const dialog = $('[data-cart]');
const totalQty = () => cart.reduce((n, i) => n + i.qty, 0);
const total = () => cart.reduce((n, i) => n + i.qty * PRODUCT.price, 0);

function save() { store.write(cart); renderCart(); }

function renderCart() {
  $('[data-cart-count]').textContent = totalQty();
  const list = $('[data-cart-items]');
  list.innerHTML = '';
  for (const item of cart) {
    const li = document.createElement('li');
    li.className = 'cart__item';
    li.innerHTML = `
      <img src="${PRODUCT.image}" alt="" width="84" height="104">
      <div>
        <p class="cart__item-name">${PRODUCT.name}</p>
        <p class="cart__item-meta">Size ${item.size} · ${money(PRODUCT.price)}</p>
        <div class="qty">
          <button type="button" data-dec aria-label="One less">−</button>
          <span>${item.qty}</span>
          <button type="button" data-inc aria-label="One more">+</button>
        </div>
      </div>
      <button type="button" class="link cart__remove" data-remove>remove</button>`;
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
  const lines = cart.map((i) => `${i.qty} × ${PRODUCT.name}, size ${i.size}, ${money(i.qty * PRODUCT.price)}`).join('\n');
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  msg.textContent = 'Sending your order…';
  try {
    const res = await fetch(endpoint(SETTINGS.orderEmail), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `New order: ${totalQty()} × MOYEN HILLS tee, ${money(total())}`,
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
$('[data-subscribe]').addEventListener('submit', async (e) => {
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
$$('[data-top]').forEach((b) => b.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}));
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* Entrances: each section's parts rise in turn */
const reveal = $$('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const group = entry.target.closest('section, footer') || document.body;
      $$('.reveal:not(.in)', group).forEach((el, i) => {
        el.style.setProperty('--d', `${Math.min(i, 6) * 75}ms`);
        el.classList.add('in');
        io.unobserve(el);
      });
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  reveal.forEach((el) => io.observe(el));
} else {
  reveal.forEach((el) => el.classList.add('in'));
}

renderProduct();
renderCart();
