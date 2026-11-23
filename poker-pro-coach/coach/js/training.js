// Training: Heads-up gegen die KI mit Coach-Feedback.
import { createGame, startHand, act, legalActions, totalPot, isGameOver, resetStacks } from './game.js';
import { botDecide } from './bot.js';
import { buildContext, recommend, judge } from './coach.js';
import { evaluate } from './evaluator.js';
import { t, pct, handNameT } from './i18n.js';
import { $, $all, esc, cardHTML, cardsHTML, cardsText, meterHTML, saveSettings } from './ui.js';
import { recordDecision, recordHand } from './stats.js';

const HERO = 0;
const BOT = 1;
let game;
let settings;
let pending = null;
let decisions = [];
let botTimer = null;
let showTip = false;
let lastFeedback = null;
let notice = '';
let foldArmed = false;
let foldTimer = null;
const log = []; // { kind: 'street'|'action', ... } – damit der Verlauf beim Sprachwechsel neu gezeichnet werden kann

export function initTraining(appSettings) {
  settings = appSettings;
  game = createGame(['You', 'AI']);
  setupSettings();
  setupActions();
  newHand();
}

/** Nach Sprachwechsel alles neu zeichnen. */
export function refreshTraining() {
  if (!game || !game.hand) return;
  if (pending && !game.hand.over && game.hand.toAct === HERO) {
    const ctx = buildContext(game, HERO);
    pending = { ctx, rec: recommend(ctx) };
  }
  updateLevelDesc();
  renderLog();
  render();
}

function setupSettings() {
  const markSeg = (id, attr, val) => $all(`#${id} button`).forEach((b) => b.classList.toggle('on', b.dataset[attr] === String(val)));
  markSeg('set-level', 'level', settings.level);
  markSeg('set-speed', 'speed', settings.speed);
  $('#set-level').addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (!b) return;
    settings.level = b.dataset.level;
    markSeg('set-level', 'level', settings.level);
    updateLevelDesc();
    saveSettings(settings);
  });
  $('#set-speed').addEventListener('click', (e) => {
    const b = e.target.closest('[data-speed]');
    if (!b) return;
    settings.speed = Number(b.dataset.speed);
    markSeg('set-speed', 'speed', settings.speed);
    saveSettings(settings);
  });
  updateLevelDesc();
  const toggles = { '#set-live': 'live', '#set-reveal': 'reveal', '#set-madehand': 'madeHand' };
  for (const [id, key] of Object.entries(toggles)) {
    const el = $(id);
    el.checked = !!settings[key];
    el.addEventListener('change', () => { settings[key] = el.checked; saveSettings(settings); render(); });
  }
  $('#btn-newgame').addEventListener('click', () => {
    if (!confirm(t('set.confirmNew'))) return;
    clearTimeout(botTimer);
    resetStacks(game);
    newHand();
  });
}

const updateLevelDesc = () => { $('#level-desc').textContent = t(`level.${settings.level}.desc`); };

