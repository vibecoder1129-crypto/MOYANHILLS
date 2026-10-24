/* MOYEN HILLS — customer accounts
 * Sign-in with Google, Apple or email (Supabase Auth), saved details and
 * order history. Loaded on every page after config.js and vendor/supabase.js;
 * does nothing until config.js has the Supabase URL and key.
 */
(() => {
  const cfg = window.MH_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = window.mhT || ((en, v) => (v ? en.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : en));
  const tMsg = window.mhTMessage || ((m) => m);
  const LV = window.mhLang === 'lv';
  const money = (n, cur = 'EUR') => new Intl.NumberFormat(LV ? 'lv-LV' : 'en-IE', { style: 'currency', currency: cur, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  const sb = window.mhData?.supabase || null; // created in data.js
  const enabled = !!sb;
  const FIELDS = ['full_name', 'phone', 'address', 'city', 'postcode', 'country'];

  const state = { user: null, profile: null };

  async function loadProfile() {
    if (!state.user) { state.profile = null; return null; }
    const { data } = await sb.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
    state.profile = data || { id: state.user.id, full_name: state.user.user_metadata?.full_name || state.user.user_metadata?.name || '' };
    return state.profile;
  }

  async function saveProfile(values) {
    const row = { id: state.user.id, updated_at: new Date().toISOString() };
    FIELDS.forEach((k) => { if (values[k] !== undefined) row[k] = String(values[k]).trim(); });
    const { error } = await sb.from('profiles').upsert(row);
    if (error) throw error;
    state.profile = { ...state.profile, ...row };
  }

  function markHeader() {
    document.querySelectorAll('[data-account-link]').forEach((a) => {
      a.classList.toggle('is-signed-in', !!state.user);
      a.setAttribute('aria-label', t(state.user ? 'Your account' : 'Sign in or create an account'));
    });
  }

  /* Used by the cart (app.js) */
  window.mhAccount = {
    enabled,
    get user() { return state.user; },
    // Fill the checkout form with saved details
    fillCheckout(form) {
      if (!state.user || !form) return;
      const p = state.profile || {};
      const set = (name, v) => { const el = form.elements[name]; if (el && !el.value && v) el.value = v; };
      set('name', p.full_name); set('email', state.user.email);
      // Saved phone "+371 20000000" goes back into the two boxes
      const m = String(p.phone || '').trim().match(/^(\+\d{1,4})\s+(.*)$/);
      if (m && form.elements.phone_code) { form.elements.phone_code.value = m[1]; set('phone', m[2]); } else set('phone', p.phone);
      set('address', p.address); set('city', p.city); set('postcode', p.postcode);
      if (p.country && form.elements.country) form.elements.country.value = p.country;
      const note = $('[data-checkout-account]', form.closest('dialog') || document);
      if (note) note.hidden = false;
    },
    // Store the order (on the account if signed in, as a guest order if not).
    // Resolves true when the order was saved.
    async recordOrder(order) {
      return !(await this.saveOrder(order));
    },
    // The same, resolving the database's message ('M is sold out.') when it was not saved, or ''
    async saveOrder(order) {
      if (!enabled) return t('Orders can’t be saved right now.');
      let { error } = await sb.from('orders').insert({ user_id: state.user?.id ?? null, ...order });
      // Database not updated for languages yet (supabase/schema.sql): save the order without it
      if (error && /\blang\b/.test(error.message)) {
        const { lang, ...rest } = order;
        ({ error } = await sb.from('orders').insert({ user_id: state.user?.id ?? null, ...rest }));
      }
      // Database not updated for gift notes yet (supabase/features.sql): save the order without it
      if (error && /gift_note/.test(error.message)) {
        const { gift_note: _, ...rest } = order;
        ({ error } = await sb.from('orders').insert({ user_id: state.user?.id ?? null, ...rest }));
      }
      if (error) console.warn('Order not saved:', error.message);
      if (state.user) {
        try {
          await saveProfile({ full_name: order.full_name, phone: order.phone, address: order.address, city: order.city, postcode: order.postcode, country: order.country });
        } catch (e) { console.warn('Details not saved:', e.message); }
      }
      return error ? tMsg(error.message) : '';
    },
  };

  /* ---------------- Account page ---------------- */
  const page = $('[data-account]');
  const views = page ? {
    off: $('[data-view="off"]', page),
    signin: $('[data-view="signin"]', page),
    reset: $('[data-view="reset"]', page),
    account: $('[data-view="account"]', page),
  } : {};
  const show = (name) => Object.entries(views).forEach(([k, el]) => { if (el) el.hidden = k !== name; });
  const say = (sel, text, isError) => { const el = $(sel, page); if (el) { el.textContent = text; el.classList.toggle('is-error', !!isError); } };

  // Parcel tracking (supabase/tracking.sql). Same carriers and links as admin.js.
  const CARRIERS = { dpd: 'DPD', omniva: 'Omniva', latvijas_pasts: 'Latvijas Pasts', venipak: 'Venipak', dhl: 'DHL' };
  const trackUrl = (c, n) => (c === 'dpd' ? `https://tracking.dpd.de/status/en_US/parcel/${encodeURIComponent(n)}`
    : c === 'dhl' ? `https://www.dhl.com/lv-en/home/tracking.html?tracking-id=${encodeURIComponent(n)}`
    : `https://t.17track.net/en#nums=${encodeURIComponent(n)}`);
  const TRACK_STATUS = {
    InfoReceived: 'Label created', InTransit: 'On its way', OutForDelivery: 'Out for delivery',
    AvailableForPickup: 'Ready to pick up', DeliveryFailure: 'Delivery attempt failed', Exception: 'Delivery problem',
  };
  function tracking(o) {
    if (!o.tracking_number && !o.shipped_at) return '';
    const day = (d) => new Date(d).toLocaleDateString(LV ? 'lv-LV' : 'en-GB', { day: 'numeric', month: 'short' });
    const when = o.delivered_at ? t('Delivered {date}', { date: day(o.delivered_at) }) : o.shipped_at ? t('Shipped {date}', { date: day(o.shipped_at) }) : '';
    const parcel = o.tracking_number ? `${esc(CARRIERS[o.carrier] || t('Parcel'))} ${esc(o.tracking_number)}` : '';
    const link = o.tracking_number && !o.delivered_at ? `<a href="${esc(trackUrl(o.carrier, o.tracking_number))}" target="_blank" rel="noopener">${esc(t('Track your parcel'))} ↗</a>` : '';
    // Live status from 17TRACK (supabase/functions/track-parcels), while the parcel is on its way
    const live = !o.delivered_at && TRACK_STATUS[o.track_status] ? t(TRACK_STATUS[o.track_status]) : '';
    const ev = o.track_event || {};
    const scan = live && ev.text ? `<span class="order__scan">${esc([ev.time ? day(ev.time) : '', ev.place, ev.text].filter(Boolean).join(' · '))}</span>` : '';
    return `<p class="order__track"><span>${[esc(when), parcel].filter(Boolean).join(' · ')}</span>${live ? `<b class="order__live">${esc(live)}</b>` : ''}${scan}${link}</p>`;
  }

  async function renderAccount() {
    const p = await loadProfile();
    $('[data-hello]', page).textContent = p?.full_name ? t('Hi, {name}', { name: p.full_name.split(' ')[0] }) : t('Your account');
    $('[data-email]', page).textContent = state.user.email || '';
    const form = $('[data-profile]', page);
    FIELDS.forEach((k) => { if (form.elements[k]) form.elements[k].value = p?.[k] || (k === 'country' ? (LV ? 'Latvija' : 'Latvia') : ''); });

    const list = $('[data-orders]', page);
    list.innerHTML = `<li class="orders__empty">${esc(t('Loading your orders…'))}</li>`;
    const { data, error } = await sb.from('orders').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false });
    if (error) { list.innerHTML = `<li class="orders__empty">${esc(t('Could not load your orders.'))} ${esc(error.message)}</li>`; return; }
    if (!data.length) { list.innerHTML = `<li class="orders__empty">${esc(t('No orders yet.'))} <a href="/shop">${esc(t('Visit the shop'))}</a></li>`; return; }
    // Reviews: once an order is sent, each piece in it can be reviewed (on its newest order only)
    const { data: mine, error: rvError } = await sb.from('reviews').select('product_id, rating, name, body, photo, status');
    myReviews = Object.fromEntries((rvError ? [] : mine).map((r) => [r.product_id, r]));
    const offered = new Set();
    const reviewLine = (o) => {
      if (rvError || !['shipped', 'delivered'].includes(o.status)) return '';
      const items = (o.items || []).filter((i) => i.id && !offered.has(i.id) && offered.add(i.id));
      return items.map((i) => {
        const r = myReviews[i.id];
        const state = r && t({ pending: 'Waiting for approval', approved: 'On the site', hidden: 'Not shown' }[r.status]);
        return `<p class="order__review">${r
          ? `<span>${esc(t('Your review of {name}', { name: i.name }))}: ${'★'.repeat(r.rating)} · ${esc(state)}</span><button type="button" class="acct__link" data-write-review="${esc(i.id)}" data-review-name="${esc(i.name)}">${esc(t('Edit'))}</button>`
          : `<span>${esc(t('How is your {name}?', { name: i.name }))}</span><button type="button" class="acct__link" data-write-review="${esc(i.id)}" data-review-name="${esc(i.name)}">${esc(t('Write a review'))}</button>`}</p>`;
      }).join('');
    };
    list.innerHTML = data.map((o) => {
      const items = (o.items || []).map((i) => `${esc(i.qty)} × ${esc(i.name)}, ${esc(t('size {size}', { size: i.size }))}`).join('<br>');
      const date = new Date(o.created_at).toLocaleDateString(LV ? 'lv-LV' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `<li class="order">
        <div class="order__top"><span>${esc(t('Order #{id}', { id: o.id }))}</span><span class="order__status order__status--${esc(o.status)}">${esc(t(o.status))}</span></div>
        <p class="order__items">${items}</p>
        <div class="order__bottom"><span>${esc(date)}</span><b>${esc(money(Number(o.total ?? o.subtotal), o.currency))}</b></div>
        ${tracking(o)}
        ${reviewLine(o)}
      </li>`;
    }).join('');
  }

  /* ---------------- Reviews with a photo (supabase/features.sql) ---------------- */
  let myReviews = {};
  const rvDialog = $('[data-review-dialog]');
  const rvForm = $('[data-review-form]');
  let rvProduct = null;
  const rvSay = (text, bad) => { const el = $('[data-review-msg]', rvForm); el.textContent = text; el.classList.toggle('is-error', !!bad); };
  const paintStars = () => {
    const n = Number(rvForm.elements.rating.value) || 0;
    rvForm.querySelectorAll('[data-review-stars] label').forEach((l, i) => l.classList.toggle('is-on', i < n));
  };

  // Photos are redrawn at up to 1600 px as JPEG: smaller uploads, and the redraw drops
  // the photo's hidden details (such as where it was taken)
  async function shrink(file) {
    let img;
    try { img = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { img = null; }
    if (!img) throw new Error(t('That photo could not be used. Try a JPG or PNG.'));
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error(t('That photo could not be used. Try a JPG or PNG.')))), 'image/jpeg', 0.85));
  }

  if (page && enabled && rvDialog) {
    page.addEventListener('click', (e) => {
      const b = e.target.closest('[data-write-review]');
      if (!b) return;
      rvProduct = b.dataset.writeReview;
      const r = myReviews[rvProduct];
      rvForm.reset();
      rvSay('');
      $('[data-review-title]', rvForm).textContent = t('Review: {name}', { name: b.dataset.reviewName });
      if (r) {
        rvForm.querySelector(`[name="rating"][value="${r.rating}"]`).checked = true;
        rvForm.elements.body.value = r.body || '';
      }
      rvForm.elements.name.value = r?.name || (state.profile?.full_name || '').split(' ')[0];
      const prev = $('[data-review-preview]', rvForm);
      prev.hidden = !r?.photo;
      if (r?.photo) prev.src = sb.storage.from('reviews').getPublicUrl(r.photo).data.publicUrl;
      paintStars();
      rvDialog.showModal();
    });
    $('[data-review-close]', rvForm).addEventListener('click', () => rvDialog.close());
    rvForm.addEventListener('change', (e) => {
      if (e.target.name === 'rating') paintStars();
      if (e.target.name === 'photo') {
        const f = e.target.files[0];
        const prev = $('[data-review-preview]', rvForm);
        prev.hidden = !f;
        if (f) prev.src = URL.createObjectURL(f);
      }
    });
    rvForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rating = Number(rvForm.elements.rating.value);
      const name = rvForm.elements.name.value.trim();
      if (!rating) { rvSay(t('Please choose 1 to 5 stars.'), true); return; }
      if (!name) { rvSay(t('Please enter your name.'), true); rvForm.elements.name.focus(); return; }
      const button = rvForm.querySelector('[type="submit"]');
      button.disabled = true;
      const file = rvForm.elements.photo.files[0];
      const old = myReviews[rvProduct]?.photo;
      let path = null;
      try {
        if (file) {
          rvSay(t('Uploading your photo…'));
          const blob = await shrink(file);
          path = `${state.user.id}/${crypto.randomUUID()}.jpg`;
          const up = await sb.storage.from('reviews').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
          if (up.error) throw new Error(t('Could not upload the photo.'));
        }
        rvSay(t('Sending…'));
        const { error } = await sb.rpc('submit_review', {
          p_product: rvProduct, p_rating: rating, p_body: rvForm.elements.body.value, p_name: name, p_photo: path,
        });
        if (error) {
          if (path) await sb.storage.from('reviews').remove([path]);
          throw new Error(tMsg(error.message));
        }
        // A new photo replaces the old one
        if (path && old) await sb.storage.from('reviews').remove([old]);
        rvDialog.close();
        renderAccount();
      } catch (err) {
        rvSay(err.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }

  async function route() {
    if (!page) return;
    if (!enabled) { show('off'); return; }
    if (state.recovering) { show('reset'); return; }
    if (state.user) { show('account'); await renderAccount(); } else { show('signin'); }
  }

  if (page && enabled) {
    const back = location.origin + location.pathname;
    // Which sign-in options to show
    page.querySelectorAll('[data-provider]').forEach((b) => { b.hidden = cfg.providers?.[b.dataset.provider] === false; });
    $('[data-email-block]', page).hidden = cfg.providers?.email === false;

    page.querySelectorAll('[data-provider]').forEach((b) => b.addEventListener('click', async () => {
      say('[data-signin-msg]', t('Redirecting…'));
      const { error } = await sb.auth.signInWithOAuth({ provider: b.dataset.provider, options: { redirectTo: back } });
      if (error) say('[data-signin-msg]', tMsg(error.message), true);
    }));

    // Email: sign in or create an account
    let mode = 'in';
    const emailForm = $('[data-email-form]', page);
    const setMode = (m) => {
      mode = m;
      page.querySelectorAll('[data-name-field]').forEach((el) => { el.hidden = m !== 'up'; });
      emailForm.elements.password.autocomplete = m === 'up' ? 'new-password' : 'current-password';
      $('[data-email-submit]', page).textContent = t(m === 'up' ? 'Create account' : 'Sign in');
      $('[data-mode-text]', page).textContent = t(m === 'up' ? 'Already have an account?' : 'New here?');
      $('[data-mode-toggle]', page).textContent = t(m === 'up' ? 'Sign in' : 'Create an account');
      say('[data-signin-msg]', '');
    };
    $('[data-mode-toggle]', page).addEventListener('click', () => setMode(mode === 'up' ? 'in' : 'up'));

    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!emailForm.reportValidity()) return;
      const email = emailForm.elements.email.value.trim();
      const password = emailForm.elements.password.value;
      const btn = $('[data-email-submit]', page);
      btn.disabled = true;
      say('[data-signin-msg]', t(mode === 'up' ? 'Creating your account…' : 'Signing in…'));
      try {
        if (mode === 'up') {
          const full_name = emailForm.elements.full_name.value.trim();
          const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: back, data: { full_name } } });
          if (error) throw error;
          // Supabase answers a sign-up for an email that already has an account with a
          // user that has no identities (and sends no email): send them to sign in.
          if (!data.session && data.user && !data.user.identities?.length) {
            setMode('in');
            say('[data-signin-msg]', t('This email already has an account. Sign in with your password, or tap “Forgot password”.'), true);
            return;
          }
          if (!data.session) {
            say('[data-signin-msg]', t('Check your inbox and tap the link to confirm your email. This page signs you in by itself once you have confirmed, even if you open the link on your phone.'));
            waitForConfirm(email, password);
          }
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
      } catch (err) {
        say('[data-signin-msg]', tMsg(err.message), true);
      } finally {
        btn.disabled = false;
      }
    });

    // After sign-up the confirmation link may be opened on another device (a phone),
    // which leaves this tab signed out. Retry the sign-in with the password still in
    // memory (never stored) until the email is confirmed, for up to 15 minutes.
    let confirmTimer = 0;
    function waitForConfirm(email, password) {
      clearInterval(confirmTimer);
      const until = Date.now() + 15 * 60 * 1000;
      let busy = false;
      const stop = () => { clearInterval(confirmTimer); document.removeEventListener('visibilitychange', tryNow); password = ''; };
      async function tryNow() {
        if (busy || document.hidden || state.user) { if (state.user) stop(); return; }
        if (Date.now() > until) { stop(); return; }
        busy = true;
        const { error } = await sb.auth.signInWithPassword({ email, password });
        busy = false;
        if (!error) stop();
        else if (!/not confirmed/i.test(error.message)) stop();
      }
      confirmTimer = setInterval(tryNow, 15000);
      document.addEventListener('visibilitychange', tryNow);
    }

    $('[data-forgot]', page).addEventListener('click', async () => {
      const email = emailForm.elements.email.value.trim();
      if (!email) { say('[data-signin-msg]', t('Type your email above first, then tap “Forgot password”.'), true); emailForm.elements.email.focus(); return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: back });
      say('[data-signin-msg]', error ? tMsg(error.message) : t('We sent you a link to choose a new password.'), !!error);
    });

    // New password after following the reset link
    $('[data-reset-form]', page).addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = e.target.elements.password.value;
      const { error } = await sb.auth.updateUser({ password });
      if (error) { say('[data-reset-msg]', tMsg(error.message), true); return; }
      state.recovering = false;
      route();
    });

    // Saved details
    $('[data-profile]', page).addEventListener('submit', async (e) => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(e.target));
      say('[data-profile-msg]', t('Saving…'));
      try {
        await saveProfile(values);
        say('[data-profile-msg]', t('Saved. These details will fill in at checkout.'));
        $('[data-hello]', page).textContent = values.full_name ? t('Hi, {name}', { name: values.full_name.split(' ')[0] }) : t('Your account');
      } catch (err) { say('[data-profile-msg]', tMsg(err.message), true); }
    });

    $('[data-signout]', page).addEventListener('click', async () => { await sb.auth.signOut(); });

    // Your data (GDPR): a copy of everything on the account, or delete it
    $('[data-export]', page).addEventListener('click', async () => {
      say('[data-data-msg]', t('Preparing your data…'));
      const { data, error } = await sb.rpc('export_my_data');
      if (error) { say('[data-data-msg]', `${t('Could not prepare your data.')} ${tMsg(error.message)}`, true); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `moyen-hills-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      say('[data-data-msg]', t('Downloaded.'));
    });
    const delForm = $('[data-delete-form]', page);
    $('[data-delete-account]', page).addEventListener('click', () => {
      delForm.hidden = !delForm.hidden;
      if (!delForm.hidden) delForm.elements.confirm.focus();
    });
    delForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (delForm.elements.confirm.value.trim() !== 'DELETE') { say('[data-data-msg]', t('Type DELETE in capitals to confirm.'), true); return; }
      say('[data-data-msg]', t('Deleting your account…'));
      // Review photos first (the reviews themselves go with the account)
      const { data: files } = await sb.storage.from('reviews').list(state.user.id, { limit: 100 });
      if (files?.length) await sb.storage.from('reviews').remove(files.map((f) => `${state.user.id}/${f.name}`));
      const { error } = await sb.rpc('delete_my_account');
      if (error) { say('[data-data-msg]', `${t('Could not delete your account.')} ${tMsg(error.message)} ${t('Email us and we will do it for you.')}`, true); return; }
      delForm.reset();
      delForm.hidden = true;
      await sb.auth.signOut();
      say('[data-signin-msg]', t('Your account has been deleted.'));
    });
  }

  if (enabled) {
    sb.auth.onAuthStateChange((event, session) => {
      state.user = session?.user || null;
      if (event === 'PASSWORD_RECOVERY') state.recovering = true;
      markHeader();
      // Supabase callbacks must not await other Supabase calls directly
      setTimeout(async () => { if (state.user && !page) await loadProfile(); route(); }, 0);
    });
  } else {
    route();
  }
})();
