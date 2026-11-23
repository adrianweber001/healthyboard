// Lernen-Tab: Handranking, Starthand-Matrix, Grundlagen, Glossar.
import { parseCards, RANK_CHARS } from './cards.js';
import { RANKED, handPercentile, handRank, preflopEquity, combosOf, topRange } from './ranges.js';
import { equityVsRange } from './equity.js';
import { DEFAULT_PARAMS } from './coach.js';
import { $, $$, esc, cardsHTML, pctText } from './ui.js';

const TOPICS = [
  ['ranking', 'Handranking'],
  ['matrix', 'Starthände'],
  ['basics', 'Ablauf & Regeln'],
  ['odds', 'Pot Odds & Outs'],
  ['strategy', 'Strategie-Basics'],
  ['glossary', 'Glossar'],
];

let current = 'ranking';
let matrixView = 'sb';
let selected = 'AKs';
let bbCache = null;

export function initLearn() {
  const nav = $('#learn-nav');
  nav.innerHTML = TOPICS.map(([k, n]) => `<button class="chip-btn" data-topic="${k}">${n}</button>`).join('');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-topic]');
    if (b) show(b.dataset.topic);
  });
  show(current);
}

function show(topic) {
  current = topic;
  $$('#learn-nav .chip-btn').forEach((b) => b.classList.toggle('active', b.dataset.topic === topic));
  const render = { ranking, matrix, basics, odds, strategy, glossary }[topic];
  $('#learn-content').innerHTML = render();
  if (topic === 'matrix') bindMatrix();
}

/* ---------- Handranking ---------- */
const HANDS = [
  ['Royal Flush', 'As Ks Qs Js Ts', 'Ass bis Zehn in einer Farbe – die beste Hand überhaupt.', 0.000032],
  ['Straight Flush', '9h 8h 7h 6h 5h', 'Fünf aufeinanderfolgende Karten in derselben Farbe.', 0.000279],
  ['Vierling', 'Qc Qd Qh Qs 7d', 'Vier Karten mit gleichem Rang. Bei Gleichstand entscheidet die fünfte Karte (Kicker).', 0.00168],
  ['Full House', 'Kh Kd Kc 4s 4h', 'Drilling + Paar. Erst zählt der Drilling, dann das Paar („Könige über Vieren“).', 0.026],
  ['Flush', 'Ad Jd 8d 6d 3d', 'Fünf Karten derselben Farbe, egal welche Ränge. Höchste Karte entscheidet, dann die nächste …', 0.0303],
  ['Straße', 'Tc 9d 8h 7s 6c', 'Fünf aufeinanderfolgende Ränge, Farben egal. Das Ass zählt hoch (A-K-Q-J-10) oder niedrig (5-4-3-2-A).', 0.0462],
  ['Drilling', '7s 7h 7d Kc 2s', 'Drei Karten mit gleichem Rang. Mit Pocket-Paar heißt das „Set“, sonst „Trips“.', 0.0483],
  ['Zwei Paare', 'Js Jd 5c 5h Ad', 'Zwei verschiedene Paare. Erst das höhere Paar, dann das niedrigere, dann der Kicker.', 0.235],
  ['Ein Paar', 'Ah Ac Qs 8d 4c', 'Zwei Karten mit gleichem Rang. Bei gleichem Paar entscheiden die drei Kicker.', 0.438],
  ['Höchste Karte', 'Ad Js 9c 6h 3d', 'Nichts davon – die höchste Karte zählt, dann die zweithöchste usw.', 0.174],
];