function setupActions() {
  $('#btn-fold').addEventListener('click', () => {
    const l = legalActions(game, HERO);
    if (l.canCheck && !foldArmed) {
      foldArmed = true;
      $('#btn-fold').textContent = t('btn.foldSure');
      clearTimeout(foldTimer);
      foldTimer = setTimeout(() => { foldArmed = false; $('#btn-fold').textContent = t('btn.fold'); }, 3000);
      return;
    }
    heroAct({ type: 'fold' });
  });
  $('#btn-call').addEventListener('click', () => heroAct({ type: legalActions(game, HERO).canCheck ? 'check' : 'call' }));
  $('#btn-raise').addEventListener('click', () => heroAct({ type: 'raise', amount: Number($('#raise-amount').value) }));
  $('#btn-tip').addEventListener('click', () => { showTip = true; renderCoach(); });
  $('#btn-next').addEventListener('click', () => newHand());

  const slider = $('#raise-slider');
  const amount = $('#raise-amount');
  slider.addEventListener('input', () => { amount.value = slider.value; updateRaiseLabel(); });
  amount.addEventListener('input', () => { slider.value = amount.value; updateRaiseLabel(); });
  amount.addEventListener('change', () => {
    const l = legalActions(game, HERO);
    const v = Math.max(l.minRaiseTo, Math.min(l.maxRaiseTo, Math.round(Number(amount.value) || l.minRaiseTo)));
    amount.value = v; slider.value = v; updateRaiseLabel();
  });
  $all('#presets [data-frac]').forEach((b) => b.addEventListener('click', () => {
    const l = legalActions(game, HERO);
    if (!l.canRaise) return;
    const h = game.hand;
    let to = b.dataset.frac === 'all' ? l.maxRaiseTo : Math.round(h.currentBet + Number(b.dataset.frac) * (totalPot(h) + l.toCall));
    to = Math.max(l.minRaiseTo, Math.min(l.maxRaiseTo, to));
    amount.value = to; slider.value = to; updateRaiseLabel();
  }));

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if ($('#view-training').hidden) return;
    const k = e.key.toLowerCase();
    if (k === 'enter' && e.target.matches('button, summary, a')) return;
    const click = (sel) => { const b = $(sel); if (b && !b.disabled && !b.hidden) b.click(); };
    if (k === 'f') click('#btn-fold');
    else if (k === 'c') click('#btn-call');
    else if (k === 'r') click('#btn-raise');
    else if (k === 't') click('#btn-tip');
    else if (k === 'n' || k === 'enter') click('#btn-next');
  });
}

function updateRaiseLabel() {
  const l = legalActions(game, HERO);
  const v = Number($('#raise-amount').value);
  const allIn = v >= l.maxRaiseTo && v - game.hand.bets[HERO] >= game.players[HERO].stack;
  $('#btn-raise').textContent = allIn ? t('btn.allin', { n: v }) : t(l.isBet ? 'btn.bet' : 'btn.raiseTo', { n: v });
}

function newHand() {
  if (game.hand && !game.hand.over) return;
  clearTimeout(botTimer);
  foldArmed = false;
  clearTimeout(foldTimer);
  if (isGameOver(game)) {
    const broke = game.players[HERO].stack <= 0;
    notice = `<div class="cc ${broke ? 'bad' : 'good'}"><strong>${esc(t(broke ? 'gameover.broke' : 'gameover.won'))}</strong><small class="muted">${esc(t('gameover.restart'))}</small></div>`;
    resetStacks(game);
  } else if (game.handNo > 0) notice = '';
  decisions = [];
  lastFeedback = null;
  showTip = false;
  pending = null;
  $('#bubble-0').hidden = true;
  $('#bubble-1').hidden = true;
  startHand(game);
  log.length = 0;
  log.push({ kind: 'street', street: 'preflop' });
  renderLog();
  step();
}

function step() {
  render();
  const hand = game.hand;
  if (hand.over) { recordHand(hand, HERO); return; }
  if (hand.toAct === BOT) {
    botTimer = setTimeout(() => doAct(BOT, botDecide(game, settings.level)), settings.speed);
  } else {
    pending = null;
    setTimeout(() => {
      if (game.hand.over || game.hand.toAct !== HERO) return;
      const ctx = buildContext(game, HERO);
      pending = { ctx, rec: recommend(ctx) };
      if (showTip) renderCoach();
    }, 30);
  }
}

function heroAct(action) {
  const hand = game.hand;
  if (hand.over || hand.toAct !== HERO) return;
  if (!pending) {
    const ctx = buildContext(game, HERO);
    pending = { ctx, rec: recommend(ctx) };
  }
  const { ctx, rec } = pending;
  foldArmed = false;
  clearTimeout(foldTimer);
  if (action.type === 'raise') {
    const l = ctx.legal;
    action.amount = Math.max(l.minRaiseTo, Math.min(l.maxRaiseTo, Math.round(action.amount || l.minRaiseTo)));
  }
  const j = judge(rec, action, ctx);
  decisions.push({ street: ctx.street, board: ctx.board.slice(), pot: ctx.pot, toCall: ctx.legal.toCall, j });
  recordDecision(j, ctx.street);
  lastFeedback = decisions[decisions.length - 1];
  showTip = false;
  pending = null;
  doAct(HERO, action);
}

