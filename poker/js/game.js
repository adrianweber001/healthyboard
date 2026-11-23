// Heads-up No-Limit Hold'em: Spielzustand und Regeln.
// Der Button postet den Small Blind, handelt preflop zuerst und postflop zuletzt.
import { freshDeck, shuffle, randInt } from './cards.js';
import { evaluate, bestFive, handName } from './evaluator.js';

export const SMALL_BLIND = 1;
export const BIG_BLIND = 2;
export const START_STACK = 200;
export const STREETS = ['preflop', 'flop', 'turn', 'river'];
export const STREET_NAMES = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' };

export function createGame(names = ['Du', 'KI']) {
  return {
    players: names.map((name, i) => ({ name, stack: START_STACK, isHero: i === 0 })),
    button: randInt(2),
    handNo: 0,
    hand: null,
  };
}

export function isGameOver(game) {
  return game.players.some((p) => p.stack <= 0);
}

export function resetStacks(game) {
  for (const p of game.players) p.stack = START_STACK;
  game.handNo = 0;
  game.hand = null;
}

export function startHand(game) {
  if (game.hand) game.button = 1 - game.button;
  game.handNo++;
  const button = game.button;
  const deck = shuffle(freshDeck());
  const hand = {
    no: game.handNo,
    button,
    deck,
    hole: [[], []],
    board: [],
    pot: 0,
    bets: [0, 0],
    contributed: [0, 0],
    folded: [false, false],
    allIn: [false, false],
    acted: [false, false],
    street: 'preflop',
    currentBet: 0,
    minRaise: BIG_BLIND,
    toAct: button,
    history: [],
    over: false,
    result: null,
    startStacks: game.players.map((p) => p.stack),
  };
  game.hand = hand;
  for (let k = 0; k < 2; k++) for (let i = 0; i < 2; i++) hand.hole[(button + 1 + i) % 2].push(deck.pop());
  post(game, button, SMALL_BLIND);
  post(game, 1 - button, BIG_BLIND);
  hand.currentBet = Math.max(...hand.bets);
  hand.history.push({ street: 'preflop', player: button, type: 'sb', to: hand.bets[button], add: hand.bets[button] });
  hand.history.push({ street: 'preflop', player: 1 - button, type: 'bb', to: hand.bets[1 - button], add: hand.bets[1 - button] });
  hand.toAct = button;
  advance(game, true);
  return hand;
}

function post(game, i, amount) {
  const hand = game.hand;
  const p = game.players[i];
  const a = Math.min(amount, p.stack);
  p.stack -= a;
  hand.bets[i] += a;
  hand.contributed[i] += a;
  if (p.stack === 0) hand.allIn[i] = true;
  return a;
}

export const totalPot = (hand) => hand.pot + hand.bets[0] + hand.bets[1];

/** Welche Aktionen hat Spieler i gerade? */
export function legalActions(game, i = game.hand.toAct) {
  const hand = game.hand;
  const me = game.players[i];
  const opp = 1 - i;
  const owe = hand.currentBet - hand.bets[i];
  const toCall = Math.min(owe, me.stack);
  const maxTo = Math.min(hand.bets[i] + me.stack, hand.bets[opp] + game.players[opp].stack);
  const canRaise = !hand.allIn[opp] && me.stack > owe && maxTo > hand.currentBet;
  const minTo = Math.min(hand.currentBet + hand.minRaise, maxTo);
  return {
    player: i,
    canFold: owe > 0,
    canCheck: owe <= 0,
    canCall: owe > 0,
    toCall,
    canRaise,
    minRaiseTo: canRaise ? Math.max(minTo, hand.currentBet + 1) : 0,
    maxRaiseTo: canRaise ? maxTo : 0,
    isBet: hand.currentBet === 0,
    pot: totalPot(hand),
  };
}

/**
 * Führt eine Aktion aus. action = { type: 'fold'|'check'|'call'|'raise', amount?: Ziel-Einsatz dieser Straße }
 */
export function act(game, action) {
  const hand = game.hand;
  if (hand.over) throw new Error('Hand ist vorbei');
  const i = hand.toAct;
  const legal = legalActions(game, i);
  const potBefore = totalPot(hand);
  const entry = { street: hand.street, player: i, type: action.type, to: 0, add: 0, pot: potBefore, toCall: legal.toCall, board: hand.board.length };

  let type = action.type;
  if (type === 'check' && !legal.canCheck) type = 'call';
  if (type === 'fold' && !legal.canFold) type = 'check';
  if (type === 'raise' && !legal.canRaise) type = legal.canCheck ? 'check' : 'call';

  if (type === 'fold') {
    hand.folded[i] = true;
  } else if (type === 'check') {
    hand.acted[i] = true;
  } else if (type === 'call') {
    entry.add = post(game, i, legal.toCall);
    hand.acted[i] = true;
  } else if (type === 'raise') {
    let to = Math.round(Number(action.amount) || legal.minRaiseTo);
    to = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, to));
    const raiseSize = to - hand.currentBet;
    entry.isBet = hand.currentBet === 0;
    entry.add = post(game, i, to - hand.bets[i]);
    if (raiseSize >= hand.minRaise) hand.minRaise = raiseSize;
    hand.currentBet = Math.max(hand.currentBet, hand.bets[i]);
    hand.acted[i] = true;
    hand.acted[1 - i] = false;
  }
  entry.type = type === 'raise' && entry.isBet ? 'bet' : type;
  entry.to = hand.bets[i];
  entry.allIn = hand.allIn[i];
  hand.history.push(entry);
  advance(game);
  return entry;
}

