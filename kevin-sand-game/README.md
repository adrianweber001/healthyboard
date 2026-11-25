# Kevin muss in 30 Tagen für Cäsar ganz Ägypten vom Sand befreien

Das Idle-/Farming-Browsergame zur TikTok-Serie. Tippe auf die Düne, schaufle Sand, verdiene Gold, kaufe Upgrades. Cäsar ist genervt.

- **Frontend:** HTML, CSS, JavaScript (ES-Module), ohne Build-Tool, mobil zuerst (iPhone Safari)
- **Backend:** Supabase (Auth, Postgres, Row Level Security)
- **Hosting:** Netlify
- Alle Grafiken sind selbst gezeichnetes SVG/CSS, alle Sounds werden live mit der Web Audio API erzeugt.

## Dateien

```
kevin-sand-game/
├── netlify.toml              Netlify: Build-Befehl, Publish-Ordner, Sicherheits-Header
├── scripts/build-config.mjs  erzeugt public/js/config.js aus den Umgebungsvariablen
├── supabase/schema.sql       Tabelle, RLS, Plausibilisierung, Rangliste (im SQL Editor ausführen)
└── public/                   das ist die Website
    ├── index.html
    ├── css/style.css
    ├── favicon.svg, manifest.webmanifest
    └── js/
        ├── main.js           UI, Spielschleife, Speichern, Modals
        ├── game.js           reine Spiellogik (Upgrades, Preise, Tag/Nacht, Offline)
        ├── backend.js        Supabase-Anbindung + Demo-Modus ohne Server
        ├── art.js            alle SVG-Grafiken (Kevin, Cäsar, Kamel, Bagger …)
        ├── audio.js          Soundeffekte (Web Audio API)
        ├── texts.js          Cäsars Sprüche
        ├── format.js         Zahlenformat (1.234 · 1,23 Mio. · 0,000002000 %)
        └── config.example.js Vorlage für lokales Testen mit Supabase
```

## Entscheidungen, die ich getroffen habe

| Thema | Entscheidung |
|---|---|
| Login | Supabase Auth mit Pseudo-E-Mail `benutzername@kevin-game.local`. Supabase speichert Passwörter nur als bcrypt-Hash. Benutzernamen: 3–20 Zeichen, `A–Z a–z 0–9 _` (keine Umlaute, weil sie Teil der E-Mail-Adresse werden). Groß-/Kleinschreibung wird angezeigt, aber „Kevin“ und „kevin“ gelten als derselbe Name. |
| Sand → Gold | 1 Sand = 1 Gold. „Sand entfernt“ = Rangliste. |
| Ägypten | hat 500 Milliarden Schaufeln Sand. Darum bleibt der Prozentwert schön absurd klein. Der Fortschrittsbalken zeigt immer mindestens einen winzigen Strich. |
| Upgrades | Eimer, Schaufel, Ventilator, Bagger und Raumschiff kann man mehrfach kaufen (jede Stufe +15 % Preis). Kamel und Zauberer gibt es nur einmal. |
| Kamel-Gehilfe | Ohne Kamel gibt es **keinen** Offline-Fortschritt. Mit Kamel: 3 Sand/s + alle Automatik-Upgrades laufen weiter (max. 8 Std.). |
| Bagger | 3 % Chance pro Tipp, dass er stecken bleibt. Dann bringt er nichts, bis man ihn 5× antippt. |
| Zauberer | Knopf „Sandsturm“, alle 30 s: 50 % → 10 s lang x10 Sand pro Tipp. 50 % → Sand kommt zurück („Sand entfernt“ sinkt, Gold bleibt). |
| Spieltag | 3 Minuten aktives Spielen. Danach Sonnenuntergang, Kevin schläft ein, Knopf „Tag X beginnen“. Nach Tag 30 gibt es ein Finale – danach geht es als „Überstunden“ weiter (TAG 31/30 …). |
| Speichern | alle 10 s, nach jedem Kauf, bei Sonnenuntergang/neuem Tag, beim Verstecken/Schließen der Seite (`fetch` mit `keepalive`). Zusätzlich eine lokale Sicherung, falls das letzte Speichern nicht durchkam. |
| Server-Plausibilisierung | Ein Datenbank-Trigger prüft jeden Speicherstand: Gold kann seit dem letzten Speichern höchstens um *maximal mögliche Rate × vergangene Zeit × 1,5* steigen, Upgrades müssen bezahlt sein, keine Rückverkäufe, Tage springen nicht. Unplausible Werte werden gekappt, und Cäsar meldet „Ich habe nachgezählt“. |
| Demo-Modus | Ohne Supabase-Konfiguration läuft das Spiel lokal im Browser (mit Hinweis-Banner). Praktisch zum Ausprobieren. Auf Netlify bricht der Build ab, wenn die Variablen fehlen, damit nie aus Versehen ein Demo-Spiel live geht. |