function doAct(player, action) {
  const hand = game.hand;
  const before = hand.street;
  const entry = act(game, action);
  if (hand.street !== before) $(`#bubble-${1 - player}`).hidden = true;
  showBubble(player, entryText(entry));
  log.push({ kind: 'action', player, entry });
  const order = ['flop', 'turn', 'river'];
  if (hand.street !== before && hand.street !== 'showdown') {
    for (let k = order.indexOf(before) + 1; k <= order.indexOf(hand.street); k++) log.push({ kind: 'street', street: order[k] });
  } else if (hand.street === 'showdown' && hand.runout) {
    for (let k = order.indexOf(before) + 1; k < 3; k++) log.push({ kind: 'street', street: order[k] });
  }
  renderLog();
  step();
}

function entryText(e) {
  const allIn = e.allIn ? ' · All-in' : '';
  switch (e.type) {
    case 'fold': return t('act.fold');
    case 'check': return t('act.check');
    case 'call': return t('act.call', { n: e.add }) + allIn;
    case 'bet': return t('act.bet', { n: e.to }) + allIn;
    case 'raise': return t('act.raise', { n: e.to }) + allIn;
    default: return e.type;
  }
}

function showBubble(player, text) {
  const b = $(`#bubble-${player}`);
  b.textContent = text;
  b.hidden = false;
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
}

function renderLog() {
  const hand = game.hand;
  $('#hand-log').innerHTML = log.map((l) => {
    if (l.kind === 'street') {
      const s = l.street;
      const cards = s === 'flop' ? hand.board.slice(0, 3) : s === 'turn' ? hand.board.slice(3, 4) : s === 'river' ? hand.board.slice(4, 5) : [];
      return `<li class="street-row">${esc(t('street.' + s))} ${cards.length ? cardsHTML(cards) : `<span>· ${esc(t('log.blinds'))} ${cardsHTML(hand.hole[HERO])}</span>`}</li>`;
    }
    return `<li>${esc(t(l.player === HERO ? 'seat.you' : 'seat.bot'))}: ${esc(entryText(l.entry))}</li>`;
  }).join('');
}

/* ---------- Darstellung ---------- */
function render() {
  const hand = game.hand;
  const over = hand.over;
  const showBot = over && (hand.result.type === 'showdown' || settings.reveal);
  const best = over && hand.result.type === 'showdown' ? hand.result.best : null;
  const winners = over ? hand.result.winners : [];

  $('#hand-no').textContent = `#${hand.no}`;
  for (const i of [HERO, BOT]) {
    const seat = $(`#seat-${i}`);
    $(`#stack-${i}`).textContent = game.players[i].stack;
    seat.querySelector('.dealer').hidden = hand.button !== i;
    seat.classList.toggle('turn', !over && hand.toAct === i);
    seat.classList.toggle('winner', over && winners.length === 1 && winners[0] === i);
    const bet = $(`#bet-${i}`);
    bet.classList.toggle('empty', hand.bets[i] === 0);
    bet.textContent = hand.bets[i] || '0';
    const reveal = i === HERO || showBot;
    const hl = best && winners.includes(i) ? new Set(best[i]) : null;
    $(`#hole-${i}`).innerHTML = hand.hole[i].map((c) => (reveal ? cardHTML(c, { hl: hl && hl.has(c), dim: over && hand.folded[i] }) : cardHTML(c, { back: true }))).join('');
  }
  const boardHl = best ? new Set(winners.flatMap((w) => best[w])) : null;
  $('#board').innerHTML = Array.from({ length: 5 }, (_, k) => cardHTML(hand.board[k], { hl: boardHl && boardHl.has(hand.board[k]) })).join('');
  $('#pot').innerHTML = over ? `${esc(t('pot'))} <strong>${hand.result.pot}</strong> · ${esc(t('pot.paid'))}` : `${esc(t('pot'))} <strong>${totalPot(hand)}</strong>`;
  $('#street').textContent = over ? t(hand.result.type === 'showdown' ? 'street.showdown' : 'street.over') : t('street.' + hand.street);
  $('#made-hand').textContent = settings.madeHand && hand.board.length >= 3 ? handNameT(evaluate([...hand.hole[HERO], ...hand.board])) : '';
  renderActions();
  renderResult();
  renderCoach();
}

