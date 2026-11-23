// Monte-Carlo-Equity: Wie oft gewinnt die Hand gegen eine Range bis zum River?
import { evaluate } from './evaluator.js';
import { randInt } from './cards.js';
import { ALL_COMBOS, removeDead } from './ranges.js';

/**
 * @param {number[]} hole  zwei eigene Karten
 * @param {number[]} board 0–5 Boardkarten
 * @param {number[][]} range mögliche Gegner-Kombos
 * @param {number} iters Durchläufe
 * @returns {number} Equity 0–1 (Split zählt halb)
 */
export function equityVsRange(hole, board, range = ALL_COMBOS, iters = 2500) {
  const dead = [hole[0], hole[1], ...board];
  let combos = removeDead(range, dead);
  if (combos.length === 0) combos = removeDead(ALL_COMBOS, dead);

  const used = new Uint8Array(52);
  for (const c of dead) used[c] = 1;
  const need = 5 - board.length;
  const heroCards = new Array(7);
  const vilCards = new Array(7);
  heroCards[0] = hole[0];
  heroCards[1] = hole[1];
  for (let i = 0; i < board.length; i++) heroCards[2 + i] = vilCards[2 + i] = board[i];

  // Restkarten pro Durchlauf: Deck ohne tote Karten
  const rest = [];
  for (let c = 0; c < 52; c++) if (!used[c]) rest.push(c);

  let score = 0;
  for (let it = 0; it < iters; it++) {
    const [v1, v2] = combos[randInt(combos.length)];
    vilCards[0] = v1;
    vilCards[1] = v2;
    // Teil-Mischung: ziehe "need" Karten, die nicht v1/v2 sind
    let drawn = 0;
    let k = 0;
    while (drawn < need) {
      const j = k + Math.floor(Math.random() * (rest.length - k));
      const t = rest[k]; rest[k] = rest[j]; rest[j] = t;
      const c = rest[k];
      k++;
      if (c === v1 || c === v2) continue;
      heroCards[2 + board.length + drawn] = vilCards[2 + board.length + drawn] = c;
      drawn++;
    }
    const h = evaluate(heroCards);
    const v = evaluate(vilCards);
    score += h > v ? 1 : h === v ? 0.5 : 0;
  }
  return score / iters;
}

/** Exakte Showdown-Equity zweier bekannter Hände (für Quiz/Rückblick). */
export function equityHeadsUp(h1, h2, board, iters = 4000) {
  return equityVsRange(h1, board, [h2], iters);
}