function ranking() {
  return `<div class="prose"><h2>Welche Hand schlägt welche?</h2>
    <p>Jeder Spieler bildet aus seinen <strong>2 eigenen Karten</strong> und den <strong>5 Gemeinschaftskarten</strong> die beste Kombination aus <strong>genau 5 Karten</strong>. Von oben (stärkste) nach unten (schwächste). Die Prozentzahl zeigt, wie oft man diese Hand nach allen 7 Karten mindestens hat.</p></div>
    <div class="learn-grid">
    ${HANDS.map(([name, cards, desc, p], i) => `
      <div class="panel rank-item">
        <h3><span class="num">${i + 1}</span>${name}</h3>
        <div>${cardsHTML(parseCards(cards))}</div>
        <p class="small" style="margin:0">${desc}</p>
        <span class="prob">Häufigkeit: ${p < 0.001 ? (p * 100).toFixed(4) : (p * 100).toFixed(1)} %${p < 0.001 ? ` (ca. 1 von ${Math.round(1 / p).toLocaleString('de-DE')})` : ''}</span>
      </div>`).join('')}
    </div>
    <div class="prose">
      <div class="callout"><strong>Farben sind gleichwertig.</strong> Pik ist nicht besser als Herz. Haben zwei Spieler exakt gleich starke 5 Karten, wird der Pot geteilt (Split Pot).</div>
      <h3>Kicker – das entscheidet oft</h3>
      <p>Beide haben ein Paar Asse? Dann vergleicht man die übrigen Karten der besten 5. Beispiel: Board ${cardsHTML(parseCards('Ah 9c 6d 4s 2h'))}. Spieler A hat ${cardsHTML(parseCards('As Kd'))}, Spieler B hat ${cardsHTML(parseCards('Ad Qc'))}. Beide: Paar Asse – aber A gewinnt mit dem König als Kicker.</p>
      <h3>Das Board spielt</h3>
      <p>Liegt auf dem Board schon eine Straße (z. B. ${cardsHTML(parseCards('9c 8d 7h 6s 5c'))}) und keiner hat etwas Besseres, teilen sich alle den Pot – die eigenen Karten zählen dann nicht.</p>
    </div>`;
}

/* ---------- Starthand-Matrix ---------- */
function labelAt(row, col) {
  const a = 12 - row;
  const b = 12 - col;
  if (a === b) return RANK_CHARS[a] + RANK_CHARS[b];
  return a > b ? RANK_CHARS[a] + RANK_CHARS[b] + 's' : RANK_CHARS[b] + RANK_CHARS[a] + 'o';
}

function computeBB() {
  if (bbCache) return bbCache;
  const range = topRange(0.7); // Range des Small Blinds beim Open-Raise (wie im Coach)
  bbCache = {};
  for (const label of RANKED) {
    bbCache[label] = equityVsRange(combosOf(label)[0], [], range, 700);
  }
  return bbCache;
}

// Preis im Big Blind gegen Open auf 5: 3 zahlen in einen Pot von 7 → 30 %
const BB_POT_ODDS = 3 / 10;

function cellClass(label) {
  const p = handPercentile(label);
  if (matrixView === 'sb') {
    if (p <= DEFAULT_PARAMS.sbOpen) return 'c-raise';
    if (p <= DEFAULT_PARAMS.sbLimp) return 'c-limp';
    return 'c-fold';
  }
  if (matrixView === 'bb') {
    if (p <= DEFAULT_PARAMS.threeBet) return 'c-3bet';
    return computeBB()[label] * 0.85 >= BB_POT_ODDS ? 'c-call' : 'c-fold';
  }
  return '';
}

function cellStyle(label) {
  if (matrixView !== 'strength') return '';
  const p = handPercentile(label);
  const hue = Math.round(140 - p * 140);
  return `background:hsl(${hue} 62% ${34 - p * 8}%)`;
}