---

## Schritt-für-Schritt: Setup

### 0. Lokal ausprobieren (optional, ohne Server)

```bash
cd public
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen. Es erscheint der Demo-Modus-Hinweis, und die Spielstände bleiben nur in diesem Browser.

### 1. Supabase-Projekt anlegen

1. Auf https://supabase.com einloggen → **New project**.
2. Name: `kevin-sand-game`, ein sicheres Datenbank-Passwort vergeben (brauchst du später nicht im Spiel), Region z. B. **Central EU (Frankfurt)** → **Create new project**. Kurz warten.

### 2. Login ohne E-Mail einstellen

1. Links **Authentication** → **Sign In / Providers** (in älteren Dashboards: *Providers*).
2. **Allow new users to sign up**: an.
3. Provider **Email** öffnen:
   - **Enable Email provider**: an
   - **Confirm email**: **AUS** ← wichtig, sonst wartet Supabase auf eine Bestätigungs-Mail, die nie ankommt
   - Falls angeboten: **Minimum password length** auf `8` setzen
   - Speichern.

### 3. Datenbank einrichten (SQL)

1. Links **SQL Editor** → **New query**.
2. Den kompletten Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen → **Run**.
3. Es sollte „Success. No rows returned“ erscheinen. Das Skript kann bei Bedarf erneut ausgeführt werden.

Was das SQL anlegt:
- Tabelle `game_saves` (ein Spielstand pro Benutzer)
- **RLS:** Jeder darf nur seine eigene Zeile lesen, anlegen und ändern. Löschen ist nicht erlaubt, anonyme Besucher dürfen gar nichts.
- Trigger `kevin_validate_save` für die serverseitige Plausibilisierung
- Trigger auf `auth.users`: legt beim Registrieren automatisch den Spielstand an und erlaubt nur Accounts mit `@kevin-game.local`
- Funktionen `load_game()` (inkl. vom Server berechneter Offline-Zeit), `get_leaderboard()` (Top 20, nur Benutzername + Sand) und `get_my_rank()`

### 4. Schlüssel kopieren

1. Links **Project Settings** (Zahnrad) → **API Keys** bzw. **Data API**.
2. Notieren:
   - **Project URL**, z. B. `https://abcdefghijkl.supabase.co`
   - **anon public** Key (Reiter *Legacy API keys*) **oder** den **Publishable key** (`sb_publishable_…`). Beides funktioniert.
3. ⚠️ **Niemals** den `service_role`- oder `sb_secret_…`-Key verwenden. Das Build-Skript bricht ab, wenn du es versuchst.

### 5. GitHub-Repo „kevin-sand-game“

1. Auf GitHub → **New repository** → Name `kevin-sand-game` → **Create repository** (leer, ohne README).
2. Den Inhalt dieses Ordners hochladen, entweder:
   - im Browser: **uploading an existing file** → alle Dateien und Ordner aus `kevin-sand-game/` hineinziehen → **Commit changes**, oder
   - per Terminal:
     ```bash
     cd kevin-sand-game
     git init
     git add .
     git commit -m "Kevin & der Sand"
     git branch -M main
     git remote add origin https://github.com/DEIN-NAME/kevin-sand-game.git
     git push -u origin main
     ```
   `netlify.toml` muss im Hauptverzeichnis des Repos liegen.

### 6. Deploy auf Netlify

1. https://app.netlify.com → **Add new project** → **Import an existing project** → **GitHub** → Repo `kevin-sand-game` auswählen.
2. Die Build-Einstellungen kommen automatisch aus `netlify.toml`:
   - Build command: `node scripts/build-config.mjs`
   - Publish directory: `public`
