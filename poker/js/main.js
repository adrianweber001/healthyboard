// Einstieg: Tabs und Module initialisieren.
import { $, $$, loadSettings } from './ui.js';
import { initTable } from './ui-table.js';
import { initLearn } from './learn.js';
import { initQuiz } from './quiz.js';
import { renderStats } from './stats.js';

const settings = loadSettings();
const inited = {};

function showTab(name) {
  if (!document.getElementById(`tab-${name}`)) name = 'spielen';
  $$('.tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  $$('.tab-panel').forEach((p) => { p.hidden = p.id !== `tab-${name}`; });
  if (name === 'lernen' && !inited.lernen) { initLearn(); inited.lernen = true; }
  if (name === 'quiz' && !inited.quiz) { initQuiz(); inited.quiz = true; }
  if (name === 'statistik') renderStats();
  if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
}

$$('.tabs [role=tab]').forEach((b) => b.addEventListener('click', () => { showTab(b.dataset.tab); window.scrollTo({ top: 0 }); }));
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

// Zoomen verhindern: Pinch-Gesten (iOS), Mehrfinger-Touch, Doppelklick sowie Strg + Mausrad / Strg + +/-/0
const stop = (e) => e.preventDefault();
['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => document.addEventListener(t, stop, { passive: false }));
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', stop, { passive: false });
window.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0', 'Add', 'Subtract'].includes(e.key)) e.preventDefault();
});

initTable(settings);
showTab(location.hash.slice(1) || 'spielen');
