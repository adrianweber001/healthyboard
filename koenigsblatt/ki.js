'use strict';
// Königsblatt – Computergegner. Bekommt nur die Sicht eines Spielers, nie den vollen Zustand.
(function (wurzel, fabrik) {
    if (typeof module === 'object' && module.exports) module.exports = fabrik(require('./engine.js'));
    else wurzel.KoenigsblattKI = fabrik(wurzel.Koenigsblatt);
})(typeof self !== 'undefined' ? self : this, function (K) {
    var STUFEN = ['Zufall', 'Heuristik', 'Reichweite'];
    // Stellschrauben der starken KI; die Simulation kann sie überschreiben.
    var STANDARD = { materialChips: 7, potFaktor: 3, temperatur: 0.6, legeKosten: 0.12, bluff: 0.14 };

    // Kleiner, wiederholbarer Zufallsgenerator für Simulationen.
    function zufallsquelle(saat) {
        var a = saat >>> 0;
        return function () {
            a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function tischKarten(s) { return s.tisch.map(function (t) { return t.karte; }); }
    function allePaare(karten) {
        var p = [];
        for (var i = 0; i < karten.length; i++) for (var j = i + 1; j < karten.length; j++) p.push([karten[i], karten[j]]);
        return p;
    }
    function hatZwilling(k, hand) {
        var w = K.wertVon(k);
        for (var i = 0; i < hand.length; i++) if (hand[i] !== k && K.wertVon(hand[i]) === w) return true;
        return false;
    }
    // Wie wertvoll eine Karte für spätere Runden ist (Ass = 1, Zwei = 0).
    function material(k, hand) {
        var x = (K.wertVon(k) - 2) / 12;
        return x * x * (hatZwilling(k, hand) ? 1.25 : 1);
    }
    // Anteil der Grundeinsätze, der nach dieser Runde noch kommt.
    function zukunft(s) {
        var e = s.konfig.grundeinsatz, rest = 0, alle = 0;
        for (var i = 0; i < e.length; i++) { alle += e[i]; if (i >= s.runde) rest += e[i]; }
        return rest / alle;
    }

    // Alle verdeckten Paare, die der Gegner haben könnte, mit Gewichten.
    function reichweite(s, deuten) {
        var paare = allePaare(s.gegnerKandidaten), gewicht = new Float64Array(paare.length);
        for (var i = 0; i < gewicht.length; i++) gewicht[i] = 1;
        if (deuten) deute(s, paare, gewicht);
        return { paare: paare, gewicht: gewicht };
    }

    // Wie hoch der Gegner bisher eingestiegen ist: 0 = immer mit seinen niedrigsten Werten, 1 = mit den höchsten.
    function gegnerNeigung(s) {
        var gegner = 1 - s.spieler, gesehen = {}, summe = 0.5, gewicht = 1, anzahl = 0;
        s.verlauf.forEach(function (v, nr) {
            var gezeigt = [], hoechster = 0, verfuegbar = [], w;
            v.tisch.forEach(function (t) { if (t.spieler === gegner) gezeigt.push(t.karte); });
            if (v.verdeckt) gezeigt = gezeigt.concat(v.verdeckt[gegner]);
            for (w = 2; w <= 14; w++) if (!gesehen[K.karte(w, gegner * 2)] || !gesehen[K.karte(w, gegner * 2 + 1)]) verfuegbar.push(w);
            gezeigt.forEach(function (k) { hoechster = Math.max(hoechster, K.wertVon(k)); gesehen[k] = true; });
            if (!gezeigt.length || verfuegbar.length < 2) return;
            var g = 1 + nr * 0.5;   // jüngere Runden zählen mehr
            summe += g * verfuegbar.indexOf(hoechster) / (verfuegbar.length - 1);
            gewicht += g; anzahl++;
        });
        return { mitte: summe / gewicht, breite: Math.max(0.16, 0.4 - 0.05 * anzahl) };
    }

    // Ausgangsgewicht jedes möglichen verdeckten Paars, bevor in dieser Runde etwas passiert ist.
    function grundgewicht(s, paare) {
        var neigung = gegnerNeigung(s), werte = [], vorhanden = {}, i;
        s.gegnerKandidaten.forEach(function (k) { vorhanden[K.wertVon(k)] = true; });
        for (i = 2; i <= 14; i++) if (vorhanden[i]) werte.push(i);
        return paare.map(function (p) {
            var a = K.wertVon(p[0]), b = K.wertVon(p[1]);
            var lage = werte.length > 1 ? werte.indexOf(Math.max(a, b)) / (werte.length - 1) : 0.5;
            var abstand = (lage - neigung.mitte) / neigung.breite;
            // Ein verdecktes Paar ist viel wahrscheinlicher als eine beliebige Kombination.
            return (a === b ? 4 : 1) * (0.05 + Math.exp(-abstand * abstand / 2));
        });
    }

    // Niedrigster Wert, von dem der Gegner noch beide Karten haben kann (für ein Paar auf dem Tisch).
    function tiefesPaar(kandidaten, ohneWert) {
        var nachWert = {}, i, w;
        for (i = 0; i < kandidaten.length; i++) { w = K.wertVon(kandidaten[i]); (nachWert[w] = nachWert[w] || []).push(kandidaten[i]); }
        for (w = 2; w <= 14; w++) if (w !== ohneWert && nachWert[w] && nachWert[w].length === 2) return nachWert[w];
        return [];
    }

    // Welche Tischkarten der Gegner mit diesen verdeckten Karten vermutlich noch legt:
    // die Zwillinge seiner verdeckten Karten, oder er vervollständigt ein eigenes Tischpaar.
    function gegnerZugaben(paar, kandidaten, tisch, gelegt, anzahl) {
        if (!anzahl) return [];
        var wa = K.wertVon(paar[0]), wb = K.wertVon(paar[1]), auswahl = [], i, k, w;
        for (i = 0; i < kandidaten.length; i++) {
            k = kandidaten[i]; w = K.wertVon(k);
            if (k === paar[0] || k === paar[1]) continue;
            if (w === wa || w === wb || gelegt.indexOf(w) >= 0) auswahl.push(k);
        }
        if (wa === wb && !gelegt.length && anzahl === 2) auswahl = auswahl.concat(tiefesPaar(kandidaten, wa));
        var beste = [], bestePunkte = K.bewerte(tisch.concat(paar)), punkte, j;
        for (i = 0; i < auswahl.length; i++) {
            punkte = K.bewerte(tisch.concat(paar, [auswahl[i]]));
            if (punkte > bestePunkte) { bestePunkte = punkte; beste = [auswahl[i]]; }
            if (anzahl < 2) continue;
            for (j = i + 1; j < auswahl.length; j++) {
                punkte = K.bewerte(tisch.concat(paar, [auswahl[i], auswahl[j]]));
                if (punkte > bestePunkte) { bestePunkte = punkte; beste = [auswahl[i], auswahl[j]]; }
            }
        }
        return beste;
    }

    // Schließt aus dem Legen und Setzen des Gegners auf seine verdeckten Karten.
    function deute(s, paare, gewicht) {
        var gegner = 1 - s.spieler, kand = s.gegnerKandidaten, tisch = [], gelegt = [], n = paare.length, i, e, p;
        var grund = grundgewicht(s, paare);
        for (i = 0; i < n; i++) gewicht[i] *= grund[i];
        // Karten, die der Gegner in dieser Runde gelegt hat: Zu ihrem Zeitpunkt hatte er sie noch.
        var damals = kand.slice();
        s.rundenlog.forEach(function (l) { if (l.art === 'legen' && l.spieler === gegner) damals.push(l.karte); });
        function zwillingDa(wert, p, ausser) {
            for (var x = 0; x < damals.length; x++) if (damals[x] !== p[0] && damals[x] !== p[1] && damals[x] !== ausser && K.wertVon(damals[x]) === wert) return true;
            return false;
        }
        for (var x = 0; x < s.rundenlog.length; x++) {
            e = s.rundenlog[x];
            if (e.art === 'legen') {
                if (e.spieler === gegner) {
                    var w = K.wertVon(e.karte);
                    for (i = 0; i < n; i++) {
                        p = paare[i];
                        var wa = K.wertVon(p[0]), wb = K.wertVon(p[1]);
                        if (wa === wb) {
                            // Verdecktes Paar: legt meist ein zweites Paar offen auf den Tisch.
                            if (!gelegt.length) gewicht[i] *= 0.18;
                            else if (gelegt.indexOf(w) < 0) gewicht[i] *= zwillingDa(gelegt[0], p, e.karte) ? 0.012 : 0.2;
                        } else if (w !== wa && w !== wb) {
                            // Zwei verschiedene Werte: Wer seine verdeckte Karte paaren kann, tut das fast immer.
                            var kann = (gelegt.indexOf(wa) < 0 && zwillingDa(wa, p, e.karte)) || (gelegt.indexOf(wb) < 0 && zwillingDa(wb, p, e.karte));
                            gewicht[i] *= kann ? 0.01 : 0.2;
                        }
                    }
                    gelegt.push(w);
                }
                tisch.push(e.karte);
            } else if (e.spieler === gegner && e.art !== 'aussteigen') {
                var punkte = new Array(n), ordnung = new Array(n), rest = e.durchgang === 1 ? 1 : 0;
                for (i = 0; i < n; i++) {
                    punkte[i] = K.bewerte(tisch.concat(paare[i], gegnerZugaben(paare[i], kand, tisch, gelegt, rest)));
                    ordnung[i] = i;
                }
                ordnung.sort(function (a, b) { return punkte[a] - punkte[b]; });
                for (i = 0; i < n; i++) {
                    var rang = n > 1 ? i / (n - 1) : 1, faktor;
                    if (e.art === 'setzen' || e.art === 'erhoehen') faktor = 0.08 + 0.92 * rang * rang * rang;
                    else if (e.art === 'schieben') faktor = 1 - 0.45 * rang * rang * rang;
                    else faktor = 0.25 + 0.75 * rang;
                    gewicht[ordnung[i]] *= faktor;
                }
            }
        }
    }

    // Gewinnchance (Gleichstand zählt halb) der eigenen Karten gegen die Reichweite.
    function chance(eigene, tisch, r) {
        var meine = K.bewerte(tisch.concat(eigene)), summe = 0, gesamt = 0, w, g;
        for (var i = 0; i < r.paare.length; i++) {
            w = r.gewicht[i];
            if (!w) continue;
            g = K.bewerte(tisch.concat(r.paare[i]));
            gesamt += w;
            if (meine > g) summe += w; else if (meine === g) summe += w / 2;
        }
        return gesamt ? summe / gesamt : 0.5;
    }

    // Wie chance(), aber rechnet im ersten Durchgang die noch fehlenden Tischkarten beider Seiten hoch.
    function chanceVoraus(s, r, meineNaechste) {
        var tisch = tischKarten(s);
        if (s.durchgang !== 1) return chance(s.verdeckt, tisch, r);
        var gegner = 1 - s.spieler, gelegt = [], summe = 0, gesamt = 0, i, w;
        s.tisch.forEach(function (t) { if (t.spieler === gegner) gelegt.push(K.wertVon(t.karte)); });
        if (meineNaechste !== undefined) tisch = tisch.concat([meineNaechste]);
        for (i = 0; i < r.paare.length; i++) {
            w = r.gewicht[i];
            if (!w) continue;
            var ende = tisch.concat(gegnerZugaben(r.paare[i], s.gegnerKandidaten, tisch, gelegt, 1));
            var meine = K.bewerte(ende.concat(s.verdeckt)), g = K.bewerte(ende.concat(r.paare[i]));
            gesamt += w;
            if (meine > g) summe += w; else if (meine === g) summe += w / 2;
        }
        return gesamt ? summe / gesamt : 0.5;
    }

    // Die eigene Karte, die das eigene Blatt am stärksten macht (bei Gleichstand die billigste).
    function staerksteEigene(s) {
        var tisch = tischKarten(s).concat(s.verdeckt), beste, bestePunkte = -1, besteKosten = 0;
        for (var i = 0; i < s.hand.length; i++) {
            var punkte = K.bewerte(tisch.concat([s.hand[i]])), kosten = material(s.hand[i], s.hand);
            if (punkte > bestePunkte || (punkte === bestePunkte && kosten < besteKosten)) { beste = s.hand[i]; bestePunkte = punkte; besteKosten = kosten; }
        }
        return beste;
    }

    // Beste Tischkarte: größte Gewinnchance, abzüglich des Werts der Karte für später.
    function besteKarte(s, r, kosten, zufall) {
        var tisch = tischKarten(s), zk = zukunft(s), gesehen = {}, beste = s.hand[0], besteNote = -Infinity;
        for (var i = 0; i < s.hand.length; i++) {
            var k = s.hand[i], w = K.wertVon(k);
            if (gesehen[w]) continue;
            gesehen[w] = true;
            var note = chance(s.verdeckt, tisch.concat([k]), r) - kosten * zk * material(k, s.hand) + zufall() * 0.002;
            if (note > besteNote) { besteNote = note; beste = k; }
        }
        return { karte: beste, note: besteNote };
    }

    // Sinnvolle Kandidaten für die zwei verdeckten Karten.
    function verdecktKandidaten(hand) {
        var nachWert = {}, werte = [], liste = [], schluessel = {}, i, j;
        hand.forEach(function (k) {
            var w = K.wertVon(k);
            if (!nachWert[w]) { nachWert[w] = []; werte.push(w); }
            nachWert[w].push(k);
        });
        werte.sort(function (a, b) { return b - a; });
        function dazu(a, b) {
            var s = Math.min(a, b) + '-' + Math.max(a, b);
            if (!schluessel[s]) { schluessel[s] = true; liste.push([a, b]); }
        }
        werte.forEach(function (w) { if (nachWert[w].length === 2) dazu(nachWert[w][0], nachWert[w][1]); });
        var oben = werte.slice(0, 6);
        for (i = 0; i < oben.length; i++) for (j = i + 1; j < oben.length; j++) dazu(nachWert[oben[i]][0], nachWert[oben[j]][0]);
        var sortiert = hand.slice().sort(function (a, b) { return a - b; });
        dazu(sortiert[0], sortiert[1]);
        if (werte.length > 1) dazu(nachWert[werte[werte.length - 1]][0], nachWert[werte[werte.length - 2]][0]);
        return liste;
    }

    // Das beste eigene Blatt aus zwei verdeckten und zwei eigenen Tischkarten.
    function eigenesPaket(verdeckt, rest) {
        var nachWert = {}, werte = [], beste = null, bestePunkte = -1, besteKosten = 0, i, j;
        rest.forEach(function (k) {
            var w = K.wertVon(k);
            if (!nachWert[w]) { nachWert[w] = []; werte.push(w); }
            nachWert[w].push(k);
        });
        for (i = 0; i < werte.length; i++) for (j = i; j < werte.length; j++) {
            if (i === j && nachWert[werte[i]].length < 2) continue;
            var a = nachWert[werte[i]][0], b = i === j ? nachWert[werte[i]][1] : nachWert[werte[j]][0];
            var punkte = K.bewerte([verdeckt[0], verdeckt[1], a, b]), kosten = material(a, rest) + material(b, rest);
            // Gleiche Blattart und gleicher oberster Wert: die billigeren Karten nehmen.
            var klasse = Math.floor(punkte / 50625), besteKlasse = Math.floor(bestePunkte / 50625);
            if (klasse > besteKlasse || (klasse === besteKlasse && kosten < besteKosten)) {
                beste = [a, b]; bestePunkte = punkte; besteKosten = kosten;
            }
        }
        return { karten: beste, punkte: bestePunkte, kosten: besteKosten };
    }

    // Geschätzter Chip-Wert einer Wahl verdeckter Karten für die starke KI.
    function rundenwert(s, verdeckt, gegnerPaare, gegnerGewicht, p) {
        var rest = s.hand.filter(function (k) { return k !== verdeckt[0] && k !== verdeckt[1]; });
        var paket = eigenesPaket(verdeckt, rest), tisch = paket.karten;
        var summe = 0, gesamt = 0;
        for (var i = 0; i < gegnerPaare.length; i++) {
            var g = gegnerPaare[i], w = gegnerGewicht[i];
            var ende = tisch.concat(gegnerZugaben(g, s.gegnerKandidaten, tisch, [], 2));
            var meine = K.bewerte(ende.concat(verdeckt)), seine = K.bewerte(ende.concat(g));
            gesamt += w;
            if (meine > seine) summe += w; else if (meine === seine) summe += w / 2;
        }
        var chanceWert = gesamt ? summe / gesamt : 0.5;
        var einsatz = s.konfig.grundeinsatz[s.runde - 1];
        var verbrauch = material(verdeckt[0], s.hand) + material(verdeckt[1], s.hand) + paket.kosten;
        return { wert: (2 * chanceWert - 1) * einsatz * p.potFaktor - p.materialChips * zukunft(s) * verbrauch, plan: paket.karten };
    }

    function erstelle(stufe, zufall, parameter) {
        zufall = zufall || Math.random;
        var p = {};
        for (var n in STANDARD) p[n] = STANDARD[n];
        for (n in (parameter || {})) p[n] = parameter[n];

        function wahl(liste) { return liste[Math.floor(zufall() * liste.length)]; }
        function groesse(anteil, basis, bereich) {
            return Math.max(bereich.min, Math.min(bereich.max, Math.round(anteil * basis)));
        }

        var plan = [];   // Tischkarten, die zur Wahl der verdeckten Karten gehören

        function verdeckt(s) {
            plan = [];
            if (stufe === 0) {
                var a = wahl(s.hand), b = wahl(s.hand);
                while (b === a) b = wahl(s.hand);
                return [a, b];
            }
            var kandidaten = verdecktKandidaten(s.hand), i;
            if (stufe === 1) {
                // Einfache Regel: mit wachsender Wahrscheinlichkeit das stärkste Paket, sonst abwerfen.
                var stark = [0.5, 0.55, 0.6, 0.7, 0.8, 1][Math.min(5, s.runde - 1 + 6 - s.runden)];
                if (zufall() >= stark) {
                    var sortiert = s.hand.slice().sort(function (x, y) { return x - y; });
                    return [sortiert[0], sortiert[1]];
                }
                var bewertet = kandidaten.map(function (v) {
                    var rest = s.hand.filter(function (k) { return k !== v[0] && k !== v[1]; });
                    var paket = eigenesPaket(v, rest);
                    return { v: v, punkte: paket.punkte, plan: paket.karten };
                }).sort(function (x, y) { return y.punkte - x.punkte; });
                var z = zufall(), gewaehlt = bewertet[z < 0.6 || bewertet.length < 2 ? 0 : z < 0.85 || bewertet.length < 3 ? 1 : 2];
                plan = gewaehlt.plan.slice();
                return gewaehlt.v;
            }
            // Starke KI: Wert jeder Wahl schätzen, dann gemischt wählen, um unberechenbar zu bleiben.
            var gegnerPaare = allePaare(s.gegnerKandidaten);
            var gegnerGewicht = grundgewicht(s, gegnerPaare);
            var ergebnisse = kandidaten.map(function (v) { return rundenwert(s, v, gegnerPaare, gegnerGewicht, p); });
            var max = -Infinity, summe = 0, anteile = [];
            for (i = 0; i < ergebnisse.length; i++) max = Math.max(max, ergebnisse[i].wert);
            for (i = 0; i < ergebnisse.length; i++) { anteile[i] = Math.exp((ergebnisse[i].wert - max) / p.temperatur); summe += anteile[i]; }
            var ziel = zufall() * summe, treffer = kandidaten.length - 1;
            for (i = 0; i < anteile.length; i++) { ziel -= anteile[i]; if (ziel <= 0) { treffer = i; break; } }
            plan = ergebnisse[treffer].plan.slice();
            return kandidaten[treffer];
        }

        function nimmPlan(karte) { plan = plan.filter(function (k) { return k !== karte; }); return karte; }

        function legen(s) {
            if (stufe === 0) return wahl(s.hand);
            plan = plan.filter(function (k) { return s.hand.indexOf(k) >= 0; });
            if (stufe === 1) {
                // Einfache KI: folgt stur ihrem Plan, die wertvollere Karte zuerst.
                if (plan.length) return nimmPlan(plan.slice().sort(function (x, y) { return y - x; })[0]);
                return besteKarte(s, reichweite(s, false), p.legeKosten, zufall).karte;
            }
            var r = reichweite(s, true);
            // Erster Durchgang: zufällig eine der Plankarten, damit die Reihenfolge nichts verrät.
            if (s.durchgang === 1 && plan.length) return nimmPlan(wahl(plan));
            var frei = besteKarte(s, r, p.legeKosten, zufall);
            if (!plan.length) return frei.karte;
            // Zweiter Durchgang: Plankarte nur, wenn sie nicht schlechter ist als die beste Alternative.
            var planNote = chance(s.verdeckt, tischKarten(s).concat([plan[0]]), r) - p.legeKosten * zukunft(s) * material(plan[0], s.hand);
            return planNote + 0.02 >= frei.note ? nimmPlan(plan[0]) : frei.karte;
        }

        // Letzte Runde: Es zählt nur noch, wer am Ende vorn liegt.
        function endspiel(s, a, e) {
            var ich = s.spieler, g = 1 - ich, c = s.chips, pot = s.pot;
            function wert(d) { return d > 0 ? 1 : d === 0 ? 0.5 : 0; }
            if (a.mitgehen) {
                var o = a.mitgehen;
                var passen = wert(c[ich] - c[g] - pot);
                var mit = e * wert(c[ich] + pot - c[g]) + (1 - e) * wert(c[ich] - o - c[g] - pot - o);
                if (mit > passen) return { art: 'mitgehen' };
                if (mit < passen) return { art: 'aussteigen' };
                return null;
            }
            if (!a.setzen) return null;
            var gewinn = wert(c[ich] + pot - c[g]), verlust = wert(c[ich] - c[g] - pot);
            if (gewinn === 1 && verlust === 1) return { art: 'schieben' };
            if (gewinn < 1) return { art: 'setzen', betrag: a.setzen.max };
            if (e < 0.4 && zufall() < 0.5) return { art: 'setzen', betrag: a.setzen.max };
            return null;
        }

        function wetten(s) {
            var a = s.aktionen, z = zufall();
            if (stufe === 0) {
                if (a.schieben) return a.setzen && z < 0.3 ? { art: 'setzen', betrag: groesse(zufall(), a.setzen.max, a.setzen) } : { art: 'schieben' };
                if (z < 0.25) return { art: 'aussteigen' };
                if (z < 0.5 && a.erhoehen) return { art: 'erhoehen', betrag: groesse(zufall(), a.erhoehen.max, a.erhoehen) };
                return { art: 'mitgehen' };
            }
            var r = reichweite(s, stufe === 2), tisch = tischKarten(s);
            var e;
            if (stufe === 2) {
                // Im ersten Durchgang zählt, was beide Seiten voraussichtlich noch legen.
                var naechste = plan.length && s.hand.indexOf(plan[0]) >= 0 ? plan[0] : staerksteEigene(s);
                e = chanceVoraus(s, r, s.durchgang === 1 ? naechste : undefined);
                if (s.runde === s.runden) { var zug = endspiel(s, a, e); if (zug) return zug; }
            } else e = chance(s.verdeckt, tisch, r);
            bot.letzteChance = e;
            if (a.schieben) {
                if (a.setzen) {
                    if (e >= 0.7 && z < 0.85) return { art: 'setzen', betrag: groesse(0.8, s.pot, a.setzen) };
                    if (e >= 0.55 && e < 0.7 && z < 0.5) return { art: 'setzen', betrag: groesse(0.5, s.pot, a.setzen) };
                    if (e < 0.35 && z < (stufe === 2 ? p.bluff : 0.08)) return { art: 'setzen', betrag: groesse(0.7, s.pot, a.setzen) };
                }
                return { art: 'schieben' };
            }
            // Die einfache KI deutet den Einsatz nicht, zieht dafür pauschal etwas ab.
            if (stufe === 1) e -= 0.1;
            var quote = a.mitgehen / (s.pot + a.mitgehen);
            if (a.erhoehen && e >= 0.85 && z < 0.7) return { art: 'erhoehen', betrag: groesse(0.8, s.pot + a.mitgehen, a.erhoehen) };
            if (a.erhoehen && stufe === 2 && e < 0.25 && z < 0.04) return { art: 'erhoehen', betrag: groesse(0.8, s.pot + a.mitgehen, a.erhoehen) };
            return e >= quote + 0.03 ? { art: 'mitgehen' } : { art: 'aussteigen' };
        }

        var bot = { name: STUFEN[stufe], stufe: stufe, verdeckt: verdeckt, legen: legen, wetten: wetten, letzteChance: null };
        return bot;
    }

    return {
        STUFEN: STUFEN, STANDARD: STANDARD, erstelle: erstelle, zufallsquelle: zufallsquelle,
        reichweite: reichweite, chance: chance, material: material, eigenesPaket: eigenesPaket,
        verdecktKandidaten: verdecktKandidaten, tischKarten: tischKarten
    };
});
