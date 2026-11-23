// Einstieg: Navigation, Sprache, Module.
import { $, $all, applyI18n, loadSettings } from './ui.js';
import { getLang, setLang } from './i18n.js';
import { initTraining, refreshTraining } from './training.js';
import { renderMatrix } from './matrix.js';
import { renderQuiz } from './quiz.js';
import { renderStats } from './stats.js';

const VIEWS = ['training', 'matrix', 'quiz', 'stats'];
let current = 'training';
const settings = loadSettings();

function show(view, { rerender = true } = {}) {
  if (!VIEWS.includes(view)) view = 'training';
  current = view;
  $all('#nav [data-view]').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  VIEWS.forEach((v) => { $(`#view-${v}`).hidden = v !== view; });
  if (rerender) {
    if (view === 'matrix') renderMatrix();
    if (view === 'quiz') renderQuiz();
    if (view === 'stats') renderStats();
  }
  $('#main').scrollTop = 0;
  if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
}

function markLang() {
  $all('#lang-switch button').forEach((b) => b.classList.toggle('on', b.dataset.lang === getLang()));
  document.documentElement.lang = getLang();
}

$('#lang-switch').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lang]');
  if (!b) return;
  setLang(b.dataset.lang);
  markLang();
  applyI18n();
  refreshTraining();
  if (current !== 'training') show(current);
});

$('#nav').addEventListener('click', (e) => {
  const a = e.target.closest('[data-view]');
  if (!a) return;
  e.preventDefault();
  show(a.dataset.view);
});
window.addEventListener('hashchange', () => show(location.hash.slice(1)));

markLang();
applyI18n();
initTraining(settings);
show(location.hash.slice(1) || 'training');
