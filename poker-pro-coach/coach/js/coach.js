// Der Coach: schätzt die Gegner-Range, rechnet Equity und Pot Odds und empfiehlt eine Aktion.
// Dieselbe Logik (mit anderen Parametern) steuert auch den KI-Gegner.
import { legalActions, totalPot, BIG_BLIND } from './game.js';
import { equityVsRange } from './equity.js';
import { evaluate, categoryOf, CATEGORY } from './evaluator.js';
import { handClass, handPercentile, topRange, narrowRange, removeDead } from './ranges.js';
import { t, pct } from './i18n.js';

export const DEFAULT_PARAMS = {
  sbOpen: 0.65, // Small Blind raist die besten 65 %
  sbLimp: 0.85, // … und limpt bis 85 %, Rest Fold
  bbIso: 0.3, // Big Blind raist gegen Limp mit den besten 30 %
  threeBet: 0.12, // Re-Raise gegen Open mit den besten 12 %
  fourBet: 0.045,
  raiseThr: 0.72, // Postflop Raise ab dieser Equity
  valueBet: 0.63, // Postflop Bet ab dieser Equity
  callBonus: 0, // > 0 = callt lockerer (Gegner-Stile)
  iters: 2500,
};


/** Schätzt die Range von Spieler p anhand seiner bisherigen Aktionen. */
export function estimateRange(hand, p) {
  const isSB = p === hand.button;
  let level = 1; // 1 = nur Big Blind, 2 = Open-Raise, 3 = 3-Bet …
  let ownPct = 1;
  let raised = false;
  for (const h of hand.history) {
    if (h.street !== 'preflop') break;
    if (h.type === 'raise' || h.type === 'bet') {
      level++;
      if (h.player === p) {
        raised = true;
        let r;
        if (level === 2) r = isSB ? 0.7 : 0.35;
        else if (level === 3) r = 0.15;
        else if (level === 4) r = 0.06;
        else r = 0.04;
        if (h.allIn && level >= 3) r = Math.max(r, 0.08);
        ownPct = Math.min(ownPct, r);
      }
    } else if (h.type === 'call' && h.player === p) {
      let r;
      if (level === 1) r = 0.85; // Limp
      else if (level === 2) r = raised ? 0.5 : 0.65;
      else if (level === 3) r = 0.25;
      else r = 0.1;
      ownPct = Math.min(ownPct, r);
    }
  }
  let range = topRange(ownPct);

  // Postflop: Bets und Raises machen die Range stärker
  for (const h of hand.history) {
    if (h.street === 'preflop' || h.player !== p) continue;
    const board = hand.board.slice(0, h.board);
    if (h.type === 'bet' || h.type === 'raise' || h.type === 'call') range = removeDead(range, board);
    if (h.type === 'bet') range = narrowRange(range, board, 0.6);
    else if (h.type === 'raise') range = narrowRange(range, board, 0.35);
    else if (h.type === 'call') range = narrowRange(range, board, 0.75);
  }
  return { range, preflopPct: ownPct, desc: String(Math.round(ownPct * 100)) };
}

/**
 * Echte Draw-Outs (nur Flop/Turn): Karten, die dir eine Straße oder einen Flush geben,
 * an dem mindestens eine deiner Karten beteiligt ist (Board-Draws zählen nicht).
 */
export function countOuts(hole, board) {
  if (board.length < 3 || board.length > 4) return { outs: 0, kind: '' };
  const cards = [...hole, ...board];
  if (categoryOf(evaluate(cards)) >= CATEGORY.STRAIGHT) return { outs: 0, kind: '' };
  const seen = new Set(cards);
  let outs = 0;
  let flushOuts = 0;
  const straightRanks = new Set();
  for (let c = 0; c < 52; c++) {
    if (seen.has(c)) continue;
    const mine = evaluate([...cards, c]);
    const cat = categoryOf(mine);
    if (cat !== CATEGORY.STRAIGHT && cat !== CATEGORY.FLUSH && cat !== CATEGORY.STRAIGHT_FLUSH) continue;
    // Nur wenn deine Karten mehr bringen als das Board allein
    if (mine <= evaluate([...board, c])) continue;
    outs++;
    if (cat === CATEGORY.STRAIGHT) straightRanks.add(c >> 2);
    else flushOuts++;
  }
  const fd = flushOuts > 0;
  const sd = straightRanks.size;
  let kind = '';
  if (fd && sd >= 2) kind = 'fdoesd';
  else if (fd && sd === 1) kind = 'fdgut';
  else if (fd) kind = 'fd';
  else if (sd >= 2) kind = 'oesd';
  else if (sd === 1) kind = 'gut';
  return { outs, kind };
}