function canStillAct(hand, i) {
  return !hand.folded[i] && !hand.allIn[i];
}

function roundComplete(hand) {
  const active = [0, 1].filter((i) => canStillAct(hand, i));
  if (active.length <= 1) {
    // Gegner all-in: fertig, sobald der verbleibende Spieler mindestens gleichgezogen hat
    return active.every((i) => hand.bets[i] >= hand.currentBet);
  }
  return active.every((i) => hand.acted[i] && hand.bets[i] === hand.currentBet);
}

function advance(game, initial = false) {
  const hand = game.hand;
  if (hand.folded[0] || hand.folded[1]) {
    finishFold(game);
    return;
  }
  if (!roundComplete(hand)) {
    if (!initial) hand.toAct = 1 - hand.toAct;
    if (!canStillAct(hand, hand.toAct)) hand.toAct = 1 - hand.toAct;
    return;
  }
  closeStreet(game);
  if (hand.street === 'river') {
    showdown(game);
    return;
  }
  dealNext(game);
  // Wenn höchstens einer noch setzen kann, Board bis zum River auslegen
  if ([0, 1].filter((i) => canStillAct(hand, i)).length < 2) {
    hand.runout = true;
    while (hand.street !== 'river') dealNext(game);
    showdown(game);
    return;
  }
  hand.toAct = 1 - hand.button;
}

function closeStreet(game) {
  const hand = game.hand;
  const [b0, b1] = hand.bets;
  if (b0 !== b1) {
    // Nicht gecallten Teil zurückgeben
    const hi = b0 > b1 ? 0 : 1;
    const diff = Math.abs(b0 - b1);
    hand.bets[hi] -= diff;
    hand.contributed[hi] -= diff;
    game.players[hi].stack += diff;
    if (diff > 0) hand.allIn[hi] = game.players[hi].stack === 0;
    hand.history.push({ street: hand.street, player: hi, type: 'return', add: -diff, to: hand.bets[hi] });
  }
  hand.pot += hand.bets[0] + hand.bets[1];
  hand.bets = [0, 0];
}

function dealNext(game) {
  const hand = game.hand;
  const next = STREETS[STREETS.indexOf(hand.street) + 1];
  hand.deck.pop(); // Burn-Karte
  const n = next === 'flop' ? 3 : 1;
  for (let k = 0; k < n; k++) hand.board.push(hand.deck.pop());
  hand.street = next;
  hand.currentBet = 0;
  hand.minRaise = BIG_BLIND;
  hand.acted = [false, false];
}

function finishFold(game) {
  const hand = game.hand;
  closeStreet(game);
  const winner = hand.folded[0] ? 1 : 0;
  game.players[winner].stack += hand.pot;
  hand.result = { type: 'fold', winners: [winner], pot: hand.pot, won: [winner === 0 ? hand.pot : 0, winner === 1 ? hand.pot : 0] };
  endHand(game);
}

function showdown(game) {
  const hand = game.hand;
  hand.street = 'showdown';
  const scores = [0, 1].map((i) => evaluate([...hand.hole[i], ...hand.board]));
  const won = [0, 0];
  let winners;
  if (scores[0] === scores[1]) {
    winners = [0, 1];
    const half = Math.floor(hand.pot / 2);
    won[0] = won[1] = half;
    won[1 - hand.button] += hand.pot - 2 * half; // ungerader Chip an den Big Blind
  } else {
    const w = scores[0] > scores[1] ? 0 : 1;
    winners = [w];
    won[w] = hand.pot;
  }
  won.forEach((v, i) => { game.players[i].stack += v; });
  hand.result = {
    type: 'showdown',
    winners,
    pot: hand.pot,
    won,
    scores,
    names: scores.map(handName),
    best: [0, 1].map((i) => bestFive([...hand.hole[i], ...hand.board])),
  };
  endHand(game);
}

function endHand(game) {
  const hand = game.hand;
  hand.over = true;
  hand.toAct = -1;
  hand.net = game.players.map((p, i) => p.stack - hand.startStacks[i]);
}
