/* YOUR HILLS — a generative halftone landscape, one per name.
   Same name + same number = the same hills, every time, on every device. */
(() => {
  const root = document.querySelector('[data-hills]');
  if (!root) return;

  const canvas = root.querySelector('[data-hills-canvas]');
  const ctx = canvas.getContext('2d');
  const form = root.querySelector('[data-hills-form]');
  const nameInput = root.querySelector('[data-hills-name]');
  const numberOut = root.querySelector('[data-hills-number]');
  const quoteOut = root.querySelector('[data-hills-quote]');
  const msg = root.querySelector('[data-hills-msg]');
  const frame = root.querySelector('[data-hills-frame]');

  const QUOTES = [
    'Art will save us all.',
    'Hey kid, never be afraid to have big desires.',
    'We all just some average kids at the end of the day.',
  ];
  const FORMATS = {
    phone: { w: 1170, h: 2532, label: 'phone' },
    desktop: { w: 2560, h: 1440, label: 'desktop' },
    post: { w: 2048, h: 2048, label: 'post' },
  };
  const PAPER = '#f2f2f0';
  const INK = '#000000';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- state, from the URL if someone shared a link ---------- */
  const params = new URLSearchParams(location.search);
  const state = {
    name: (params.get('n') || '').slice(0, 24),
    v: Math.max(0, parseInt(params.get('v'), 10) || 0),
    night: params.get('m') === 'night',
    format: FORMATS[params.get('f')] ? params.get('f') : 'phone',
  };
  if (!params.has('v')) state.v = Math.floor(Math.random() * 9999);

  /* ---------- seeded randomness ---------- */
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noise1D(rand) {
    const n = 256, vals = new Float32Array(n);
    for (let i = 0; i < n; i++) vals[i] = rand();
    return (x) => {
      const i = Math.floor(x), f = x - i;
      const a = vals[((i % n) + n) % n], b = vals[(((i + 1) % n) + n) % n];
      const s = f * f * (3 - 2 * f);
      return a + (b - a) * s;
    };
  }

  /* ---------- the landscape, built from the seed ---------- */
  let world;
  function build() {
    const key = `${state.name.trim().toLowerCase()}|${state.v}`;
    const seed = hash(key);
    const rand = rng(seed);
    const noise = noise1D(rand);
    const count = 4 + Math.floor(rand() * 3); // 4–6 ridges
    const jagged = rand(); // 0 = soft rolling, 1 = sharp peaks
    const layers = [];
    for (let i = 0; i < count; i++) {
      const k = i / (count - 1); // 0 far … 1 near
      layers.push({
        base: 0.54 + k * 0.26 + (rand() - 0.5) * 0.03,
        amp: (0.15 - k * 0.1) * (0.75 + rand() * 0.5),
        freq: (1.2 + rand() * 1.6) * (1 + k * 0.6),
        off: rand() * 200,
        tone: 0.34 + Math.pow(k, 1.15) * 0.62,
        drift: 0.012 + k * 0.04,
        octaves: 3 + Math.round(jagged * 2),
        ridged: jagged > 0.62 && i < count - 1,
      });
    }
    world = {
      seed,
      noise,
      layers,
      sun: { x: 0.2 + rand() * 0.6, y: 0.2 + rand() * 0.16, r: 0.07 + rand() * 0.07, rings: rand() > 0.55 },
      stars: Array.from({ length: 40 }, () => ({ x: rand(), y: rand() * 0.45, t: rand() })),
      number: String(seed % 10000).padStart(4, '0'),
      quote: QUOTES[seed % QUOTES.length],
    };
    numberOut.textContent = `N° ${world.number}`;
    quoteOut.textContent = `“${world.quote}”`;
  }

  function ridgeY(layer, x, t, aspect) {
    const { noise } = world;
    let sum = 0, amp = 1, f = layer.freq * Math.max(1, aspect * 0.8), norm = 0;
    for (let o = 0; o < layer.octaves; o++) {
      let n = noise(x * f + layer.off + t * layer.drift * (o + 1));
      if (layer.ridged) n = 1 - Math.abs(n * 2 - 1);
      sum += n * amp; norm += amp; amp *= 0.5; f *= 2.1;
    }
    return layer.base - layer.amp * (sum / norm) * 1.6;
  }

  /* tone 0 = paper, 1 = full ink */
  function makeToneField(W, H, t) {
    const aspect = W / H;
    const cols = new Array(world.layers.length);
    world.layers.forEach((layer, i) => {
      const row = new Float32Array(W + 1);
      for (let x = 0; x <= W; x++) row[x] = ridgeY(layer, x / H, t, 1) * H;
      cols[i] = row;
    });
    const sun = world.sun;
    const night = state.night;
    const sx = sun.x * W, sy = sun.y * H * (aspect > 1 ? 1.35 : 1), sr = sun.r * Math.min(W, H) * (aspect > 1 ? 1.4 : 1.8);
    return (x, y) => {
      const xi = Math.max(0, Math.min(W, x | 0));
      for (let i = world.layers.length - 1; i >= 0; i--) {
        const top = cols[i][xi];
        if (y >= top) {
          const layer = world.layers[i];
          const depth = (y - top) / H;
          const near = i === world.layers.length - 1;
          let k = near ? 1 : Math.max(0.05, Math.min(1, layer.tone + 0.14 - Math.min(1, depth / 0.11) * 0.34));
          // dark crisp ridge, fading into mist further down: each hill stands out from the one behind.
          // At night the ink is light, so flip it: black hills, moonlit mist between them.
          return night ? Math.min(0.9, 1 - k) : k;
        }
      }
      // sky: sun disc, optional rings, soft glow towards the horizon
      const d = Math.hypot(x - sx, y - sy);
      if (d < sr) return 0.92;
      if (sun.rings) {
        const ring = (d - sr) / (sr * 0.32);
        if (ring > 0 && ring < 5 && (ring % 1) < 0.28) return 0.55 - ring * 0.08;
      }
      const glow = Math.max(0, 1 - d / (sr * 3));
      if (night) return 0.03 + (y / H) * 0.08 + glow * glow * 0.3;
      return Math.max(0, 0.02 + (y / H) * 0.1 - glow * 0.05);
    };
  }

  /* ---------- draw: rotated 45° halftone screen ---------- */
  let logoImg = null;
  const logoReady = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { logoImg = img; resolve(); };
    img.onerror = resolve;
    img.src = 'images/logo.png';
  });

  function draw(c, W, H, t, opts = {}) {
    const ink = state.night ? PAPER : INK;
    const paper = state.night ? '#0b0b0b' : PAPER;
    c.fillStyle = paper;
    c.fillRect(0, 0, W, H);

    const tone = makeToneField(W, H, t);
    const cell = opts.cell || Math.max(6, Math.round(Math.min(W, H) / 70));
    const ang = Math.PI / 4, cos = Math.cos(ang), sin = Math.sin(ang);
    const half = Math.ceil(Math.hypot(W, H) / 2 / cell) + 1;
    const cx = W / 2, cy = H / 2;
    const maxR = cell * 0.72; // overlap at full ink → solid

    c.fillStyle = ink;
    c.beginPath();
    for (let u = -half; u <= half; u++) {
      for (let v = -half; v <= half; v++) {
        const x = cx + (u * cos - v * sin) * cell;
        const y = cy + (u * sin + v * cos) * cell;
        if (x < -cell || y < -cell || x > W + cell || y > H + cell) continue;
        const k = tone(x, y);
        if (k < 0.02) continue;
        const r = maxR * Math.sqrt(k);
        c.moveTo(x + r, y);
        c.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    c.fill();

    // stars, only at night, only in open sky
    if (state.night) {
      c.fillStyle = ink;
      world.stars.forEach((s) => {
        const x = s.x * W, y = s.y * H;
        if (tone(x, y) > 0.2) return;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.5 + s.t * 20);
        c.globalAlpha = 0.35 + tw * 0.65;
        c.fillRect(x, y, cell * 0.28, cell * 0.28);
      });
      c.globalAlpha = 1;
    }

    drawLabels(c, W, H, state.night ? ink : paper);
  }

  function drawLabels(c, W, H, onInk) {
    // labels sit on the dark foreground, knocked out in paper colour
    const m = Math.min(W, H);
    const pad = m * 0.07;
    const logoW = Math.min(W * 0.62, m * 0.62);
    const baseY = H - pad;
    c.textBaseline = 'alphabetic';
    c.fillStyle = onInk;

    const small = Math.round(m * 0.024);
    c.font = `600 ${small}px "Inter Tight", Arial, sans-serif`;
    if ('letterSpacing' in c) c.letterSpacing = `${small * 0.14}px`;
    const who = state.name.trim() ? `FOR ${state.name.trim().toUpperCase()}` : 'ART WILL TEE';
    c.textAlign = 'left';
    c.fillText(`N° ${world.number}`, pad, baseY);
    c.textAlign = 'right';
    c.fillText(who, W - pad, baseY);
    if ('letterSpacing' in c) c.letterSpacing = '0px';

    const q = Math.round(m * 0.034);
    c.font = `500 ${q}px "Inter Tight", Arial, sans-serif`;
    c.textAlign = 'center';
    c.fillText(`“${world.quote}”`, W / 2, baseY - small * 2.4, W - pad * 2);

    if (logoImg) {
      const lh = logoW * (logoImg.height / logoImg.width);
      const ly = baseY - small * 2.4 - q * 1.9 - lh;
      const off = document.createElement('canvas');
      off.width = Math.ceil(logoW); off.height = Math.ceil(lh);
      const o = off.getContext('2d');
      o.drawImage(logoImg, 0, 0, logoW, lh);
      o.globalCompositeOperation = 'source-in';
      o.fillStyle = onInk;
      o.fillRect(0, 0, off.width, off.height);
      c.drawImage(off, (W - logoW) / 2, ly);
    }
  }

  /* ---------- live preview ---------- */
  let size = { w: 0, h: 0 };
  function fit() {
    const f = FORMATS[state.format];
    frame.dataset.format = state.format;
    frame.style.aspectRatio = `${f.w} / ${f.h}`;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    size = { w: Math.round(rect.width * dpr), h: Math.round(rect.height * dpr) };
    canvas.width = size.w; canvas.height = size.h;
  }

  let t0 = performance.now(), raf = 0, visible = true;
  function frameLoop(now) {
    raf = 0;
    if (!size.w) return;
    const t = reduceMotion ? 0 : (now - t0) / 1000;
    draw(ctx, size.w, size.h, t);
    if (!reduceMotion && visible) raf = requestAnimationFrame(frameLoop);
  }
  function redraw() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frameLoop);
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) redraw(); }).observe(canvas);

  /* ---------- controls ---------- */
  function syncUrl() {
    const p = new URLSearchParams();
    if (state.name.trim()) p.set('n', state.name.trim());
    p.set('v', state.v);
    if (state.night) p.set('m', 'night');
    if (state.format !== 'phone') p.set('f', state.format);
    history.replaceState(null, '', `${location.pathname}?${p}`);
  }
  function syncControls() {
    nameInput.value = state.name;
    root.querySelectorAll('[data-hills-format]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hillsFormat === state.format)));
    root.querySelectorAll('[data-hills-mode]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.hillsMode === 'night') === state.night)));
  }
  function update({ rebuild = true, refit = false } = {}) {
    if (rebuild) build();
    if (refit) fit();
    syncUrl();
    syncControls();
    redraw();
  }

  let typing;
  nameInput.addEventListener('input', () => {
    clearTimeout(typing);
    typing = setTimeout(() => { state.name = nameInput.value.slice(0, 24); state.v = 0; update(); }, 180);
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); nameInput.blur(); });
  root.querySelector('[data-hills-shuffle]').addEventListener('click', () => { state.v = (state.v + 1 + Math.floor(Math.random() * 97)) % 10000; update(); });
  root.querySelectorAll('[data-hills-format]').forEach((b) => b.addEventListener('click', () => { state.format = b.dataset.hillsFormat; update({ rebuild: false, refit: true }); }));
  root.querySelectorAll('[data-hills-mode]').forEach((b) => b.addEventListener('click', () => { state.night = b.dataset.hillsMode === 'night'; update({ rebuild: false }); }));

  function say(text) { msg.textContent = text; clearTimeout(say.t); say.t = setTimeout(() => { msg.textContent = ''; }, 3500); }

  root.querySelector('[data-hills-save]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    say('Printing your hills…');
    await Promise.all([logoReady, document.fonts ? document.fonts.ready : null]);
    const f = FORMATS[state.format];
    const out = document.createElement('canvas');
    out.width = f.w; out.height = f.h;
    // freeze the moment you are looking at, at full resolution
    draw(out.getContext('2d'), f.w, f.h, reduceMotion ? 0 : (performance.now() - t0) / 1000, { cell: Math.round(Math.min(f.w, f.h) / 95) });
    out.toBlob(async (blob) => {
      btn.disabled = false;
      if (!blob) { say('Could not save. Try again.'); return; }
      const slug = (state.name.trim() || 'hills').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hills';
      const file = `moyen-hills-${slug}-${world.number}-${f.label}.png`;
      const asFile = new File([blob], file, { type: 'image/png' });
      // phones: the share sheet lets you "Save Image" straight to Photos
      if (navigator.canShare && navigator.canShare({ files: [asFile] }) && matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ files: [asFile], title: 'My MOYEN HILLS' }); say('Saved. Set it as your wallpaper.'); return; } catch (err) { if (err.name === 'AbortError') { say(''); return; } }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      say('Saved. Set it as your wallpaper.');
    }, 'image/png');
  });

  root.querySelector('[data-hills-link]').addEventListener('click', async () => {
    const link = location.href;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: 'My MOYEN HILLS', url: link }); return; }
      await navigator.clipboard.writeText(link);
      say('Link copied. Same name, same hills.');
    } catch (err) { if (err.name !== 'AbortError') say(link); }
  });

  // re-measure whenever the frame settles on a new size (window resize, or the format animation ending)
  let resizeT;
  new ResizeObserver(() => { clearTimeout(resizeT); resizeT = setTimeout(() => { fit(); redraw(); }, 60); }).observe(frame);

  build();
  syncControls();
  syncUrl();
  fit();
  Promise.all([logoReady, document.fonts ? document.fonts.load('600 20px "Inter Tight"') : null]).finally(redraw);
  redraw();
})();
