/* MOYEN HILLS — cookie notice
 * The site uses no tracking or advertising cookies, only what it needs to work
 * (cart, intro, sign-in), so EU rules don't require a consent choice. This is a
 * plain notice with a link to the details; "OK" hides it on this browser.
 * If you ever add analytics, pixels or embeds, replace this with a real
 * consent banner (Accept / Reject) that blocks them until the visitor accepts.
 */
(() => {
  const KEY = 'mh-cookie-ok';
  try { if (localStorage.getItem(KEY)) return; } catch { /* storage blocked: show it each visit */ }
  const box = document.createElement('section');
  box.className = 'cookie';
  box.setAttribute('aria-label', 'Cookie notice');
  box.innerHTML = '<p class="cookie__text"><b>Cookies.</b> We only store what the shop needs to work: your cart and, if you sign in, your session. No tracking, no ads. <a href="privacy.html#device">Details</a></p>'
    + '<button type="button" class="btn cookie__ok">OK</button>';
  box.querySelector('button').addEventListener('click', () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* fine: it just shows again next visit */ }
    box.classList.remove('is-on');
    setTimeout(() => box.remove(), 400);
  });
  document.body.append(box);
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-on')));
})();