/** Alle Infos, die Coach und Bot für eine Entscheidung brauchen. */
export function buildContext(game, i) {
  const hand = game.hand;
  const legal = legalActions(game, i);
  return {
    hand,
    player: i,
    hole: hand.hole[i],
    board: hand.board.slice(),
    street: hand.street,
    isButton: i === hand.button,
    pot: totalPot(hand),
    myBet: hand.bets[i],
    currentBet: hand.currentBet,
    stack: game.players[i].stack,
    oppStack: game.players[1 - i].stack,
    oppAllIn: hand.allIn[1 - i],
    legal,
  };
}

function preflopLevel(hand) {
  let level = 1;
  for (const h of hand.history) if (h.street === 'preflop' && (h.type === 'raise' || h.type === 'bet')) level++;
  return level;
}

function clampTo(ctx, to) {
  const { legal } = ctx;
  if (!legal.canRaise) return 0;
  to = Math.round(to);
  to = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, to));
  // Wenn ein Großteil des Stacks drin wäre: gleich all-in
  if (to >= ctx.myBet + 0.6 * ctx.stack) to = legal.maxRaiseTo;
  return to;
}

export function actionLabel(type, to, ctx) {
  if (type === 'fold') return t('act.fold');
  if (type === 'check') return t('act.check');
  if (type === 'call') return t('act.call', { n: ctx.legal.toCall });
  if (type === 'raise') {
    const allIn = to >= ctx.legal.maxRaiseTo && to - ctx.myBet >= ctx.stack;
    if (allIn) return t('act.allin', { n: to });
    return t(ctx.currentBet === 0 ? 'act.bet' : 'act.raise', { n: to });
  }
  return type;
}

/**
 * Empfehlung für die aktuelle Entscheidung.
 * @returns {{action, to, label, ok:Set, equity, potOdds, need, reasons:string[], ...}}
 */