function matrix() {
  const legend = {
    sb: '<span><i class="c-raise"></i>Raise (2,5 BB)</span><span><i class="c-limp"></i>Limp (Call)</span><span><i class="c-fold"></i>Fold</span>',
    bb: '<span><i class="c-3bet"></i>3-Bet (Re-Raise)</span><span><i class="c-call"></i>Call</span><span><i class="c-fold"></i>Fold</span>',
    strength: '<span><i style="background:hsl(140 62% 34%)"></i>stark</span><span><i style="background:hsl(70 62% 30%)"></i>mittel</span><span><i style="background:hsl(0 62% 26%)"></i>schwach</span>',
  }[matrixView];
  let cells = '';
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const l = labelAt(r, c);
      cells += `<button data-hand="${l}" class="${cellClass(l)} ${l === selected ? 'sel' : ''}" style="${cellStyle(l)}" aria-label="${l}">${l}</button>`;
    }
  }
  return `<div class="prose"><h2>Starthände im Heads-up</h2>
    <p>Es gibt 169 verschiedene Starthände. <strong>Oben rechts</strong> stehen <em>suited</em> Hände (gleiche Farbe, „s“), <strong>unten links</strong> <em>offsuit</em> (verschiedene Farben, „o“), auf der <strong>Diagonale</strong> Paare. Im Heads-up spielt man deutlich mehr Hände als an vollen Tischen, weil nur ein Gegner da ist und man jede zweite Hand den Big Blind zahlt.</p>
    <p class="small muted">Kurzschreibweise: A = Ass, K = König, Q = Dame, J = Bube, T = Zehn. Klick auf eine Hand für Details.</p></div>
    <div class="subnav" id="matrix-views">
      <button class="chip-btn ${matrixView === 'sb' ? 'active' : ''}" data-view="sb">Small Blind (Button): erste Aktion</button>
      <button class="chip-btn ${matrixView === 'bb' ? 'active' : ''}" data-view="bb">Big Blind gegen Raise auf 2,5 BB</button>
      <button class="chip-btn ${matrixView === 'strength' ? 'active' : ''}" data-view="strength">Stärke</button>
    </div>
    <div class="matrix-wrap">
      <div>
        <div class="matrix" id="matrix">${cells}</div>
        <div class="legend">${legend}</div>
      </div>
      <div class="panel" id="hand-detail">${handDetail(selected)}</div>
    </div>`;
}

function handDetail(label) {
  const p = handPercentile(label);
  const type = label.length === 2 ? 'Paar' : label[2] === 's' ? 'suited (gleiche Farbe)' : 'offsuit (verschiedene Farben)';
  const combos = combosOf(label);
  const sb = p <= DEFAULT_PARAMS.sbOpen ? 'Raise auf 2,5 BB' : p <= DEFAULT_PARAMS.sbLimp ? 'Limp (1 Chip nachzahlen)' : 'Fold';
  const bbLimp = p <= DEFAULT_PARAMS.bbIso ? 'Raise auf 4 BB' : 'Check';
  let bbRaise;
  if (p <= DEFAULT_PARAMS.threeBet) bbRaise = '3-Bet auf ca. 7,5 BB';
  else if (bbCache) bbRaise = bbCache[label] * 0.85 >= BB_POT_ODDS ? 'Call' : 'Fold';
  else bbRaise = '…';
  const notes = [];
  if (label.length === 2) notes.push(label === 'AA' || label === 'KK' ? 'Premium-Paar: fast immer vorne. Baue den Pot auf!' : 'Paare treffen auf dem Flop in ca. 12 % der Fälle ein Set (Drilling) – dann oft sehr profitabel.');
  if (label[2] === 's') notes.push('Suited bringt ca. 2–3 % Equity extra (Flush-Chancen), wird aber oft überschätzt.');
  if (label[0] === 'A' && label.length === 3) notes.push('Ein Ass ist im Heads-up viel wert, weil der Gegner oft gar nichts trifft.');
  if (label.length === 3 && Math.abs(RANK_CHARS.indexOf(label[0]) - RANK_CHARS.indexOf(label[1])) === 1) notes.push('Connector: gute Chancen auf Straßen.');
  return `<h3 style="font-size:20px">${label}</h3>
    <div style="margin:8px 0">${cardsHTML(combos[0])}</div>
    <table class="simple">
      <tr><th>Typ</th><td>${type} · ${combos.length} Kombinationen</td></tr>
      <tr><th>Rang</th><td>${handRank(label)} von 169 (Top ${pctText(p)})</td></tr>
      <tr><th>Equity vs. zufällige Hand</th><td>${preflopEquity(label).toFixed(1)} %</td></tr>
      <tr><th>Small Blind, erste Aktion</th><td><strong>${sb}</strong></td></tr>
      <tr><th>Big Blind gegen Limp</th><td><strong>${bbLimp}</strong></td></tr>
      <tr><th>Big Blind gegen Raise</th><td><strong>${bbRaise}</strong></td></tr>
    </table>
    ${notes.map((n) => `<p class="small">${esc(n)}</p>`).join('')}`;
}

