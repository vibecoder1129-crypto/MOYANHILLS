/* Runs first, in <head>: marks that JavaScript is on and plays the intro once per visit.
 * Kept in a file (not inline) so the Content-Security-Policy can block inline scripts. */
document.documentElement.classList.add('js');
try {
  if (sessionStorage.getItem('mh-intro')) document.documentElement.classList.add('seen-intro');
  else sessionStorage.setItem('mh-intro', '1');
} catch (e) { /* storage blocked: the intro just plays */ }
