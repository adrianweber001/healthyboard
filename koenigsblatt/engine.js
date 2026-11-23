'use strict';
// Königsblatt – reine Spiellogik ohne DOM. Läuft im Browser und in Node.
(function (wurzel, fabrik) {
    if (typeof module === 'object' && module.exports) module.exports = fabrik();
    else wurzel.Koenigsblatt = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
    var FARBEN = ['♠', '♣', '♥', '♦'];
    var WERTNAMEN = { 11: 'B', 12: 'D', 13: 'K', 14: 'A' };
    var BLATTNAMEN = ['', 'Höchste Karte', 'Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Full House', 'Vierling'];
    var BASIS = 15, STUFE = BASIS * BASIS * BASIS * BASIS * BASIS;
    var STANDARD = {
        startChips: 30,
        grundeinsatz: [1, 1, 2, 2, 3, 3], // ein Eintrag pro Runde
        maxErhoehungen: 3,
        rundenLimit: 5,                   // höchster Gesamteinsatz pro Runde als Vielfaches des Grundeinsatzes (0 = keine Grenze)
        ersteVorhand: 0
    };

    // Karte = Zahl 0..51. Farbe 0/1 gehört Schwarz (Spieler 0), 2/3 gehört Rot (Spieler 1).
    function karte(wert, farbe) { return (wert - 2) * 4 + farbe; }
    function wertVon(k) { return (k >> 2) + 2; }
    function farbeVon(k) { return k & 3; }
    function besitzer(k) { return (k & 3) < 2 ? 0 : 1; }
    function wertText(w) { return WERTNAMEN[w] || String(w); }
    function kartenText(k) { return wertText(wertVon(k)) + FARBEN[farbeVon(k)]; }
    function alleKarten(spieler) {
        var liste = [];
        for (var w = 2; w <= 14; w++) { liste.push(karte(w, spieler * 2)); liste.push(karte(w, spieler * 2 + 1)); }
        return liste;
    }

    // Bewertet 1 bis 7 Karten als bestes Fünfer-Blatt. Farben zählen nicht.
    var zaehler = new Int8Array(15);
    function bewerte(karten) {
        var n = karten.length, i, w, z;
        for (i = 0; i < n; i++) zaehler[(karten[i] >> 2) + 2]++;
        var vier = 0, drei = 0, dreiB = 0, paar = 0, paarB = 0, strasse = 0, folge = 0;
        for (w = 14; w >= 2; w--) {
            z = zaehler[w];
            if (z) { folge++; if (folge >= 5 && !strasse) strasse = w + 4; } else folge = 0;
            if (z === 4) { if (!vier) vier = w; }
            else if (z === 3) { if (!drei) drei = w; else if (!dreiB) dreiB = w; }
            else if (z === 2) { if (!paar) paar = w; else if (!paarB) paarB = w; }
        }
        // Ass zählt in der Straße A-2-3-4-5 als Eins.
        if (!strasse && folge >= 4 && zaehler[14]) strasse = 5;
        var punkte;
        if (vier) punkte = 7 * STUFE + vier * 50625 + beikarten(1, vier, 0, 3375);
        else if (drei && (dreiB || paar)) punkte = 6 * STUFE + drei * 50625 + Math.max(dreiB, paar) * 3375;
        else if (strasse) punkte = 5 * STUFE + strasse * 50625;
        else if (drei) punkte = 4 * STUFE + drei * 50625 + beikarten(2, drei, 0, 3375);
        else if (paarB) punkte = 3 * STUFE + paar * 50625 + paarB * 3375 + beikarten(1, paar, paarB, 225);
        else if (paar) punkte = 2 * STUFE + paar * 50625 + beikarten(3, paar, 0, 3375);
        else punkte = STUFE + beikarten(5, 0, 0, 50625);
        for (i = 0; i < n; i++) zaehler[(karten[i] >> 2) + 2] = 0;
        return punkte;
    }
    // Die höchsten übrigen Werte als Stellen zur Basis 15, beginnend bei `stelle`.
    function beikarten(anzahl, ohneA, ohneB, stelle) {
        var summe = 0;
        for (var w = 14; w >= 2 && anzahl > 0; w--) {
            if (!zaehler[w] || w === ohneA || w === ohneB) continue;
            summe += w * stelle; stelle /= 15; anzahl--;
        }
        return summe;
    }
    function blattArt(punkte) { return Math.floor(punkte / STUFE); }
    function blattName(punkte) { return BLATTNAMEN[blattArt(punkte)]; }

    function neuesSpiel(konfig) {
        var k = {};
        for (var s in STANDARD) k[s] = STANDARD[s];
        for (s in (konfig || {})) k[s] = konfig[s];
        var z = {
            konfig: k,
            runde: 0,
            vorhand: k.ersteVorhand,
            chips: [k.startChips, k.startChips],
            hand: [alleKarten(0), alleKarten(1)],
            offen: [[], []],       // alles, was vom Spieler je offen zu sehen war
            ungesehen: [0, 0],     // verdeckt abgelegte Karten
            verdeckt: [null, null],
            tisch: [],
            pot: 0,
            eingezahlt: [0, 0],    // Grundeinsatz und Einsätze der laufenden Runde
            phase: 'rundenende',
            amZug: -1,
            durchgang: 0,
            wette: null,
            rundenlog: [],
            verlauf: [],           // öffentliche Zusammenfassung jeder beendeten Runde
            letzteRunde: null,
            ergebnis: null
        };
        naechsteRunde(z);
        return z;
    }

    function naechsteRunde(z) {
        if (z.phase !== 'rundenende') throw new Error('Die Runde läuft noch.');
        var k = z.konfig;
        z.runde++;
        z.vorhand = (k.ersteVorhand + z.runde - 1) % 2;
        var einsatz = Math.min(k.grundeinsatz[z.runde - 1], z.chips[0], z.chips[1]);
        z.chips[0] -= einsatz; z.chips[1] -= einsatz;
        z.pot = 2 * einsatz;
        z.eingezahlt = [einsatz, einsatz];
        z.verdeckt = [null, null];
        z.tisch = [];
        z.durchgang = 0;
        z.wette = null;
        z.rundenlog = [];
        z.letzteRunde = null;
        z.phase = 'verdeckt';
        z.amZug = -1;
    }

    function entferne(hand, k) {
        var i = hand.indexOf(k);
        if (i < 0) throw new Error('Karte ' + kartenText(k) + ' ist nicht auf der Hand.');
        hand.splice(i, 1);
    }

    function verdecktWaehlen(z, spieler, karten) {
        if (z.phase !== 'verdeckt') throw new Error('Jetzt werden keine verdeckten Karten gelegt.');
        if (z.verdeckt[spieler]) throw new Error('Die verdeckten Karten liegen schon.');
        if (!karten || karten.length !== 2 || karten[0] === karten[1]) throw new Error('Genau zwei verschiedene Karten wählen.');
        if (z.hand[spieler].indexOf(karten[0]) < 0 || z.hand[spieler].indexOf(karten[1]) < 0) throw new Error('Karte ist nicht auf der Hand.');
        entferne(z.hand[spieler], karten[0]); entferne(z.hand[spieler], karten[1]);
        z.verdeckt[spieler] = [karten[0], karten[1]];
        if (z.verdeckt[0] && z.verdeckt[1]) { z.phase = 'legen'; z.durchgang = 1; z.amZug = z.vorhand; }
    }

    function beginneWettrunde(z) {
        z.wette = { beitrag: [0, 0], erhoehungen: 0, agiert: [false, false] };
        z.phase = 'wetten';
        z.amZug = z.vorhand;
        // Ist jemand all-in oder am Rundenlimit, gibt es nichts mehr zu setzen.
        if (spielraum(z, 0) === 0 || spielraum(z, 1) === 0) beendeWettrunde(z);
    }

    // Wie viele Chips ein Spieler in dieser Runde noch einsetzen darf und kann.
    function spielraum(z, spieler) {
        var k = z.konfig, frei = z.chips[spieler];
        if (k.rundenLimit) frei = Math.min(frei, Math.max(0, k.rundenLimit * k.grundeinsatz[z.runde - 1] - z.eingezahlt[spieler]));
        return frei;
    }

    function beendeWettrunde(z) {
        z.wette = null;
        if (z.durchgang === 1) { z.durchgang = 2; z.phase = 'legen'; z.amZug = z.vorhand; }
        else showdown(z);
    }

    // Was der Spieler am Zug gerade tun darf.
    function erlaubteAktionen(z) {
        var a = { legen: false, schieben: false, setzen: null, mitgehen: 0, erhoehen: null, aussteigen: false };
        if (z.phase === 'legen') { a.legen = true; return a; }
        if (z.phase !== 'wetten') return a;
        var s = z.amZug, g = 1 - s, offen = z.wette.beitrag[g] - z.wette.beitrag[s], max;
        if (offen === 0) {
            a.schieben = true;
            max = Math.min(z.pot, spielraum(z, s), spielraum(z, g));
            if (max >= 1) a.setzen = { min: 1, max: max };
        } else {
            a.aussteigen = true;
            a.mitgehen = offen;
            max = Math.min(z.pot + offen, spielraum(z, s) - offen, spielraum(z, g));
            if (z.wette.erhoehungen < z.konfig.maxErhoehungen && max >= 1) a.erhoehen = { min: 1, max: max };
        }
        return a;
    }

    function zahle(z, spieler, betrag) {
        z.chips[spieler] -= betrag; z.pot += betrag; z.wette.beitrag[spieler] += betrag; z.eingezahlt[spieler] += betrag;
    }

    function anwenden(z, aktion) {
        var s = z.amZug, g = 1 - s, a = erlaubteAktionen(z), betrag;
        if (aktion.art === 'legen') {
            if (!a.legen) throw new Error('Jetzt wird keine Karte gelegt.');
            entferne(z.hand[s], aktion.karte);
            z.tisch.push({ karte: aktion.karte, spieler: s });
            z.offen[s].push(aktion.karte);
            z.rundenlog.push({ spieler: s, art: 'legen', karte: aktion.karte, durchgang: z.durchgang });
            if (s === z.vorhand) z.amZug = g; else beginneWettrunde(z);
            return;
        }
        if (z.phase !== 'wetten') throw new Error('Jetzt wird nicht gewettet.');
        var eintrag = { spieler: s, art: aktion.art, betrag: 0, potVorher: z.pot, durchgang: z.durchgang, tischAnzahl: z.tisch.length };
        if (aktion.art === 'schieben') {
            if (!a.schieben) throw new Error('Schieben ist nicht möglich.');
            z.rundenlog.push(eintrag);
            z.wette.agiert[s] = true;
            if (z.wette.agiert[g]) beendeWettrunde(z); else z.amZug = g;
        } else if (aktion.art === 'setzen') {
            betrag = aktion.betrag;
            if (!a.setzen || betrag !== Math.floor(betrag) || betrag < a.setzen.min || betrag > a.setzen.max) throw new Error('Ungültiger Einsatz.');
            eintrag.betrag = betrag; z.rundenlog.push(eintrag);
            zahle(z, s, betrag); z.wette.agiert[s] = true; z.amZug = g;
        } else if (aktion.art === 'mitgehen') {
            if (!a.mitgehen) throw new Error('Es gibt nichts mitzugehen.');
            eintrag.betrag = a.mitgehen; z.rundenlog.push(eintrag);
            zahle(z, s, a.mitgehen);
            beendeWettrunde(z);
        } else if (aktion.art === 'erhoehen') {
            betrag = aktion.betrag;
            if (!a.erhoehen || betrag !== Math.floor(betrag) || betrag < a.erhoehen.min || betrag > a.erhoehen.max) throw new Error('Ungültige Erhöhung.');
            eintrag.betrag = betrag; eintrag.mitgegangen = a.mitgehen; z.rundenlog.push(eintrag);
            zahle(z, s, a.mitgehen + betrag); z.wette.erhoehungen++; z.wette.agiert[s] = true; z.amZug = g;
        } else if (aktion.art === 'aussteigen') {
            if (!a.aussteigen) throw new Error('Aussteigen ist nur gegen einen Einsatz möglich.');
            z.rundenlog.push(eintrag);
            z.ungesehen[0] += 2; z.ungesehen[1] += 2;
            z.chips[g] += z.pot;
            beendeRunde(z, { art: 'aufgabe', sieger: g, ausgestiegen: s, pot: z.pot });
        } else throw new Error('Unbekannte Aktion.');
    }

    function showdown(z) {
        var tisch = z.tisch.map(function (t) { return t.karte; });
        var p0 = bewerte(z.verdeckt[0].concat(tisch)), p1 = bewerte(z.verdeckt[1].concat(tisch));
        z.offen[0].push(z.verdeckt[0][0], z.verdeckt[0][1]);
        z.offen[1].push(z.verdeckt[1][0], z.verdeckt[1][1]);
        var sieger = p0 > p1 ? 0 : p1 > p0 ? 1 : -1;
        if (sieger < 0) { z.chips[0] += z.pot / 2; z.chips[1] += z.pot / 2; }
        else z.chips[sieger] += z.pot;
        beendeRunde(z, { art: 'showdown', sieger: sieger, pot: z.pot, punkte: [p0, p1], verdeckt: [z.verdeckt[0].slice(), z.verdeckt[1].slice()] });
    }

    function beendeRunde(z, bericht) {
        z.letzteRunde = bericht;
        z.verlauf.push({
            runde: z.runde, art: bericht.art, sieger: bericht.sieger, pot: bericht.pot, vorhand: z.vorhand,
            tisch: z.tisch.map(function (t) { return { karte: t.karte, spieler: t.spieler }; }),
            verdeckt: bericht.verdeckt || null   // nur nach einem Showdown bekannt
        });
        z.pot = 0; z.wette = null; z.amZug = -1;
        z.phase = 'rundenende';
        if (z.chips[0] === 0 || z.chips[1] === 0) {
            z.phase = 'ende';
            z.ergebnis = { sieger: z.chips[0] === 0 ? 1 : 0, grund: 'pleite' };
        } else if (z.runde >= z.konfig.grundeinsatz.length) {
            z.phase = 'ende';
            z.ergebnis = { sieger: z.chips[0] > z.chips[1] ? 0 : z.chips[1] > z.chips[0] ? 1 : -1, grund: 'chips' };
        }
    }

    // Alles, was ein Spieler ehrlich wissen kann. Die KI bekommt nur das.
    function sicht(z, spieler) {
        var g = 1 - spieler, gesehen = z.offen[g];
        var kandidaten = alleKarten(g).filter(function (k) { return gesehen.indexOf(k) < 0; });
        return {
            spieler: spieler,
            konfig: z.konfig,
            runde: z.runde,
            runden: z.konfig.grundeinsatz.length,
            vorhand: z.vorhand,
            phase: z.phase,
            amZug: z.amZug,
            durchgang: z.durchgang,
            chips: z.chips.slice(),
            pot: z.pot,
            eingezahlt: z.eingezahlt.slice(),
            hand: z.hand[spieler].slice(),
            verdeckt: z.verdeckt[spieler] ? z.verdeckt[spieler].slice() : null,
            gegnerHatGelegt: !!z.verdeckt[g],
            tisch: z.tisch.map(function (t) { return { karte: t.karte, spieler: t.spieler }; }),
            rundenlog: z.rundenlog.slice(),
            verlauf: z.verlauf.slice(),
            gegnerKandidaten: kandidaten,   // Hand + aktuelle verdeckte + ungesehen abgelegte Karten des Gegners
            gegnerHandgroesse: z.hand[g].length,
            gegnerUngesehen: z.ungesehen[g],
            aktionen: z.amZug === spieler ? erlaubteAktionen(z) : null
        };
    }

    return {
        STANDARD: STANDARD, FARBEN: FARBEN,
        karte: karte, wertVon: wertVon, farbeVon: farbeVon, besitzer: besitzer,
        wertText: wertText, kartenText: kartenText, alleKarten: alleKarten,
        bewerte: bewerte, blattArt: blattArt, blattName: blattName,
        neuesSpiel: neuesSpiel, naechsteRunde: naechsteRunde, verdecktWaehlen: verdecktWaehlen,
        erlaubteAktionen: erlaubteAktionen, anwenden: anwenden, sicht: sicht
    };
});
