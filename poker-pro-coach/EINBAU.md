# AW Poker Pro · Coach – Einbau

Das Lernsystem des Hold'em Coach im Design von AW Poker Pro (DE / EN / PL):

- **Training:** Heads-up gegen die KI mit 💡 Tipp, Live-Feedback (✅ / ⚠️ / ❌), Equity, Pot Odds, Bet-Größe und Handrückblick
- **Starthände:** 13×13-Matrix (Small Blind / Big Blind gegen Raise / Stärke) mit Details pro Hand
- **Quiz:** Wer gewinnt?, Was habe ich?, Pot Odds, Preflop
- **Statistik:** gute Entscheidungen, häufigste Fehler mit Tipp, VPIP/PFR

## Variante A: eigene Netlify-Seite (am einfachsten)

`aw-poker-pro-coach-netlify.zip` enthält die fertige Seite (`index.html` liegt ganz oben). In Netlify das Projekt **aw-poker-pro-coach** öffnen → **Deploys** → ZIP ins Upload-Feld ziehen. Danach läuft der Coach unter `https://aw-poker-pro-coach.netlify.app/`; „← Poker Pro“ führt zurück zu `aw-poker-pro.netlify.app`.

Für den Menüpunkt „Coach“ in Poker Pro diese Zeile in Poker Pros `index.html` vor `</body>` einfügen:

```html
<script src="https://aw-poker-pro-coach.netlify.app/coach-link.js" defer></script>
```

Hinweis: Auf einer eigenen Domain kann der Coach die Spracheinstellung von Poker Pro nicht mitlesen – die Sprache wählt man dort einmal selbst (DE/EN/PL oben rechts).

## Variante B: in den Poker-Pro-Quellcode einbauen

Es ist ein eigenständiger Ordner, der unter `/coach/` läuft. Login, Ranked, Rangliste, Battle Pass, Lektionen und die `/api`-Funktion von Poker Pro werden **nicht** verändert.

### 1. Ordner kopieren

Den Ordner `coach/` aus dieser ZIP in das Poker-Pro-Projekt nach **`public/coach/`** kopieren:

```
aw-poker-pro/
  public/
    coach/          ← hierhin
      index.html
      coach.css
      coach-link.js
      fonts/
      js/
  src/ …
  netlify/functions/ …
```

Vite kopiert alles aus `public/` unverändert in den Build. Danach ist der Coach unter `https://aw-poker-pro.netlify.app/coach/` erreichbar. Die Netlify-Weiterleitung `/* → /index.html` stört nicht, weil Netlify echte Dateien zuerst ausliefert.

### 2. Link in der Navigation (optional, eine Zeile)

In Poker Pros **`index.html`** (Projektwurzel, nicht `public/`) vor `</body>` einfügen:

```html
<script src="/coach/coach-link.js" defer></script>
```

Das fügt in der Hauptnavigation hinter „Lernen“ den Punkt **Coach** (PL: „Trener“) ein. Auf dem Handy wird die untere Navigationsleiste automatisch um eine Spalte erweitert.

Alternativ kann der Link auch direkt im React-Code der Navigation (`nav.nav`) ergänzt werden:

```jsx
<a href="/coach/">{t('nav.coach')}</a>
```

Dann bitte einen normalen `<a>`-Link verwenden (kein `NavLink`), damit der Browser die Coach-Seite wirklich lädt.

### 3. Bauen und hochladen

Wie bisher: `npm run build` bzw. Deploy über Netlify. Es kommen keine neuen Abhängigkeiten dazu.

## Gut zu wissen

- **Sprache:** Der Coach liest und schreibt denselben Schlüssel wie Poker Pro (`localStorage` → `awpp.lang`). Wer in Poker Pro auf EN stellt, sieht den Coach auf Englisch – und umgekehrt.
- **Daten:** Coach-Einstellungen und -Statistik liegen nur im Browser unter `awpp.coach.settings.v1` und `awpp.coach.stats.v1`. Es gibt keine Server-Aufrufe, keine Datenbank-Änderung und keinen Login.
- **Zoom:** Wie Poker Pro ist Zoomen (Pinch, Doppeltippen) gesperrt (`js/nozoom.js`).
- **Schrift:** Inter (SIL Open Font License) liegt in `fonts/` bei – dieselbe Schrift wie in Poker Pro.
- **Tastatur (Computer):** F = Fold, C = Check/Call, R = Raise, T = Tipp, N/Enter = nächste Hand.
- Der Coach arbeitet mit vereinfachten Regeln (Monte-Carlo-Equity, Pot Odds, Starthand-Rangliste) und ist kein GTO-Solver.
