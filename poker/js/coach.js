// Der Coach: schätzt die Gegner-Range, rechnet Equity und Pot Odds und empfiehlt eine Aktion.
// Dieselbe Logik (mit anderen Parametern) steuert auch den KI-Gegner.
import { legalActions, totalPot, BIG_BLIND } from './game.js';
import { equityVsRange } from './equity.js';
import { evaluate, categoryOf, hasFlushDraw, straightDrawRanks, CATEGORY } from './evaluator.js';
import { handClass, handPercentile, topRange, narrowRange, removeDead } from './ranges.js';

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

const pct = (x) => `${Math.round(x * 100)} %`;

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
    if (h.type === 'bet') range = narrowRange(range, board, 0.6);
    else if (h.type === 'raise') range = narrowRange(range, board, 0.35);
    else if (h.type === 'call') range = narrowRange(range, board, 0.75);
  }
  return { range, preflopPct: ownPct, desc: `Top ${Math.round(ownPct * 100)} % der Starthände` };
}

/** Outs zu Straße oder besser (nur Flop/Turn). */
export function countOuts(hole, board) {
  if (board.length < 3 || board.length > 4) return { outs: 0, kind: '' };
  const cards = [...hole, ...board];
  const now = categoryOf(evaluate(cards));
  if (now >= CATEGORY.STRAIGHT) return { outs: 0, kind: '' };
  const seen = new Set(cards);
  let outs = 0;
  for (let c = 0; c < 52; c++) {
    if (seen.has(c)) continue;
    if (categoryOf(evaluate([...cards, c])) >= CATEGORY.STRAIGHT) outs++;
  }
  const fd = hasFlushDraw(cards);
  const sd = straightDrawRanks(cards);
  let kind = '';
  if (fd && sd >= 2) kind = 'Flush-Draw + Open-Ender';
  else if (fd && sd === 1) kind = 'Flush-Draw + Gutshot';
  else if (fd) kind = 'Flush-Draw';
  else if (sd >= 2) kind = 'Open-Ended Straight-Draw';
  else if (sd === 1) kind = 'Gutshot';
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
  if (type === 'fold') return 'Fold';
  if (type === 'check') return 'Check';
  if (type === 'call') return `Call ${ctx.legal.toCall}`;
  if (type === 'raise') {
    const allIn = to >= ctx.legal.maxRaiseTo && to - ctx.myBet >= ctx.stack;
    const verb = ctx.currentBet === 0 ? 'Bet' : 'Raise auf';
    return allIn ? `All-in (${to})` : `${verb} ${to}`;
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
  const range = removeDead(est.range, [...hole, ...board]);
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
  const mistakeIfFold = 'Zu tight gefoldet';

  const sizeTo = (frac) => clampTo(ctx, ctx.currentBet + frac * ctx.pot);

  if (ctx.street === 'preflop') {
    const level = preflopLevel(hand);
    reasons.push(`${cls} gehört zu den besten ${pct(pctl)} aller Starthände.`);
    if (level === 1 && ctx.isButton && ctx.myBet < BIG_BLIND) {
      // Small Blind, erste Aktion
      if (pctl <= P.sbOpen) {
        action = 'raise'; to = clampTo(ctx, 2.5 * BIG_BLIND);
        reasons.push('Im Heads-up ist der Small Blind (Button) in Position – eröffne mit einem Raise auf ca. 2,5 Big Blinds, um den Pot zu gewinnen oder mit Initiative zu spielen.');
        if (pctl > P.sbOpen - 0.08) ok.add('call');
      } else if (pctl <= P.sbLimp) {
        action = 'call';
        reasons.push('Zu schwach zum Raisen, aber für einen halben Big Blind lohnt sich ein günstiger Blick auf den Flop (Limp).');
        ok.add('fold');
        if (pctl < P.sbOpen + 0.08) ok.add('raise');
      } else {
        action = 'fold';
        reasons.push('Diese Hand gehört zu den schwächsten – auch im Heads-up lohnt sich hier selbst der halbe Big Blind kaum.');
        if (pctl < P.sbLimp + 0.05) ok.add('call');
      }
    } else if (level === 1 && toCall === 0) {
      // Big Blind gegen Limp
      if (pctl <= P.bbIso) {
        action = 'raise'; to = clampTo(ctx, 4 * BIG_BLIND);
        reasons.push('Der Gegner hat nur gelimpt (schwache Range). Mit einer starken Hand raist du auf ca. 4 Big Blinds für Value.');
        if (pctl > P.bbIso - 0.1) ok.add('check');
      } else {
        action = 'check';
        reasons.push('Gratis-Flop: Check ist hier nie ein Fehler; ein Raise würde nur gegen bessere Hände bezahlt.');
        if (pctl < P.bbIso + 0.1) ok.add('raise');
      }
    } else {
      // Gegen einen Raise
      const valueThr = level === 2 ? P.threeBet : level === 3 ? P.fourBet : 0.025;
      reasons.push(`Gegner-Range geschätzt: ${est.desc}. Deine Equity dagegen: ${pct(equity)}.`);
      reasons.push(`Pot Odds: ${toCall} zahlen in einen Pot von ${ctx.pot} → du brauchst ${pct(potOdds)} Equity${realize < 1 ? ` (außer Position realisierst du nur ca. ${pct(realize)} davon)` : ''}.`);
      if (legal.canRaise && pctl <= valueThr) {
        action = 'raise';
        to = clampTo(ctx, level === 2 ? 3 * ctx.currentBet : 2.3 * ctx.currentBet);
        reasons.push('Deine Hand ist stark genug für einen Re-Raise (Value): Du baust den Pot auf, während du vorne liegst.');
        ok.add('call');
      } else if (effEq >= potOdds) {
        action = 'call';
        reasons.push('Die Equity reicht für einen Call.');
        if (effEq - potOdds < 0.04) ok.add('fold');
        if (legal.canRaise && pctl <= valueThr * 1.6) ok.add('raise');
      } else {
        action = 'fold';
        reasons.push('Die Equity reicht nicht für den Preis – Fold spart Chips.');
        if (potOdds - effEq < 0.04) ok.add('call');
      }
    }
  } else {
    // Postflop
    reasons.push(`Gegner-Range geschätzt: ${est.desc}${hand.history.some((h) => h.player === opp && h.street !== 'preflop' && (h.type === 'bet' || h.type === 'raise')) ? ', durch seine Bets eingeengt' : ''}. Deine Equity: ${pct(equity)}.`);
    if (draw.outs > 0) {
      const mult = board.length === 3 ? 4 : 2;
      reasons.push(`${draw.kind || 'Draw'}: ${draw.outs} Outs ≈ ${Math.min(100, draw.outs * mult)} % (Regel ${mult}×Outs${board.length === 3 ? ', Flop bis River' : ', nur noch River'}).`);
    }
    const strongDraw = draw.outs >= 8 && board.length < 5;
    if (toCall > 0) {
      const facingRaise = ctx.myBet > 0;
      const thr = P.raiseThr + (facingRaise ? 0.08 : 0);
      reasons.push(`Pot Odds: ${toCall} zahlen in einen Pot von ${ctx.pot} → du brauchst ${pct(potOdds)} Equity${realize < 1 ? ` (ohne Position realisierst du nur ca. ${pct(realize)} deiner Equity)` : ''}.`);
      if (legal.canRaise && equity >= thr) {
        action = 'raise';
        to = clampTo(ctx, ctx.currentBet + 2 * (ctx.currentBet - ctx.myBet));
        reasons.push('Du bist klar vorne: Raise für Value, damit schlechtere Hände mehr bezahlen.');
        ok.add('call');
      } else if (effEq >= potOdds) {
        action = 'call';
        reasons.push(`Deine Equity (${pct(equity)}) liegt über dem Preis (${pct(potOdds)}) – Call ist profitabel.`);
        if (effEq - potOdds < 0.05) ok.add('fold');
        if (legal.canRaise && (equity >= thr - 0.07 || (strongDraw && board.length === 3))) ok.add('raise');
      } else if (strongDraw && effEq + 0.07 >= potOdds) {
        action = 'call';
        reasons.push('Knapp zu teuer, aber mit einem starken Draw gewinnst du später oft mehr, wenn du triffst (Implied Odds).');
        ok.add('fold');
        if (legal.canRaise) ok.add('raise');
      } else {
        action = 'fold';
        reasons.push(`Die Equity (${pct(equity)}) reicht nicht für den Preis (${pct(potOdds)}) – Fold.`);
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
        reasons.push(`Du liegst wahrscheinlich vorne: Bet für Value (${frac === 1 ? 'Pot-Größe' : 'ca. ⅔ Pot'}), damit schlechtere Hände bezahlen${river ? '' : ' und Draws teuer werden'}.`);
        if (equity < valueThr + 0.07 || equity >= 0.85) ok.add('check');
      } else if (legal.canRaise && strongDraw) {
        action = 'raise';
        to = sizeTo(0.5);
        reasons.push('Semi-Bluff: Mit einem starken Draw setzt du ca. ½ Pot – entweder der Gegner foldet sofort, oder du triffst noch.');
        ok.add('check');
      } else {
        action = 'check';
        if (equity >= 0.45) reasons.push('Mittelstarke Hand: Check hält den Pot klein (Pot-Kontrolle) – zu setzen würde meist nur von besseren Händen bezahlt.');
        else reasons.push('Zu schwach für Value: Check und billig weitersehen ist hier am besten.');
        if (legal.canRaise && (equity >= valueThr - 0.06 || (inPosition && board.length === 3 && equity < 0.35))) ok.add('raise');
      }
    }
  }
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

const VERDICT = { good: '✅ Gut', ok: '⚠️ Vertretbar', bad: '❌ Fehler' };
export const verdictLabel = (v) => VERDICT[v];

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
        mistake = 'Bet-Größe';
        notes.push(mine < rel ? `Richtige Idee, aber eher zu klein gesetzt – ca. ${rec.to} wäre besser, damit schlechtere Hände mehr zahlen und Draws keinen günstigen Preis bekommen.` : `Richtige Idee, aber sehr groß gesetzt – mit ca. ${rec.to} bezahlen dich mehr schlechtere Hände.`);
      }
    }
  } else if (rec.ok.has(type)) {
    verdict = 'ok';
  } else {
    verdict = 'bad';
    if (type === 'fold') mistake = rec.mistakeIfFold;
    else if (type === 'call' && rec.action === 'fold') mistake = 'Zu loose gecallt';
    else if ((type === 'call' || type === 'check') && rec.action === 'raise') mistake = 'Zu passiv';
    else if (type === 'raise' && (rec.action === 'check' || rec.action === 'fold')) mistake = 'Zu aggressiv';
    else if (type === 'raise' && rec.action === 'call') mistake = 'Überspielt';
    else mistake = 'Andere Aktion';
  }

  // EV-Hinweis bei Call/Fold-Entscheidungen
  if (rec.evCall !== null && (type === 'fold' || type === 'call') && verdict !== 'good') {
    const ev = rec.evCall;
    if (type === 'fold' && ev > 0) notes.push(`Ein Call hätte im Schnitt etwa +${ev.toFixed(1)} Chips gebracht.`);
    if (type === 'call' && ev < 0) notes.push(`Der Call kostet im Schnitt etwa ${Math.abs(ev).toFixed(1)} Chips.`);
  }

  let summary;
  if (verdict === 'good') summary = `${taken} – genau richtig.`;
  else if (verdict === 'ok') summary = `${taken} ist vertretbar. Empfehlung: ${rec.label}.`;
  else summary = `${taken} war ein Fehler. Besser: ${rec.label}.`;

  return { verdict, label: verdictLabel(verdict), taken, summary, notes, mistake, rec };
}
