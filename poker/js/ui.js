// Gemeinsame Darstellungshelfer.
import { RANK_LABELS, SUIT_SYMBOLS, SUIT_NAMES, RANK_NAMES, rankOf, suitOf } from './cards.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function cardHTML(c, opts = {}) {
  const cls = ['card'];
  if (opts.small) cls.push('sm');
  if (opts.back) return `<span class="${cls.join(' ')} back" aria-label="verdeckte Karte"></span>`;
  if (c === undefined || c === null) return `<span class="${cls.join(' ')} slot" aria-hidden="true"></span>`;
  cls.push(`suit-${suitOf(c)}`);
  if (opts.hl) cls.push('hl');
  if (opts.dim) cls.push('dim');
  const label = `${SUIT_NAMES[suitOf(c)]} ${RANK_NAMES[rankOf(c)]}`;
  return `<span class="${cls.join(' ')}" role="img" aria-label="${label}"><span class="r">${RANK_LABELS[rankOf(c)]}</span><span class="s">${SUIT_SYMBOLS[suitOf(c)]}</span></span>`;
}

export function cardsHTML(cards, opts = {}) {
  return `<span class="cards-inline">${cards.map((c) => cardHTML(c, { small: true, ...opts })).join('')}</span>`;
}

/** Kurze Text-Schreibweise wie „A♥ K♠“ (für Listen). */
export function cardsText(cards) {
  return cards.map((c) => RANK_LABELS[rankOf(c)] + SUIT_SYMBOLS[suitOf(c)]).join(' ');
}

export const pctText = (x) => `${Math.round(x * 100)} %`;

/** Balken: Equity vs. benötigte Equity. */
export function meterHTML(equity, need, labelLeft = 'Deine Equity', labelRight = 'benötigt') {
  const e = Math.max(0, Math.min(1, equity));
  return `<div class="meter">
    <div class="meter-label"><span>${labelLeft}: <strong>${pctText(e)}</strong></span>${need > 0 ? `<span>${labelRight}: <strong>${pctText(need)}</strong></span>` : ''}</div>
    <div class="meter-track" role="img" aria-label="${labelLeft} ${pctText(e)}${need > 0 ? `, ${labelRight} ${pctText(need)}` : ''}">
      <div class="meter-fill" style="width:${(e * 100).toFixed(1)}%"></div>
      ${need > 0 ? `<div class="meter-mark" style="left:calc(${(need * 100).toFixed(1)}% - 1px)"></div>` : ''}
    </div>
  </div>`;
}

const SETTINGS_KEY = 'holdem-coach-settings-v1';
export const DEFAULT_SETTINGS = { level: 'normal', live: true, reveal: true, madeHand: true, fourColor: false, speed: 800 };

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* Speicher nicht verfügbar */ }
}
