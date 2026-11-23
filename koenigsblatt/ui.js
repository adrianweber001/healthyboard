'use strict';
// Königsblatt – Oberfläche: Mensch (Schwarz) gegen Computer (Rot).
(function () {
    var K = window.Koenigsblatt, KI = window.KoenigsblattKI;
    var ICH = 0, GEGNER = 1, WARTEZEIT = 700;
    var WERTWORT = { 11: 'Bube', 12: 'Dame', 13: 'König', 14: 'Ass' };
    var FARBWORT = ['Pik', 'Kreuz', 'Herz', 'Karo'];
    var z, bot, auswahl = [], betrag = 1, lauf = 0, partien = 0, wartet = false;

    function $(id) { return document.getElementById(id); }
    function element(tag, klasse, text, parent) {
        var e = document.createElement(tag);
        if (klasse) e.className = klasse;
        if (text !== undefined) e.textContent = text;
        if (parent) parent.appendChild(e);
        return e;
    }
    function leere(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
    function kartenName(k) { return (WERTWORT[K.wertVon(k)] || K.wertVon(k)) + ' ' + FARBWORT[K.farbeVon(k)]; }
    function wer(spieler) { return spieler === ICH ? 'Du' : 'Computer'; }

    function kartenElement(k, alsKnopf) {
        var e = element(alsKnopf ? 'button' : 'div', 'karte ' + (K.farbeVon(k) >= 2 ? 'rot' : 'schwarz'));
        if (alsKnopf) e.type = 'button';
        e.setAttribute('aria-label', kartenName(k));
        element('span', 'wert', K.wertText(K.wertVon(k)), e).setAttribute('aria-hidden', 'true');
        element('span', 'farbe', K.FARBEN[K.farbeVon(k)], e).setAttribute('aria-hidden', 'true');
        return e;
    }
    function rueckseite(spieler, parent) {
        var e = element('div', 'karte rueckseite' + (spieler === ICH ? ' schwarz' : ''), undefined, parent);
        e.setAttribute('aria-label', 'Verdeckte Karte');
        return e;
    }
    function platz(parent) { return element('div', 'karte platz', undefined, parent); }

    function schreibe(text, klasse) {
        var liste = $('protokoll'), li = element('li', klasse || '', text);
        liste.insertBefore(li, liste.firstChild);
    }

    function neuePartie() {
        lauf++;
        wartet = false;
        z = K.neuesSpiel({ ersteVorhand: partien % 2 });
        partien++;
        bot = KI.erstelle(Number($('stufe').value));
        leere($('protokoll'));
        beginneRunde();
    }

    function beginneRunde() {
        auswahl = [];
        var einsatz = z.eingezahlt[ICH];
        schreibe('Runde ' + z.runde + ': Grundeinsatz ' + einsatz + ', Vorhand: ' + wer(z.vorhand) + '.', 'runde');
        // Der Computer legt zuerst, kennt deine Wahl also nicht.
        K.verdecktWaehlen(z, GEGNER, bot.verdeckt(K.sicht(z, GEGNER)));
        zeichne();
    }

    function aktionsText(spieler, aktion, mitgehen) {
        var du = spieler === ICH;
        switch (aktion.art) {
            case 'legen': return (du ? 'Du legst ' : 'Computer legt ') + K.kartenText(aktion.karte) + '.';
            case 'schieben': return du ? 'Du schiebst.' : 'Computer schiebt.';
            case 'setzen': return (du ? 'Du setzt ' : 'Computer setzt ') + aktion.betrag + '.';
            case 'mitgehen': return (du ? 'Du gehst mit (' : 'Computer geht mit (') + mitgehen + ').';
            case 'erhoehen': return (du ? 'Du erhöhst um ' : 'Computer erhöht um ') + aktion.betrag + '.';
            default: return du ? 'Du steigst aus.' : 'Computer steigt aus.';
        }
    }

    function rundenText() {
        var r = z.letzteRunde;
        if (r.art === 'aufgabe') return wer(r.ausgestiegen) + (r.ausgestiegen === ICH ? ' steigst aus. ' : ' steigt aus. ') + wer(r.sieger) + (r.sieger === ICH ? ' gewinnst' : ' gewinnt') + ' den Pot (' + r.pot + ').';
        var blaetter = 'Showdown: Du ' + K.blattName(r.punkte[ICH]) + ', Computer ' + K.blattName(r.punkte[GEGNER]) + '. ';
        if (r.sieger < 0) return blaetter + 'Gleichstand, der Pot (' + r.pot + ') wird geteilt.';
        return blaetter + wer(r.sieger) + (r.sieger === ICH ? ' gewinnst' : ' gewinnt') + ' den Pot (' + r.pot + ').';
    }

    function endText() {
        var e = z.ergebnis, stand = z.chips[ICH] + ' : ' + z.chips[GEGNER];
        if (e.sieger < 0) return 'Partie vorbei: Remis, ' + stand + '.';
        if (e.grund === 'pleite') return 'Partie vorbei: ' + (e.sieger === ICH ? 'Der Computer ist pleite. Du gewinnst.' : 'Du bist pleite. Der Computer gewinnt.');
        return 'Partie vorbei: ' + (e.sieger === ICH ? 'Du gewinnst ' : 'Der Computer gewinnt ') + stand + '.';
    }

    function fuehreAus(aktion) {
        var spieler = z.amZug, mitgehen = z.phase === 'wetten' ? K.erlaubteAktionen(z).mitgehen : 0;
        K.anwenden(z, aktion);
        schreibe(aktionsText(spieler, aktion, mitgehen));
        if (z.phase === 'rundenende' || z.phase === 'ende') {
            schreibe(rundenText(), 'ergebnis');
            if (z.phase === 'ende') schreibe(endText(), 'ergebnis');
        }
    }

    // Lässt den Computer ziehen, solange er dran ist, mit kurzer Pause zum Mitlesen.
    function weiter() {
        zeichne();
        if (z.phase !== 'legen' && z.phase !== 'wetten') return;
        if (z.amZug !== GEGNER) return;
        var meinLauf = lauf;
        wartet = true;
        zeichne();
        setTimeout(function () {
            if (meinLauf !== lauf) return;
            var s = K.sicht(z, GEGNER);
            fuehreAus(z.phase === 'legen' ? { art: 'legen', karte: bot.legen(s) } : bot.wetten(s));
            wartet = false;
            weiter();
        }, WARTEZEIT);
    }

    function ichBinDran() { return !wartet && (z.phase === 'legen' || z.phase === 'wetten') && z.amZug === ICH; }
    function darfWaehlen() { return z.phase === 'verdeckt' ? 2 : (ichBinDran() && z.phase === 'legen' ? 1 : 0); }

    function waehle(k) {
        var grenze = darfWaehlen(), i = auswahl.indexOf(k);
        if (!grenze) return;
        if (i >= 0) auswahl.splice(i, 1);
        else { if (auswahl.length >= grenze) auswahl.shift(); auswahl.push(k); }
        zeichne();
    }

    // 13 Spalten, je Wert die zwei Karten übereinander. Gespielte Karten bleiben als Lücke sichtbar.
    function zeichneRaster(ziel, spieler, vorhanden, bauen) {
        leere(ziel);
        for (var w = 14; w >= 2; w--) {
            var spalte = element('div', 'wertspalte', undefined, ziel);
            for (var f = 0; f < 2; f++) {
                var k = K.karte(w, spieler * 2 + f);
                spalte.appendChild(bauen(k, vorhanden.indexOf(k) >= 0));
            }
        }
    }

    function zeichneHand() {
        var grenze = darfWaehlen(), hand = $('hand');
        hand.className = 'kartenraster' + (grenze ? ' waehlbar' : '');
        zeichneRaster(hand, ICH, z.hand[ICH], function (k, da) {
            if (!da) return element('div', 'karte platz');
            var e = kartenElement(k, true);
            e.disabled = !grenze;
            e.setAttribute('aria-pressed', auswahl.indexOf(k) >= 0 ? 'true' : 'false');
            e.setAttribute('data-fokus', 'karte-' + k);
            e.addEventListener('click', function () { waehle(k); });
            return e;
        });
    }

    function zeichneGegnerkarten() {
        var s = K.sicht(z, ICH);
        zeichneRaster($('gegnerkarten'), GEGNER, s.gegnerKandidaten, function (k, da) {
            var e = kartenElement(k, false);
            if (!da) { e.className += ' gespielt'; e.setAttribute('aria-label', kartenName(k) + ', schon gespielt'); }
            return e;
        });
        var text = 'Der Computer hat noch ' + s.gegnerHandgroesse + ' Karten auf der Hand.';
        if (s.gegnerUngesehen) text += ' ' + s.gegnerUngesehen + ' der hellen Karten hat er beim Aussteigen ungesehen abgelegt. Welche, weißt du nicht.';
        if (s.gegnerHatGelegt && z.phase !== 'rundenende' && z.phase !== 'ende') text += ' Zwei der hellen Karten liegen gerade verdeckt vor ihm.';
        $('gegnerinfo').textContent = text;
    }

    function zeichneVerdeckt() {
        var mein = leere($('verdeckt-0')), sein = leere($('verdeckt-1')), r = z.letzteRunde;
        var vorbei = z.phase === 'rundenende' || z.phase === 'ende';
        if (z.verdeckt[ICH]) z.verdeckt[ICH].forEach(function (k) { mein.appendChild(kartenElement(k, false)).className += ' geheim'; });
        else { platz(mein); platz(mein); }
        if (vorbei && r.art === 'showdown') z.verdeckt[GEGNER].forEach(function (k) { sein.appendChild(kartenElement(k, false)); });
        else if (z.verdeckt[GEGNER]) { rueckseite(GEGNER, sein); rueckseite(GEGNER, sein); }
        else { platz(sein); platz(sein); }

        var tisch = z.tisch.map(function (t) { return t.karte; });
        $('blatt-0').textContent = z.verdeckt[ICH] ? 'Dein Blatt: ' + K.blattName(K.bewerte(z.verdeckt[ICH].concat(tisch))) : '';
        $('blatt-1').textContent = vorbei && r.art === 'showdown' ? 'Blatt: ' + K.blattName(r.punkte[GEGNER]) : (vorbei ? 'Bleibt ungesehen' : '');
    }

    function zeichneTisch() {
        var ziel = leere($('tischkarten'));
        for (var i = 0; i < 4; i++) {
            if (z.tisch[i]) ziel.appendChild(kartenElement(z.tisch[i].karte, false));
            else platz(ziel);
        }
        $('pot').textContent = z.phase === 'rundenende' || z.phase === 'ende' ? z.letzteRunde.pot : z.pot;
        $('chips-0').textContent = z.chips[ICH];
        $('chips-1').textContent = z.chips[GEGNER];
        $('vorhand-0').hidden = z.vorhand !== ICH;
        $('vorhand-1').hidden = z.vorhand !== GEGNER;
        var k = z.konfig, grund = k.grundeinsatz[z.runde - 1];
        $('runde').textContent = 'Runde ' + z.runde + ' von ' + k.grundeinsatz.length;
        $('rundeninfo').textContent = 'Grundeinsatz ' + grund + ' · höchstens ' + k.rundenLimit * grund + ' Chips pro Spieler';
    }

    function knopf(text, klasse, parent, handler, aus) {
        var b = element('button', klasse || '', text, parent);
        b.type = 'button';
        b.setAttribute('data-fokus', 'knopf-' + text.split(/[:\d]/)[0].trim());
        b.disabled = !!aus;
        b.addEventListener('click', handler);
        return b;
    }

    // Kleiner Zähler für Einsatz und Erhöhung.
    function betragWahl(parent, bereich) {
        betrag = Math.max(bereich.min, Math.min(bereich.max, betrag));
        var box = element('span', 'betrag', undefined, parent);
        knopf('−', '', box, function () { betrag--; zeichne(); }, betrag <= bereich.min).setAttribute('aria-label', 'Einen Chip weniger');
        var anzeige = element('output', '', String(betrag), box);
        anzeige.setAttribute('aria-label', 'Betrag');
        knopf('+', '', box, function () { betrag++; zeichne(); }, betrag >= bereich.max).setAttribute('aria-label', 'Einen Chip mehr');
        knopf('Max', '', box, function () { betrag = bereich.max; zeichne(); }, betrag >= bereich.max).setAttribute('aria-label', 'Höchstbetrag ' + bereich.max);
    }

    function menschZieht(aktion) {
        auswahl = [];
        fuehreAus(aktion);
        betrag = 1;
        weiter();
    }

    function zeichneAktionen() {
        var ziel = leere($('aktionen')), status = $('status'), a;
        if (z.phase === 'ende') {
            status.textContent = endText();
            knopf('Neue Partie', '', ziel, neuePartie);
        } else if (z.phase === 'rundenende') {
            status.textContent = rundenText();
            knopf('Nächste Runde', '', ziel, function () { K.naechsteRunde(z); beginneRunde(); });
        } else if (z.phase === 'verdeckt') {
            status.textContent = 'Wähle unten zwei Karten, die du verdeckt legst.';
            knopf('Verdeckt legen', '', ziel, function () {
                K.verdecktWaehlen(z, ICH, auswahl);
                schreibe('Beide legen zwei Karten verdeckt.');
                auswahl = [];
                weiter();
            }, auswahl.length !== 2);
        } else if (!ichBinDran()) {
            status.textContent = z.phase === 'legen' ? 'Der Computer legt eine Karte …' : 'Der Computer überlegt …';
        } else if (z.phase === 'legen') {
            status.textContent = 'Du bist dran: Wähle unten eine Karte für den Tisch.';
            knopf('Offen legen', '', ziel, function () { menschZieht({ art: 'legen', karte: auswahl[0] }); }, auswahl.length !== 1);
        } else {
            a = K.erlaubteAktionen(z);
            if (a.schieben) {
                status.textContent = a.setzen ? 'Du bist dran: schieben oder setzen?' : 'Du bist dran.';
                knopf('Schieben', 'leise', ziel, function () { menschZieht({ art: 'schieben' }); });
                if (a.setzen) {
                    betragWahl(ziel, a.setzen);
                    knopf('Setzen: ' + betrag, '', ziel, function () { menschZieht({ art: 'setzen', betrag: betrag }); });
                }
            } else {
                status.textContent = 'Der Computer hat gesetzt. Mitgehen kostet ' + a.mitgehen + '.';
                knopf('Mitgehen: ' + a.mitgehen, '', ziel, function () { menschZieht({ art: 'mitgehen' }); });
                if (a.erhoehen) {
                    betragWahl(ziel, a.erhoehen);
                    knopf('Erhöhen um ' + betrag, 'leise', ziel, function () { menschZieht({ art: 'erhoehen', betrag: betrag }); });
                }
                knopf('Aussteigen', 'gefahr', ziel, function () { menschZieht({ art: 'aussteigen' }); });
            }
        }
    }

    function zeichne() {
        // Beim Neuzeichnen bleibt der Tastaturfokus auf demselben Knopf oder derselben Karte.
        var aktiv = document.activeElement, fokus = aktiv && aktiv.getAttribute ? aktiv.getAttribute('data-fokus') : null;
        zeichneTisch();
        zeichneVerdeckt();
        zeichneAktionen();
        zeichneHand();
        zeichneGegnerkarten();
        if (fokus) {
            var neu = document.querySelector('[data-fokus="' + fokus + '"]');
            if (neu && !neu.disabled) neu.focus();
        }
    }

    $('neu').addEventListener('click', neuePartie);
    $('stufe').addEventListener('change', neuePartie);
    $('regeln-knopf').addEventListener('click', function () { $('regeln').showModal(); });
    neuePartie();
})();
