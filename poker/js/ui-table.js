// Spielen-Tab: Tisch, Aktionen, Coach-Feedback und Handrückblick.
import { createGame, startHand, act, legalActions, totalPot, isGameOver, resetStacks, STREET_NAMES } from './game.js';
import { botDecide, BOT_LEVELS } from './bot.js';
import { buildContext, recommend, judge } from './coach.js';
import { evaluate, handName } from './evaluator.js';
import { $, $$, esc, cardHTML, cardsHTML, cardsText, meterHTML, pctText, saveSettings } from './ui.js';
import { recordDecision, recordHand } from './stats.js';

const HERO = 0;
const BOT = 1;

let game;
let settings;
let pending = null; // { ctx, rec } für die aktuelle Hero-Entscheidung
let decisions = [];
let botTimer = null;
let showTip = false;
let lastFeedback = null;
let notice = '';

export function initTable(appSettings) {
  settings = appSettings;
  game = createGame(['Du', 'KI']);
  setupSettings();
  setupActions();
  newHand();
}

function setupSettings() {
  const sel = $('#set-level');
  sel.innerHTML = Object.entries(BOT_LEVELS).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
  sel.value = settings.level;
  const updateDesc = () => { $('#level-desc').textContent = BOT_LEVELS[settings.level].desc; };
  updateDesc();
  sel.addEventListener('change', () => { settings.level = sel.value; updateDesc(); persist(); });
  const toggles = { '#set-live': 'live', '#set-reveal': 'reveal', '#set-madehand': 'madeHand', '#set-fourcolor': 'fourColor' };
  for (const [id, key] of Object.entries(toggles)) {
    const el = $(id);
    el.checked = !!settings[key];
    el.addEventListener('change', () => { settings[key] = el.checked; persist(); render(); });
  }
  const speed = $('#set-speed');
  speed.value = String(settings.speed);
  speed.addEventListener('change', () => { settings.speed = Number(speed.value); persist(); });
  $('#btn-newgame').addEventListener('click', () => {
    if (!confirm('Neues Spiel starten? Beide Stacks werden auf 200 zurückgesetzt.')) return;
    clearTimeout(botTimer);
    resetStacks(game);
    newHand();
  });
  document.body.classList.toggle('four-color', settings.fourColor);
}

function persist() {
  document.body.classList.toggle('four-color', settings.fourColor);
  saveSettings(settings);
}

function setupActions() {
  $('#btn-fold').addEventListener('click', () => heroAct({ type: 'fold' }));
  $('#btn-call').addEventListener('click', () => {
    const l = legalActions(game, HERO);
    heroAct({ type: l.canCheck ? 'check' : 'call' });
  });
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
  $$('#presets .chip-btn').forEach((b) => b.addEventListener('click', () => {
    const l = legalActions(game, HERO);
    if (!l.canRaise) return;
    let to;
    if (b.dataset.frac === 'all') to = l.maxRaiseTo;
    else {
      const h = game.hand;
      to = Math.round(h.currentBet + Number(b.dataset.frac) * (totalPot(h) + l.toCall));
    }
    to = Math.max(l.minRaiseTo, Math.min(l.maxRaiseTo, to));
    amount.value = to; slider.value = to; updateRaiseLabel();
  }));

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if ($('#tab-spielen').hidden) return;
    const k = e.key.toLowerCase();
    if (k === 'f' && !$('#btn-fold').disabled) $('#btn-fold').click();
    else if (k === 'c' && !$('#btn-call').disabled) $('#btn-call').click();
    else if (k === 'r' && !$('#btn-raise').disabled) $('#btn-raise').click();
    else if (k === 't' && !$('#btn-tip').disabled) $('#btn-tip').click();
    else if ((k === 'n' || k === 'enter') && !$('#btn-next').hidden) $('#btn-next').click();
  });
}

function updateRaiseLabel() {
  const l = legalActions(game, HERO);
  const v = Number($('#raise-amount').value);
  const allIn = v >= l.maxRaiseTo && v - game.hand.bets[HERO] >= game.players[HERO].stack;
  $('#btn-raise').textContent = allIn ? `All-in ${v}` : `${l.isBet ? 'Bet' : 'Raise auf'} ${v}`;
}

