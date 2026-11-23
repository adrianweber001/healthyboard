// Coach-Statistik (nur im Browser, eigener Schlüssel – berührt keine Poker-Pro-Daten).
import { $, esc } from './ui.js';
import { t, pct } from './i18n.js';

const KEY = 'awpp.coach.stats.v1';
const empty = () => ({
  hands: 0, won: 0, net: 0, vpip: 0, pfr: 0, showdowns: 0, showdownsWon: 0,
  decisions: { good: 0, ok: 0, bad: 0 },
  byStreet: { preflop: [0, 0, 0], flop: [0, 0, 0], turn: [0, 0, 0], river: [0, 0, 0] },
  mistakes: {},
  quiz: { total: 0, correct: 0, bestStreak: 0 },
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) {
      const b = empty();
      return { ...b, ...raw, decisions: { ...b.decisions, ...raw.decisions }, byStreet: { ...b.byStreet, ...raw.byStreet }, quiz: { ...b.quiz, ...raw.quiz } };
    }
  } catch { /* ignorieren */ }
  return empty();
}
let stats = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch { /* kein Speicher */ } };

export function recordDecision(j, street) {
  stats.decisions[j.verdict]++;
  if (stats.byStreet[street]) stats.byStreet[street][{ good: 0, ok: 1, bad: 2 }[j.verdict]]++;
  if (j.mistake && j.verdict !== 'good') stats.mistakes[j.mistake] = (stats.mistakes[j.mistake] || 0) + 1;
  save();
}

export function recordHand(hand, hero = 0) {
  stats.hands++;
  const net = hand.net[hero];
  stats.net += net;
  if (net > 0) stats.won++;
  const pre = hand.history.filter((h) => h.street === 'preflop' && h.player === hero);
  if (pre.some((h) => h.type === 'call' || h.type === 'raise')) stats.vpip++;
  if (pre.some((h) => h.type === 'raise')) stats.pfr++;
  if (hand.result.type === 'showdown') {
    stats.showdowns++;
    if (hand.result.winners.length === 1 && hand.result.winners[0] === hero) stats.showdownsWon++;
  }
  save();
}

export function recordQuiz(correct, streak) {
  stats.quiz.total++;
  if (correct) stats.quiz.correct++;
  stats.quiz.bestStreak = Math.max(stats.quiz.bestStreak, streak);
  save();
}

const share = (a, b) => (b > 0 ? pct(a / b) : '–');

export function renderStats() {
  const s = stats;
  const total = s.decisions.good + s.decisions.ok + s.decisions.bad;
  const mistakes = Object.entries(s.mistakes).sort((a, b) => b[1] - a[1]);
  const max = mistakes.length ? mistakes[0][1] : 1;
  $('#view-stats').innerHTML = `
    <div class="page-intro"><h1>${esc(t('nav.stats'))}</h1><p>${esc(t('s.local'))}</p></div>
    <div class="stat-grid">
      <div class="stat"><span>${esc(t('s.hands'))}</span><strong id="st-hands">${s.hands}</strong><small>${esc(t('s.won', { p: share(s.won, s.hands) }))}</small></div>
      <div class="stat"><span>${esc(t('s.net'))}</span><strong class="${s.net >= 0 ? 'verdict good' : 'verdict bad'}">${s.net >= 0 ? '+' : ''}${s.net}</strong><small>${esc(t('s.bb100', { n: s.hands ? (s.net / 2 / s.hands * 100).toFixed(1) : '0' }))}</small></div>
      <div class="stat"><span>${esc(t('s.good'))}</span><strong>${share(s.decisions.good, total)}</strong><small>${esc(t('s.rated', { n: total }))}</small></div>
      <div class="stat"><span>${esc(t('s.vpip'))}</span><strong>${share(s.vpip, s.hands)} / ${share(s.pfr, s.hands)}</strong><small>${esc(t('s.vpipDesc'))}</small></div>
      <div class="stat"><span>${esc(t('s.sd'))}</span><strong>${share(s.showdownsWon, s.showdowns)}</strong><small>${esc(t('s.sdDesc', { n: s.showdowns }))}</small></div>
      <div class="stat"><span>${esc(t('s.quiz'))}</span><strong>${share(s.quiz.correct, s.quiz.total)}</strong><small id="st-quiz">${esc(t('s.quizDesc', { n: s.quiz.total, s: s.quiz.bestStreak }))}</small></div>
    </div>
    <div class="two-col">
      <div class="panel"><h2>${esc(t('s.byStreet'))}</h2><small class="muted">${esc(t('s.legend'))}</small>
        <div class="bars">${Object.entries(s.byStreet).map(([st, [g, o, b]]) => {
          const n = g + o + b || 1;
          return `<div class="bar-row"><span>${esc(t('street.' + st))}</span><div class="bar-track"><i style="width:${g / n * 100}%;background:var(--ok)"></i><i style="width:${o / n * 100}%;background:var(--warn)"></i><i style="width:${b / n * 100}%;background:var(--danger)"></i></div><span>${g + o + b}</span></div>`;
        }).join('')}</div>
      </div>
      <div class="panel"><h2>${esc(t('s.mistakes'))}</h2>
        ${mistakes.length ? `<div class="bars">${mistakes.map(([m, n]) => `<div class="bar-row"><span>${esc(t('mistake.' + m))}</span><div class="bar-track"><i style="width:${n / max * 100}%;background:var(--danger)"></i></div><span>${n}</span></div>`).join('')}</div>
          <div class="callout">💡 ${esc(t('tip.' + mistakes[0][0]))}</div>` : `<p class="muted">${esc(t('s.noMistakes'))}</p>`}
      </div>
    </div>
    <p style="margin-top:1rem"><button class="btn btn-danger" id="btn-reset-stats">${esc(t('s.reset'))}</button></p>`;
  $('#btn-reset-stats').addEventListener('click', () => {
    if (confirm(t('s.confirmReset'))) { stats = empty(); save(); renderStats(); }
  });
}
