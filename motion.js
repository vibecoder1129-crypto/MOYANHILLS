/* MOYEN HILLS — motion
 * ---------------------------------------------------------------------------
 * The moving parts that need a script. Everything else (loading screen, page
 * transitions, hovers, the ticker) is plain CSS in site.css under "Motion".
 *
 * - Headlines and quotes rise word by word out of a mask, line after line.
 * - Photos open from a smaller frame and settle as they scroll into view.
 * - The main buttons lean toward the mouse (mouse and trackpad only).
 * - The ticker stops when it is off screen.
 *
 * Runs after i18n.js, so Latvian text is split the same way. Does nothing when
 * the visitor asks for reduced motion: the page then shows everything still.
 * Ideas ported from 21st.dev components (Text Reveal Mask, Scroll Reveal Image,
 * Magnetic) to plain JavaScript, so the site keeps its no-CDN security policy.
 */
(() => {
  if (!('IntersectionObserver' in window)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const html = document.documentElement;

  // Each one starts once, when it is a little way into the screen
  const seen = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    if (el.classList.contains('split')) stagger(el);
    el.classList.add('is-in');
    seen.unobserve(el);
  }), { rootMargin: '0px 0px -10% 0px' });

  // The wrapper that used to fade the whole block in now holds still and lets its parts move
  const stage = (el) => {
    const host = el.closest('[data-reveal], [data-reveal-group] > *');
    if (host) host.classList.add('is-staged');
  };

  /* ---------- Words rise out of a mask ---------- */
  const SPLIT = [
    '.brand__statement',
    '.look__quote p',
    '.look__big p',
    '.sub__title',
  ].join(',');

  function split(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const texts = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n);
    texts.forEach((n) => {
      if (!n.nodeValue.trim()) return;
      const frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(part); return; }
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = part;
        frag.append(w);
      });
      n.replaceWith(frag);
    });
    el.classList.add('split');
  }

  // Lines go one after another; inside a line the words follow quickly
  function stagger(el) {
    let line = -1; let top = null; let inLine = 0;
    $$('.w', el).forEach((w) => {
      const y = w.offsetTop;
      if (top === null || y > top + 4) { line += 1; top = y; inLine = 0; }
      w.style.setProperty('--d', `${line * 110 + inLine * 28}ms`);
      inLine += 1;
    });
  }

  $$(SPLIT).forEach((el) => {
    if (el.closest('[hidden], dialog') || !el.textContent.trim()) return;
    split(el);
    stage(el);
    seen.observe(el);
  });

  /* ---------- Photos open up as they arrive ---------- */
  $$('.look__img, .feature__media, .lookcta').forEach((el) => {
    el.classList.add('unveil');
    stage(el);
    seen.observe(el);
  });

  /* ---------- Buttons lean toward the pointer ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const magnet = (host, target, pull) => {
      let raf = 0;
      host.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = host.getBoundingClientRect();
          const x = (e.clientX - (r.left + r.width / 2)) * pull;
          const y = (e.clientY - (r.top + r.height / 2)) * pull;
          target.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
        });
      });
      host.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        target.style.translate = '';
      });
      target.classList.add('magnet');
    };
    $$('.landing__cta, .feature__cta, .sub .btn').forEach((b) => magnet(b, b, 0.3));
    // On the big lookbook photo the button drifts after the mouse across the whole picture
    $$('.lookcta').forEach((a) => { const b = a.querySelector('.lookcta__btn'); if (b) magnet(a, b, 0.12); });
  }

  /* ---------- Ticker: only runs while on screen ---------- */
  const tickers = $$('.ticker');
  if (tickers.length) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      en.target.classList.toggle('is-off', !en.isIntersecting);
    }));
    tickers.forEach((t) => io.observe(t));
  }

  html.classList.add('motion');
})();