function renderActions() {
  const hand = game.hand;
  const heroTurn = !hand.over && hand.toAct === HERO;
  $('#controls').classList.toggle('waiting', !heroTurn);
  $('#btn-next').hidden = !hand.over;
  $('#btn-tip').hidden = hand.over;
  $('#btn-tip').disabled = !heroTurn;
  $('#action-main').hidden = hand.over;
  if (!foldArmed) $('#btn-fold').textContent = t('btn.fold');
  if (!heroTurn) {
    ['#btn-fold', '#btn-call', '#btn-raise'].forEach((s) => { $(s).disabled = true; });
    if (hand.over) $('#raise-box').hidden = true;
    return;
  }
  const l = legalActions(game, HERO);
  $('#btn-fold').disabled = false;
  $('#btn-call').disabled = false;
  $('#btn-call').textContent = l.canCheck ? t('btn.check') : (l.toCall >= game.players[HERO].stack ? t('btn.allin', { n: l.toCall }) : t('btn.call', { n: l.toCall }));
  $('#btn-raise').disabled = !l.canRaise;
  $('#raise-box').hidden = !l.canRaise;
  if (l.canRaise) {
    const slider = $('#raise-slider');
    const amount = $('#raise-amount');
    slider.min = amount.min = l.minRaiseTo;
    slider.max = amount.max = l.maxRaiseTo;
    slider.step = 1;
    let def;
    if (hand.street === 'preflop' && hand.currentBet === 2 && hand.bets[HERO] === 1) def = 5;
    else if (l.isBet) def = Math.round(totalPot(hand) * 0.66);
    else def = hand.currentBet + 2 * (hand.currentBet - hand.bets[HERO]);
    def = Math.max(l.minRaiseTo, Math.min(l.maxRaiseTo, def));
    slider.value = amount.value = def;
    updateRaiseLabel();
  } else {
    $('#btn-raise').textContent = t('btn.raise');
  }
}

function renderResult() {
  const hand = game.hand;
  const el = $('#result');
  if (!hand.over) { el.hidden = true; return; }
  const r = hand.result;
  const net = hand.net[HERO];
  let title;
  let cls;
  if (r.winners.length === 2) { title = t('result.split'); cls = 'split'; }
  else if (r.winners[0] === HERO) { title = t('result.youWin', { n: r.pot }); cls = 'win'; }
  else { title = t('result.botWins', { n: r.pot }); cls = 'lose'; }
  const detail = r.type === 'fold'
    ? t(r.winners[0] === HERO ? 'result.botFolded' : 'result.youFolded')
    : `${t('seat.you')}: ${handNameT(r.scores[HERO])} · ${t('seat.bot')}: ${handNameT(r.scores[BOT])}`;
  el.innerHTML = `<div><div class="big ${cls}">${esc(title)}</div><small class="muted">${esc(detail)}</small></div><div><small class="muted">${esc(t('result.net'))}</small> <strong class="verdict ${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : ''}${net}</strong></div>`;
  el.hidden = false;
}

