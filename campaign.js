/* Black Friday (or any other) campaign: a strip above the header with the code and a countdown.
 * Runs in <head> so the page leaves room for the strip before it is drawn (no jump).
 * It shows only between `start` and `end` (Riga time), then hides itself: nothing to remove later.
 * The code itself must also exist in Admin → Promo codes (same name, expiring at `end`):
 * the database decides the discount, this file only advertises it.
 * Preview before the start date: add ?campaign=preview to any page address. */
(() => {
  const C = {
    code: 'BLACKFRIDAY',
    off: '20%',
    start: '2026-11-23T00:00:00+02:00',
    end: '2026-11-30T23:59:59+02:00',
    link: '/shop',
  };
  const root = document.documentElement;
  const qs = new URLSearchParams(location.search);
  try {
    if (qs.get('campaign') === 'preview') sessionStorage.setItem('mh-campaign-preview', '1');
    // A link such as /shop?code=BLACKFRIDAY puts the code in the bag automatically (app.js)
    const fromLink = (qs.get('code') || '').trim().toUpperCase();
    if (/^[A-Z0-9_-]{2,40}$/.test(fromLink)) sessionStorage.setItem('mh-code', fromLink);
  } catch (e) { /* storage blocked: the visitor can still type the code */ }

  let preview = false;
  try { preview = sessionStorage.getItem('mh-campaign-preview') === '1'; } catch (e) { /* no preview */ }
  const start = Date.parse(C.start);
  const end = Date.parse(C.end);
  const live = () => { const now = Date.now(); return now < end && (now >= start || preview); };
  window.mhCampaign = { code: C.code, live };
  if (!live()) return;
  root.classList.add('has-campaign');

  const pad = (n) => String(n).padStart(2, '0');
  function left() {
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const d = Math.floor(s / 86400);
    const hms = `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    return d ? `${d}d ${hms}` : hms;
  }

  function draw() {
    const bar = document.querySelector('[data-bar]');
    if (!bar || bar.querySelector('.camp')) return;
    const a = document.createElement('a');
    a.className = 'camp';
    a.href = `${C.link}?code=${encodeURIComponent(C.code)}`;
    a.setAttribute('translate', 'no');
    const time = '<span class="camp__time" data-camp-time></span>';
    a.innerHTML = `
      <span data-lang="en"><span class="camp__long"><b>Black Friday</b> · ${C.off} off with code <b>${C.code}</b> · Ends in ${time}</span><span class="camp__short">−${C.off} · Code <b>${C.code}</b> · ${time}</span></span>
      <span data-lang="lv"><span class="camp__long"><b>Black Friday</b> · −${C.off} ar kodu <b>${C.code}</b> · Beidzas pēc ${time}</span><span class="camp__short">−${C.off} · Kods <b>${C.code}</b> · ${time}</span></span>`;
    bar.prepend(a);
    const tick = () => {
      if (!live()) { a.remove(); root.classList.remove('has-campaign'); clearInterval(timer); return; }
      const t = left();
      a.querySelectorAll('[data-camp-time]').forEach((el) => { el.textContent = t; });
    };
    const timer = setInterval(tick, 1000);
    tick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw);
  else draw();
})();
