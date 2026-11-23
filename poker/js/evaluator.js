// Bewertet 5–7 Karten. Ergebnis ist eine Zahl: höher = besser.
// Aufbau: Kategorie * 16^5 + fünf Ränge (je 4 Bit) als Tie-Breaker.
import { RANK_NAMES, RANK_PLURAL, rankOf, suitOf } from './cards.js';

export const CATEGORY = {
  HIGH_CARD: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4,
  FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8,
};

export const CATEGORY_NAMES = [
  'Höchste Karte', 'Ein Paar', 'Zwei Paare', 'Drilling', 'Straße',
  'Flush', 'Full House', 'Vierling', 'Straight Flush',
];

const B = 16;
const B5 = B ** 5;
const counts = new Int8Array(13);
const suitMasks = new Int32Array(4);

function pack(cat, r0 = 0, r1 = 0, r2 = 0, r3 = 0, r4 = 0) {
  return cat * B5 + r0 * 65536 + r1 * 4096 + r2 * 256 + r3 * 16 + r4;
}

/** Höchster Rang einer Straße in einer Rang-Bitmaske (Ass auch als Eins) oder -1. */
export function straightHigh(mask) {
  const ext = (mask << 1) | ((mask >> 12) & 1);
  for (let top = 13; top >= 4; top--) {
    if (((ext >> (top - 4)) & 0x1f) === 0x1f) return top - 1;
  }
  return -1;
}

function topRanks(mask, n, exclude1 = -1, exclude2 = -1) {
  const out = [];
  for (let r = 12; r >= 0 && out.length < n; r--) {
    if (r !== exclude1 && r !== exclude2 && (mask >> r) & 1) out.push(r);
  }
  return out;
}

export function evaluate(cards) {
  counts.fill(0);
  suitMasks.fill(0);
  let rankMask = 0;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const r = c >> 2;
    counts[r]++;
    suitMasks[c & 3] |= 1 << r;
    rankMask |= 1 << r;
  }

  // Bei 7 Karten schließt ein Flush Vierling und Full House aus.
  for (let s = 0; s < 4; s++) {
    const m = suitMasks[s];
    if (popcount(m) >= 5) {
      const sf = straightHigh(m);
      if (sf >= 0) return pack(CATEGORY.STRAIGHT_FLUSH, sf);
      const t = topRanks(m, 5);
      return pack(CATEGORY.FLUSH, t[0], t[1], t[2], t[3], t[4]);
    }
  }

  let quad = -1;
  let trip1 = -1;
  let trip2 = -1;
  let pair1 = -1;
  let pair2 = -1;
  let pair3 = -1;
  for (let r = 12; r >= 0; r--) {
    const n = counts[r];
    if (n === 4) quad = r;
    else if (n === 3) {
      if (trip1 < 0) trip1 = r; else if (trip2 < 0) trip2 = r;
    } else if (n === 2) {
      if (pair1 < 0) pair1 = r; else if (pair2 < 0) pair2 = r; else if (pair3 < 0) pair3 = r;
    }
  }

  if (quad >= 0) {
    const k = topRanks(rankMask, 1, quad);
    return pack(CATEGORY.QUADS, quad, k[0] ?? 0);
  }
  if (trip1 >= 0 && (trip2 >= 0 || pair1 >= 0)) {
    return pack(CATEGORY.FULL_HOUSE, trip1, Math.max(trip2, pair1));
  }
  const st = straightHigh(rankMask);
  if (st >= 0) return pack(CATEGORY.STRAIGHT, st);
  if (trip1 >= 0) {
    const k = topRanks(rankMask, 2, trip1);
    return pack(CATEGORY.TRIPS, trip1, k[0] ?? 0, k[1] ?? 0);
  }
  if (pair2 >= 0) {
    const k = topRanks(rankMask, 1, pair1, pair2);
    return pack(CATEGORY.TWO_PAIR, pair1, pair2, k[0] ?? 0);
  }
  if (pair1 >= 0) {
    const k = topRanks(rankMask, 3, pair1);
    return pack(CATEGORY.PAIR, pair1, k[0] ?? 0, k[1] ?? 0, k[2] ?? 0);
  }
  const t = topRanks(rankMask, 5);
  return pack(CATEGORY.HIGH_CARD, t[0], t[1], t[2], t[3] ?? 0, t[4] ?? 0);
}

