// Starthand-Matrix 13×13 mit drei Ansichten.
import { RANK_CHARS } from './cards.js';
import { RANKED, handPercentile, handRank, preflopEquity, combosOf, topRange } from './ranges.js';
import { equityVsRange } from './equity.js';
import { DEFAULT_PARAMS } from './coach.js';
import { t } from './i18n.js';
import { $, $all, esc, cardHTML } from './ui.js';

let view = 'sb';
let selected = 'AKs';
let bbCache = null;
const BB_POT_ODDS = 3 / 10; // 3 zahlen in einen Pot von 7

function labelAt(row, col) {
  const a = 12 - row;
  const b = 12 - col;
  if (a === b) return RANK_CHARS[a] + RANK_CHARS[b];
  return a > b ? RANK_CHARS[a] + RANK_CHARS[b] + 's' : RANK_CHARS[b] + RANK_CHARS[a] + 'o';
}

function computeBB() {
  if (bbCache) return bbCache;
  const range = topRange(0.7);
  bbCache = {};
  for (const l of RANKED) bbCache[l] = equityVsRange(combosOf(l)[0], [], range, 700);
  return bbCache;
}

function cellClass(l) {
  const p = handPercentile(l);
  if (view === 'sb') return p <= DEFAULT_PARAMS.sbOpen ? 'c-raise' : p <= DEFAULT_PARAMS.sbLimp ? 'c-limp' : 'c-fold';
  if (view === 'bb') {
    if (p <= DEFAULT_PARAMS.threeBet) return 'c-3bet';
    return computeBB()[l] * 0.85 >= BB_POT_ODDS ? 'c-call' : 'c-fold';
  }
  return '';
}

function cellStyle(l) {
  if (view !== 'strength') return '';
  const p = handPercentile(l);
  return `background:hsl(0 0% ${Math.round(92 - p * 82)}%);color:${p < 0.45 ? '#000' : '#fff'}`;
}

export function renderMatrix() {
  const el = $('#view-matrix');
  const legend = {
    sb: `<span><i class="c-raise"></i>${esc(t('m.raise'))}</span><span><i class="c-limp"></i>${esc(t('m.limp'))}</span><span><i class="c-fold"></i>${esc(t('m.fold'))}</span>`,
    bb: `<span><i class="c-3bet"></i>${esc(t('m.3bet'))}</span><span><i class="c-call"></i>${esc(t('m.call'))}</span><span><i class="c-fold"></i>${esc(t('m.fold'))}</span>`,
    strength: `<span><i style="background:hsl(0 0% 90%)"></i>${esc(t('m.strong'))}</span><span><i style="background:hsl(0 0% 50%)"></i>${esc(t('m.mid'))}</span><span><i style="background:hsl(0 0% 14%)"></i>${esc(t('m.weak'))}</span>`,
  }[view];
  let cells = '';
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const l = labelAt(r, c);
      cells += `<button data-hand="${l}" class="${cellClass(l)}${l === selected ? ' sel' : ''}" style="${cellStyle(l)}" aria-label="${l}">${l}</button>`;
    }
  }
  el.innerHTML = `
    <div class="page-intro"><h1>${esc(t('m.title'))}</h1><p>${esc(t('m.intro'))}</p></div>
    <div class="tabs tabs-3" id="matrix-views" style="margin-top:1rem">
      <button data-mv="sb" class="${view === 'sb' ? 'on' : ''}">${esc(t('m.view.sb'))}</button>
      <button data-mv="bb" class="${view === 'bb' ? 'on' : ''}">${esc(t('m.view.bb'))}</button>
      <button data-mv="strength" class="${view === 'strength' ? 'on' : ''}">${esc(t('m.view.strength'))}</button>
    </div>
    <div class="matrix-wrap">
      <div><div class="matrix" id="matrix">${cells}</div><div class="legend">${legend}</div></div>
      <div class="panel" id="hand-detail">${detail(selected)}</div>
    </div>`;
  $('#matrix-views').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mv]');
    if (!b) return;
    view = b.dataset.mv;
    if (view === 'bb' && !bbCache) { $('#matrix').style.opacity = '.4'; setTimeout(renderMatrix, 20); return; }
    renderMatrix();
  });
  $('#matrix').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hand]');
    if (!b) return;
    selected = b.dataset.hand;
    $all('#matrix button').forEach((x) => x.classList.toggle('sel', x === b));
    $('#hand-detail').innerHTML = detail(selected);
  });
  if (!bbCache) setTimeout(() => { computeBB(); if (!$('#view-matrix').hidden) $('#hand-detail').innerHTML = detail(selected); }, 200);
}

function detail(l) {
  const p = handPercentile(l);
  const combos = combosOf(l);
  const type = l.length === 2 ? t('m.pair') : l[2] === 's' ? t('m.suited') : t('m.offsuit');
  const sb = t(p <= DEFAULT_PARAMS.sbOpen ? 'm.a.raise25' : p <= DEFAULT_PARAMS.sbLimp ? 'm.a.limp' : 'm.a.fold');
  const bbLimp = t(p <= DEFAULT_PARAMS.bbIso ? 'm.a.raise4' : 'm.a.check');
  let bbRaise = '…';
  if (p <= DEFAULT_PARAMS.threeBet) bbRaise = t('m.a.3bet');
  else if (bbCache) bbRaise = t(bbCache[l] * 0.85 >= BB_POT_ODDS ? 'm.a.call' : 'm.a.fold');
  const notes = [];
  if (l.length === 2) notes.push(t(l === 'AA' || l === 'KK' ? 'm.n.premium' : 'm.n.pair'));
  if (l[2] === 's') notes.push(t('m.n.suited'));
  if (l[0] === 'A' && l.length === 3) notes.push(t('m.n.ace'));
  if (l.length === 3 && Math.abs(RANK_CHARS.indexOf(l[0]) - RANK_CHARS.indexOf(l[1])) === 1) notes.push(t('m.n.connector'));
  return `<div class="panel-head"><h2 style="font-size:1.375rem">${l}</h2><span class="cards-inline">${combos[0].map((c) => cardHTML(c, { size: 'sm' })).join('')}</span></div>
    <dl class="kv">
      <dt>${esc(t('m.type'))}</dt><dd>${esc(type)} · ${esc(t('m.combos', { n: combos.length }))}</dd>
      <dt>${esc(t('m.rank'))}</dt><dd>${esc(t('m.rankVal', { r: handRank(l), p: Math.max(1, Math.round(p * 100)) }))}</dd>
      <dt>${esc(t('m.eqRandom'))}</dt><dd>${preflopEquity(l).toFixed(1)} %</dd>
      <dt>${esc(t('m.sbFirst'))}</dt><dd>${esc(sb)}</dd>
      <dt>${esc(t('m.bbLimp'))}</dt><dd>${esc(bbLimp)}</dd>
      <dt>${esc(t('m.bbRaise'))}</dt><dd>${esc(bbRaise)}</dd>
    </dl>
    ${notes.map((n) => `<small class="muted">${esc(n)}</small>`).join('')}`;
}
