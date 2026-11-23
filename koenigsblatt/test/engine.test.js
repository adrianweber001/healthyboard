'use strict';
const test = require('node:test');
const assert = require('node:assert');
const K = require('../engine.js');

// Kurzschreibweise: 'A♠ K♥' -> Kartenzahlen
function k(text) {
    return text.split(' ').map(function (t) {
        const farbe = K.FARBEN.indexOf(t.slice(-1));
        const w = t.slice(0, -1);
        const wert = { B: 11, D: 12, K: 13, A: 14 }[w] || Number(w);
        return K.karte(wert, farbe);
    });
}
function art(text) { return K.blattName(K.bewerte(k(text))); }

// Spielt eine Runde bis zur ersten Wettrunde mit festen Karten.
function bisWettrunde(z, verdeckt0, verdeckt1, tisch) {
    K.verdecktWaehlen(z, 0, k(verdeckt0));
    K.verdecktWaehlen(z, 1, k(verdeckt1));
    k(tisch).forEach(function (karte) { K.anwenden(z, { art: 'legen', karte: karte }); });
}

test('Jeder Spieler hat 26 Karten, jeden Wert zweimal', function () {
    const z = K.neuesSpiel();
    assert.strictEqual(z.hand[0].length, 26);
    assert.strictEqual(z.hand[1].length, 26);
    assert.ok(z.hand[0].every(function (c) { return K.besitzer(c) === 0; }));
    assert.ok(z.hand[1].every(function (c) { return K.besitzer(c) === 1; }));
    assert.strictEqual(z.hand[0].filter(function (c) { return K.wertVon(c) === 14; }).length, 2);
});

test('Blattarten werden erkannt', function () {
    assert.strictEqual(art('A♠ K♥ 9♣ 7♦ 4♠ 2♥'), 'Höchste Karte');
    assert.strictEqual(art('A♠ A♥ 9♣ 7♦ 4♠ 2♥'), 'Paar');
    assert.strictEqual(art('A♠ A♥ 9♣ 9♦ 4♠ 2♥'), 'Zwei Paare');
    assert.strictEqual(art('A♠ A♥ A♣ 9♦ 4♠ 2♥'), 'Drilling');
    assert.strictEqual(art('5♠ 6♥ 7♣ 8♦ 9♠ 2♥'), 'Straße');
    assert.strictEqual(art('A♠ A♥ A♣ 9♦ 9♠ 2♥'), 'Full House');
    assert.strictEqual(art('A♠ A♥ A♣ A♦ 9♠ 2♥'), 'Vierling');
});

test('Rangfolge der Blattarten', function () {
    const reihe = ['A♠ K♥ 9♣ 7♦ 4♠ 2♥', '2♠ 2♥ 9♣ 7♦ 4♠ 3♥', '2♠ 2♥ 3♣ 3♦ 4♠ 5♥', '2♠ 2♥ 2♣ 7♦ 4♠ 9♥',
        'A♠ 2♥ 3♣ 4♦ 5♠ 9♥', '2♠ 2♥ 2♣ 3♦ 3♠ 9♥', '2♠ 2♥ 2♣ 2♦ 3♠ 9♥'].map(function (t) { return K.bewerte(k(t)); });
    for (let i = 1; i < reihe.length; i++) assert.ok(reihe[i] > reihe[i - 1], 'Stufe ' + i);
});

test('Farben zählen nicht: fünf gleiche Farben sind kein Blatt', function () {
    assert.strictEqual(art('A♠ J♠ 9♠ 7♠ 4♠ 2♠'.replace('J', 'B')), 'Höchste Karte');
});

test('Straßen: Ass hoch und Ass niedrig, kein Umlauf', function () {
    assert.strictEqual(art('10♠ B♥ D♣ K♦ A♠ 2♥'), 'Straße');
    assert.strictEqual(art('A♠ 2♥ 3♣ 4♦ 5♠ 9♥'), 'Straße');
    assert.strictEqual(art('D♠ K♥ A♣ 2♦ 3♠ 7♥'), 'Höchste Karte');
    assert.ok(K.bewerte(k('2♥ 3♣ 4♦ 5♠ 6♥')) > K.bewerte(k('A♠ 2♥ 3♣ 4♦ 5♠')), 'Sechs-hoch schlägt Fünf-hoch');
    assert.ok(K.bewerte(k('2♥ 3♣ 4♦ 5♠ 6♥ 7♠')) > K.bewerte(k('2♥ 3♣ 4♦ 5♠ 6♥ 9♠')), 'beste Straße aus sechs Karten');
});