function bindMatrix() {
  $('#matrix-views').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    matrixView = b.dataset.view;
    if (matrixView === 'bb' && !bbCache) {
      $('#matrix').style.opacity = '.4';
      setTimeout(() => show('matrix'), 20);
      return;
    }
    show('matrix');
  });
  $('#matrix').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hand]');
    if (!b) return;
    selected = b.dataset.hand;
    $$('#matrix button').forEach((x) => x.classList.toggle('sel', x === b));
    $('#hand-detail').innerHTML = handDetail(selected);
  });
  if (!bbCache) setTimeout(() => { computeBB(); if (current === 'matrix') $('#hand-detail').innerHTML = handDetail(selected); }, 200);
}

/* ---------- Ablauf & Regeln ---------- */
function basics() {
  return `<div class="prose">
    <h2>So läuft eine Hand ab (Heads-up)</h2>
    <ol>
      <li><strong>Blinds:</strong> Der Spieler mit dem Dealer-Button (D) zahlt den <em>Small Blind</em> (1 Chip), der andere den <em>Big Blind</em> (2 Chips). Der Button wechselt jede Hand.</li>
      <li><strong>Preflop:</strong> Jeder bekommt 2 verdeckte Karten. Im Heads-up beginnt der <strong>Small Blind</strong> (Button).</li>
      <li><strong>Flop:</strong> 3 Gemeinschaftskarten werden aufgedeckt. Ab jetzt beginnt immer der <strong>Big Blind</strong> – der Button handelt zuletzt (das ist der Positionsvorteil).</li>
      <li><strong>Turn:</strong> die 4. Gemeinschaftskarte, neue Setzrunde.</li>
      <li><strong>River:</strong> die 5. Karte, letzte Setzrunde.</li>
      <li><strong>Showdown:</strong> Sind noch beide dabei, zeigen sie ihre Karten. Die beste 5-Karten-Hand gewinnt den Pot.</li>
    </ol>
    <h3>Deine Möglichkeiten</h3>
    <table class="simple">
      <tr><th>Fold</th><td>Aufgeben. Du verlierst, was du schon gesetzt hast.</td></tr>
      <tr><th>Check</th><td>Schieben, ohne zu setzen – nur möglich, wenn niemand gesetzt hat.</td></tr>
      <tr><th>Bet</th><td>Als Erster in einer Setzrunde Chips setzen.</td></tr>
      <tr><th>Call</th><td>Den Einsatz des Gegners mitgehen.</td></tr>
      <tr><th>Raise</th><td>Erhöhen. Ein Raise muss mindestens so groß sein wie die letzte Erhöhung.</td></tr>
      <tr><th>All-in</th><td>Alle Chips setzen. Mehr als der Gegner hat, kann er nicht verlieren – der Rest geht zurück.</td></tr>
    </table>
    <div class="callout">In dieser App heißt <strong>„Raise auf 6“</strong>: Dein gesamter Einsatz in dieser Setzrunde beträgt danach 6 Chips.</div>
    <h3>No-Limit</h3>
    <p>Du darfst jederzeit beliebig viel setzen – bis zu all deinen Chips. Beide starten mit <strong>200 Chips = 100 Big Blinds</strong>.</p>
  </div>`;
}

