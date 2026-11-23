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

initTable(settings);
showTab(location.hash.slice(1) || 'spielen');