test('Beikarten entscheiden, gleiche Blätter sind exakt gleich', function () {
    assert.ok(K.bewerte(k('A♠ A♥ K♣ 7♦ 4♠ 2♥')) > K.bewerte(k('A♣ A♦ D♣ 7♦ 4♠ 2♥')));
    assert.ok(K.bewerte(k('K♠ K♥ 5♣ 5♦ A♠ 2♥')) > K.bewerte(k('K♣ K♦ 5♠ 5♥ D♠ 2♥')));
    assert.strictEqual(K.bewerte(k('A♠ K♠ 9♣ 7♦ 4♠ 2♥')), K.bewerte(k('A♥ K♥ 9♣ 7♦ 4♠ 3♥')), 'sechste Karte zählt nicht');
    assert.strictEqual(K.bewerte(k('A♠ A♣ 9♣ 9♦ 4♠ 4♥')), K.bewerte(k('A♥ A♦ 9♠ 9♥ 4♣ 3♥')), 'drittes Paar zählt nur als Beikarte');
    assert.ok(K.bewerte(k('9♠ 9♣ 9♥ 5♦ 5♠ 5♥')) > K.bewerte(k('9♠ 9♣ 9♥ 4♦ 4♠ A♥')), 'zwei Drillinge ergeben ein Full House');
});

test('Rundenablauf: Grundeinsatz, verdeckte Karten, Legen, Wetten, Showdown', function () {
    const z = K.neuesSpiel();
    assert.deepStrictEqual(z.chips, [29, 29]);
    assert.strictEqual(z.pot, 2);
    assert.strictEqual(z.phase, 'verdeckt');
    K.verdecktWaehlen(z, 0, k('A♠ A♣'));
    assert.strictEqual(z.phase, 'verdeckt');
    K.verdecktWaehlen(z, 1, k('K♥ K♦'));
    assert.strictEqual(z.phase, 'legen');
    assert.strictEqual(z.amZug, 0);
    K.anwenden(z, { art: 'legen', karte: k('2♠')[0] });
    assert.strictEqual(z.amZug, 1);
    K.anwenden(z, { art: 'legen', karte: k('3♥')[0] });
    assert.strictEqual(z.phase, 'wetten');
    K.anwenden(z, { art: 'schieben' });
    K.anwenden(z, { art: 'schieben' });
    assert.strictEqual(z.phase, 'legen');
    assert.strictEqual(z.durchgang, 2);
    K.anwenden(z, { art: 'legen', karte: k('7♠')[0] });
    K.anwenden(z, { art: 'legen', karte: k('9♥')[0] });
    K.anwenden(z, { art: 'setzen', betrag: 2 });
    K.anwenden(z, { art: 'mitgehen' });
    assert.strictEqual(z.phase, 'rundenende');
    assert.strictEqual(z.letzteRunde.art, 'showdown');
    assert.strictEqual(z.letzteRunde.sieger, 0);
    assert.deepStrictEqual(z.chips, [33, 27]);
    assert.strictEqual(z.hand[0].length, 22);
    assert.strictEqual(z.offen[1].length, 4, 'Tischkarten und gezeigte verdeckte Karten sind bekannt');
    K.naechsteRunde(z);
    assert.strictEqual(z.runde, 2);
    assert.strictEqual(z.vorhand, 1, 'Vorhand wechselt');
});

