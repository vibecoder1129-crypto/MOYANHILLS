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
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    const past = hero ? y > hero.offsetHeight - 80 : y > 10;
    bar.classList.toggle('is-solid', past || !hero);
    bar.classList.toggle('is-hidden', y > lastY && y > 400 && !document.querySelector('dialog[open]'));
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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

  /* Words of the quote, for the scroll fill */
  $$('[data-words]').forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    if (reduced || !hasGsap) el.classList.add('is-plain');
  });

  if (!hasGsap || reduced) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'expo.out', duration: 1.1 });

  /* Hero copy rises line by line after the intro */
  if (hero) {
    gsap.from('.hero__copy .line > span', { yPercent: 110, stagger: 0.12, delay: introDelay + 0.1 });
    gsap.from('.hero__cta', { y: 20, opacity: 0, delay: introDelay + 0.45 });
    gsap.from('.hero__frame', { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.inOut', stagger: 0.12, delay: introDelay - 0.35 });
    gsap.from('.bar > *', { y: -20, opacity: 0, stagger: 0.08, delay: introDelay + 0.2 });
    // the hero drifts slower than the page as it leaves
    gsap.to('.hero__frames', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* Fade-ups, staggered per group */
  const groups = [
    '.shop__head', '.card', '.details__intro > *', '.quote__note', '.look .h-section', '.look__copy > *',
    '.facts > div', '.foot__inner > *', '.foot__legal', '.pdp__about > *', '.pdp__buy > *',
  ];
  groups.forEach((sel) => {
    const els = $$(sel);
    if (!els.length) return;
    ScrollTrigger.batch(els, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => gsap.from(batch, { y: 32, opacity: 0, stagger: 0.08 }),
    });
  });

  /* Parallax on the campaign picture */
  $$('[data-parallax] img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentElement, scrub: true } });
  });

  /* Pictures open from the bottom as they arrive */
  $$('.reveal-img, .shop__campaign').forEach((fig) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
    tl.from(fig, { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.inOut' })
      .from(fig.querySelector('img'), { scale: 1.3, duration: 1.8 }, 0);
  });

  /* Product page pictures */
  $$('.pdp__gallery figure').forEach((fig, i) => {
    gsap.from(fig.querySelector('img'), {
      scale: 1.15, opacity: 0, duration: 1.4,
      scrollTrigger: { trigger: fig, start: 'top 95%', once: true }, delay: i === 0 ? 0.1 : 0,
    });
  });

  /* Quote fills in word by word with the scroll */
  $$('[data-words]').forEach((el) => {
    gsap.to(el.querySelectorAll('.w'), {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  });

  /* Details: vertical scroll moves the strip sideways (desktop) */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 721px)', () => {
    const pin = $('[data-hscroll]');
    const track = $('[data-hscroll-track]');
    if (!pin || !track) return;
    const distance = () => Math.max(0, track.scrollWidth - (pin.clientWidth - track.offsetLeft) + 32);
    gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true },
    });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
