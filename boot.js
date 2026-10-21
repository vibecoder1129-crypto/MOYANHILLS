/* Runs first, in <head>: marks that JavaScript is on, picks the language and plays the intro once per visit.
 * Kept in a file (not inline) so the Content-Security-Policy can block inline scripts. */
document.documentElement.classList.add('js');
try {
  if (sessionStorage.getItem('mh-intro')) document.documentElement.classList.add('seen-intro');
  else sessionStorage.setItem('mh-intro', '1');
} catch (e) { /* storage blocked: the intro just plays */ }

/* Language: a link with ?lang=lv or ?lang=en, then the visitor's own choice (the LV / EN switch
 * in the header), then the device language: Latvian devices get Latvian, everything else English.
 * i18n.js does the translating; until it has run, a Latvian page stays hidden (at most 1.5 s, see site.css). */
(() => {
  let lang = null;
  try { lang = localStorage.getItem('mh-lang'); } catch (e) { /* storage blocked */ }
  const asked = new URLSearchParams(location.search).get('lang');
  if (asked === 'lv' || asked === 'en') {
    lang = asked;
    try { localStorage.setItem('mh-lang', asked); } catch (e) { /* fine: only this page */ }
  }
  if (lang !== 'lv' && lang !== 'en') {
    const first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    lang = /^lv\b/i.test(first) ? 'lv' : 'en';
  }
  document.documentElement.lang = lang;
  if (lang === 'lv') document.documentElement.classList.add('i18n-wait');
})();