test('Drilling entsteht nur mit Karten des Gegners auf dem Tisch', function () {
    const z = K.neuesSpiel();
    bisWettrunde(z, 'A♠ A♣', 'A♥ 5♥', '2♠ A♦');
    K.anwenden(z, { art: 'schieben' }); K.anwenden(z, { art: 'schieben' });
    K.anwenden(z, { art: 'legen', karte: k('7♠')[0] });
    K.anwenden(z, { art: 'legen', karte: k('9♥')[0] });
    K.anwenden(z, { art: 'schieben' }); K.anwenden(z, { art: 'schieben' });
    assert.strictEqual(K.blattName(z.letzteRunde.punkte[0]), 'Drilling');
    assert.strictEqual(K.blattName(z.letzteRunde.punkte[1]), 'Paar');
    assert.strictEqual(z.letzteRunde.sieger, 0);
});

test('Pot-Limit und Erhöhungsgrenze', function () {
    const z = K.neuesSpiel({ rundenLimit: 0 });
    bisWettrunde(z, 'A♠ A♣', 'K♥ K♦', '2♠ 3♥');
    let a = K.erlaubteAktionen(z);
    assert.deepStrictEqual(a.setzen, { min: 1, max: 2 }, 'höchstens der Pot');
    assert.strictEqual(a.aussteigen, false, 'ohne Einsatz kein Aussteigen');
    assert.throws(function () { K.anwenden(z, { art: 'setzen', betrag: 3 }); });
    K.anwenden(z, { art: 'setzen', betrag: 2 });
    a = K.erlaubteAktionen(z);
    assert.strictEqual(a.mitgehen, 2);
    assert.deepStrictEqual(a.erhoehen, { min: 1, max: 6 }, 'Pot nach dem Mitgehen');
    K.anwenden(z, { art: 'erhoehen', betrag: 6 });
    K.anwenden(z, { art: 'erhoehen', betrag: 1 });
    K.anwenden(z, { art: 'erhoehen', betrag: 1 });
    a = K.erlaubteAktionen(z);
    assert.strictEqual(a.erhoehen, null, 'nach drei Erhöhungen ist Schluss');
    assert.strictEqual(a.mitgehen, 1);
});

test('Einsätze sind durch den kleineren Stapel begrenzt (All-in)', function () {
    const z = K.neuesSpiel({ startChips: 4, grundeinsatz: [1, 1], rundenLimit: 0 });
    bisWettrunde(z, 'A♠ A♣', 'K♥ K♦', '2♠ 3♥');
    K.anwenden(z, { art: 'setzen', betrag: 2 });
    K.anwenden(z, { art: 'erhoehen', betrag: 1 });
    assert.deepStrictEqual(z.chips, [1, 0]);
    assert.strictEqual(K.erlaubteAktionen(z).erhoehen, null, 'gegen einen leeren Stapel gibt es nichts zu erhöhen');
    K.anwenden(z, { art: 'mitgehen' });
    // Zweiter Durchgang: Wettrunde entfällt, weil Rot all-in ist.
    K.anwenden(z, { art: 'legen', karte: k('7♠')[0] });
    K.anwenden(z, { art: 'legen', karte: k('9♥')[0] });
    assert.strictEqual(z.phase, 'ende');
    assert.deepStrictEqual(z.ergebnis, { sieger: 0, grund: 'pleite' });
    assert.deepStrictEqual(z.chips, [8, 0]);
});

test('Rundenlimit: höchstens das Fünffache des Grundeinsatzes pro Runde', function () {
    const z = K.neuesSpiel();
    bisWettrunde(z, 'A♠ A♣', 'K♥ K♦', '2♠ 3♥');
    K.anwenden(z, { art: 'setzen', betrag: 2 });
    assert.deepStrictEqual(K.erlaubteAktionen(z).erhoehen, { min: 1, max: 2 }, 'nur noch 2 bis zum Limit von 5');
    K.anwenden(z, { art: 'erhoehen', betrag: 2 });
    assert.strictEqual(K.erlaubteAktionen(z).erhoehen, null);
    K.anwenden(z, { art: 'mitgehen' });
    assert.deepStrictEqual(z.eingezahlt, [5, 5]);
    // Zweiter Durchgang: keine Wettrunde mehr, beide sind am Limit.
    K.anwenden(z, { art: 'legen', karte: k('7♠')[0] });
    K.anwenden(z, { art: 'legen', karte: k('9♥')[0] });
    assert.strictEqual(z.phase, 'rundenende');
    assert.deepStrictEqual(z.chips, [35, 25]);
    K.naechsteRunde(z);
    assert.deepStrictEqual(z.eingezahlt, [1, 1]);
});

