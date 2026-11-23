// Starthände (169 Klassen), Rangliste und Ranges als Kombinationslisten.
import { RANK_CHARS, makeCard, rankOf, suitOf } from './cards.js';
import { PREFLOP_EQUITY } from './preflop-table.js';
import { evaluate, hasFlushDraw, straightDrawRanks, CATEGORY } from './evaluator.js';

/** Klassen-Name wie „AKs“, „T9o“ oder „77“ für zwei Karten. */
export function handClass(c1, c2) {
  let a = rankOf(c1);
  let b = rankOf(c2);
  if (b > a) [a, b] = [b, a];
  if (a === b) return RANK_CHARS[a] + RANK_CHARS[b];
  return RANK_CHARS[a] + RANK_CHARS[b] + (suitOf(c1) === suitOf(c2) ? 's' : 'o');
}

export function combosOf(label) {
  const a = RANK_CHARS.indexOf(label[0]);
  const b = RANK_CHARS.indexOf(label[1]);
  const out = [];
  if (a === b) {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = s1 + 1; s2 < 4; s2++) out.push([makeCard(a, s1), makeCard(b, s2)]);
  } else if (label[2] === 's') {
    for (let s = 0; s < 4; s++) out.push([makeCard(a, s), makeCard(b, s)]);
  } else {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) if (s1 !== s2) out.push([makeCard(a, s1), makeCard(b, s2)]);
  }
  return out;
}

export const comboCount = (label) => (label.length === 2 ? 6 : label[2] === 's' ? 4 : 12);

/** Alle 169 Klassen, stärkste zuerst. */
export const RANKED = Object.keys(PREFLOP_EQUITY).sort((x, y) => PREFLOP_EQUITY[y] - PREFLOP_EQUITY[x]);

const rankIndex = {};
const percentileTop = {}; // Anteil aller Kombos, die mindestens so stark sind (inkl. dieser Hand)
const percentileStart = {}; // Anteil aller Kombos, die stärker sind
{
  let cum = 0;
  RANKED.forEach((label, i) => {
    rankIndex[label] = i + 1;
    percentileStart[label] = cum / 1326;
    cum += comboCount(label);
    percentileTop[label] = cum / 1326;
  });
}

export const handRank = (label) => rankIndex[label];
/** Mittlere Perzentil-Position einer Klasse (0 = beste Hand, 1 = schlechteste). */
export const handPercentile = (label) => (percentileStart[label] + percentileTop[label]) / 2;
export const preflopEquity = (label) => PREFLOP_EQUITY[label];

/** Alle Kombos der stärksten pct-Anteile (0–1). */
export function topRange(pct) {
  const out = [];
  for (const label of RANKED) {
    if (percentileStart[label] >= pct) break;
    for (const c of combosOf(label)) out.push(c);
  }
  return out;
}

export const ALL_COMBOS = topRange(1.01);

/** Entfernt Kombos, die bekannte (tote) Karten enthalten. */
export function removeDead(range, dead) {
  const set = new Set(dead);
  return range.filter(([a, b]) => !set.has(a) && !set.has(b));
}

const B5 = 16 ** 5;
const DRAW_KEY = CATEGORY.PAIR * B5 + 8 * 65536; // Draw ≈ so viel wert wie ein Paar Zehnen
const COMBO_DRAW_KEY = CATEGORY.TWO_PAIR * B5;

/** Grobe Stärke einer Hand auf dem Board inkl. Draws (für Range-Schätzung). */
export function postflopStrength(hole, board) {
  const cards = [hole[0], hole[1], ...board];
  let key = evaluate(cards);
  if (board.length < 5 && key < CATEGORY.STRAIGHT * B5) {
    const fd = hasFlushDraw(cards, hole);
    const sd = straightDrawRanks(cards, board) >= 2;
    if (fd && sd) key = Math.max(key, COMBO_DRAW_KEY);
    else if (fd || sd) key = Math.max(key, DRAW_KEY);
  }
  return key;
}

/** Behält den stärksten Anteil keep (0–1) einer Range auf dem Board. */
export function narrowRange(range, board, keep) {
  if (range.length <= 12) return range;
  const scored = range.map((c) => [c, postflopStrength(c, board)]);
  scored.sort((x, y) => y[1] - x[1]);
  const n = Math.max(12, Math.round(scored.length * keep));
  return scored.slice(0, n).map((x) => x[0]);
}
