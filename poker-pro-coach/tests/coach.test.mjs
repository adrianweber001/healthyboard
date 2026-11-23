// Tests für die Poker-Pro-Coach-Module (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startHand, act, START_STACK } from '../coach/js/game.js';
import { botDecide } from '../coach/js/bot.js';
import { buildContext, recommend, judge } from '../coach/js/coach.js';
import { setLang, t, handNameT, LANGS } from '../coach/js/i18n.js';
import { evaluate } from '../coach/js/evaluator.js';
import { parseCards } from '../coach/js/cards.js';

globalThis.document = { documentElement: {} }; // setLang setzt documentElement.lang

const leak = (s) => /\{\w+\}|(^|\s)(r|m|q|s|act|judge|mistake|tip|draw)\.[a-z]/.test(s);

for (const lang of LANGS) {
  test(`Coach-Texte vollständig übersetzt (${lang})`, () => {
    setLang(lang);
    const game = createGame(['A', 'B']);
    let hands = 0;
    while (hands < 300) {
      if (game.players.some((p) => p.stack <= 0)) game.players.forEach((p) => { p.stack = START_STACK; });
      const hand = startHand(game);
      while (!hand.over) {
        const total = game.players[0].stack + game.players[1].stack + hand.pot + hand.bets[0] + hand.bets[1];
        assert.equal(total, 2 * START_STACK);
        if (hand.toAct === 0 && hands % 3 === 0) {
          const ctx = buildContext(game, 0);
          const rec = recommend(ctx, { iters: 200 });
          for (const r of rec.reasons) assert.ok(!leak(r), `Unübersetzt: ${r}`);
          assert.ok(!leak(rec.label), rec.label);
          for (const a of [{ type: 'fold' }, { type: 'call' }, { type: 'check' }, { type: rec.action, amount: rec.to }]) {
            const j = judge(rec, a, ctx);
            assert.ok(!leak(j.summary) && !leak(j.label), j.summary);
            j.notes.forEach((n) => assert.ok(!leak(n), n));
            if (j.mistake) assert.ok(!leak(t('mistake.' + j.mistake)) && !t('mistake.' + j.mistake).startsWith('mistake.'));
          }
        }
        act(game, botDecide(game, ['easy', 'normal', 'hard'][hands % 3]));
      }
      assert.equal(game.players[0].stack + game.players[1].stack, 2 * START_STACK);
      hands++;
    }
  });
}

test('Handnamen in allen Sprachen', () => {
  const samples = ['As Ks Qs Js Ts 2d 3c', '9h 8h 7h 6h 5h Ad Ac', '9h 9d 9s 9c 5h Ad Ac', '9h 9d 9s Ac 5h Ad 2c', '2h 7h 9h Jh Qh Ad Ac',
    'Ah 2d 3s 4c 5h Kd Kc', 'Ah Ad As 4c 5h Kd 9c', 'Ah Ad 4s 4c 5h Kd 9c', 'Ah Ad 3s 4c 8h Kd 9c', 'Ah Jd 3s 4c 8h Kd 9c'];
  for (const lang of LANGS) {
    setLang(lang);
    const names = samples.map((s) => handNameT(evaluate(parseCards(s))));
    assert.equal(new Set(names).size, 10, `${lang}: ${names.join(' | ')}`);
    names.forEach((n) => assert.ok(!n.includes('undefined'), n));
  }
  setLang('en');
  assert.equal(handNameT(evaluate(parseCards('Ah Ad 4s 4c 5h Kd 9c'))), 'Two Pair, Aces and Fours');
  setLang('de');
  assert.equal(handNameT(evaluate(parseCards('Ah Ad 4s 4c 5h Kd 9c'))), 'Zwei Paare, Asse und Vieren');
});
