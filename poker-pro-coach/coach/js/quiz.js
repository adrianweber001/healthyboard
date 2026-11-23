// Quiz: vier Modi mit sofortiger Auflösung.
import { freshDeck, shuffle, parseCards, randInt, makeCard, rankOf, suitOf } from './cards.js';
import { evaluate, bestFive } from './evaluator.js';
import { RANKED, handPercentile, combosOf, topRange } from './ranges.js';
import { equityVsRange } from './equity.js';
import { DEFAULT_PARAMS } from './coach.js';
import { t, pct, handNameT, categoryIndex, CATEGORIES, getLang } from './i18n.js';
import { $, $all, esc, cardHTML } from './ui.js';
import { recordQuiz } from './stats.js';

const MODES = ['winner', 'name', 'odds', 'preflop'];
let mode = 'winner';
const score = { correct: 0, total: 0, streak: 0 };
let q = null;
let bound = false;

export function renderQuiz() {
  $('#quiz-modes').innerHTML = MODES.map((m) => `<button data-mode="${m}" class="${m === mode ? 'on' : ''}">${esc(t('q.mode.' + m))}</button>`).join('');
  if (!bound) {
    bound = true;
    $('#quiz-modes').addEventListener('click', (e) => {
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
  }
  next();
}

function renderScore() {
  $('#quiz-score').innerHTML = `<span>${esc(t('q.correct'))}: <strong>${score.correct} / ${score.total}</strong></span><span>${esc(t('q.streak'))}: <strong>${score.streak}</strong> 🔥</span>`;
}

function next() {
  $all('#quiz-modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  q = { winner: genWinner, name: genName, odds: genOdds, preflop: genPreflop }[mode]();
  q.answered = false;
  $('#quiz-card').innerHTML = `<div class="quiz-q">${esc(q.question)}</div>${q.body}
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
  $all('#quiz-card [data-answer]').forEach((b) => {
    if (b.dataset.answer === q.correct) b.classList.add('correct');
    else if (b.dataset.answer === v) b.classList.add('wrong');
    b.disabled = true;
  });
  if (q.after) q.after();
  $('#quiz-result').innerHTML = `<div class="quiz-explain"><strong class="verdict ${ok ? 'good' : 'bad'}">${esc(t(ok ? 'q.right' : 'q.wrong'))}</strong> ${q.explain}</div>
    <p style="margin-top:.75rem"><button class="btn btn-primary btn-block" id="quiz-next">${esc(t('q.next'))} →</button></p>`;
  renderScore();
  $('#quiz-next').focus();
}

const cards = (arr, hl) => arr.map((c) => cardHTML(c, { hl: hl && hl.has(c) })).join('');

function genWinner() {
  let a; let b; let board; let sa; let sb;
  for (let i = 0; i < 40; i++) {
    const d = shuffle(freshDeck());
    a = [d.pop(), d.pop()]; b = [d.pop(), d.pop()];
    board = [d.pop(), d.pop(), d.pop(), d.pop(), d.pop()];
    sa = evaluate([...a, ...board]); sb = evaluate([...b, ...board]);
    if (Math.floor(sa / 16 ** 5) === Math.floor(sb / 16 ** 5) || i > 30 || randInt(3) === 0) break;
  }
  const correct = sa > sb ? 'A' : sb > sa ? 'B' : 'split';
  const bA = new Set(bestFive([...a, ...board]));
  const bB = new Set(bestFive([...b, ...board]));
  return {
    question: t('q.winner.q'),
    body: `<div class="quiz-felt"><small class="muted">${esc(t('q.board'))}</small><div class="board">${cards(board)}</div></div>
      <div class="quiz-hands"><div class="quiz-hand" id="qa"><strong>${esc(t('q.playerA'))}</strong><div class="seat-cards">${cards(a)}</div></div>
      <div class="quiz-hand" id="qb"><strong>${esc(t('q.playerB'))}</strong><div class="seat-cards">${cards(b)}</div></div></div>`,
    options: [['A', t('q.playerA')], ['B', t('q.playerB')], ['split', t('q.split')]],
    correct,
    explain: `${esc(t('q.winner.ex', { a: handNameT(sa), b: handNameT(sb) }))} ${esc(t(correct === 'split' ? 'q.winner.split' : 'q.winner.hl'))}`,
    after() {
      $('#qa .seat-cards').innerHTML = cards(a, bA);
      $('#qb .seat-cards').innerHTML = cards(b, bB);
    },
  };
}

function genName() {
  let hole; let board; let s;
  const strong = randInt(2) === 0;
  for (let i = 0; i < 200; i++) {
    const d = shuffle(freshDeck());
    hole = [d.pop(), d.pop()];
    board = [d.pop(), d.pop(), d.pop(), d.pop(), d.pop()];
    s = evaluate([...hole, ...board]);
    if (!strong || Math.floor(s / 16 ** 5) >= 3) break;
  }
  const cats = CATEGORIES[getLang()];
  const idx = categoryIndex(s);
  const pool = new Set([idx]);
  const near = shuffle([idx - 1, idx + 1, idx - 2, idx + 2].filter((i) => i >= 0 && i < 10));
  for (const i of near) if (pool.size < 4) pool.add(i);
  while (pool.size < 4) pool.add(randInt(10));
  const best = new Set(bestFive([...hole, ...board]));
  return {
    question: t('q.name.q'),
    body: `<div class="quiz-felt"><small class="muted">${esc(t('q.board'))}</small><div class="board" id="qn-board">${cards(board)}</div>
      <small class="muted">${esc(t('q.yourCards'))}</small><div class="seat-cards" id="qn-hole">${cards(hole)}</div></div>`,
    options: shuffle([...pool]).map((i) => [String(i), cats[i]]),
    correct: String(idx),
    explain: esc(t('q.name.ex', { h: handNameT(s) })),
    after() {
      $('#qn-board').innerHTML = cards(board, best);
      $('#qn-hole').innerHTML = cards(hole, best);
    },
  };
}

const DRAWS = [
  { key: 'draw.fd', outs: 9, hole: 'Ah 7h', flop: 'Kh 9h 2c', turn: '4s' },
  { key: 'draw.oesd', outs: 8, hole: '9c 8d', flop: 'Th 7s 2c', turn: '3h' },
  { key: 'draw.gut', outs: 4, hole: 'Jc 9d', flop: 'Qh 8s 3c', turn: '2d' },
  { key: 'draw.fdoesd', outs: 15, hole: '9h 8h', flop: 'Th 7h 2c', turn: 'Ks' },
  { key: 'q.draw.set', outs: 2, hole: '5c 5d', flop: 'Kh 9s 2c', turn: '7d' },
];
const permuteSuits = (arr) => { const p = shuffle([0, 1, 2, 3]); return arr.map((c) => makeCard(rankOf(c), p[suitOf(c)])); };

function genOdds() {
  for (;;) {
    const d = DRAWS[randInt(DRAWS.length)];
    const onTurn = randInt(2) === 0;
    const potBefore = [20, 30, 40, 60, 80, 100][randInt(6)];
    const bet = Math.round(potBefore * [0.33, 0.5, 0.75, 1, 1.5][randInt(5)]);
    const pot = potBefore + bet;
    const need = bet / (pot + bet);
    const n = onTurn ? 46 : 47;
    const eq = onTurn ? d.outs / 46 : 1 - ((n - d.outs) * (n - 1 - d.outs)) / (n * (n - 1));
    if (Math.abs(eq - need) < 0.03) continue;
    const all = permuteSuits(parseCards(`${d.hole} ${d.flop}${onTurn ? ' ' + d.turn : ''}`));
    const correct = eq >= need ? 'call' : 'fold';
    return {
      question: t('q.odds.q', { street: t(onTurn ? 'street.turn' : 'street.flop'), bet }),
      body: `<div class="quiz-felt"><small class="muted">${esc(t('q.board'))}</small><div class="board">${cards(all.slice(2))}</div>
        <small class="muted">${esc(t('q.yourCards'))}</small><div class="seat-cards">${cards(all.slice(0, 2))}</div>
        <div class="pot">${esc(t('q.odds.pot', { pot, bet }))}</div></div>
        <small class="hint">${esc(t('q.odds.assume', { draw: t(d.key) }))}</small>`,
      options: [['call', t('act.call', { n: bet })], ['fold', t('act.fold')]],
      correct,
      explain: esc(t('q.odds.ex', {
        bet, pot, need: pct(need), outs: d.outs, when: t(onTurn ? 'q.odds.turn' : 'q.odds.flop'),
        eq: `${(eq * 100).toFixed(1)} %`, rule: onTurn ? `${d.outs} × 2 ≈ ${d.outs * 2} %` : `${d.outs} × 4 ≈ ${d.outs * 4} %`,
        verdict: t(correct === 'call' ? 'q.odds.callV' : 'q.odds.foldV'),
      })),
    };
  }
}

const bbEq = {};
const bbEquity = (l) => (bbEq[l] ??= equityVsRange(combosOf(l)[0], [], topRange(0.7), 2000));

function genPreflop() {
  for (;;) {
    const l = RANKED[randInt(RANKED.length)];
    const p = handPercentile(l);
    const sit = ['sb', 'sb', 'bbraise', 'bblimp'][randInt(4)];
    const all = combosOf(l);
    const combo = permuteSuits(all[randInt(all.length)]);
    const P = DEFAULT_PARAMS;
    const pp = `${Math.max(1, Math.round(p * 100))} %`;
    let question; let options; let correct; let explain;
    if (sit === 'sb') {
      if (Math.abs(p - P.sbOpen) < 0.03 || Math.abs(p - P.sbLimp) < 0.03) continue;
      question = t('q.pre.sb');
      options = [['raise', t('q.pre.o.raise25')], ['call', t('q.pre.o.limp')], ['fold', t('q.pre.o.fold')]];
      correct = p <= P.sbOpen ? 'raise' : p <= P.sbLimp ? 'call' : 'fold';
      explain = t('q.pre.ex.sb', { cls: l, p: pp });
    } else if (sit === 'bblimp') {
      if (Math.abs(p - P.bbIso) < 0.03) continue;
      question = t('q.pre.bblimp');
      options = [['raise', t('q.pre.o.raise4')], ['check', t('q.pre.o.check')]];
      correct = p <= P.bbIso ? 'raise' : 'check';
      explain = t('q.pre.ex.bblimp', { cls: l, p: pp });
    } else {
      const eq = bbEquity(l);
      const eff = eq * 0.85;
      if (p > P.threeBet && Math.abs(eff - 0.3) < 0.02) continue;
      if (Math.abs(p - P.threeBet) < 0.02) continue;
      question = t('q.pre.bbraise');
      options = [['raise', t('q.pre.o.3bet')], ['call', t('q.pre.o.call')], ['fold', t('q.pre.o.fold')]];
      correct = p <= P.threeBet ? 'raise' : eff >= 0.3 ? 'call' : 'fold';
      explain = t('q.pre.ex.bbraise', { cls: l, eq: pct(eq), eff: pct(eff), v: t(correct === 'raise' ? 'q.pre.v.3bet' : correct === 'call' ? 'q.pre.v.call' : 'q.pre.v.fold') });
    }
    return {
      question,
      body: `<div class="quiz-felt"><small class="muted">${esc(t('q.yourCards'))} (${l})</small><div class="seat-cards">${cards(combo)}</div></div>`,
      options,
      correct,
      explain: esc(explain),
    };
  }
}
