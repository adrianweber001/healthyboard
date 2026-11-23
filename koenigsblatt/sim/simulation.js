'use strict';
// Königsblatt – KI gegen KI. Aufruf: node koenigsblatt/sim/simulation.js [--spiele 400] [--saat 1]
const K = require('../engine.js');
const KI = require('../ki.js');

function argument(name, standard) {
    const i = process.argv.indexOf('--' + name);
    return i >= 0 ? Number(process.argv[i + 1]) : standard;
}

// Einfachrezepte: Wenn eines davon die Heuristik schlägt, ist das Spiel zu simpel.
function rezeptBot(name, zufall) {
    const basis = KI.erstelle(1, zufall);
    function hoechstesPaar(hand) {
        const sortiert = hand.slice().sort(function (a, b) { return b - a; });
        for (let i = 0; i + 1 < sortiert.length; i++) if (K.wertVon(sortiert[i]) === K.wertVon(sortiert[i + 1])) return [sortiert[i], sortiert[i + 1]];
        return [sortiert[0], sortiert[1]];
    }
    function niedrigste(hand, n) { return hand.slice().sort(function (a, b) { return a - b; }).slice(0, n); }
    function gross(bereich) { return bereich.max; }
    if (name === 'Immer Paar') return {
        name: name,
        verdeckt: function (s) { return hoechstesPaar(s.hand); },
        legen: function (s) { return niedrigste(s.hand, 1)[0]; },
        wetten: function (s) { const a = s.aktionen; return a.schieben ? (a.setzen ? { art: 'setzen', betrag: Math.max(1, Math.round(a.setzen.max / 2)) } : { art: 'schieben' }) : { art: 'mitgehen' }; }
    };
    if (name === 'Nur mit Ass') return {
        name: name,
        verdeckt: function (s) {
            const asse = s.hand.filter(function (k) { return K.wertVon(k) === 14; });
            if (asse.length) { const rest = s.hand.filter(function (k) { return K.wertVon(k) !== 14; }).sort(function (a, b) { return b - a; }); return [asse[0], rest[0]]; }
            return niedrigste(s.hand, 2);
        },
        legen: basis.legen,
        wetten: function (s) {
            const a = s.aktionen, ass = s.verdeckt.some(function (k) { return K.wertVon(k) === 14; });
            if (!ass) return a.schieben ? { art: 'schieben' } : { art: 'aussteigen' };
            if (a.schieben) return a.setzen ? { art: 'setzen', betrag: gross(a.setzen) } : { art: 'schieben' };
            return a.erhoehen ? { art: 'erhoehen', betrag: gross(a.erhoehen) } : { art: 'mitgehen' };
        }
    };
    if (name === 'Geht immer mit') return {
        name: name,
        verdeckt: basis.verdeckt, legen: basis.legen,
        wetten: function (s) { return s.aktionen.schieben ? { art: 'schieben' } : { art: 'mitgehen' }; }
    };
    if (name === 'Setzt immer voll') return {
        name: name,
        verdeckt: basis.verdeckt, legen: basis.legen,
        wetten: function (s) {
            const a = s.aktionen;
            if (a.schieben) return a.setzen ? { art: 'setzen', betrag: gross(a.setzen) } : { art: 'schieben' };
            return a.erhoehen ? { art: 'erhoehen', betrag: gross(a.erhoehen) } : { art: 'mitgehen' };
        }
    };
    if (name === 'Eine Stufe drüber') return {
        // Spielt nie die niedrigsten Werte, sondern immer die zwei direkt darüber.
        name: name,
        verdeckt: function (s) {
            const werte = [], erste = {};
            s.hand.slice().sort(function (x, y) { return x - y; }).forEach(function (k) { const w = K.wertVon(k); if (!(w in erste)) { erste[w] = k; werte.push(w); } });
            return werte.length >= 4 ? [erste[werte[2]], erste[werte[3]]] : [erste[werte[0]], erste[werte[1]] !== undefined ? erste[werte[1]] : s.hand.filter(function (k) { return k !== erste[werte[0]]; })[0]];
        },
        legen: function (s) {
            const zwilling = s.hand.filter(function (k) { return s.verdeckt.some(function (v) { return K.wertVon(v) === K.wertVon(k); }); });
            return zwilling.length ? zwilling[0] : basis.legen(s);
        },
        wetten: basis.wetten
    };
    throw new Error('Unbekanntes Rezept ' + name);
}

