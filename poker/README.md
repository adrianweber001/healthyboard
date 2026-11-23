# Hold'em Coach

Lern-App für Texas Hold'em (No-Limit, Heads-up): Du spielst 1 gegen 1 gegen eine KI, und ein Coach bewertet jede deiner Entscheidungen – mit Empfehlung (Fold / Check / Call / Bet / Raise inkl. Größe), Equity, Pot Odds und Erklärung. Dazu: Handranking, Starthand-Matrix, Pot Odds & Outs, Strategie-Basics, Glossar, Quiz und Statistik.

Reines HTML/CSS/JavaScript (ES-Module), kein Build-Schritt, keine Abhängigkeiten, läuft komplett im Browser. Statistik und Einstellungen liegen im `localStorage`.

## Lokal starten

```bash
cd poker
python3 -m http.server 8000
# http://localhost:8000
```

## Tests

```bash
cd poker
npm test   # node --test tests/*.test.mjs
```

Geprüft werden Hand-Evaluator, Equity-Werte (z. B. AA gegen KK ≈ 82 %), Ranges und 1 500 Bot-gegen-Bot-Hände (Chips bleiben erhalten, nur legale Aktionen).

## Netlify

Als eigene Netlify-Seite aus diesem Repo anlegen und **Base directory = `poker`** setzen. `poker/netlify.toml` veröffentlicht den Ordner direkt (`publish = "."`, kein Build-Befehl).

## Aufbau

| Datei | Aufgabe |
| --- | --- |
| `js/evaluator.js` | Bewertet 5–7 Karten, deutsche Handnamen |
| `js/equity.js` | Monte-Carlo-Equity gegen eine Range |
| `js/ranges.js`, `js/preflop-table.js` | 169 Starthände, Rangliste (Equity gegen zufällige Hand), Ranges |
| `js/game.js` | Heads-up-Regeln: Blinds, Setzrunden, Min-Raise, All-in, Showdown |
| `js/coach.js` | Range-Schätzung, Empfehlung, Bewertung (✅ / ⚠️ / ❌) |
| `js/bot.js` | KI-Gegner (Locker / Solide / Aggressiv) auf Basis der Coach-Logik |
| `js/ui-table.js` | Tisch, Aktionen, Live-Feedback, Handrückblick |
| `js/learn.js`, `js/quiz.js`, `js/stats.js` | Lernseiten, Quiz, Statistik |

Der Coach arbeitet mit vereinfachten Regeln und ist kein GTO-Solver – er soll die wichtigsten Grundlagen (Pot Odds, Equity, Value-Bets, Position) greifbar machen.
