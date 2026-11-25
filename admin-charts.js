/* MOYEN HILLS admin: interactive charts for the Overview (sales) and Visitors tabs.
   Uses Chart.js (vendor/chart.js, self-hosted so the admin's strict CSP allows it).
   Chart.js only sets styles through script (element.style), which that CSP permits.
   Every chart has a hover tooltip, a clickable legend where there is more than one
   series, and a "See the numbers" table under it. */
(() => {
  'use strict';

  // Categorical colours, always given out in this fixed order (checked for colour-blind safety).
  const PAL = ['#257de0', '#f47230', '#00b894', '#f2a600', '#ee7fac', '#008a17', '#6a4ce2', '#ec4647'];
  const INK = '#111111';
  const MUTED = '#6b6b6b';
  const GRID = '#ecece9';
  const SURFACE = '#ffffff';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n) => '€' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
  const num = (n) => Number(n || 0).toLocaleString('en-GB');
  const plural = (n, w) => `${num(n)} ${w}${n === 1 ? '' : 's'}`;
  const dayLabel = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const longDay = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const key = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };

  // Old charts are destroyed before a tab redraws, so nothing leaks between refreshes.
  const live = new Map();
  function reset(el) { (live.get(el) || []).forEach((c) => c.destroy()); live.set(el, []); }

  let ready = false;
  function setup() {
    if (ready || !window.Chart) return !!window.Chart;
    const C = window.Chart;
    C.defaults.font.family = getComputedStyle(document.body).fontFamily || 'Inter Tight, Arial, sans-serif';
    C.defaults.font.size = 12;
    C.defaults.color = MUTED;
    C.defaults.borderColor = GRID;
    C.defaults.maintainAspectRatio = false;
    C.defaults.animation.duration = 500;
    C.defaults.plugins.legend.labels.usePointStyle = true;
    C.defaults.plugins.legend.labels.boxWidth = 8;
    C.defaults.plugins.legend.labels.boxHeight = 8;
    C.defaults.plugins.legend.labels.padding = 14;
    C.defaults.plugins.legend.labels.color = INK;
    Object.assign(C.defaults.plugins.tooltip, {
      backgroundColor: INK, titleColor: '#fff', bodyColor: '#fff', footerColor: '#d8d8d8',
      padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
      titleFont: { weight: '700' }, footerFont: { weight: '400' },
    });
    // Total in the middle of each doughnut; it follows the slices you switch off in the legend.
    C.register({
      id: 'mhCenter',
      afterDraw(chart, _a, opts) {
        if (chart.config.type !== 'doughnut' || !opts || !opts.label) return;
        const meta = chart.getDatasetMeta(0);
        if (!meta.data.length) return;
        const total = chart.data.datasets[0].data.reduce((n, v, i) => n + (chart.getDataVisibility(i) ? Number(v) || 0 : 0), 0);
        const { x, y } = meta.data[0];
        const { ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = INK;
        ctx.font = `700 22px ${C.defaults.font.family}`;
        ctx.fillText(opts.format ? opts.format(total) : num(total), x, y - 8);
        ctx.fillStyle = MUTED;
        ctx.font = `500 11px ${C.defaults.font.family}`;
        ctx.fillText(opts.label.toUpperCase(), x, y + 13);
        ctx.restore();
      },
    });
    ready = true;
    return true;
  }

  /* ---------- building blocks ---------- */
  // One card: title, a line of context, the chart, and the same numbers as a table.
  function card(id, title, sub, table, cls = '') {
    return `<section class="adm__card stats__box chart ${cls}">
      <div class="chart__head"><h2 class="stats__h">${title}</h2>${sub ? `<span class="adm__muted chart__sub">${sub}</span>` : ''}</div>
      <div class="chart__plot"><canvas data-chart="${id}" role="img" aria-label="${esc(title)}"></canvas></div>
      ${table ? `<details class="chart__table"><summary>See the numbers</summary>${table}</details>` : ''}
    </section>`;
  }
  function empty(title, text, cls = '') {
    return `<section class="adm__card stats__box chart ${cls}"><div class="chart__head"><h2 class="stats__h">${title}</h2></div><p class="adm__muted chart__none">${text}</p></section>`;
  }
  const table = (head, rows) => (rows.length
    ? `<table class="stats__table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '');

  // Ranked list of plain numbers with a thin bar behind each, for "top X" data.
  // Bar widths are set from script afterwards (the CSP blocks inline style attributes).
  function numList(id, title, sub, rows, { unit = '', extra } = {}, cls = '') {
    if (!rows.length) return empty(title, 'Nothing yet.', cls);
    const top = Math.max(...rows.map((r) => r.value), 1);
    const total = rows.reduce((n, r) => n + r.value, 0) || 1;
    return `<section class="adm__card stats__box chart ${cls}">
      <div class="chart__head"><h2 class="stats__h">${title}</h2>${sub ? `<span class="adm__muted chart__sub">${sub}</span>` : ''}</div>
      <ol class="mlist" data-list="${id}">${rows.map((r) => `<li class="mlist__row" title="${esc(r.name)}: ${num(r.value)}${unit ? ` ${unit}` : ''}">
        <span class="mlist__name">${esc(r.name)}</span>
        <span class="mlist__val"><b>${num(r.value)}</b>${extra ? ` <span class="adm__muted">${extra(r)}</span>` : ` <span class="adm__muted">${Math.round((r.value / total) * 100)}%</span>`}</span>
        <span class="mlist__bar"><i data-w="${Math.max(2, Math.round((r.value / top) * 100))}"></i></span>
      </li>`).join('')}</ol>
    </section>`;
  }
  function sizeBars(el) { el.querySelectorAll('.mlist__bar i').forEach((i) => i.style.setProperty('--w', `${i.dataset.w}%`)); }
  const tiles = (list) => `<div class="stats stats--compact">${list.map(([label, value, sub, cls]) => `<div class="stat ${cls || ''}"><span class="stat__label">${label}</span><b class="stat__value">${value}</b>${sub ? `<span class="adm__muted">${sub}</span>` : ''}</div>`).join('')}</div>`;

  function draw(el, id, config) {
    const canvas = el.querySelector(`[data-chart="${id}"]`);
    if (!canvas) return;
    live.get(el).push(new window.Chart(canvas, config));
  }

  // Doughnut for "parts of a whole". Each slice keeps its colour whatever else is on the chart.
  function doughnut(el, id, labels, values, colors, { centre, fmt = num } = {}) {
    const total = values.reduce((a, b) => a + b, 0) || 1;
    draw(el, id, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: SURFACE, borderWidth: 2, hoverOffset: 8, hoverBorderColor: SURFACE }] },
      options: {
        cutout: '64%',
        layout: { padding: 8 },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmt(c.parsed)} (${Math.round((c.parsed / total) * 100)}%)` } },
          mhCenter: { label: centre, format: fmt },
        },
      },
    });
  }

  const axisY = (fmt = num) => ({ beginAtZero: true, border: { display: false }, grid: { color: GRID }, ticks: { precision: 0, callback: (v) => fmt(v), maxTicksLimit: 5 } });
  const axisX = { grid: { display: false }, border: { color: GRID }, ticks: { maxRotation: 0, autoSkipPadding: 12 } };
  const hoverIndex = { mode: 'index', intersect: false };

  // Fixed colour per name: known names first (in their list order), anything new after them.
  function colourMap(known, names) {
    const map = {};
    let next = known.length;
    names.forEach((n) => { const i = known.indexOf(n); map[n] = PAL[(i >= 0 ? i : next++) % PAL.length]; });
    return map;
  }
  // More than `max` slices fold into "Other" so a doughnut stays readable.
  function fold(rows, max = 6) {
    if (rows.length <= max) return rows;
    const keep = rows.slice(0, max - 1);
    keep.push({ name: 'Other', value: rows.slice(max - 1).reduce((n, r) => n + r.value, 0), other: true });
    return keep;
  }

  /* ---------- Overview: sales ---------- */
  const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'ONE SIZE'];
  const STATUS = [
    ['toship', 'To ship'], ['shipped', 'On the way'], ['delivered', 'Delivered'], ['unpaid', 'Not paid'], ['cancelled', 'Cancelled'],
  ];
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function sales(el, { orders = [], prods = [], days = 30, isSale, pieces }) {
    if (!setup()) { el.innerHTML = '<p class="adm__empty">Charts could not load. Refresh the page.</p>'; return; }
    reset(el);
    const when = (o) => new Date(o.paid_at || o.created_at);
    const allSales = orders.filter(isSale);
    const today = startOfDay(new Date());
    let from;
    if (days === 'all') {
      const first = [...orders].map((o) => new Date(o.created_at)).sort((a, b) => a - b)[0];
      from = startOfDay(first || today);
    } else { from = new Date(today); from.setDate(from.getDate() - (days - 1)); }
    const span = Math.round((today - from) / 864e5) + 1;
    const inRange = (d) => d >= from;
    const salesIn = allSales.filter((o) => inRange(when(o)));
    const ordersIn = orders.filter((o) => inRange(new Date(o.created_at)));
    const money = (list) => list.reduce((n, o) => n + Number(o.total ?? o.subtotal ?? 0), 0);
    const periodName = days === 'all' ? 'since the first order' : `last ${days} days`;

    // 1. Sales over time: bars per day up to a month, a line above that, per week past ~4 months
    const weekly = span > 120;
    const buckets = [];
    for (let d = new Date(from); d <= today; d.setDate(d.getDate() + (weekly ? 7 : 1))) buckets.push(new Date(d));
    const bucketOf = (d) => (weekly ? Math.min(buckets.length - 1, Math.floor((startOfDay(d) - from) / (7 * 864e5))) : buckets.findIndex((b) => key(b) === key(d)));
    const perBucket = buckets.map(() => ({ money: 0, orders: 0, pieces: 0 }));
    salesIn.forEach((o) => { const i = bucketOf(when(o)); if (i >= 0) { perBucket[i].money += Number(o.total ?? o.subtotal ?? 0); perBucket[i].orders += 1; perBucket[i].pieces += pieces(o); } });
    const asLine = span > 31;
    const trendRows = buckets.map((b, i) => [weekly ? `Week of ${dayLabel(b)}` : longDay(b), eur(perBucket[i].money), perBucket[i].orders, perBucket[i].pieces]).filter((r, i) => perBucket[i].orders).reverse();

    // 2. Order status of orders placed in the period
    const statusOf = (o) => {
      if (o.status === 'cancelled') return 'cancelled';
      if (o.status === 'delivered') return 'delivered';
      if (o.status === 'shipped') return 'shipped';
      return isSale(o) ? 'toship' : 'unpaid';
    };
    const statusCount = Object.fromEntries(STATUS.map(([k]) => [k, 0]));
    ordersIn.forEach((o) => { statusCount[statusOf(o)] += 1; });

    // 3. Sizes: sold in the period and left in stock now
    const soldBy = {}; const prodBy = {}; const promoBy = {};
    salesIn.forEach((o) => {
      (o.items || []).forEach((i) => {
        const q = Number(i.qty) || 0;
        soldBy[i.size] = (soldBy[i.size] || 0) + q;
        prodBy[i.name || 'Product'] = (prodBy[i.name || 'Product'] || 0) + q;
      });
      const code = o.promo_code ? String(o.promo_code).toUpperCase() : 'No code';
      promoBy[code] = (promoBy[code] || 0) + 1;
    });
    const leftBy = {};
    prods.filter((p) => p.active !== false).forEach((p) => (p.sizes || []).forEach((s) => { leftBy[s.size] = (leftBy[s.size] || 0) + Math.max(0, Number(s.stock) || 0); }));
    const sizeRank = (s) => { const i = SIZE_ORDER.indexOf(String(s).toUpperCase()); return i < 0 ? 99 : i; };
    const sizes = [...new Set([...Object.keys(leftBy), ...Object.keys(soldBy)])].sort((a, b) => sizeRank(a) - sizeRank(b));

    // 4. Weekdays: which days bring orders
    const byWeekday = WEEKDAYS.map(() => ({ orders: 0, money: 0 }));
    salesIn.forEach((o) => { const w = (when(o).getDay() + 6) % 7; byWeekday[w].orders += 1; byWeekday[w].money += Number(o.total ?? o.subtotal ?? 0); });

    const prodRows = Object.entries(prodBy).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
    const promoRows = Object.entries(promoBy).sort((a, b) => (a[0] === 'No code') - (b[0] === 'No code') || b[1] - a[1]).map(([name, value]) => ({ name, value }));

    const totalPieces = Object.values(soldBy).reduce((x, y) => x + y, 0);
    el.innerHTML = `
      <section class="adm__card stats__box chart chart--wide">
        <div class="chart__head"><h2 class="stats__h">Orders placed</h2><span class="adm__muted chart__sub">${plural(ordersIn.length, 'order')}, ${periodName}</span></div>
        ${tiles(STATUS.map(([k, n]) => [n, num(statusCount[k]), ordersIn.length ? `${Math.round((statusCount[k] / ordersIn.length) * 100)}%` : '', statusCount[k] && k === 'toship' ? 'stat--hot' : '']))}
      </section>
      ${card('trend', weekly ? 'Sales per week' : 'Sales per day', `${eur(money(salesIn))} from ${plural(salesIn.length, 'paid order')}, ${periodName}`,
        table([weekly ? 'Week' : 'Day', 'Sales', 'Orders', 'Pieces'], trendRows), 'chart--wide')}
      <div class="chart__grid">
        ${salesIn.length ? card('running', 'Sales adding up', `Running total, ${periodName}`, '') : empty('Sales adding up', `Nothing sold ${periodName}.`)}
        ${sizes.length ? card('sizes', 'Sizes: sold and left', `Sold ${periodName}; left = in stock now`,
          table(['Size', 'Sold', 'Left'], sizes.map((x) => [esc(x), soldBy[x] || 0, leftBy[x] || 0]))) : empty('Sizes: sold and left', 'No sizes yet.')}
        ${salesIn.length ? card('sizeshare', 'Share of pieces by size', `${plural(totalPieces, 'piece')} sold, ${periodName}`,
          table(['Size', 'Pieces'], sizes.filter((x) => soldBy[x]).map((x) => [esc(x), soldBy[x]]))) : empty('Share of pieces by size', `Nothing sold ${periodName}.`)}
        ${salesIn.length ? card('weekday', 'Best days of the week', `Paid orders by weekday, ${periodName}`,
          table(['Day', 'Orders', 'Sales'], WEEKDAYS.map((w, i) => [w, byWeekday[i].orders, eur(byWeekday[i].money)]))) : empty('Best days of the week', `Nothing sold ${periodName}.`)}
        ${salesIn.length ? numList('promos', 'Promo codes', `Paid orders, ${periodName}`, promoRows, { unit: 'orders' }) : ''}
        ${prodRows.length > 1 ? numList('products', 'Pieces sold by product', periodName[0].toUpperCase() + periodName.slice(1), prodRows, { unit: 'pieces' }) : ''}
      </div>`;

    // Draw
    draw(el, 'trend', {
      type: asLine ? 'line' : 'bar',
      data: {
        labels: buckets.map((b) => dayLabel(b)),
        datasets: [{
          label: 'Sales', data: perBucket.map((b) => b.money),
          backgroundColor: asLine ? 'rgba(37,125,224,.12)' : INK, borderColor: asLine ? PAL[0] : INK,
          borderWidth: asLine ? 2 : 0, borderRadius: 4, borderSkipped: 'start', fill: asLine,
          tension: 0.3, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: PAL[0], pointHoverBorderColor: SURFACE, pointHoverBorderWidth: 2,
          maxBarThickness: 28, hoverBackgroundColor: PAL[0],
        }],
      },
      options: {
        interaction: hoverIndex,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            title: (c) => (weekly ? `Week of ${longDay(buckets[c[0].dataIndex])}` : longDay(buckets[c[0].dataIndex])),
            label: (c) => ` Sales: ${eur(c.parsed.y)}`,
            afterLabel: (c) => { const b = perBucket[c.dataIndex]; return `${plural(b.orders, 'order')} · ${plural(b.pieces, 'piece')}`; },
          } },
        },
        scales: { x: axisX, y: axisY(eur) },
      },
    });

    if (salesIn.length) {
      let run = 0;
      const running = perBucket.map((b) => (run += b.money));
      draw(el, 'running', {
        type: 'line',
        data: { labels: buckets.map((b) => dayLabel(b)), datasets: [{ label: 'Running total', data: running, borderColor: PAL[2], backgroundColor: 'rgba(0,184,148,.14)', fill: true, borderWidth: 2, stepped: false, tension: 0.2, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: PAL[2], pointHoverBorderColor: SURFACE, pointHoverBorderWidth: 2 }] },
        options: {
          interaction: hoverIndex,
          plugins: { legend: { display: false }, tooltip: { callbacks: { title: (c) => (weekly ? `Up to the week of ${longDay(buckets[c[0].dataIndex])}` : `Up to ${longDay(buckets[c[0].dataIndex])}`), label: (c) => ` Total so far: ${eur(c.parsed.y)}` } } },
          scales: { x: axisX, y: axisY(eur) },
        },
      });
    }

    if (sizes.length) {
      draw(el, 'sizes', {
        type: 'bar',
        data: {
          labels: sizes,
          datasets: [
            { label: 'Sold', data: sizes.map((s) => soldBy[s] || 0), backgroundColor: PAL[0], borderRadius: 4, borderSkipped: 'start', maxBarThickness: 26 },
            { label: 'Left in stock', data: sizes.map((s) => leftBy[s] || 0), backgroundColor: PAL[1], borderRadius: 4, borderSkipped: 'start', maxBarThickness: 26 },
          ],
        },
        options: {
          interaction: hoverIndex,
          datasets: { bar: { categoryPercentage: 0.7, barPercentage: 0.9 } },
          plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { title: (c) => `Size ${c[0].label}`, label: (c) => ` ${c.dataset.label}: ${plural(c.parsed.y, 'piece')}`, afterBody: (c) => ((leftBy[c[0].label] || 0) === 0 ? 'Sold out' : '') } } },
          scales: { x: axisX, y: axisY() },
        },
      });
    }

    if (salesIn.length) {
      const sold = sizes.filter((s) => soldBy[s]);
      const sc = colourMap(['S', 'M', 'L', 'XL', 'XS', 'XXL', 'XXS', '3XL'], sold.map((s) => String(s).toUpperCase()));
      doughnut(el, 'sizeshare', sold, sold.map((s) => soldBy[s]), sold.map((s) => sc[String(s).toUpperCase()]), { centre: 'pieces' });

      const best = Math.max(...byWeekday.map((w) => w.orders));
      draw(el, 'weekday', {
        type: 'bar',
        data: { labels: WEEKDAYS, datasets: [{ label: 'Orders', data: byWeekday.map((w) => w.orders), backgroundColor: byWeekday.map((w) => (w.orders === best && best ? INK : '#c9c9c5')), hoverBackgroundColor: PAL[0], borderRadius: 4, borderSkipped: 'start', maxBarThickness: 30 }] },
        options: {
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${plural(c.parsed.y, 'order')}`, afterLabel: (c) => `Sales: ${eur(byWeekday[c.dataIndex].money)}` } } },
          scales: { x: axisX, y: axisY() },
        },
      });
    }

    sizeBars(el);
  }

  /* ---------- Visitors ---------- */
  const SOURCE_ORDER = ['direct', 'instagram', 'tiktok', 'google', 'facebook', 'email', 'youtube', 'x'];
  const DEVICE_ORDER = ['phone', 'computer', 'tablet'];

  function visits(el, { v, days, sourceName = (s) => s, deviceName = (s) => s, pageName = (s) => s }) {
    if (!setup()) { el.innerHTML = '<p class="adm__empty">Charts could not load. Refresh the page.</p>'; return; }
    reset(el);
    const per = v.per_day || [];
    const sources = (v.sources || []).map((r) => ({ name: r.source, value: Number(r.visitors) || 0 }));
    const devices = (v.devices || []).map((r) => ({ name: r.device, value: Number(r.visitors) || 0 }));
    const pages = (v.pages || []).slice(0, 8);
    const period = `last ${days} days`;

    el.innerHTML = `
      ${card('vtrend', 'Visitors and page views per day', `Click a name under the chart to hide or show it`,
        table(['Day', 'Visitors', 'Page views'], [...per].reverse().map((d) => [longDay(d.day), d.visitors, d.views])), 'chart--wide')}
      <div class="chart__grid">
        ${sources.length ? card('sources', 'Where they come from', `Visitors by source, ${period}`,
          table(['Source', 'Visitors'], sources.map((r) => [esc(sourceName(r.name)), r.value]))) : empty('Where they come from', 'Nothing yet.')}
        ${devices.length ? card('devices', 'Devices', `Visitors by device, ${period}`,
          table(['Device', 'Visitors'], devices.map((r) => [esc(deviceName(r.name)), r.value]))) : empty('Devices', 'Nothing yet.')}
        ${numList('pages', 'Most viewed pages', `Page views, ${period}`, pages.map((r) => ({ name: pageName(r.path), value: Number(r.views) || 0, visitors: Number(r.visitors) || 0 })), { unit: 'views', extra: (r) => plural(r.visitors, 'visitor') }, 'chart--wide')}
      </div>`;

    const many = per.length > 31;
    draw(el, 'vtrend', {
      type: 'line',
      data: {
        labels: per.map((d) => dayLabel(d.day)),
        datasets: [
          { label: 'Visitors', data: per.map((d) => d.visitors), borderColor: PAL[0], backgroundColor: 'rgba(37,125,224,.12)', fill: true, borderWidth: 2, tension: 0.3, pointRadius: many ? 0 : 3, pointBackgroundColor: PAL[0], pointBorderColor: SURFACE, pointBorderWidth: 2, pointHoverRadius: 6 },
          { label: 'Page views', data: per.map((d) => d.views), borderColor: PAL[1], backgroundColor: PAL[1], fill: false, borderWidth: 2, tension: 0.3, pointRadius: many ? 0 : 3, pointBackgroundColor: PAL[1], pointBorderColor: SURFACE, pointBorderWidth: 2, pointHoverRadius: 6 },
        ],
      },
      options: {
        interaction: hoverIndex,
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { title: (c) => longDay(per[c[0].dataIndex].day), label: (c) => ` ${c.dataset.label}: ${num(c.parsed.y)}` } } },
        scales: { x: axisX, y: axisY() },
      },
    });

    if (sources.length) {
      const f = fold(sources, 8);
      const all = f.reduce((n, r) => n + r.value, 0) || 1;
      draw(el, 'sources', {
        type: 'bar',
        data: { labels: f.map((r) => (r.other ? 'Other' : sourceName(r.name))), datasets: [{ label: 'Visitors', data: f.map((r) => r.value), backgroundColor: INK, hoverBackgroundColor: PAL[0], borderRadius: 4, borderSkipped: 'start', maxBarThickness: 20 }] },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${plural(c.parsed.x, 'visitor')} (${Math.round((c.parsed.x / all) * 100)}%)` } } },
          scales: { x: { ...axisY(), grid: { color: GRID } }, y: { grid: { display: false }, border: { display: false }, ticks: { color: INK } } },
        },
      });
    }
    if (devices.length) {
      const dc = colourMap(DEVICE_ORDER, devices.map((r) => r.name));
      doughnut(el, 'devices', devices.map((r) => deviceName(r.name)), devices.map((r) => r.value), devices.map((r) => dc[r.name]), { centre: 'visitors' });
    }
    sizeBars(el);
  }

  window.MHCharts = { sales, visits };
})();
