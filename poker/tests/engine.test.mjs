import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, handName, categoryName, bestFive } from '../js/evaluator.js';
import { parseCards } from '../js/cards.js';
import { equityVsRange } from '../js/equity.js';
import { combosOf, RANKED, topRange, handPercentile } from '../js/ranges.js';
import { createGame, startHand, act, legalActions, START_STACK } from '../js/game.js';
import { botDecide } from '../js/bot.js';
import { buildContext, recommend, judge } from '../js/coach.js';

const ev = (s) => evaluate(parseCards(s));

test('Handkategorien', () => {
  assert.equal(categoryName(ev('As Ks Qs Js Ts 2d 3c')), 'Royal Flush');
  assert.equal(categoryName(ev('9h 8h 7h 6h 5h Ad Ac')), 'Straight Flush');
  assert.equal(categoryName(ev('9h 9d 9s 9c 5h Ad Ac')), 'Vierling');
  assert.equal(categoryName(ev('9h 9d 9s Ac 5h Ad 2c')), 'Full House');
  assert.equal(categoryName(ev('2h 7h 9h Jh Qh Ad Ac')), 'Flush');
  assert.equal(categoryName(ev('Ah 2d 3s 4c 5h Kd Kc')), 'Straße');
  assert.equal(categoryName(ev('Ah Ad As 4c 5h Kd 9c')), 'Drilling');
  assert.equal(categoryName(ev('Ah Ad 4s 4c 5h Kd 9c')), 'Zwei Paare');
  assert.equal(categoryName(ev('Ah Ad 3s 4c 8h Kd 9c')), 'Ein Paar');
  assert.equal(categoryName(ev('Ah Jd 3s 4c 8h Kd 9c')), 'Höchste Karte');
});

test('Vergleiche und Kicker', () => {
  assert.ok(ev('Ah 2d 3s 4c 5h') < ev('2h 3d 4s 5c 6h'), 'Wheel ist die kleinste Straße');
  assert.ok(ev('As Ad Kc 7h 2s') > ev('As Ad Qc Jh Ts'), 'Kicker K schlägt Q');
  assert.equal(ev('As Ad Kc Qh Js 2c 3d'), ev('Ac Ah Kd Qs Jh 4c 5s') - 0 + 0, 'gleiche beste 5 → Split');
  assert.ok(ev('Ks Kd Kc 2h 2s') > ev('Qs Qd Qc Ah As'));
  assert.ok(ev('9h 9d 9s 5c 5h 5d Ac') === ev('9h 9d 9s 5c 5h 2d 3c'), 'Zwei Drillinge: Full House 9 über 5');
  assert.equal(handName(ev('Ah Ad 4s 4c 5h Kd 9c')), 'Zwei Paare, Asse und Vieren');
  assert.equal(bestFive(parseCards('Ah Ad 4s 4c 5h Kd 9c')).length, 5);
});

test('Equity-Plausibilität', () => {
  const aa = parseCards('As Ah');
  const kk = combosOf('KK').filter(([a, b]) => true);
  const e = equityVsRange(aa, [], kk, 20000);
  assert.ok(e > 0.79 && e < 0.85, `AA vs KK ≈ 82 %, war ${e}`);
  const e2 = equityVsRange(parseCards('As Ks'), [], combosOf('22'), 20000);
  assert.ok(e2 > 0.46 && e2 < 0.54, `AKs vs 22 ≈ 50 %, war ${e2}`);
});

test('Ranges', () => {
  assert.equal(RANKED.length, 169);
  assert.equal(RANKED[0], 'AA');
  assert.equal(topRange(1.01).length, 1326);
  assert.ok(handPercentile('AA') < 0.01);
  assert.ok(handPercentile('72o') > 0.95);
});

test('Engine: 1500 Bot-gegen-Bot-Hände, Chips bleiben erhalten', () => {
  const levels = ['easy', 'normal', 'hard'];
  const game = createGame(['A', 'B']);
  let hands = 0;
  let showdowns = 0;
  while (hands < 1500) {
    if (game.players.some((p) => p.stack <= 0)) {
      game.players.forEach((p) => { p.stack = START_STACK; });
    }
    const hand = startHand(game);
    let guard = 0;
    while (!hand.over) {
      const total = game.players[0].stack + game.players[1].stack + hand.pot + hand.bets[0] + hand.bets[1];
      assert.equal(total, 2 * START_STACK, 'Chips während der Hand');
      const lvl = levels[(hands + hand.toAct) % 3];
      const legal = legalActions(game);
      if (hands % 7 === 0 && hand.toAct === 0) {
        const ctx = buildContext(game, 0);
        const rec = recommend(ctx, { iters: 300 });
        const j = judge(rec, { type: rec.action, amount: rec.to }, ctx);
        assert.equal(j.verdict, 'good');
      }
      const a = botDecide(game, lvl);
      if (a.type === 'raise') assert.ok(legal.canRaise);
      act(game, a);
      assert.ok(++guard < 100, 'Endlosschleife');
    }
    if (hand.result.type === 'showdown') {
      showdowns++;
      assert.equal(hand.board.length, 5);
    }
    assert.equal(game.players[0].stack + game.players[1].stack, 2 * START_STACK, 'Chips nach der Hand');
    assert.ok(game.players.every((p) => p.stack >= 0));
    hands++;
  }
  assert.ok(showdowns > 50, `Showdowns: ${showdowns}`);
});

test('Engine: Min-Raise, All-in und Rückgabe', () => {
  const game = createGame(['A', 'B']);
  game.button = 1; // nach startHand wechselt nichts beim ersten Mal
  game.players[0].stack = 50;
  game.players[1].stack = 350;
  const hand = startHand(game);
  const b = hand.button;
  assert.equal(hand.toAct, b);
  const legal = legalActions(game);
  assert.equal(legal.minRaiseTo, 4);
  // Button geht all-in: Maximal so viel, wie der Gegner decken kann
  act(game, { type: 'raise', amount: 9999 });
  const last = hand.history.at(-1);
  const shortStack = Math.min(...hand.startStacks);
  assert.equal(last.to, shortStack);
  act(game, { type: 'call' });
  assert.ok(hand.over);
  assert.equal(hand.board.length, 5);
  assert.equal(game.players[0].stack + game.players[1].stack, 400);
});
