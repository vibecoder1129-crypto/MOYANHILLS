/* MOYEN HILLS — cookie notice
 * The site uses no tracking or advertising cookies, only what it needs to work
 * (cart, intro, sign-in), so EU rules don't require a consent choice. This is a
 * plain notice with a link to the details; "OK" hides it on this browser.
 * If you ever add analytics, pixels or embeds, replace this with a real
 * consent banner (Accept / Reject) that blocks them until the visitor accepts.
 */
(() => {
  const KEY = 'mh-cookie-ok-2'; // bump when the notice text changes, so everyone sees it once more
  try { if (localStorage.getItem(KEY)) return; } catch { /* storage blocked: show it each visit */ }
  const box = document.createElement('section');
  box.className = 'cookie';
  const lv = document.documentElement.lang === 'lv';
  box.setAttribute('aria-label', lv ? 'Paziņojums par sīkdatnēm' : 'Cookie notice');
  box.innerHTML = (lv
    ? '<p class="cookie__text"><b>Sīkdatnes.</b> Mēs saglabājam tikai to, kas vajadzīgs veikala darbībai: tavu grozu, valodu un, ja pieslēdzies, tavu sesiju. Nekādas izsekošanas, nekādu reklāmu. Apmaksa notiek Stripe drošajā lapā, kas izmanto savas sīkdatnes krāpšanas novēršanai. <a href="privacy.html#device">Sīkāk</a></p>'
    : '<p class="cookie__text"><b>Cookies.</b> We only store what the shop needs to work: your cart, your language and, if you sign in, your session. No tracking, no ads. Payment happens on Stripe’s secure page, which uses its own cookies to prevent fraud. <a href="privacy.html#device">Details</a></p>')
    + '<button type="button" class="btn cookie__ok">OK</button>';
  box.querySelector('button').addEventListener('click', () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* fine: it just shows again next visit */ }
    box.classList.remove('is-on');
    setTimeout(() => box.remove(), 400);
  });
  document.body.append(box);
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-on')));
})();