export function recommend(ctx, params = DEFAULT_PARAMS) {
  const P = { ...DEFAULT_PARAMS, ...params };
  const { hand, hole, board, legal } = ctx;
  const opp = 1 - ctx.player;
  const est = estimateRange(hand, opp);
  let range = removeDead(est.range, [...hole, ...board]);
  if (range.length === 0) range = removeDead(topRange(est.preflopPct), [...hole, ...board]);
  const equity = equityVsRange(hole, board, range, P.iters);
  const toCall = legal.toCall;
  const potOdds = toCall > 0 ? toCall / (ctx.pot + toCall) : 0;
  const callIsAllIn = toCall >= ctx.stack || ctx.oppAllIn;
  const inPosition = ctx.isButton;
  let realize = 1;
  if (!callIsAllIn) {
    if (ctx.street === 'preflop') realize = inPosition ? 0.95 : 0.85;
    else if (ctx.street === 'flop') realize = inPosition ? 1 : 0.88;
    else if (ctx.street === 'turn') realize = inPosition ? 1 : 0.94;
  }
  const effEq = equity * realize + P.callBonus;
  const cls = handClass(hole[0], hole[1]);
  const pctl = handPercentile(cls);
  const draw = countOuts(hole, board);
  const reasons = [];
  const ok = new Set();
  let action;
  let to = 0;
  const mistakeIfFold = 'tooTight';

  const sizeTo = (frac) => clampTo(ctx, ctx.currentBet + frac * ctx.pot);

  if (ctx.street === 'preflop') {
    const level = preflopLevel(hand);
    reasons.push(t('r.rank', { cls, p: Math.max(1, Math.round(pctl * 100)) }));
    if (level === 1 && ctx.isButton && ctx.myBet < BIG_BLIND && legal.canRaise && !ctx.oppAllIn) {
      // Small Blind, erste Aktion
      if (pctl <= P.sbOpen) {
        action = 'raise'; to = clampTo(ctx, 2.5 * BIG_BLIND);
        reasons.push(t('r.sbOpen'));
        if (pctl > P.sbOpen - 0.08) ok.add('call');
      } else if (pctl <= P.sbLimp) {
        action = 'call';
        reasons.push(t('r.sbLimp'));
        ok.add('fold');
        if (pctl < P.sbOpen + 0.08) ok.add('raise');
      } else {
        action = 'fold';
        reasons.push(t('r.sbFold'));
        if (pctl < P.sbLimp + 0.05) ok.add('call');
      }
    } else if (level === 1 && toCall === 0) {
      // Big Blind gegen Limp
      if (legal.canRaise && pctl <= P.bbIso) {
        action = 'raise'; to = clampTo(ctx, 4 * BIG_BLIND);
        reasons.push(t('r.bbIso'));
        if (pctl > P.bbIso - 0.1) ok.add('check');
      } else {
        action = 'check';
        reasons.push(t('r.bbCheck'));
        if (pctl < P.bbIso + 0.1) ok.add('raise');
      }
    } else {
      // Gegen einen Raise
      const valueThr = level === 2 ? P.threeBet : level === 3 ? P.fourBet : 0.025;
      reasons.push(t('r.range', { p: est.desc, narrowed: '', eq: pct(equity) }));
      reasons.push(t('r.odds', { call: toCall, pot: ctx.pot, need: pct(potOdds) }) + (realize < 1 ? ' ' + t('r.realize', { r: pct(realize) }) : ''));
      if (legal.canRaise && pctl <= valueThr) {
        action = 'raise';
        to = clampTo(ctx, level === 2 ? 3 * ctx.currentBet : 2.3 * ctx.currentBet);
        reasons.push(t('r.reraise'));
        ok.add('call');
      } else if (effEq >= potOdds) {
        action = 'call';
        reasons.push(t('r.preCall'));
        if (effEq - potOdds < 0.04) ok.add('fold');
        if (legal.canRaise && pctl <= valueThr * 1.6) ok.add('raise');
      } else {
        action = 'fold';
        reasons.push(t('r.preFold'));
        if (potOdds - effEq < 0.04) ok.add('call');
      }
    }
  } else {
    // Postflop
    const narrowed = hand.history.some((h) => h.player === opp && h.street !== 'preflop' && (h.type === 'bet' || h.type === 'raise'));
    reasons.push(t('r.range', { p: est.desc, narrowed: narrowed ? t('r.narrowed') : '', eq: pct(equity) }));
    if (draw.outs > 0) {
      const mult = board.length === 3 ? 4 : 2;
      reasons.push(t('r.draw', { kind: draw.kind ? t('draw.' + draw.kind) : 'Draw', outs: draw.outs, pct: Math.min(100, draw.outs * mult), mult, span: t(board.length === 3 ? 'r.span.flop' : 'r.span.turn') }));
    }
    const strongDraw = draw.outs >= 8 && board.length < 5;
    if (toCall > 0) {
      const facingRaise = ctx.myBet > 0;
      const thr = P.raiseThr + (facingRaise ? 0.08 : 0);
      reasons.push(t('r.odds', { call: toCall, pot: ctx.pot, need: pct(potOdds) }) + (realize < 1 ? ' ' + t('r.realize', { r: pct(realize) }) : ''));
      if (legal.canRaise && equity >= thr) {
        action = 'raise';
        to = clampTo(ctx, ctx.currentBet + 2 * (ctx.currentBet - ctx.myBet));
        reasons.push(t('r.postRaise'));
        ok.add('call');
      } else if (effEq >= potOdds) {
        action = 'call';
        reasons.push(t('r.postCall', { eq: pct(equity), need: pct(potOdds) }));
        if (effEq - potOdds < 0.05) ok.add('fold');
        if (legal.canRaise && (equity >= thr - 0.07 || (strongDraw && board.length === 3))) ok.add('raise');
      } else if (strongDraw && effEq + 0.07 >= potOdds) {
        action = 'call';
        reasons.push(t('r.implied'));
        ok.add('fold');
        if (legal.canRaise) ok.add('raise');
      } else {
        action = 'fold';
        reasons.push(t('r.postFold', { eq: pct(equity), need: pct(potOdds) }));
        if (potOdds - effEq < 0.05) ok.add('call');
      }
    } else {
      // Niemand hat gesetzt: Check oder Bet
      const river = board.length === 5;
      const valueThr = P.valueBet - (river ? 0.03 : 0);
      if (legal.canRaise && equity >= valueThr) {
        action = 'raise';
        const frac = equity >= 0.85 && river ? 1 : 0.66;
        to = sizeTo(frac);
        reasons.push(t('r.value', { size: t(frac === 1 ? 'r.size.pot' : 'r.size.twothirds'), draws: river ? '' : t('r.value.draws') }));
        if (equity < valueThr + 0.07 || equity >= 0.85) ok.add('check');
      } else if (legal.canRaise && strongDraw) {
        action = 'raise';
        to = sizeTo(0.5);
        reasons.push(t('r.semibluff'));
        ok.add('check');
      } else {
        action = 'check';
        if (equity >= 0.45) reasons.push(t('r.potControl'));
        else reasons.push(t('r.weak'));
        if (legal.canRaise && (equity >= valueThr - 0.06 || (inPosition && board.length === 3 && equity < 0.35))) ok.add('raise');
      }
    }
  }
  // Sicherheitsnetz: nie eine unmögliche Aktion empfehlen (z. B. Gegner schon all-in)
  if (action === 'raise' && !legal.canRaise) {
    action = toCall > 0 ? 'call' : 'check';
    to = 0;
    reasons.push(t('r.noRaise'));
  }
  if (!legal.canRaise) ok.delete('raise');
  ok.add(action);

  const evCall = toCall > 0 ? effEq * (ctx.pot + toCall) - toCall : null;
  return {
    action,
    to,
    label: actionLabel(action, to, ctx),
    ok,
    equity,
    potOdds,
    realize,
    need: potOdds,
    evCall,
    draw,
    handClass: cls,
    percentile: pctl,
    rangeDesc: est.desc,
    reasons,
    mistakeIfFold,
    street: ctx.street,
  };
}

