// Darstellungshelfer im Poker-Pro-Stil.
import { RANK_LABELS, SUIT_SYMBOLS, rankOf, suitOf } from './cards.js';
import { t, cardName, pct } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Karte wie in Poker Pro: Rang oben, Farbe darunter. */
export function cardHTML(c, o = {}) {
  const size = o.size ? ` card-${o.size}` : '';
  if (o.back) return `<span class="card card-back${size}" aria-hidden="true"></span>`;
  if (c === undefined || c === null) return `<span class="card card-slot${size}" aria-hidden="true"></span>`;
  const red = suitOf(c) === 1 || suitOf(c) === 2 ? ' card-red' : '';
  const cls = `card card-face${red}${size}${o.hl ? ' card-hl' : ''}${o.dim ? ' card-dim' : ''}`;
  return `<span class="${cls}" role="img" aria-label="${esc(cardName(c))}"><span class="card-rank">${RANK_LABELS[rankOf(c)]}</span><span class="card-suit">${SUIT_SYMBOLS[suitOf(c)]}</span></span>`;
}

export const cardsHTML = (cards, o = {}) => `<span class="cards-inline">${cards.map((c) => cardHTML(c, { size: 'xs', ...o })).join('')}</span>`;
export const cardsText = (cards) => cards.map((c) => RANK_LABELS[rankOf(c)] + SUIT_SYMBOLS[suitOf(c)]).join(' ');

export function meterHTML(equity, need) {
  const e = Math.max(0, Math.min(1, equity));
  return `<div class="meter">
    <div class="meter-label"><span>${esc(t('coach.equity'))}: <strong>${pct(e)}</strong></span>${need > 0 ? `<span>${esc(t('coach.need'))}: <strong>${pct(need)}</strong></span>` : ''}</div>
    <div class="meter-track"><div class="meter-fill" style="width:${(e * 100).toFixed(1)}%"></div>${need > 0 ? `<div class="meter-mark" style="left:calc(${(need * 100).toFixed(1)}% - 1px)"></div>` : ''}</div>
  </div>`;
}

/** Statische Texte mit data-i18n übersetzen. */
export function applyI18n(root = document) {
  $all('[data-i18n]', root).forEach((el) => { el.textContent = t(el.dataset.i18n); });
}

const SETTINGS_KEY = 'awpp.coach.settings.v1';
const DEFAULTS = { level: 'normal', live: true, reveal: true, madeHand: true, speed: 800 };
export function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}
export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* kein Speicher */ }
}
