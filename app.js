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
  // Shown to buyers if an order cannot be sent.
  contactEmail: 'moyenhills@gmail.com',
};

const PRODUCT = {
  id: 'art-will-tee',
  name: 'ART WILL TEE',
  colour: 'White',
  price: 35,
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

  // Honest scarcity: counts what is really left, from PRODUCT.stock
  const left = Object.values(PRODUCT.stock).reduce((n, v) => n + Math.max(0, v), 0);
  $$('[data-stock-left]').forEach((el) => {
    el.hidden = soldOut;
    $('[data-stock-text]', el).textContent = left <= 10 ? `Almost gone — only ${left} left` : `Limited stock — only ${left} left`;
  });

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
    const note = $('[data-size-note]');
    if (note) {
      row.addEventListener('change', (e) => {
        const n = PRODUCT.stock[e.target.value];
        note.textContent = n > 0 && n <= 3 ? `Only ${n} left in ${e.target.value}` : '';
      });
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
    if (!size) { msg.textContent = 'Choose a size first.'; return; }
    msg.textContent = addToCart(size) || `Added to cart: ${PRODUCT.name}, size ${size}.`;
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
  $('[data-bar]')?.classList.remove('is-hidden'); // bring the header back so the bag count is visible
  const count = $('[data-cart-count]');
  count.classList.add('bump');
  setTimeout(() => count.classList.remove('bump'), 350);
}

/* Cart */
const dialog = $('[data-cart]');
function save() { store.write(cart); renderCart(); }

function renderCart() {
  $$('[data-cart-count]').forEach((el) => { el.textContent = totalQty(); });
  $$('[data-open-cart].bar__cart').forEach((el) => el.setAttribute('aria-label', `Open cart, ${totalQty()} item${totalQty() === 1 ? '' : 's'}`));
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
  window.mhAccount?.fillCheckout($('[data-checkout]'));
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
  // Join country code and number: "+371 20 000 000"
  const code = (data.phone_code || '').replace(/[^\d+]/g, '').replace(/^(?!\+)/, '+');
  data.phone = data.phone ? `${code.length > 1 ? code + ' ' : ''}${data.phone.trim()}` : '';
  const lines = cart.map((i) => `${i.qty} × ${PRODUCT.name} (${PRODUCT.colour}), size ${i.size}, ${money(i.qty * PRODUCT.price)}`).join('\n');
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  msg.textContent = 'Sending your order…';
  const order = {
    items: cart.map((i) => ({ name: PRODUCT.name, colour: PRODUCT.colour, size: i.size, qty: i.qty, price: PRODUCT.price })),
    subtotal: total(),
    currency: SETTINGS.currency,
    full_name: data.name, email: data.email, phone: data.phone || null,
    address: data.address, city: data.city, postcode: data.postcode, country: data.country, note: data.note || null,
  };
  const subject = `New order: ${totalQty()} × ${PRODUCT.name}, ${money(total())}`;
  const address = `${data.address}, ${data.postcode} ${data.city}, ${data.country}`;
  try {
    // 1. Email the owner. FormSubmit answers 200 even when it did not send
    //    (for example before the address is activated), so check `success`.
    const emailed = fetch(endpoint(SETTINGS.orderEmail), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: subject,
        _template: 'table',
        _replyto: data.email,
        Order: lines,
        Subtotal: money(total()),
        Name: data.name,
        Email: data.email,
        Phone: data.phone || '—',
        Address: address,
        Note: data.note || '—',
      }),
    }).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok || String(body.success) !== 'true') throw new Error(body.message || res.status);
      return true;
    }).catch((err) => { console.warn('Order email not sent:', err.message); return false; });
    // 2. Store the order in Supabase (every order, signed in or guest), once accounts are set up.
    const stored = window.mhAccount?.recordOrder(order) ?? Promise.resolve(false);
    const [sent, saved] = await Promise.all([emailed, stored]);
    if (!sent && !saved) throw new Error('not delivered');
    cart = [];
    save();
    form.reset();
    msg.textContent = '';
    $('[data-cart-view]').hidden = true;
    $('[data-cart-done]').hidden = false;
  } catch {
    // Nothing reached the shop: let the buyer send the order themselves, already written out.
    const mail = `mailto:${SETTINGS.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `${lines}\nSubtotal: ${money(total())}\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || '—'}\nAddress: ${address}\nNote: ${data.note || '—'}`)}`;
    msg.innerHTML = `The order could not be sent. Please try again, or <a href="${mail}">email the order to ${SETTINGS.contactEmail}</a>.`;
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
  msg.textContent = 'Joining…';
  try {
    const res = await fetch(endpoint(SETTINGS.subscribeEmail), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ _subject: 'New member of the Hills family', _template: 'table', Email: email, _replyto: email }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || String(body.success) !== 'true') throw new Error(body.message || res.status);
    form.reset();
    msg.textContent = 'Welcome to the Hills family. New drops and news will come to your inbox.';
  } catch {
    msg.textContent = 'That did not go through. Please try again in a moment.';
  } finally {
    button.disabled = false;
  }
});

