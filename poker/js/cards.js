// Karten als Zahl 0–51: Rang = c >> 2 (0 = Zwei … 12 = Ass), Farbe = c & 3.
export const RANK_CHARS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const RANK_LABELS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];
export const SUIT_NAMES = ['Pik', 'Herz', 'Karo', 'Kreuz'];
export const RANK_NAMES = ['Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Bube', 'Dame', 'König', 'Ass'];
export const RANK_PLURAL = ['Zweien', 'Dreien', 'Vieren', 'Fünfen', 'Sechsen', 'Siebenen', 'Achten', 'Neunen', 'Zehnen', 'Buben', 'Damen', 'Könige', 'Asse'];

export const rankOf = (c) => c >> 2;
export const suitOf = (c) => c & 3;
export const makeCard = (rank, suit) => (rank << 2) | suit;

/** Erzeugt eine Karte aus Kurzschreibweise wie "As", "Td", "9h". */
export function parseCard(str) {
  const r = RANK_CHARS.indexOf(str[0].toUpperCase());
  const s = 'shdc'.indexOf(str[1].toLowerCase());
  if (r < 0 || s < 0) throw new Error(`Ungültige Karte: ${str}`);
  return makeCard(r, s);
}

export const parseCards = (str) => str.trim().split(/\s+/).filter(Boolean).map(parseCard);

export function cardToString(c) {
  return RANK_CHARS[rankOf(c)] + 'shdc'[suitOf(c)];
}

export function cardLabel(c) {
  return RANK_LABELS[rankOf(c)] + SUIT_SYMBOLS[suitOf(c)];
}

export function freshDeck() {
  return Array.from({ length: 52 }, (_, i) => i);
}

/** Gleichverteilte Zufallszahl 0 … n-1 (kryptografisch, falls verfügbar). */
const buf = new Uint32Array(1);
export function randInt(n) {
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    const limit = Math.floor(0x100000000 / n) * n;
    let x;
    do {
      globalThis.crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % n;
  }
  return Math.floor(Math.random() * n);
}

/** Fisher-Yates-Mischen (in place). */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