function feedbackHTML(d) {
  const j = d.j;
  const r = j.rec;
  return `<div class="cc ${j.verdict}">
    <div class="cc-head"><span class="verdict ${j.verdict}">${esc(j.label)}</span><small class="muted">${esc(t('street.' + r.street))}</small></div>
    <div>${esc(j.summary)}</div>
    ${j.notes.map((n) => `<small>${esc(n)}</small>`).join('')}
    ${meterHTML(r.equity, r.need)}
    <ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>`;
}

function renderCoach() {
  const hand = game.hand;
  const parts = [];
  if (notice) parts.push(notice);
  if (hand.over) parts.push(reviewHTML());
  else {
    if (lastFeedback && settings.live) parts.push(feedbackHTML(lastFeedback));
    if (hand.toAct === HERO) {
      if (showTip) {
        if (pending) {
          const r = pending.rec;
          const names = { fold: t('act.fold'), check: t('act.check'), call: t('act.call', { n: '' }).trim(), raise: t('act.betraise') };
          const alt = [...r.ok].filter((a) => a !== r.action).map((a) => names[a]);
          parts.unshift(`<div class="cc tip">
            <div class="cc-head"><span>💡 ${esc(t('coach.rec'))}</span><small class="muted">${esc(t('street.' + r.street))}</small></div>
            <div class="rec">${esc(r.label)}</div>
            ${alt.length ? `<small class="muted">${esc(t('coach.alsoOk', { list: alt.join(', ') }))}</small>` : ''}
            ${meterHTML(r.equity, r.need)}
            <ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>`);
        } else parts.unshift(`<div class="cc tip"><span class="muted">${esc(t('coach.thinking'))}</span></div>`);
      } else if (!lastFeedback || !settings.live) {
        parts.push(`<small class="muted">${esc(t(hand.no === 1 && !decisions.length ? 'coach.intro' : 'coach.yourTurn'))}</small>`);
      }
    } else parts.push(`<small class="muted">${esc(t('coach.botThinking'))}</small>`);
  }
  $('#coach-content').innerHTML = parts.join('');
}

function reviewHTML() {
  const hand = game.hand;
  const counts = { good: 0, ok: 0, bad: 0 };
  decisions.forEach((d) => counts[d.j.verdict]++);
  const bot = hand.result.type === 'showdown' || settings.reveal ? `<div><small class="muted">${esc(t('review.botCards'))}</small> ${cardsHTML(hand.hole[BOT])}</div>` : '';
  if (!decisions.length) return `<div class="cc"><strong>${esc(t('review.title'))}</strong><small class="muted">${esc(t('review.none'))}</small>${bot}</div>`;
  const score = Math.round((counts.good + counts.ok * 0.5) / decisions.length * 100);
  const items = decisions.map((d) => {
    const j = d.j;
    return `<div class="review-item">
      <div><strong>${esc(t('street.' + d.street))}</strong> · <span class="verdict ${j.verdict}">${esc(j.label)}</span></div>
      <div>${esc(t('review.you'))}: <strong>${esc(j.taken)}</strong>${j.verdict !== 'good' ? ` · ${esc(t('review.coach'))}: <strong>${esc(j.rec.label)}</strong>` : ''}</div>
      <small class="muted">${d.board.length ? `${esc(t('review.board'))} ${esc(cardsText(d.board))} · ` : ''}${esc(t('pot'))} ${d.pot}${d.toCall ? ` · ${esc(t('review.toCall'))} ${d.toCall}` : ''} · Equity ${pct(j.rec.equity)}</small>
      <details><summary>${esc(t('review.why'))}</summary>${j.notes.map((n) => `<p><small>${esc(n)}</small></p>`).join('')}<ul class="cc-list">${j.rec.reasons.map((x) => `<li><small>${esc(x)}</small></li>`).join('')}</ul></details>
    </div>`;
  }).join('');
  return `<div class="cc"><div class="cc-head"><strong>${esc(t('review.title'))}</strong><span class="pill">${score} / 100</span></div>
    <small>✅ ${counts.good} · ⚠️ ${counts.ok} · ❌ ${counts.bad}</small>${bot}</div><div class="review">${items}</div>`;
}