function partie(bots, konfig) {
    const z = K.neuesSpiel(konfig);
    const bericht = { showdowns: 0, aufgaben: 0, runden: 0 };
    while (z.phase !== 'ende') {
        if (z.phase === 'verdeckt') {
            const s0 = K.sicht(z, 0), s1 = K.sicht(z, 1);
            const v0 = bots[0].verdeckt(s0), v1 = bots[1].verdeckt(s1);
            K.verdecktWaehlen(z, 0, v0); K.verdecktWaehlen(z, 1, v1);
        } else if (z.phase === 'legen') {
            K.anwenden(z, { art: 'legen', karte: bots[z.amZug].legen(K.sicht(z, z.amZug)) });
        } else if (z.phase === 'wetten') {
            K.anwenden(z, bots[z.amZug].wetten(K.sicht(z, z.amZug)));
        }
        if (z.phase === 'rundenende' || z.phase === 'ende') {
            bericht.runden++;
            if (z.letzteRunde.art === 'showdown') bericht.showdowns++; else bericht.aufgaben++;
            if (z.phase === 'rundenende') K.naechsteRunde(z);
        }
    }
    bericht.sieger = z.ergebnis.sieger;
    bericht.grund = z.ergebnis.grund;
    bericht.chips = z.chips.slice();
    return bericht;
}

// Lässt A gegen B antreten; die Vorhand der ersten Runde wechselt von Partie zu Partie.
function duell(baueA, baueB, spiele, saat, konfig) {
    const zufall = KI.zufallsquelle(saat);
    const e = { a: 0, b: 0, remis: 0, pleite: 0, showdowns: 0, runden: 0, vorhandSiege: 0, entschieden: 0, chipsA: 0 };
    for (let i = 0; i < spiele; i++) {
        const aIstSchwarz = i % 2 === 0, ersteVorhand = (i >> 1) % 2;
        const a = baueA(zufall), b = baueB(zufall);
        const k = Object.assign({}, konfig || {}, { ersteVorhand: ersteVorhand });
        const r = partie(aIstSchwarz ? [a, b] : [b, a], k);
        const platzA = aIstSchwarz ? 0 : 1;
        if (r.sieger < 0) e.remis++;
        else {
            e.entschieden++;
            if (r.sieger === platzA) e.a++; else e.b++;
            if (r.sieger === ersteVorhand) e.vorhandSiege++;
        }
        if (r.grund === 'pleite') e.pleite++;
        e.showdowns += r.showdowns; e.runden += r.runden;
        e.chipsA += r.chips[platzA];
    }
    return e;
}

function prozent(x, von) { return von ? (100 * x / von).toFixed(1).replace('.', ',') + ' %' : '–'; }
function zeile(name, e, spiele) {
    console.log(name.padEnd(40) + ' Siege ' + prozent(e.a, e.entschieden).padStart(8) +
        ' | Remis ' + prozent(e.remis, spiele).padStart(7) +
        ' | Showdown ' + prozent(e.showdowns, e.runden).padStart(7) +
        ' | Pleite ' + prozent(e.pleite, spiele).padStart(7) +
        ' | erste Vorhand ' + prozent(e.vorhandSiege, e.entschieden).padStart(7) +
        ' | Ø Chips ' + (e.chipsA / spiele).toFixed(1).replace('.', ','));
}

function hauptlauf() {
    const spiele = argument('spiele', 400), saat = argument('saat', 1);
    const stufe = function (n, p) { return function (zufall) { return KI.erstelle(n, zufall, p); }; };
    const rezept = function (name) { return function (zufall) { return rezeptBot(name, zufall); }; };
    console.log('Königsblatt-Simulation: ' + spiele + ' Partien je Paarung, Saat ' + saat);
    console.log('Siege = Anteil der entschiedenen Partien für den zuerst Genannten.\n');
    const start = Date.now();
    zeile('Reichweite gegen Heuristik', duell(stufe(2), stufe(1), spiele, saat), spiele);
    zeile('Heuristik gegen Zufall', duell(stufe(1), stufe(0), spiele, saat + 1), spiele);
    zeile('Reichweite gegen Zufall', duell(stufe(2), stufe(0), spiele, saat + 2), spiele);
    zeile('Reichweite gegen Reichweite', duell(stufe(2), stufe(2), spiele, saat + 3), spiele);
    zeile('Heuristik gegen Heuristik', duell(stufe(1), stufe(1), spiele, saat + 4), spiele);
    console.log('\nEinfachrezepte (sollen verlieren, also unter 50 %):');
    ['Immer Paar', 'Nur mit Ass', 'Geht immer mit', 'Setzt immer voll', 'Eine Stufe drüber'].forEach(function (name, i) {
        zeile(name + ' gegen Heuristik', duell(rezept(name), stufe(1), spiele, saat + 10 + i), spiele);
        zeile(name + ' gegen Reichweite', duell(rezept(name), stufe(2), spiele, saat + 20 + i), spiele);
    });
    console.log('\nDauer: ' + ((Date.now() - start) / 1000).toFixed(1) + ' s');
}

if (require.main === module) hauptlauf();
module.exports = { partie: partie, duell: duell, rezeptBot: rezeptBot };
