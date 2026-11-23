// Statistik im Browser (localStorage). Funktioniert auch ohne Speicher, dann nur für die Sitzung.
import { $, esc, pctText } from './ui.js';

const KEY = 'holdem-coach-stats-v1';
const empty = () => ({
  hands: 0, won: 0, net: 0, vpip: 0, pfr: 0, showdowns: 0, showdownsWon: 0, biggestPot: 0,
  decisions: { good: 0, ok: 0, bad: 0 },
  byStreet: { preflop: [0, 0, 0], flop: [0, 0, 0], turn: [0, 0, 0], river: [0, 0, 0] },
  mistakes: {},
  quiz: { total: 0, correct: 0, bestStreak: 0 },
});

let stats = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) {
      const base = empty();
      return { ...base, ...raw, decisions: { ...base.decisions, ...raw.decisions }, byStreet: { ...base.byStreet, ...raw.byStreet }, quiz: { ...base.quiz, ...raw.quiz } };
    }
  } catch { /* ignorieren */ }
  return empty();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch { /* Speicher nicht verfügbar */ }
}

export function recordDecision(judgement, street) {
  stats.decisions[judgement.verdict]++;
  const idx = { good: 0, ok: 1, bad: 2 }[judgement.verdict];
  if (stats.byStreet[street]) stats.byStreet[street][idx]++;
  if (judgement.mistake && judgement.verdict !== 'good') stats.mistakes[judgement.mistake] = (stats.mistakes[judgement.mistake] || 0) + 1;
  save();
}

export function recordHand(hand, heroIdx = 0) {
  stats.hands++;
  const net = hand.net[heroIdx];
  stats.net += net;
  if (net > 0) stats.won++;
  const pre = hand.history.filter((h) => h.street === 'preflop' && h.player === heroIdx);
  if (pre.some((h) => h.type === 'call' || h.type === 'raise')) stats.vpip++;
  if (pre.some((h) => h.type === 'raise')) stats.pfr++;
  if (hand.result.type === 'showdown') {
    stats.showdowns++;
    if (hand.result.winners.includes(heroIdx) && hand.result.winners.length === 1) stats.showdownsWon++;
  }
  stats.biggestPot = Math.max(stats.biggestPot, hand.result.pot);
  save();
}

export function recordQuiz(correct, streak) {
  stats.quiz.total++;
  if (correct) stats.quiz.correct++;
  stats.quiz.bestStreak = Math.max(stats.quiz.bestStreak, streak);
  save();
}

export function resetStats() {
  stats = empty();
  save();
}

const share = (a, b) => (b > 0 ? pctText(a / b) : '–');

export function renderStats() {
  const s = stats;
  const totalDec = s.decisions.good + s.decisions.ok + s.decisions.bad;
  const mistakes = Object.entries(s.mistakes).sort((a, b) => b[1] - a[1]);
  const maxMistake = mistakes.length ? mistakes[0][1] : 1;
  const tips = {
    'Zu tight gefoldet': 'Achte auf die Pot Odds: Wenn du nur wenig zahlen musst, reicht oft schon eine geringe Equity.',
    'Zu loose gecallt': 'Rechne vor dem Call: zu callen ÷ (Pot + zu callen). Liegt deine Equity darunter, ist Fold richtig.',
    'Zu passiv': 'Mit starken Händen setzen und raisen – sonst bekommst du zu wenig Value.',
    'Zu aggressiv': 'Bluffs brauchen einen Grund (Draw, gute Story, Position). Mittelstarke Hände lieber checken.',
    'Überspielt': 'Nicht jede gute Hand ist ein Raise wert – oft ist Call besser, damit schwächere Hände im Pot bleiben.',
    'Bet-Größe': 'Value-Bets meist ½ bis ⅔ Pot; zu kleine Bets geben Draws einen günstigen Preis.',
  };

  $('#stats-content').innerHTML = `
    <div class="stats-grid">
      <div class="panel stat"><span>Gespielte Hände</span><strong>${s.hands}</strong><small>davon gewonnen: ${share(s.won, s.hands)}</small></div>
      <div class="panel stat"><span>Bilanz</span><strong style="color:${s.net >= 0 ? 'var(--good)' : 'var(--bad)'}">${s.net >= 0 ? '+' : ''}${s.net}</strong><small>Chips (${s.hands ? (s.net / 2 / s.hands * 100).toFixed(1) : '0'} BB/100 Hände)</small></div>
      <div class="panel stat"><span>Gute Entscheidungen</span><strong>${share(s.decisions.good, totalDec)}</strong><small>${totalDec} bewertete Entscheidungen</small></div>
      <div class="panel stat"><span>VPIP / PFR</span><strong>${share(s.vpip, s.hands)} / ${share(s.pfr, s.hands)}</strong><small>freiwillig investiert / Preflop-Raise</small></div>
      <div class="panel stat"><span>Showdowns gewonnen</span><strong>${share(s.showdownsWon, s.showdowns)}</strong><small>${s.showdowns} Showdowns</small></div>
      <div class="panel stat"><span>Quiz</span><strong>${share(s.quiz.correct, s.quiz.total)}</strong><small>${s.quiz.total} Fragen · beste Serie ${s.quiz.bestStreak}</small></div>
    </div>

    <div class="learn-grid">
      <div class="panel">
        <h2>Entscheidungen nach Straße</h2>
        <p class="muted small">Grün = gut, gelb = vertretbar, rot = Fehler</p>
        <div class="bars">
          ${Object.entries(s.byStreet).map(([st, [g, o, b]]) => {
            const t = g + o + b || 1;
            return `<div class="bar-row"><span>${st[0].toUpperCase() + st.slice(1)}</span>
              <div class="bar-track" role="img" aria-label="${st}: ${g} gut, ${o} vertretbar, ${b} Fehler">
                <i style="width:${g / t * 100}%;background:var(--good)"></i><i style="width:${o / t * 100}%;background:var(--ok)"></i><i style="width:${b / t * 100}%;background:var(--bad)"></i>
              </div><span>${g + o + b}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="panel">
        <h2>Deine häufigsten Fehler</h2>
        ${mistakes.length ? `<div class="bars" style="margin-top:10px">${mistakes.map(([m, n]) => `
          <div class="bar-row"><span>${esc(m)}</span><div class="bar-track"><i style="width:${n / maxMistake * 100}%;background:var(--bad)"></i></div><span>${n}</span></div>`).join('')}</div>
          <div class="callout small">💡 ${esc(tips[mistakes[0][0]] || 'Schau dir im Handrückblick an, was der Coach empfohlen hätte.')}</div>`
          : '<p class="muted">Noch keine Fehler erfasst – spiel ein paar Hände!</p>'}
      </div>
    </div>
    <p style="margin-top:16px"><button class="btn btn-ghost" id="btn-reset-stats">Statistik zurücksetzen</button></p>
    <p class="muted small">Die Statistik wird nur in diesem Browser gespeichert.</p>
  `;
  $('#btn-reset-stats').addEventListener('click', () => {
    if (confirm('Statistik wirklich zurücksetzen?')) { resetStats(); renderStats(); }
  });
}