function newHand() {
  clearTimeout(botTimer);
  if (isGameOver(game)) {
    const heroBroke = game.players[HERO].stack <= 0;
    notice = `<div class="coach-card ${heroBroke ? 'bad' : 'good'}"><h3>${heroBroke ? 'Du bist pleite 😬' : 'Du hast alle Chips der KI gewonnen! 🏆'}</h3><p class="small" style="margin:4px 0">Neues Spiel: beide starten wieder mit 200 Chips.</p></div>`;
    resetStacks(game);
  } else if (game.handNo > 0) {
    notice = '';
  }
  decisions = [];
  lastFeedback = null;
  showTip = false;
  pending = null;
  $('#bubble-0').hidden = true;
  $('#bubble-1').hidden = true;
  startHand(game);
  $('#hand-log').innerHTML = '';
  logStreet('preflop');
  step();
}

function step() {
  render();
  const hand = game.hand;
  if (hand.over) {
    onHandOver();
    return;
  }
  if (hand.toAct === BOT) {
    botTimer = setTimeout(() => {
      const a = botDecide(game, settings.level);
      doAct(BOT, a);
    }, settings.speed);
  } else {
    // Empfehlung im Hintergrund vorbereiten, damit die Oberfläche zuerst zeichnet
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
  if (action.type === 'raise') {
    const l = ctx.legal;
    action.amount = Math.max(l.minRaiseTo, Math.min(l.maxRaiseTo, Math.round(action.amount || l.minRaiseTo)));
  }
  const j = judge(rec, action, ctx);
  decisions.push({ street: ctx.street, board: ctx.board.slice(), pot: ctx.pot, toCall: ctx.legal.toCall, j });
  recordDecision(j, ctx.street);
  lastFeedback = j;
  showTip = false;
  pending = null;
  doAct(HERO, action);
}

function doAct(player, action) {
  const hand = game.hand;
  const streetBefore = hand.street;
  const entry = act(game, action);
  if (hand.street !== streetBefore) $(`#bubble-${1 - player}`).hidden = true;
  showBubble(player, entryText(entry));
  logAction(player, entry);
  if (hand.street !== streetBefore && hand.street !== 'showdown') {
    // Neue Straßen protokollieren (auch beim Durchlaufen nach All-in)
    const order = ['flop', 'turn', 'river'];
    const from = order.indexOf(streetBefore) + 1;
    const to = order.indexOf(hand.street);
    for (let k = from; k <= to; k++) logStreet(order[k]);
  } else if (hand.street === 'showdown' && hand.runout) {
    const order = ['flop', 'turn', 'river'];
    for (let k = order.indexOf(streetBefore) + 1; k < 3; k++) logStreet(order[k]);
  }
  step();
}

function entryText(e) {
  const allIn = e.allIn ? ' (All-in)' : '';
  switch (e.type) {
    case 'fold': return 'Fold';
    case 'check': return 'Check';
    case 'call': return `Call ${e.add}${allIn}`;
    case 'bet': return `Bet ${e.to}${allIn}`;
    case 'raise': return `Raise auf ${e.to}${allIn}`;
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

function logStreet(street) {
  const hand = game.hand;
  const li = document.createElement('li');
  li.className = 'street';
  const cards = street === 'flop' ? hand.board.slice(0, 3) : street === 'turn' ? hand.board.slice(3, 4) : street === 'river' ? hand.board.slice(4, 5) : [];
  li.innerHTML = `${STREET_NAMES[street]} ${cards.length ? cardsHTML(cards) : `<span class="muted">· Blinds 1/2 · deine Karten ${cardsHTML(hand.hole[HERO])}</span>`}`;
  $('#hand-log').appendChild(li);
}

function logAction(player, entry) {
  const li = document.createElement('li');
  li.textContent = `${player === HERO ? 'Du' : 'KI'}: ${entryText(entry)}`;
  $('#hand-log').appendChild(li);
}

/* ---------- Darstellung ---------- */

function render() {
  const hand = game.hand;
  const over = hand.over;
  const showBot = over && (hand.result.type === 'showdown' || settings.reveal);
  const best = over && hand.result.type === 'showdown' ? hand.result.best : null;
  const winners = over ? hand.result.winners : [];

  $('#hand-no').textContent = `Hand #${hand.no}`;
  for (const i of [HERO, BOT]) {
    const seat = $(`#seat-${i}`);
    seat.querySelector('.seat-stack').textContent = game.players[i].stack;
    seat.querySelector('.dealer').hidden = hand.button !== i;
    seat.querySelector('.dealer').title = 'Dealer-Button = Small Blind';
    seat.classList.toggle('to-act', !over && hand.toAct === i);
    const bet = $(`#bet-${i}`);
    bet.classList.toggle('empty', hand.bets[i] === 0);
    bet.textContent = hand.bets[i] || '0';
    const holeEl = $(`#hole-${i}`);
    const reveal = i === HERO || showBot;
    const hlSet = best && winners.includes(i) ? new Set(best[i]) : null;
    holeEl.innerHTML = hand.hole[i].map((c) => (reveal ? cardHTML(c, { hl: hlSet && hlSet.has(c), dim: over && hand.folded[i] }) : cardHTML(c, { back: true }))).join('');
  }
  const boardHl = best ? new Set(winners.flatMap((w) => best[w])) : null;
  $('#board').innerHTML = Array.from({ length: 5 }, (_, k) => cardHTML(hand.board[k], { hl: boardHl && boardHl.has(hand.board[k]) })).join('');
  $('#pot').textContent = `Pot: ${totalPot(hand)}`;
  $('#street-label').textContent = over ? (hand.result.type === 'showdown' ? 'Showdown' : 'Hand beendet') : STREET_NAMES[hand.street];

  const madeEl = $('#made-hand');
  madeEl.textContent = settings.madeHand && hand.board.length >= 3 ? handName(evaluate([...hand.hole[HERO], ...hand.board])) : '';

  renderActions();
  renderResult();
  renderCoach();
}

function renderActions() {
  const hand = game.hand;
  const heroTurn = !hand.over && hand.toAct === HERO;
  $('#actions').classList.toggle('disabled', !heroTurn);
  $('#btn-next').hidden = !hand.over;
  $('#btn-tip').hidden = hand.over;
  $('#btn-tip').disabled = !heroTurn;
  $('.action-main').hidden = hand.over;
  if (!heroTurn) {
    ['#btn-fold', '#btn-call', '#btn-raise'].forEach((s) => { $(s).disabled = true; });
    if (hand.over) $('#raise-box').hidden = true;
    return;
  }
  const l = legalActions(game, HERO);
  $('#btn-fold').disabled = !l.canFold;
  $('#btn-call').disabled = false;
  $('#btn-call').textContent = l.canCheck ? 'Check' : `Call ${l.toCall}${l.toCall >= game.players[HERO].stack ? ' (All-in)' : ''}`;
  $('#btn-raise').disabled = !l.canRaise;
  $('#raise-box').hidden = !l.canRaise;
  if (l.canRaise) {
    const slider = $('#raise-slider');
    const amount = $('#raise-amount');
    slider.min = amount.min = l.minRaiseTo;
    slider.max = amount.max = l.maxRaiseTo;
    slider.step = 1;
    let def = l.minRaiseTo;
    if (hand.street === 'preflop' && hand.currentBet === 2 && hand.bets[HERO] === 1) def = 5;
    else if (l.isBet) def = Math.round(totalPot(hand) * 0.66);
    else def = hand.currentBet + 2 * (hand.currentBet - hand.bets[HERO]);
    def = Math.max(l.minRaiseTo, Math.min(l.maxRaiseTo, def));
    slider.value = amount.value = def;
    updateRaiseLabel();
  } else {
    $('#btn-raise').textContent = 'Raise';
  }
}

function renderResult() {
  const hand = game.hand;
  const el = $('#result-banner');
  if (!hand.over) { el.hidden = true; return; }
  const r = hand.result;
  const net = hand.net[HERO];
  let title;
  let cls;
  if (r.winners.length === 2) { title = 'Split Pot'; cls = 'split'; }
  else if (r.winners[0] === HERO) { title = `Du gewinnst ${r.pot} Chips`; cls = 'win'; }
  else { title = `KI gewinnt ${r.pot} Chips`; cls = 'lose'; }
  let detail = '';
  if (r.type === 'fold') detail = r.winners[0] === HERO ? 'Die KI hat gefoldet.' : 'Du hast gefoldet.';
  else detail = `Du: ${esc(r.names[HERO])}<br>KI: ${esc(r.names[BOT])}`;
  el.innerHTML = `<div><div class="big ${cls}">${title}</div><div class="small muted">${detail}</div></div><div class="small">Bilanz: <strong style="color:${net >= 0 ? 'var(--good)' : 'var(--bad)'}">${net >= 0 ? '+' : ''}${net}</strong></div>`;
  el.hidden = false;
}

function feedbackHTML(j) {
  const r = j.rec;
  return `<div class="coach-card ${j.verdict}">
    <h3><span class="verdict ${j.verdict}">${j.label}</span><span class="muted small">${STREET_NAMES[r.street]}</span></h3>
    <p style="margin:4px 0">${esc(j.summary)}</p>
    ${j.notes.map((n) => `<p class="small" style="margin:4px 0">${esc(n)}</p>`).join('')}
    ${meterHTML(r.equity, r.need)}
    <ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>`;
}

function renderCoach() {
  const hand = game.hand;
  const parts = [];
  if (notice) parts.push(notice);
  if (hand.over) {
    parts.push(reviewHTML());
  } else {
    if (lastFeedback && settings.live) parts.push(feedbackHTML(lastFeedback));
    if (hand.toAct === HERO) {
      if (showTip) {
        if (pending) {
          const r = pending.rec;
          parts.unshift(`<div class="coach-card tip">
            <h3><span>💡 Empfehlung</span><span class="muted small">${STREET_NAMES[r.street]}</span></h3>
            <div class="rec">${esc(r.label)}</div>
            ${r.ok.size > 1 ? `<p class="small muted" style="margin:4px 0">Auch vertretbar: ${esc([...r.ok].filter((a) => a !== r.action).map((a) => ({ fold: 'Fold', check: 'Check', call: 'Call', raise: 'Bet/Raise' }[a])).join(', '))}</p>` : ''}
            ${meterHTML(r.equity, r.need)}
            <ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>`);
        } else {
          parts.unshift('<div class="coach-card tip"><p class="muted">Coach rechnet …</p></div>');
        }
      } else if (!lastFeedback || !settings.live) {
        parts.push('<p class="muted small">Du bist dran. Brauchst du Hilfe? Klick auf <strong>💡 Tipp vom Coach</strong> (Taste T).</p>');
      }
    } else {
      parts.push('<p class="muted small">Die KI überlegt …</p>');
    }
  }
  $('#coach-content').innerHTML = parts.join('');
}

function reviewHTML() {
  const hand = game.hand;
  const counts = { good: 0, ok: 0, bad: 0 };
  decisions.forEach((d) => counts[d.j.verdict]++);
  const botCards = hand.result.type === 'showdown' || settings.reveal ? `<p class="small">Karten der KI: ${cardsHTML(hand.hole[BOT])}</p>` : '';
  if (!decisions.length) {
    return `<div class="coach-card"><h3>Handrückblick</h3><p class="small muted">Du musstest in dieser Hand nichts entscheiden.</p>${botCards}</div>`;
  }
  const items = decisions.map((d) => `
    <div class="review-item">
      <span class="st">${STREET_NAMES[d.street]}</span>
      <span><span class="verdict ${d.j.verdict}">${d.j.label}</span> · Du: <strong>${esc(d.j.taken)}</strong>${d.j.verdict !== 'good' ? ` · Coach: <strong>${esc(d.j.rec.label)}</strong>` : ''}</span>
      <span></span>
      <span class="small muted">${d.board.length ? `Board ${esc(cardsText(d.board))} · ` : ''}Pot ${d.pot}${d.toCall ? ` · zu callen ${d.toCall}` : ''} · Equity ${pctText(d.j.rec.equity)}</span>
      <details><summary>Warum?</summary>
        ${d.j.notes.map((n) => `<p class="small" style="margin:4px 0">${esc(n)}</p>`).join('')}
        <ul class="small">${d.j.rec.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </details>
    </div>`).join('');
  const score = Math.round((counts.good + counts.ok * 0.5) / decisions.length * 100);
  return `<div class="coach-card">
    <h3><span>Handrückblick</span><span class="badge">${score} / 100</span></h3>
    <p class="small" style="margin:4px 0">✅ ${counts.good} · ⚠️ ${counts.ok} · ❌ ${counts.bad}</p>
    ${botCards}
  </div><div class="review">${items}</div>`;
}

function onHandOver() {
  recordHand(game.hand, HERO);
}

