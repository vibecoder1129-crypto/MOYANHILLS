/* Black Friday (or any other) campaign: a strip above the header on every page, and a countdown
 * section on the home page. Runs in <head> so the page leaves room for the strip before it is drawn.
 * Everything shows only between `start` and `end` (Riga time) and then hides by itself, so the site
 * goes back to normal with nothing to remove. The price itself changes in the database
 * (supabase/black-friday.sql, same times), not here.
 * Preview before the start date: add ?campaign=preview to any page address (ends with the browser tab). */
(() => {
  const C = {
    start: '2026-11-23T12:00:00+02:00', // Monday 23 Nov, 12:00
    end: '2026-11-30T00:00:00+02:00',   // when Sunday 29 Nov ends
    off: '27%',
    was: '€37',
    now: '€27',
    code: '',                            // a promo code that goes in the bag by itself; empty = none
    link: '/product',
  };
  const root = document.documentElement;
  const qs = new URLSearchParams(location.search);
  try {
    if (qs.get('campaign') === 'preview') sessionStorage.setItem('mh-campaign-preview', '1');
    // A link such as /shop?code=HILLS10 puts that code in the bag automatically (app.js)
    const fromLink = (qs.get('code') || '').trim().toUpperCase();
    if (/^[A-Z0-9_-]{2,40}$/.test(fromLink)) sessionStorage.setItem('mh-code', fromLink);
  } catch (e) { /* storage blocked: the visitor can still type a code */ }

  let preview = false;
  try { preview = sessionStorage.getItem('mh-campaign-preview') === '1'; } catch (e) { /* no preview */ }
  const start = Date.parse(C.start);
  const end = Date.parse(C.end);
  const live = () => { const t = Date.now(); return t < end && (t >= start || preview); };
  window.mhCampaign = { code: C.code, live };
  if (!live()) return;
  root.classList.add('has-campaign');

  const pad = (n) => String(n).padStart(2, '0');
  function parts() {
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  }
  const short = (p) => `${p.d ? `${p.d}d ` : ''}${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`;

  function strip(bar) {
    const a = document.createElement('a');
    a.className = 'camp';
    a.href = C.link;
    a.setAttribute('translate', 'no');
    const time = '<span class="camp__time" data-camp-time></span>';
    a.innerHTML = `
      <span data-lang="en"><span class="camp__long"><b>Black Friday</b> · −${C.off} · <s>${C.was}</s> ${C.now} · Ends in ${time}</span><span class="camp__short"><b>Black Friday −${C.off}</b> · ${time}</span></span>
      <span data-lang="lv"><span class="camp__long"><b>Black Friday</b> · −${C.off} · <s>${C.was}</s> ${C.now} · Beidzas pēc ${time}</span><span class="camp__short"><b>Black Friday −${C.off}</b> · ${time}</span></span>`;
    bar.prepend(a);
    return a;
  }

  // Home page: the section is in index.html (hidden) and only switched on here
  function section() {
    const el = document.querySelector('[data-bf]');
    if (!el) return null;
    el.hidden = false;
    el.querySelectorAll('[data-bf-off]').forEach((x) => { x.textContent = `−${C.off}`; });
    el.querySelectorAll('[data-bf-was]').forEach((x) => { x.textContent = C.was; });
    el.querySelectorAll('[data-bf-now]').forEach((x) => { x.textContent = C.now; });
    return el;
  }

  function draw() {
    const bar = document.querySelector('[data-bar]');
    if (!bar || bar.querySelector('.camp')) return;
    const a = strip(bar);
    const sec = section();
    const tick = () => {
      if (!live()) {
        a.remove();
        if (sec) sec.hidden = true;
        root.classList.remove('has-campaign');
        clearInterval(timer);
        return;
      }
      const p = parts();
      a.querySelectorAll('[data-camp-time]').forEach((el) => { el.textContent = short(p); });
      sec?.querySelectorAll('[data-bf-unit]').forEach((el) => { el.textContent = pad(p[el.dataset.bfUnit]); });
    };
    const timer = setInterval(tick, 1000);
    tick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw);
  else draw();
})();