3. **Environment variables** (bei „Add environment variables“ oder später unter *Site configuration → Environment variables*):

   | Key | Wert |
   |---|---|
   | `SUPABASE_URL` | deine Project URL, z. B. `https://abcdefghijkl.supabase.co` |
   | `SUPABASE_ANON_KEY` | der anon-public- bzw. Publishable-Key |
   | `PSEUDO_EMAIL_DOMAIN` | *(optional)* Standard ist `kevin-game.local` |

4. **Deploy**. Wenn du die Variablen erst nachträglich setzt: **Deploys → Trigger deploy → Deploy site**.
5. Fertig. Die Adresse ist z. B. `https://kevin-sand-game.netlify.app` und lässt sich unter *Domain management* umbenennen.

### 7. Abnahme-Test

- [ ] Registrieren mit Benutzername + Passwort → Spiel startet
- [ ] Ein paar Mal auf die Düne tippen, Eimer kaufen, 10 Sekunden warten (unten erscheint „✓ hh:mm“)
- [ ] Seite neu laden → noch eingeloggt, Gold und Eimer sind noch da
- [ ] Menü (☰) → Abmelden → wieder einloggen → Stand ist da
- [ ] Auf einem anderen Gerät einloggen → gleicher Stand
- [ ] Menü → Rangliste zeigt dich
- [ ] In Supabase unter *Table Editor → game_saves* ist deine Zeile zu sehen

---

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| „Der Server verlangt eine E-Mail-Bestätigung“ | Schritt 2: **Confirm email** ausschalten. Bereits angelegte, unbestätigte Accounts unter *Authentication → Users* löschen oder bestätigen. |
| „Der Server lehnt die interne Spiel-Adresse ab“ (`email_address_invalid`) | Manche Supabase-Projekte lehnen erfundene Domains ab. Dann eine (Sub-)Domain nehmen, die dir gehört, z. B. `spieler.deine-domain.de`: in Netlify `PSEUDO_EMAIL_DOMAIN=spieler.deine-domain.de` setzen **und** in `schema.sql` die Zeile `like '%@kevin-game.local'` anpassen und das SQL erneut ausführen. Es werden keine Mails verschickt. |
| „Der Server konnte den Account nicht anlegen“ | Das SQL aus Schritt 3 wurde nicht (vollständig) ausgeführt. |
| „Spielstand konnte nicht geladen werden“ | Ebenfalls Schritt 3 prüfen. Unter *Project Settings → Data API* muss das Schema `public` freigegeben sein (Standard). |
| Netlify-Build schlägt fehl | Die Umgebungsvariablen fehlen oder es wurde ein geheimer Key eingetragen (siehe Build-Log). |
| Kein Ton auf dem iPhone | Stummschalter an der Seite des iPhones prüfen. Ton startet erst nach dem ersten Tippen (iOS-Regel). |
| Eigene Supabase-Domain (nicht `*.supabase.co`) | In `netlify.toml` die Domain bei `connect-src` ergänzen. |
| Projekt „schläft“ | Kostenlose Supabase-Projekte pausieren nach etwa einer Woche ohne Aktivität. Im Dashboard auf **Restore** klicken. |

## Sicherheit

- Im Frontend landen nur die Supabase-URL und der **anon/publishable-Key**. Beide sind öffentlich gedacht. Der Schutz kommt von RLS.
- Passwörter speichert Supabase Auth nur als bcrypt-Hash, nie im Klartext.
- RLS: nur eigener Spielstand lesbar/änderbar. Die Rangliste läuft über eine Funktion, die nur Benutzername + Sand herausgibt.
- Server-Plausibilisierung: siehe Tabelle oben. Das ist bewusst „grob“: Wer im Browser schummelt, kommt höchstens auf das, was mit sehr schnellem Tippen (25 Tipps/s) theoretisch möglich wäre.
- Sicherheits-Header (CSP, X-Frame-Options usw.) in `netlify.toml`.

## Balancing anpassen

Preise und Werte stehen in `public/js/game.js` (`UPGRADES`, `DAY_LENGTH`, `EGYPT_SAND` …).
**Wenn du Preise oder „+Sand“-Werte änderst, passe auch `supabase/schema.sql` an** (`kevin_upgrade_spent`, `kevin_max_rate`) und führe es erneut aus. Sonst kappt der Server ehrliche Spielstände.
Cäsars Sprüche stehen in `public/js/texts.js`.