test('Aussteigen: Pot weg, Karten ungesehen, Tischkarte gespart', function () {
    const z = K.neuesSpiel();
    bisWettrunde(z, '2♠ 3♣', 'K♥ K♦', '4♠ 5♥');
    K.anwenden(z, { art: 'schieben' });
    K.anwenden(z, { art: 'setzen', betrag: 2 });
    K.anwenden(z, { art: 'aussteigen' });
    assert.strictEqual(z.letzteRunde.art, 'aufgabe');
    assert.strictEqual(z.letzteRunde.sieger, 1);
    assert.deepStrictEqual(z.chips, [29, 31]);
    assert.strictEqual(z.hand[0].length, 23, 'nur drei Karten verbraucht');
    assert.deepStrictEqual(z.ungesehen, [2, 2]);
    assert.strictEqual(z.offen[0].length, 1, 'verdeckte Karten bleiben geheim');
    const s = K.sicht(z, 1);
    assert.strictEqual(s.gegnerKandidaten.length, 25);
    assert.strictEqual(s.gegnerHandgroesse, 23);
});

test('Sicht verrät keine geheimen Karten des Gegners', function () {
    const z = K.neuesSpiel();
    K.verdecktWaehlen(z, 0, k('A♠ A♣'));
    const s = K.sicht(z, 1);
    assert.strictEqual(s.gegnerHatGelegt, true);
    assert.strictEqual(s.verdeckt, null);
    assert.strictEqual(JSON.stringify(s).indexOf('"hand":[' + z.hand[0].join(',')), -1);
    assert.strictEqual(s.gegnerKandidaten.length, 26);
});

test('Partie endet nach sechs Runden, Gleichstand ist Remis', function () {
    const z = K.neuesSpiel();
    for (let r = 1; r <= 6; r++) {
        if (r > 1) K.naechsteRunde(z);
        // Beide spielen spiegelgleich: gleiche Werte, also immer geteilt.
        K.verdecktWaehlen(z, 0, [K.karte(r + 1, 0), K.karte(r + 1, 1)]);
        K.verdecktWaehlen(z, 1, [K.karte(r + 1, 2), K.karte(r + 1, 3)]);
        for (let d = 0; d < 2; d++) {
            K.anwenden(z, { art: 'legen', karte: K.karte(7 + r, z.amZug * 2 + d) });
            K.anwenden(z, { art: 'legen', karte: K.karte(7 + r, z.amZug * 2 + d) });
            K.anwenden(z, { art: 'schieben' }); K.anwenden(z, { art: 'schieben' });
        }
        assert.strictEqual(z.letzteRunde.sieger, -1, 'Runde ' + r);
    }
    assert.strictEqual(z.phase, 'ende');
    assert.deepStrictEqual(z.ergebnis, { sieger: -1, grund: 'chips' });
    assert.deepStrictEqual(z.chips, [30, 30]);
    assert.throws(function () { K.naechsteRunde(z); });
});

test('Unerlaubte Züge werden abgewiesen', function () {
    const z = K.neuesSpiel();
    assert.throws(function () { K.verdecktWaehlen(z, 0, k('A♥ K♥')); }, 'fremde Karten');
    assert.throws(function () { K.verdecktWaehlen(z, 0, k('A♠ A♠')); }, 'doppelte Karte');
    K.verdecktWaehlen(z, 0, k('A♠ A♣'));
    assert.throws(function () { K.verdecktWaehlen(z, 0, k('K♠ K♣')); }, 'zweimal legen');
    K.verdecktWaehlen(z, 1, k('K♥ K♦'));
    assert.throws(function () { K.anwenden(z, { art: 'legen', karte: k('A♠')[0] }); }, 'Karte liegt schon verdeckt');
    assert.throws(function () { K.anwenden(z, { art: 'schieben' }); }, 'erst legen');
});
