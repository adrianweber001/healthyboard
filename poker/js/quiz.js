// Quiz-Tab: vier Modi mit sofortiger Auflösung.
import { freshDeck, shuffle, parseCards, randInt, makeCard, rankOf, suitOf } from './cards.js';
import { evaluate, handName, categoryName, bestFive } from './evaluator.js';
import { RANKED, handPercentile, combosOf, topRange } from './ranges.js';
import { equityVsRange } from './equity.js';
import { DEFAULT_PARAMS } from './coach.js';
import { $, $$, esc, cardsHTML, cardHTML, pctText } from './ui.js';
import { recordQuiz } from './stats.js';

const MODES = [
  ['winner', 'Welche Hand gewinnt?'],
  ['name', 'Was habe ich?'],
  ['odds', 'Pot Odds: Call oder Fold?'],
  ['preflop', 'Preflop-Entscheidung'],
];
const ALL_CATS = ['Royal Flush', 'Straight Flush', 'Vierling', 'Full House', 'Flush', 'Straße', 'Drilling', 'Zwei Paare', 'Ein Paar', 'Höchste Karte'];

let mode = 'winner';
let score = { correct: 0, total: 0, streak: 0 };
let q = null;

export function initQuiz() {
  const nav = $('#quiz-nav');
  nav.innerHTML = MODES.map(([k, n]) => `<button class="chip-btn" data-mode="${k}">${n}</button>`).join('');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    mode = b.dataset.mode;
    next();
  });
  $('#quiz-card').addEventListener('click', (e) => {
    const opt = e.target.closest('[data-answer]');
    if (opt && q && !q.answered) answer(opt.dataset.answer);
    if (e.target.closest('#quiz-next')) next();
  });
  next();
}

function renderScore() {
  $('#quiz-score').innerHTML = `<span>Richtig: <strong>${score.correct} / ${score.total}</strong></span><span>Serie: <strong>${score.streak}</strong> 🔥</span>`;
}

