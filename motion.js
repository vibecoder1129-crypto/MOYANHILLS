/* MOYEN HILLS — motion
 * Uses GSAP + ScrollTrigger (vendor/). Everything is visible without it;
 * with reduced motion only the slideshow runs, without movement.
 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const introShown = !!$('[data-intro]') && !document.documentElement.classList.contains('seen-intro') && !reduced;
  const introDelay = introShown ? 1.75 : 0.15;

  /* Intro counter */
  const count = $('[data-intro-count]');
  if (count && introShown) {
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1300);
      count.textContent = Math.round(p * 100);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* Header: solid once past the hero, hides on scroll down, returns on scroll up */
  const bar = $('[data-bar]');
  const hero = $('.hero');
  // one read per frame at most, and only class changes when the state flips
  let lastY = scrollY;
  let ticking = false;
  let hidden = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      const hide = y > lastY && y > 400 && !document.querySelector('dialog[open]');
      if (hide !== hidden) { hidden = hide; bar.classList.toggle('is-hidden', hide); }
      lastY = y;
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });

  /* Hero slideshow: both frames advance together, progress bars keep time */
  const frames = $$('[data-slides]');
  const bars = $$('.hero__progress span');
  if (frames.length) {
    const SLIDE = 4500;
    const n = frames[0].children.length;
    let i = 0;
    document.documentElement.style.setProperty('--slide', `${SLIDE}ms`);
    const show = (k) => {
      frames.forEach((f) => [...f.children].forEach((img, j) => img.classList.toggle('is-on', j === k)));
      bars.forEach((b, j) => {
        b.classList.remove('is-on');
        b.classList.toggle('is-done', j < k);
      });
      if (bars[k]) { void bars[k].offsetWidth; bars[k].classList.add('is-on'); }
    };
    setTimeout(() => {
      show(0);
      setInterval(() => { i = (i + 1) % n; show(i); }, SLIDE);
    }, introDelay * 1000);
  }

  if (!hasGsap || reduced) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: 'expo.out', duration: 1.1 });
  const done = { clearProps: 'transform,opacity' };

  /* Hero copy rises line by line after the intro */
  if (hero) {
    gsap.from('.hero__copy .line > span', { yPercent: 110, stagger: 0.12, delay: introDelay + 0.1 });
    gsap.from('.hero__cta', { y: 20, opacity: 0, delay: introDelay + 0.45 });
    gsap.from('.hero__frame', { yPercent: 100, duration: 1.4, ease: 'expo.inOut', stagger: 0.12, delay: introDelay - 0.35, ...done });
    gsap.from('.bar > *', { y: -20, opacity: 0, stagger: 0.08, delay: introDelay + 0.2 });
  }

  /* Fade-ups, staggered per group */
  const groups = [
    '.shop__head', '.card', '.look .h-section',
    '.foot__inner > *', '.foot__legal', '.pdp__about > *', '.pdp__buy > *',
  ];
  groups.forEach((sel) => {
    const els = $$(sel);
    if (!els.length) return;
    ScrollTrigger.batch(els, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => gsap.from(batch, { y: 20, opacity: 0, duration: 0.9, stagger: 0.08, ...done }),
    });
  });

  /* Pictures rise and settle as they arrive (transform and opacity only, so the GPU does the work) */
  $$('.reveal-img').forEach((fig) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 90%', once: true } });
    tl.from(fig, { y: 24, opacity: 0, duration: 1, ...done })
      .from(fig.querySelector('img'), { scale: 1.06, duration: 1.4, ...done }, 0);
  });

  /* Product page pictures */
  $$('.pdp__gallery figure').forEach((fig, i) => {
    gsap.from(fig.querySelector('img'), {
      scale: 1.04, opacity: 0, duration: 1, ...done,
      scrollTrigger: { trigger: fig, start: 'top 95%', once: true }, delay: i === 0 ? 0.1 : 0,
    });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