/* Product gallery: swipe, arrows, thumbnails, keyboard */
const gal = $('[data-gallery]');
if (gal) {
  const track = $('[data-track]', gal);
  const slides = [...track.children];
  const thumbs = $$('[data-go]', gal);
  const prev = $('[data-prev]', gal);
  const next = $('[data-next]', gal);
  const counter = $('[data-index]', gal);
  let current = 0;
  const go = (i) => {
    const k = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: k * track.clientWidth, behavior: reduced() ? 'auto' : 'smooth' });
  };
  const sync = () => {
    const k = Math.round(track.scrollLeft / track.clientWidth);
    if (k === current) return;
    current = k;
    counter.textContent = k + 1;
    thumbs.forEach((t, j) => t.classList.toggle('is-on', j === k));
    prev.disabled = k === 0;
    next.disabled = k === slides.length - 1;
  };
  let raf = 0;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  thumbs.forEach((t) => t.addEventListener('click', () => go(Number(t.dataset.go))));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
  });
  prev.disabled = true;
}

/* Full-screen menu */
const menuEl = $('[data-menu]');
if (menuEl) {
  $$('[data-open-menu]').forEach((b) => b.addEventListener('click', () => { if (menuEl.showModal) menuEl.showModal(); else menuEl.setAttribute('open', ''); }));
  $$('[data-close-menu]').forEach((b) => b.addEventListener('click', () => menuEl.close()));
  menuEl.addEventListener('click', (e) => { if (e.target.closest('a[href]')) menuEl.close(); });
}

/* Phone buy bar on the product page: shows once the main button scrolls away */
const sticky = $('[data-sticky]');
if (sticky && 'IntersectionObserver' in window) {
  const addBtn = $('[data-add]');
  const stickyBtn = $('[data-sticky-add]');
  const io = new IntersectionObserver(([en]) => {
    const on = !en.isIntersecting && en.boundingClientRect.top < 0 && !isSoldOut();
    sticky.classList.toggle('is-on', on);
    sticky.setAttribute('aria-hidden', String(!on));
    stickyBtn.tabIndex = on ? 0 : -1;
  });
  io.observe(addBtn);
  stickyBtn.addEventListener('click', () => {
    const form = $('[data-buy]');
    if (new FormData(form).get('size')) { form.requestSubmit(); return; }
    $('[data-sizes]').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    $('[data-buy-msg]').textContent = 'Choose a size first.';
  });
}

/* Motion: header clear over the landing photo, solid after it; hides on scroll down */
const bar = $('[data-bar]');
const landing = $('.landing');
if (bar) {
  let lastY = scrollY; let ticking = false; let hidden = false;
  const update = () => {
    const y = scrollY;
    bar.classList.toggle('is-solid', !landing || y > landing.offsetHeight - bar.offsetHeight);
    const hide = y > lastY && y > 300 && !dialog.open && !(menuEl && menuEl.open);
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

/* Sections rise into view */
const reveals = $$('[data-reveal], [data-reveal-group]');
if ('IntersectionObserver' in window && reveals.length) {
  $$('[data-reveal-group]').forEach((g) => [...g.children].forEach((el, i) => el.style.setProperty('--d', `${i * 80}ms`)));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-in'));
}

/* Back to top */
$$('[data-top]').forEach((b) => b.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
}));
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

renderProduct();
renderCart();
