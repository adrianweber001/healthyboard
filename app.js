'use strict';

function element(tag, klasse, text, parent) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
}
function zahl(wert) {
    return wert.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fehlt(wert) { return wert === '' || wert === '?'; }
function fehler(text) {
    document.getElementById('fehler').textContent = text;
    document.getElementById('fehler').hidden = !text;
    document.getElementById('analyse').hidden = true;
    document.getElementById('startvorschau').hidden = false;
}
// Anführungszeichen können Trenner und Zeilenumbrüche einschließen.
function csvZeilen(text, trenner, nurKopf) {
    var zeilen = [], zeile = [], feld = '', zitiert = false, begonnen = false;
    for (var i = 0; i < text.length; i++) {
        var c = text[i];
        if (c === '"' && (zitiert || /^[ \t]*$/.test(feld))) {
            if (!zitiert) feld = ''; // Wie PHP: Leerraum vor öffnenden Anführungszeichen ignorieren.
            begonnen = true;
            if (zitiert && text[i + 1] === '"') { feld += '"'; i++; }
            else zitiert = !zitiert;
        } else if (!zitiert && c === trenner) {
            zeile.push(feld); feld = ''; begonnen = true;
        } else if (!zitiert && (c === '\n' || c === '\r')) {
            if (begonnen || feld !== '' || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
            else zeilen.push(null);
            if (nurKopf) return zeilen; // Die Trennzeichenprobe braucht nur die Kopfzeile.
            zeile = []; feld = ''; begonnen = false;
            if (c === '\r' && text[i + 1] === '\n') i++;
        } else { feld += c; begonnen = true; }
    }
    if (begonnen || feld !== '' || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
    return zeilen;
}
function leseCsv(text) {
    text = text.replace(/^\uFEFF/, '');
    var komma = csvZeilen(text, ',', true), semi = csvZeilen(text, ';', true);
    var trenner = ',';
    if (semi[0] && semi[0].length > (komma[0] ? komma[0].length : 0)) trenner = ';';
    var liste = csvZeilen(text, trenner); // Daten nur einmal vollständig zerlegen.
    if (!liste[0] || liste[0].length < 2) throw new Error('Bitte eine CSV mit mindestens zwei Spalten und einer Kopfzeile hochladen.');
    var kopf = liste[0], zeilen = [], namen = Object.create(null), meldung = '';
    for (var i = 0; i < kopf.length; i++) {
        kopf[i] = kopf[i].trim();
        if (!kopf[i] || /[\u0000\uFFFD]/.test(kopf[i])) meldung = 'Die Kopfzeile muss gültige, nicht leere UTF-8-Spaltennamen enthalten.';
    }
    for (i = 0; i < kopf.length; i++) {
        if (namen[kopf[i]]) meldung = 'Bitte eindeutige Spaltennamen verwenden.';
        namen[kopf[i]] = true;
    }
    if (meldung) throw new Error(meldung);
    for (i = 1; i < liste.length; i++) {
        if (liste[i] === null) continue;
        if (liste[i].length !== kopf.length) throw new Error('Uneinheitliche Spaltenzahl bei Datenzeile ' + (zeilen.length + 1) + '.');
        for (var j = 0; j < kopf.length; j++) {
            if (/[\u0000\uFFFD]/.test(liste[i][j])) throw new Error('Bitte eine UTF-8-CSV ohne binäre Inhalte verwenden.');
            liste[i][j] = liste[i][j].trim();
        }
        zeilen.push(liste[i]);
    }
    if (!zeilen.length) throw new Error('Die CSV enthält keine Datenzeilen.');
    return { kopf: kopf, zeilen: zeilen, trenner: trenner };
}
function statistik(daten) {
    var ergebnis = [];
    for (var i = 0; i < daten.kopf.length; i++) {
        var s = { name: daten.kopf[i], fehlend: 0, werte: [], numerisch: true, haeufig: [], bins: [0, 0, 0, 0, 0] };
        var kategorien = Object.create(null);
        for (var j = 0; j < daten.zeilen.length; j++) {
            var wert = daten.zeilen[j][i];
            if (fehlt(wert)) { s.fehlend++; continue; }
            s.werte.push(wert);
            if (kategorien[wert] === undefined) { kategorien[wert] = s.haeufig.length; s.haeufig.push({ wert: wert, anzahl: 0 }); }
            s.haeufig[kategorien[wert]].anzahl++;
            if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(wert) || !isFinite(Number(wert)) || Math.abs(Number(wert)) > 1e100) s.numerisch = false;
        }
        s.numerisch = s.numerisch && s.werte.length > 0;
        if (s.numerisch) {
            s.min = Number(s.werte[0]); s.max = s.min; var summe = 0;
            for (j = 0; j < s.werte.length; j++) {
                var n = Number(s.werte[j]); summe += n;
                s.min = Math.min(s.min, n); s.max = Math.max(s.max, n);
            }
            s.mittel = summe / s.werte.length;
            for (j = 0; j < s.werte.length; j++) {
                var bin = 0;
                if (s.max !== s.min) bin = Math.min(4, Math.floor((Number(s.werte[j]) - s.min) / (s.max - s.min) * 5));
                s.bins[bin]++;
            }
        }
        s.haeufig.sort(function(a, b) { return b.anzahl - a.anzahl; });
        ergebnis.push(s);
    }
    return ergebnis;
}
// SVG-Knoten entstehen im eigenen Namensraum.
function svgElement(tag, attribute, text, parent) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var name in attribute) e.setAttribute(name, attribute[name]);
    if (text !== undefined) e.textContent = text;
    parent.appendChild(e); return e;
}
function histogramm(s, parent) {
    var karte = element('article', 'glass panel', undefined, parent);
    var heading = element('div', 'chart-heading', undefined, karte);
    element('h3', '', s.name, heading); element('span', 'badge', s.werte.length + ' Werte', heading);
    var mini = element('div', 'mini-stats', undefined, karte);
    var titel = ['Minimum', 'Mittelwert', 'Maximum'], werte = [s.min, s.mittel, s.max];
    for (var i = 0; i < 3; i++) {
        var gruppe = element('div', '', undefined, mini);
        element('small', '', titel[i], gruppe); element('b', i === 1 ? 'accent' : '', zahl(werte[i]), gruppe);
    }
    var svg = svgElement('svg', { viewBox: '0 0 400 180', role: 'img' }, undefined, karte);
    svgElement('title', {}, 'Verteilung: ' + s.name, svg);
    svgElement('desc', {}, 'Fünf Intervalle, Balkenhöhe entspricht der Anzahl.', svg);
    svgElement('line', { x1: 20, y1: 144, x2: 380, y2: 144, 'class': 'axis' }, undefined, svg);
    var details = element('details', '', undefined, karte);
    element('summary', '', 'Intervallgrenzen anzeigen', details);
    var liste = element('ul', '', undefined, details), maximum = Math.max.apply(null, s.bins);
    for (i = 0; i < 5; i++) {
        var hoehe = s.bins[i] / maximum * 100, x = 28 + i * 72;
        var von = zahl(s.min + (s.max - s.min) * i / 5), bis = zahl(s.min + (s.max - s.min) * (i + 1) / 5);
        var rect = svgElement('rect', { x: x, y: 144 - hoehe, width: 56, height: hoehe, rx: 5, 'class': 'hist-bar' }, undefined, svg);
        svgElement('title', {}, von + ' bis ' + bis + (i < 4 ? ' (Obergrenze exklusiv)' : ' (Obergrenze inklusive)') + ': ' + s.bins[i] + ' Werte', rect);
        svgElement('text', { x: x + 28, y: 134 - hoehe, 'text-anchor': 'middle' }, s.bins[i], svg);
        svgElement('text', { x: x + 28, y: 168, 'text-anchor': 'middle' }, i + 1, svg);
        element('li', '', (i + 1) + ': ' + von + ' bis ' + bis + (i < 4 ? ' (oben exklusiv)' : ' (oben inklusive)') + ' — ' + s.bins[i] + ' Werte', liste);
    }
    var note = element('p', 'chart-note', 'Intervalle 1–5 von ' + zahl(s.min) + ' bis ' + zahl(s.max) + '. Balken: Anzahl der Werte. Details beim Berühren oder Überfahren.');
    karte.insertBefore(note, details);
}
function anzeigen(daten, quelle, beispiel) {
    var stats = statistik(daten), gesamt = 0;
    var balken = document.getElementById('fehlwerte'), charts = document.getElementById('diagramme'), kategorien = document.getElementById('kategorien'), tabelle = document.getElementById('vorschau');
    balken.textContent = ''; charts.textContent = ''; kategorien.textContent = ''; tabelle.textContent = '';
    for (var i = 0; i < stats.length; i++) {
        var s = stats[i]; gesamt += s.fehlend;
        var prozent = s.fehlend / daten.zeilen.length * 100;
        var item = element('div', 'missing-item', undefined, balken), label = element('div', 'bar-label', undefined, item);
        element('span', '', s.name, label); element('span', '', s.fehlend + ' · ' + zahl(prozent) + ' %', label);
        var track = element('div', 'track', undefined, item);
        // Spaltenname und Prozentwert stehen bereits als zugänglicher Text davor.
        track.setAttribute('aria-hidden', 'true');
        element('div', 'fill', undefined, track).style.width = prozent + '%';
        if (s.numerisch) histogramm(s, charts);
        else {
            var karte = element('article', 'glass panel', undefined, kategorien);
            element('h3', '', s.name, karte); element('p', '', 'Häufigkeiten · fehlende Werte ausgeschlossen', karte);
            if (!s.werte.length) element('p', '', 'Keine vorhandenen Werte.', karte);
            var liste = element('ul', 'frequency-list', undefined, karte);
            for (var j = 0; j < s.haeufig.length; j++) {
                var li = element('li', '', undefined, liste);
                element('span', '', s.haeufig[j].wert, li); element('b', '', s.haeufig[j].anzahl, li);
            }
        }
    }
    element('caption', '', 'Vorschau der CSV-Daten', tabelle);
    var tr = element('tr', '', undefined, element('thead', '', undefined, tabelle));
    element('th', '', 'Zeile', tr).scope = 'col';
    for (i = 0; i < daten.kopf.length; i++) element('th', '', daten.kopf[i], tr).scope = 'col';
    var body = element('tbody', '', undefined, tabelle);
    for (i = 0; i < Math.min(10, daten.zeilen.length); i++) {
        tr = element('tr', '', undefined, body); element('th', '', i + 1, tr).scope = 'row';
        for (j = 0; j < daten.kopf.length; j++) {
            var zelle = element('td', '', undefined, tr);
            // Eigene Textknoten halten auch die mobile Kartenansicht frei von HTML-Eingaben.
            element('span', 'cell-label', daten.kopf[j], zelle).setAttribute('aria-hidden', 'true');
            element('span', 'cell-value', fehlt(daten.zeilen[i][j]) ? '—' : daten.zeilen[i][j], zelle);
        }
    }
    document.getElementById('wert-zeilen').textContent = daten.zeilen.length;
    document.getElementById('wert-spalten').textContent = daten.kopf.length;
    document.getElementById('wert-fehlend').textContent = gesamt;
    document.getElementById('quelle').textContent = quelle + ' · Trennzeichen ' + daten.trenner + (beispiel ? ' · Erfundene Beispieldaten' : '');
    document.getElementById('fehler').hidden = true;
    document.getElementById('analyse').hidden = false;
    document.getElementById('startvorschau').hidden = true;
}
// Die laufende Nummer verhindert veraltete Ergebnisse beim schnellen Wechsel.
var vorgang = 0;
document.getElementById('upload-form').addEventListener('submit', function(event) {
    event.preventDefault(); var aktuell = ++vorgang;
    var datei = document.getElementById('csv').files[0];
    fehler('');
    if (!datei) { fehler('Bitte eine CSV-Datei auswählen. Bei großen Dateien gilt die Grenze von 2 MB.'); return; }
    if (datei.size > 2 * 1024 * 1024) { fehler('Die Datei ist zu groß. Erlaubt sind maximal 2 MB (2 MiB).'); return; }
    if (datei.size === 0) { fehler('Die Datei ist leer. Bitte eine CSV mit Daten auswählen.'); return; }
    if (!/\.csv$/i.test(datei.name)) { fehler('Bitte eine Datei mit der Endung .csv hochladen.'); return; }
    var reader = new FileReader();
    reader.onload = function() {
        if (aktuell !== vorgang) return;
        try { anzeigen(leseCsv(reader.result), datei.name, false); }
        catch (error) { fehler(error.message); }
    };
    reader.onerror = function() { if (aktuell === vorgang) fehler('Die Datei konnte nicht gelesen werden.'); };
    reader.readAsText(datei, 'UTF-8');
});
document.getElementById('example-form').addEventListener('submit', function(event) {
    event.preventDefault(); var aktuell = ++vorgang; fehler('');
    fetch('beispiel_niere.csv').then(function(response) {
        if (!response.ok) throw new Error('Die Datei konnte nicht gelesen werden.');
        return response.text();
    }).catch(function() {
        // Browser liefern unterschiedliche technische Netzwerkfehler.
        throw new Error('Die Datei konnte nicht gelesen werden.');
    }).then(function(text) {
        if (aktuell === vorgang) anzeigen(leseCsv(text), 'beispiel_niere.csv', true);
    }).catch(function(error) { if (aktuell === vorgang) fehler(error.message); });
});
