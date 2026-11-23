// KI-Gegner: nutzt die Coach-Logik mit eigenem Stil plus etwas Zufall und Bluffs.
import { recommend, buildContext } from './coach.js';
import { randInt } from './cards.js';

export const BOT_LEVELS = {
  easy: {
    name: 'Locker (Anfänger)',
    desc: 'Callt viel, blufft selten, setzt nur mit starken Händen.',
    params: { sbOpen: 0.35, sbLimp: 1, bbIso: 0.15, threeBet: 0.04, raiseThr: 0.82, valueBet: 0.75, callBonus: 0.1, iters: 700 },
    bluff: 0.03, slowplay: 0.3, sizes: [0.5, 0.5, 0.66],
  },
  normal: {
    name: 'Solide',
    desc: 'Spielt nah an der Empfehlung des Coaches, blufft manchmal.',
    params: { iters: 900 },
    bluff: 0.12, slowplay: 0.12, sizes: [0.5, 0.66, 0.75],
  },
  hard: {
    name: 'Aggressiv',
    desc: 'Raist oft, blufft häufig, setzt groß – du musst öfter mutig callen.',
    params: { sbOpen: 0.82, sbLimp: 0.9, bbIso: 0.45, threeBet: 0.2, fourBet: 0.07, raiseThr: 0.66, valueBet: 0.58, callBonus: -0.02, iters: 900 },
    bluff: 0.25, slowplay: 0.08, sizes: [0.66, 0.75, 1],
  },
};

const chance = (p) => randInt(10000) < p * 10000;
const pick = (arr) => arr[randInt(arr.length)];

export function botDecide(game, level = 'normal') {
  const cfg = BOT_LEVELS[level] || BOT_LEVELS.normal;
  const i = game.hand.toAct;
  const ctx = buildContext(game, i);
  const rec = recommend(ctx, cfg.params);
  const { legal } = ctx;
  const sizeTo = (frac) => {
    let to = Math.round(ctx.currentBet + frac * ctx.pot);
    to = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, to));
    return to;
  };

  let action = { type: rec.action, amount: rec.to };
  const postflop = ctx.street !== 'preflop';

  if (rec.action === 'raise' && rec.to < legal.maxRaiseTo && postflop) {
    if (chance(cfg.slowplay) && rec.equity > 0.8) action = { type: legal.canCheck ? 'check' : 'call' };
    else if (ctx.currentBet === 0) action = { type: 'raise', amount: sizeTo(pick(cfg.sizes)) };
  } else if (postflop && legal.canRaise && rec.action === 'check' && chance(cfg.bluff)) {
    action = { type: 'raise', amount: sizeTo(pick(cfg.sizes)) }; // Bluff
  } else if (postflop && legal.canRaise && rec.action === 'fold' && ctx.street !== 'river' && chance(cfg.bluff / 3)) {
    action = { type: 'raise', amount: legal.minRaiseTo + Math.round(ctx.pot * 0.5) }; // Bluff-Raise
  }
  if (action.type === 'raise') action.amount = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, action.amount || legal.minRaiseTo));
  return action;
}