const ICON = { good: '✅', ok: '⚠️', bad: '❌' };
export const verdictLabel = (v) => `${ICON[v]} ${t('verdict.' + v)}`;

/** Bewertet die tatsächlich gewählte Aktion des Spielers. */
export function judge(rec, action, ctx) {
  let type = action.type;
  if (type === 'bet') type = 'raise';
  const taken = actionLabel(type, action.amount, ctx);
  let verdict;
  let mistake = null;
  const notes = [];

  if (type === rec.action) {
    verdict = 'good';
    if (type === 'raise' && rec.to > 0) {
      const mine = action.amount - ctx.myBet;
      const rel = rec.to - ctx.myBet;
      const allInEither = action.amount >= ctx.legal.maxRaiseTo || rec.to >= ctx.legal.maxRaiseTo;
      if (!allInEither && (mine < rel * 0.5 || mine > rel * 2.2)) {
        verdict = 'ok';
        mistake = 'sizing';
        notes.push(t(mine < rel ? 'judge.small' : 'judge.big', { n: rec.to }));
      }
    }
  } else if (rec.ok.has(type)) {
    verdict = 'ok';
  } else {
    verdict = 'bad';
    if (type === 'fold' && ctx.legal.toCall === 0) {
      mistake = 'foldCheck';
      notes.push(t('judge.foldCheck'));
    } else if (type === 'fold') mistake = rec.mistakeIfFold;
    else if (type === 'call' && rec.action === 'fold') mistake = 'tooLoose';
    else if ((type === 'call' || type === 'check') && rec.action === 'raise') mistake = 'tooPassive';
    else if (type === 'raise' && (rec.action === 'check' || rec.action === 'fold')) mistake = 'tooAggressive';
    else if (type === 'raise' && rec.action === 'call') mistake = 'overplay';
    else mistake = 'other';
  }

  // EV-Hinweis bei Call/Fold-Entscheidungen
  if (rec.evCall !== null && (type === 'fold' || type === 'call') && verdict !== 'good') {
    const ev = rec.evCall;
    if (type === 'fold' && ev > 0) notes.push(t('judge.evFold', { n: ev.toFixed(1) }));
    if (type === 'call' && ev < 0) notes.push(t('judge.evCall', { n: Math.abs(ev).toFixed(1) }));
  }

  let summary;
  summary = t('judge.' + verdict, { a: taken, r: rec.label });

  return { verdict, label: verdictLabel(verdict), taken, summary, notes, mistake, rec };
}