/* ---------- Pot Odds & Outs ---------- */
function odds() {
  const draws = [
    ['Flush-Draw + Open-Ender', 15], ['Flush-Draw', 9], ['Open-Ended Straight-Draw', 8],
    ['Zwei Overcards', 6], ['Gutshot (Bauchschuss)', 4], ['Pocket-Paar → Set', 2],
  ];
  const flopRiver = (o) => 1 - ((47 - o) * (46 - o)) / (47 * 46);
  const turnRiver = (o) => o / 46;
  return `<div class="prose">
    <h2>Pot Odds: Lohnt sich der Call?</h2>
    <p>Pot Odds sagen dir, wie viel Equity (Gewinnchance) du mindestens brauchst, damit ein Call auf lange Sicht Gewinn bringt.</p>
    <div class="callout"><span class="formula">benötigte Equity = zu callen ÷ (Pot + zu callen)</span><br>Der „Pot“ enthält dabei schon die Bet des Gegners.</div>
    <p><strong>Beispiel:</strong> Im Pot liegen 20, der Gegner setzt 10 (Pot jetzt 30). Du musst 10 zahlen: 10 ÷ (30 + 10) = <strong>25 %</strong>. Gewinnst du in mehr als 25 % der Fälle, ist Call profitabel.</p>
    <table class="simple"><tr><th>Gegner setzt …</th><th>benötigte Equity</th></tr>
      <tr><td>¼ Pot</td><td>17 %</td></tr><tr><td>⅓ Pot</td><td>20 %</td></tr><tr><td>½ Pot</td><td>25 %</td></tr>
      <tr><td>⅔ Pot</td><td>29 %</td></tr><tr><td>Pot</td><td>33 %</td></tr><tr><td>2× Pot</td><td>40 %</td></tr></table>

    <h3>Outs und die 2-4-Regel</h3>
    <p><strong>Outs</strong> sind Karten, die deine Hand (wahrscheinlich) zur besten machen. Faustregel: <strong>Outs × 4</strong> am Flop (zwei Karten kommen noch), <strong>Outs × 2</strong> am Turn (eine Karte kommt noch).</p>
    <div class="table-wrap"><table class="simple">
      <tr><th>Draw</th><th>Outs</th><th>Flop → River</th><th>Turn → River</th></tr>
      ${draws.map(([n, o]) => `<tr><td>${n}</td><td>${o}</td><td>${(flopRiver(o) * 100).toFixed(1)} %</td><td>${(turnRiver(o) * 100).toFixed(1)} %</td></tr>`).join('')}
    </table></div>
    <p class="small muted">Hinweis: Wenn noch eine Bet am Turn kommt, zählt für den Call am Flop eher die Turn-Chance (×2).</p>

    <h3>Implied Odds</h3>
    <p>Triffst du deinen Draw, gewinnst du oft noch weitere Chips. Darum darf ein Call mit starkem Draw manchmal etwas teurer sein, als die reinen Pot Odds sagen. Am River gibt es keine Implied Odds mehr.</p>

    <h3>Equity</h3>
    <p>Equity ist dein Anteil am Pot, wenn alle restlichen Karten ausgeteilt würden. Der Coach schätzt die <strong>Range</strong> des Gegners (welche Hände er nach seinen Aktionen haben kann) und rechnet deine Equity dagegen per Simulation aus.</p>
  </div>`;
}

/* ---------- Strategie ---------- */
function strategy() {
  return `<div class="prose">
    <h2>Strategie-Basics fürs Heads-up</h2>
    <h3>1. Position ist Macht</h3>
    <p>Der Button handelt nach dem Flop zuletzt und sieht, was der Gegner tut. Darum spielt man mit dem Button mehr Hände (ca. 65–85 %) und aggressiver.</p>
    <h3>2. Aggressiv statt passiv</h3>
    <p>Wer setzt, kann auf zwei Arten gewinnen: Der Gegner foldet – oder du hast die bessere Hand. Wer nur callt, gewinnt nur im Showdown. Eröffne mit einem Raise statt mit einem Limp, wenn deine Hand gut genug ist.</p>
    <h3>3. Value-Bets: Setze, wenn schlechtere Hände bezahlen</h3>
    <p>Starke Hand → setzen, meist ½ bis ⅔ des Pots. Frag dich: „Welche schlechteren Hände callen mich?“ Wenn dir keine einfallen, ist Check oft besser.</p>
    <h3>4. Mittelstarke Hände: Pot klein halten</h3>
    <p>Ein mittleres Paar ist oft vorne gegen Bluffs, aber hinten gegen starke Hände. Check und günstig zum Showdown kommen ist hier oft am besten (Pot-Kontrolle).</p>
    <h3>5. Bluffen mit Plan</h3>
    <p>Die besten Bluffs sind <strong>Semi-Bluffs</strong>: Hände mit Draw (z. B. Flush-Draw). Callt der Gegner, kannst du noch treffen. Reine Bluffs am River nur, wenn deine Geschichte glaubwürdig ist.</p>
    <h3>6. Pot Odds vor jedem Call</h3>
    <p>Rechne kurz: zu callen ÷ (Pot + zu callen). Ist deine geschätzte Equity höher, ist Call okay.</p>
    <h3>7. Big Blind verteidigen</h3>
    <p>Im Big Blind hast du schon 2 Chips investiert und bekommst gegen einen kleinen Raise einen guten Preis. Im Heads-up verteidigt man daher sehr viele Hände.</p>
    <div class="callout"><strong>Typische Anfängerfehler:</strong> zu viele Hände callen statt raisen · mit Draws zu teure Bets callen · starke Hände zu passiv spielen · aus Frust weiterbluffen („Tilt“) · am River mit schwacher Hand callen, „weil ja schon so viel im Pot ist“.</div>
  </div>`;
}

