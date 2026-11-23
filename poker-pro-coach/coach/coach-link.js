// Fügt in der Navigation von AW Poker Pro einen Link „Coach“ ein (→ /coach/).
// Einbinden in Poker Pros index.html:  <script src="https://aw-poker-pro-coach.netlify.app/coach-link.js" defer></script>
(function () {
  'use strict';
  var LABELS = { de: 'Coach', en: 'Coach', pl: 'Trener' };
  // Ziel = Ordner, aus dem dieses Skript geladen wurde (eigene Netlify-Seite oder /coach/ in Poker Pro)
  var me = document.currentScript && document.currentScript.src;
  var BASE = me ? new URL('./', me).href : '/coach/';
  function label() {
    var l = 'de';
    try { l = localStorage.getItem('awpp.lang') || l; } catch (e) { /* kein Speicher */ }
    return LABELS[l] || LABELS.de;
  }
  function ensure() {
    var nav = document.querySelector('nav.nav');
    if (!nav) return;
    var link = nav.querySelector('a[data-coach-link]');
    if (!link) {
      link = document.createElement('a');
      link.href = BASE;
      link.setAttribute('data-coach-link', '');
      // Hinter „Lernen“ einsortieren, sonst ans Ende
      var learn = nav.querySelector('a[href="/learn"]');
      if (learn && learn.nextSibling) nav.insertBefore(link, learn.nextSibling);
      else nav.appendChild(link);
    }
    var text = label();
    if (link.textContent !== text) link.textContent = text;
    // Auf dem Handy ist die Navigation ein Raster – eine Spalte mehr
    var cols = nav.querySelectorAll('a').length;
    if (window.matchMedia('(max-width: 720px)').matches) nav.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
    else nav.style.gridTemplateColumns = '';
  }
  function start() {
    ensure();
    new MutationObserver(ensure).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', ensure);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}());