function popcount(x) {
  let n = 0;
  while (x) { x &= x - 1; n++; }
  return n;
}

export const categoryOf = (score) => Math.floor(score / B5);
const rankAt = (score, i) => Math.floor(score / 16 ** (4 - i)) % 16;

/** Deutscher Name einer Hand, z. B. „Zwei Paare, Asse und Könige“. */
export function handName(score) {
  const cat = categoryOf(score);
  const r0 = rankAt(score, 0);
  const r1 = rankAt(score, 1);
  switch (cat) {
    case CATEGORY.STRAIGHT_FLUSH:
      return r0 === 12 ? 'Royal Flush' : `Straight Flush bis ${RANK_NAMES[r0]}`;
    case CATEGORY.QUADS: return `Vierling, ${RANK_PLURAL[r0]}`;
    case CATEGORY.FULL_HOUSE: return `Full House, ${RANK_PLURAL[r0]} über ${RANK_PLURAL[r1]}`;
    case CATEGORY.FLUSH: return `Flush, ${RANK_NAMES[r0]} hoch`;
    case CATEGORY.STRAIGHT: return `Straße bis ${RANK_NAMES[r0]}`;
    case CATEGORY.TRIPS: return `Drilling, ${RANK_PLURAL[r0]}`;
    case CATEGORY.TWO_PAIR: return `Zwei Paare, ${RANK_PLURAL[r0]} und ${RANK_PLURAL[r1]}`;
    case CATEGORY.PAIR: return `Ein Paar, ${RANK_PLURAL[r0]}`;
    default: return `Höchste Karte ${RANK_NAMES[r0]}`;
  }
}

/** Kategorie-Name inkl. Royal Flush (für Quiz und Lernseiten). */
export function categoryName(score) {
  const cat = categoryOf(score);
  if (cat === CATEGORY.STRAIGHT_FLUSH && rankAt(score, 0) === 12) return 'Royal Flush';
  return CATEGORY_NAMES[cat];
}

/** Die fünf Karten, die die beste Hand bilden (für Hervorhebung). */
export function bestFive(cards) {
  if (cards.length <= 5) return cards.slice();
  let best = -1;
  let bestSet = null;
  const n = cards.length;
  const idx = [0, 1, 2, 3, 4];
  const pick = new Array(5);
  // Alle Kombinationen 5 aus n durchgehen (max. 21).
  for (;;) {
    for (let i = 0; i < 5; i++) pick[i] = cards[idx[i]];
    const s = evaluate(pick);
    if (s > best) { best = s; bestSet = pick.slice(); }
    let i = 4;
    while (i >= 0 && idx[i] === n - 5 + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < 5; j++) idx[j] = idx[j - 1] + 1;
  }
  return bestSet;
}

/** Hat die Hand einen Flush-Draw (4 Karten einer Farbe, noch kein Flush)? */
export function hasFlushDraw(cards) {
  const sc = [0, 0, 0, 0];
  for (const c of cards) sc[suitOf(c)]++;
  return sc.some((n) => n === 4);
}

/** Zählt Ränge, die eine Straße vervollständigen würden (2 = Open-Ender, 1 = Gutshot). */
export function straightDrawRanks(cards) {
  let mask = 0;
  for (const c of cards) mask |= 1 << rankOf(c);
  if (straightHigh(mask) >= 0) return 0;
  let n = 0;
  for (let r = 0; r < 13; r++) {
    if (!((mask >> r) & 1) && straightHigh(mask | (1 << r)) >= 0) n++;
  }
  return n;
}
