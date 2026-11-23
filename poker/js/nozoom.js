// Zoom-Sperre für alle Geräte. Läuft als normales Skript im <head>, also vor allem anderen.
// iOS-Safari ignoriert „user-scalable=no“ – deshalb zusätzlich Touch- und Gesten-Events abfangen.
(function () {
  'use strict';
  var opts = { passive: false };
  var stop = function (e) { if (e.cancelable) e.preventDefault(); };

  // 1. Pinch-Zoom: Safari (iPhone, iPad, Mac-Trackpad) meldet eigene Gesten-Events
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) {
    document.addEventListener(t, stop, opts);
    window.addEventListener(t, stop, opts);
  });

  // 2. Pinch-Zoom über Touch: sobald zwei Finger auf dem Bildschirm sind
  var multi = function (e) {
    if ((e.touches && e.touches.length > 1) || (typeof e.scale === 'number' && e.scale !== 1)) stop(e);
  };
  document.addEventListener('touchstart', multi, opts);
  document.addEventListener('touchmove', multi, opts);

  // 3. Doppeltippen: zweites Tippen innerhalb von 350 ms abfangen, den Klick aber selbst auslösen
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    var target = e.target;
    var isField = target && target.closest && target.closest('input, select, textarea');
    if (now - lastTouchEnd <= 350 && !isField) {
      stop(e);
      var clickable = target && target.closest && target.closest('button, a, summary, label, [data-answer], [data-hand]');
      if (clickable && !clickable.disabled) clickable.click();
    }
    lastTouchEnd = now;
  }, opts);

  // 4. Doppelklick (Desktop, manche Android-Browser)
  document.addEventListener('dblclick', stop, opts);

  // 5. Strg/Cmd + Mausrad bzw. Trackpad-Pinch in Chrome, Edge, Firefox
  window.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) stop(e); }, opts);

  // 6. Strg/Cmd + Plus / Minus / 0
  window.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    var k = e.key;
    var c = e.code;
    if (k === '+' || k === '-' || k === '=' || k === '0' || k === '_' ||
        c === 'NumpadAdd' || c === 'NumpadSubtract' || c === 'Numpad0' ||
        c === 'Equal' || c === 'Minus' || c === 'Digit0' || c === 'BracketRight' || c === 'Slash') stop(e);
  }, opts);

  // 7. Falls trotzdem gezoomt wurde (z. B. durch eine Bedienhilfe): sofort zurücksetzen
  var meta = document.querySelector('meta[name=viewport]');
  var base = 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover';
  var resetting = false;
  function resetZoom() {
    var vv = window.visualViewport;
    if (!meta || !vv || resetting || Math.abs(vv.scale - 1) < 0.01) return;
    resetting = true;
    meta.setAttribute('content', base.replace('initial-scale=1', 'initial-scale=0.99'));
    setTimeout(function () { meta.setAttribute('content', base); resetting = false; }, 30);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resetZoom);
    window.visualViewport.addEventListener('scroll', resetZoom);
  }
  document.addEventListener('touchend', function () { setTimeout(resetZoom, 50); }, { passive: true });
}());