function next() {
  $$('#quiz-nav .chip-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  q = { winner: genWinner, name: genName, odds: genOdds, preflop: genPreflop }[mode]();
  q.answered = false;
  $('#quiz-card').innerHTML = `
    <div class="quiz-q">${q.question}</div>
    ${q.body}
    <div class="quiz-options">${q.options.map(([v, l]) => `<button class="btn" data-answer="${esc(v)}">${esc(l)}</button>`).join('')}</div>
    <div id="quiz-result"></div>`;
  renderScore();
}

function answer(v) {
  q.answered = true;
  const ok = v === q.correct;
  score.total++;
  if (ok) { score.correct++; score.streak++; } else score.streak = 0;
  recordQuiz(ok, score.streak);
  $$('#quiz-card [data-answer]').forEach((b) => {
    if (b.dataset.answer === q.correct) b.classList.add('correct');
    else if (b.dataset.answer === v) b.classList.add('wrong');
    b.disabled = true;
  });
  if (q.after) q.after();
  $('#quiz-result').innerHTML = `<div class="quiz-explain"><strong style="color:${ok ? 'var(--good)' : 'var(--bad)'}">${ok ? '✅ Richtig!' : '❌ Leider falsch.'}</strong> ${q.explain}</div>
    <p><button class="btn btn-next" id="quiz-next">Nächste Frage ▶</button></p>`;
  renderScore();
  $('#quiz-next').focus();
}

/* ---------- Modus 1: Welche Hand gewinnt? ---------- */
function genWinner() {
  let deck;
  let a;
  let b;
  let board;
  let sa;
  let sb;
  // Interessante Spots bevorzugen: beide haben mindestens ein Paar oder es ist knapp
  for (let tries = 0; tries < 40; tries++) {
    deck = shuffle(freshDeck());
    a = [deck.pop(), deck.pop()];
    b = [deck.pop(), deck.pop()];
    board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    sa = evaluate([...a, ...board]);
    sb = evaluate([...b, ...board]);
    if (Math.floor(sa / 16 ** 5) === Math.floor(sb / 16 ** 5) || tries > 30 || randInt(3) === 0) break;
  }
  const correct = sa > sb ? 'A' : sb > sa ? 'B' : 'split';
  const bestA = new Set(bestFive([...a, ...board]));
  const bestB = new Set(bestFive([...b, ...board]));
  const q = {
    question: 'Welcher Spieler gewinnt den Pot?',
    body: `<div class="quiz-felt"><div class="small muted">Board</div><div class="board">${board.map((c) => cardHTML(c)).join('')}</div></div>
      <div class="quiz-hands">
        <div class="quiz-hand" id="qa"><strong>Spieler A</strong><div class="hole">${a.map((c) => cardHTML(c)).join('')}</div></div>
        <div class="quiz-hand" id="qb"><strong>Spieler B</strong><div class="hole">${b.map((c) => cardHTML(c)).join('')}</div></div>
      </div>`,
    options: [['A', 'Spieler A'], ['B', 'Spieler B'], ['split', 'Split Pot']],
    correct,
    explain: `Spieler A: <strong>${esc(handName(sa))}</strong> · Spieler B: <strong>${esc(handName(sb))}</strong>. ${correct === 'split' ? 'Beide haben exakt gleich starke 5 Karten.' : 'Die besten 5 Karten sind hervorgehoben.'}`,
    after() {
      const hl = (id, cards, set) => { $(`#${id} .hole`).innerHTML = cards.map((c) => cardHTML(c, { hl: set.has(c) })).join(''); };
      hl('qa', a, bestA);
      hl('qb', b, bestB);
    },
  };
  return q;
}

/* ---------- Modus 2: Was habe ich? ---------- */
function genName() {
  // Seltene Hände etwas häufiger zeigen, damit es spannend bleibt
  let hole;
  let board;
  let s;
  const wantStrong = randInt(2) === 0;
  for (let tries = 0; tries < 200; tries++) {
    const deck = shuffle(freshDeck());
    hole = [deck.pop(), deck.pop()];
    board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    s = evaluate([...hole, ...board]);
    if (!wantStrong || Math.floor(s / 16 ** 5) >= 3) break;
  }
  const cat = categoryName(s);
  const idx = ALL_CATS.indexOf(cat);
  const pool = new Set([cat]);
  const near = [idx - 1, idx + 1, idx - 2, idx + 2].filter((i) => i >= 0 && i < ALL_CATS.length);
  shuffle(near);
  for (const i of near) { if (pool.size < 4) pool.add(ALL_CATS[i]); }
  while (pool.size < 4) pool.add(ALL_CATS[randInt(ALL_CATS.length)]);
  const options = shuffle([...pool]).map((c) => [c, c]);
  const best = new Set(bestFive([...hole, ...board]));
  return {
    question: 'Was ist deine beste 5-Karten-Hand?',
    body: `<div class="quiz-felt"><div class="small muted">Board</div><div class="board" id="qn-board">${board.map((c) => cardHTML(c)).join('')}</div>
      <div class="small muted">Deine Karten</div><div class="hole" id="qn-hole">${hole.map((c) => cardHTML(c)).join('')}</div></div>`,
    options,
    correct: cat,
    explain: `Du hast <strong>${esc(handName(s))}</strong>.`,
    after() {
      $('#qn-board').innerHTML = board.map((c) => cardHTML(c, { hl: best.has(c) })).join('');
      $('#qn-hole').innerHTML = hole.map((c) => cardHTML(c, { hl: best.has(c) })).join('');
    },
  };
}

/* ---------- Modus 3: Pot Odds ---------- */
const DRAWS = [
  { name: 'Flush-Draw', outs: 9, hole: 'Ah 7h', flop: 'Kh 9h 2c', turn: '4s' },
  { name: 'Open-Ended Straight-Draw', outs: 8, hole: '9c 8d', flop: 'Th 7s 2c', turn: '3h' },
  { name: 'Gutshot', outs: 4, hole: 'Jc 9d', flop: 'Qh 8s 3c', turn: '2d' },
  { name: 'Flush-Draw + Open-Ender', outs: 15, hole: '9h 8h', flop: 'Th 7h 2c', turn: 'Ks' },
  { name: 'Pocket-Paar, das ein Set braucht', outs: 2, hole: '5c 5d', flop: 'Kh 9s 2c', turn: '7d' },
];

function permuteSuits(cards) {
  const perm = shuffle([0, 1, 2, 3]);
  return cards.map((c) => makeCard(rankOf(c), perm[suitOf(c)]));
}

function genOdds() {
  for (;;) {
    const d = DRAWS[randInt(DRAWS.length)];
    const onTurn = randInt(2) === 0;
    const frac = [0.33, 0.5, 0.75, 1, 1.5][randInt(5)];
    const potBefore = [20, 30, 40, 60, 80, 100][randInt(6)];
    const bet = Math.round(potBefore * frac);
    const pot = potBefore + bet;
    const need = bet / (pot + bet);
    const unseen = onTurn ? 46 : 47;
    const eq = onTurn ? d.outs / 46 : 1 - ((unseen - d.outs) * (unseen - 1 - d.outs)) / (unseen * (unseen - 1));
    if (Math.abs(eq - need) < 0.03) continue;
    const all = permuteSuits(parseCards(`${d.hole} ${d.flop}${onTurn ? ' ' + d.turn : ''}`));
    const hole = all.slice(0, 2);
    const board = all.slice(2);
    const correct = eq >= need ? 'call' : 'fold';
    const rule = onTurn ? `${d.outs} × 2 ≈ ${d.outs * 2} %` : `${d.outs} × 4 ≈ ${d.outs * 4} %`;
    return {
      question: `${onTurn ? 'Turn' : 'Flop'}: Der Gegner setzt ${bet} und ist damit all-in. Call oder Fold?`,
      body: `<div class="quiz-felt"><div class="small muted">Board</div><div class="board">${board.map((c) => cardHTML(c)).join('')}</div>
        <div class="small muted">Deine Karten</div><div class="hole">${hole.map((c) => cardHTML(c)).join('')}</div>
        <div class="pot">Pot inkl. Bet: ${pot} · zu callen: ${bet}</div></div>
        <p class="small muted" style="margin:0">Annahme: Der Gegner hat bereits eine bessere Hand, du gewinnst nur, wenn du deinen Draw triffst (${esc(d.name)}).</p>`,
      options: [['call', 'Call'], ['fold', 'Fold']],
      correct,
      explain: `Benötigt: ${bet} ÷ (${pot} + ${bet}) = <strong>${pctText(need)}</strong>. Deine Chance mit ${d.outs} Outs ${onTurn ? 'am Turn (eine Karte)' : 'am Flop (zwei Karten)'}: <strong>${(eq * 100).toFixed(1)} %</strong> (Faustregel ${rule}). ${correct === 'call' ? 'Die Chance ist höher als der Preis → Call.' : 'Der Preis ist zu hoch → Fold.'}`,
    };
  }
}

/* ---------- Modus 4: Preflop ---------- */
let bbEq = null;
function bbEquity(label) {
  if (!bbEq) bbEq = {};
  if (bbEq[label] === undefined) bbEq[label] = equityVsRange(combosOf(label)[0], [], topRange(0.7), 2000);
  return bbEq[label];
}

function genPreflop() {
  for (;;) {
    const label = RANKED[randInt(RANKED.length)];
    const p = handPercentile(label);
    const situation = ['sb', 'sb', 'bbraise', 'bblimp'][randInt(4)];
    const combo = permuteSuits(combosOf(label)[randInt(combosOf(label).length)]);
    let correct;
    let options;
    let question;
    let explain;
    if (situation === 'sb') {
      if (Math.abs(p - DEFAULT_PARAMS.sbOpen) < 0.03 || Math.abs(p - DEFAULT_PARAMS.sbLimp) < 0.03) continue;
      question = 'Du bist Small Blind (Button) und als Erster dran. Was machst du?';
      options = [['raise', 'Raise auf 2,5 BB'], ['call', 'Limp (Call)'], ['fold', 'Fold']];
      correct = p <= DEFAULT_PARAMS.sbOpen ? 'raise' : p <= DEFAULT_PARAMS.sbLimp ? 'call' : 'fold';
      explain = `${label} gehört zu den besten ${pctText(p)} aller Hände. Im Heads-up raist der Button etwa die besten 65 %, limpt bis ca. 85 % und foldet den Rest.`;
    } else if (situation === 'bblimp') {
      if (Math.abs(p - DEFAULT_PARAMS.bbIso) < 0.03) continue;
      question = 'Du bist Big Blind. Der Gegner hat nur gelimpt (gecallt). Was machst du?';
      options = [['raise', 'Raise auf 4 BB'], ['check', 'Check']];
      correct = p <= DEFAULT_PARAMS.bbIso ? 'raise' : 'check';
      explain = `${label} ist Top ${pctText(p)}. Gegen einen Limp raist man mit den besten ca. 30 % für Value, sonst Check – Folden wäre nie richtig, der Flop ist gratis.`;
    } else {
      const eq = bbEquity(label);
      const eff = eq * 0.85;
      if (p > DEFAULT_PARAMS.threeBet && Math.abs(eff - 0.3) < 0.02) continue;
      if (Math.abs(p - DEFAULT_PARAMS.threeBet) < 0.02) continue;
      question = 'Du bist Big Blind. Der Gegner raist auf 2,5 BB (5 Chips). Was machst du?';
      options = [['raise', '3-Bet (Re-Raise)'], ['call', 'Call'], ['fold', 'Fold']];
      correct = p <= DEFAULT_PARAMS.threeBet ? 'raise' : eff >= 0.3 ? 'call' : 'fold';
      explain = `Du zahlst 3 in einen Pot von 7 → du brauchst 30 % Equity. ${label} hat gegen die typische Raise-Range (Top 70 %) ca. ${pctText(eq)} Equity; ohne Position realisierst du etwa 85 % davon (≈ ${pctText(eff)}). ${correct === 'raise' ? 'Die Hand ist sogar stark genug für eine 3-Bet (Top 12 %).' : correct === 'call' ? 'Das reicht für einen Call.' : 'Das reicht nicht – Fold.'}`;
    }
    return {
      question,
      body: `<div class="quiz-felt"><div class="small muted">Deine Karten (${label})</div><div class="hole">${combo.map((c) => cardHTML(c)).join('')}</div></div>`,
      options,
      correct,
      explain,
    };
  }
}