/* ---------- Glossar ---------- */
const GLOSSARY = [
  ['All-in', 'Alle verbleibenden Chips setzen.'],
  ['Big Blind (BB)', 'Pflichteinsatz des Spielers ohne Button (hier 2 Chips). Auch Maßeinheit: 100 BB = 200 Chips.'],
  ['Board', 'Die bis zu 5 offenen Gemeinschaftskarten.'],
  ['Button', 'Dealer-Position. Im Heads-up = Small Blind, handelt nach dem Flop zuletzt.'],
  ['C-Bet', 'Continuation Bet: Wer preflop geraist hat, setzt am Flop erneut.'],
  ['Draw', 'Unfertige Hand, die noch eine Karte braucht (z. B. Flush-Draw).'],
  ['Effektiver Stack', 'Der kleinere der beiden Stacks – mehr kann in einer Hand nicht verloren werden.'],
  ['Equity', 'Dein Anteil am Pot bzw. deine Gewinnchance, wenn alle Karten ausgeteilt würden.'],
  ['Gutshot', 'Straight-Draw mit einer Lücke in der Mitte (4 Outs).'],
  ['Implied Odds', 'Zusätzliche Chips, die du gewinnst, wenn du deinen Draw triffst.'],
  ['IP / OOP', 'In Position (handelt zuletzt) / Out of Position (handelt zuerst).'],
  ['Kicker', 'Beikarte, die bei gleichem Paar/Drilling über den Sieger entscheidet.'],
  ['Limp', 'Preflop nur den Big Blind mitgehen statt zu raisen.'],
  ['Nuts', 'Die bestmögliche Hand auf dem aktuellen Board.'],
  ['Open-Ender', 'Straight-Draw, der an beiden Enden ergänzt werden kann (8 Outs).'],
  ['Outs', 'Karten, die deine Hand zur (wahrscheinlich) besten machen.'],
  ['Pot Odds', 'Verhältnis von Call-Betrag zu Pot – zeigt die benötigte Equity.'],
  ['Range', 'Alle Hände, die ein Spieler in einer Situation haben kann.'],
  ['Semi-Bluff', 'Bluff mit einer Hand, die sich noch verbessern kann.'],
  ['Set / Trips', 'Drilling mit Pocket-Paar (Set) bzw. mit einem Paar auf dem Board (Trips).'],
  ['Slowplay', 'Eine sehr starke Hand absichtlich passiv spielen, um den Gegner zu locken.'],
  ['Split Pot', 'Gleich starke Hände teilen sich den Pot.'],
  ['Suited / Offsuit', 'Zwei Startkarten gleicher Farbe („s“) bzw. verschiedener Farben („o“).'],
  ['Tilt', 'Emotional schlecht spielen, z. B. nach einer verlorenen Hand.'],
  ['Value-Bet', 'Setzen mit einer starken Hand, damit schlechtere Hände bezahlen.'],
  ['VPIP / PFR', 'Wie oft du preflop freiwillig Chips investierst / wie oft du preflop raist.'],
  ['3-Bet', 'Der Re-Raise auf einen Raise (der Big Blind zählt als erste „Bet“).'],
];

function glossary() {
  return `<div class="prose"><h2>Glossar</h2>
    <dl class="glossary">${GLOSSARY.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></div>`;
}
