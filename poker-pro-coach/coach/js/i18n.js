// Texte in DE / EN / PL. Die Sprache wird mit AW Poker Pro geteilt (localStorage „awpp.lang“).
import { rankOf } from './cards.js';

export const LANGS = ['de', 'en', 'pl'];
const LANG_KEY = 'awpp.lang';

const RANKS = {
  de: ['Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Bube', 'Dame', 'König', 'Ass'],
  en: ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'],
  pl: ['Dwójka', 'Trójka', 'Czwórka', 'Piątka', 'Szóstka', 'Siódemka', 'Ósemka', 'Dziewiątka', 'Dziesiątka', 'Walet', 'Dama', 'Król', 'As'],
};
const RANKS_PL = {
  de: ['Zweien', 'Dreien', 'Vieren', 'Fünfen', 'Sechsen', 'Siebenen', 'Achten', 'Neunen', 'Zehnen', 'Buben', 'Damen', 'Könige', 'Asse'],
  en: ['Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'],
  pl: ['Dwójki', 'Trójki', 'Czwórki', 'Piątki', 'Szóstki', 'Siódemki', 'Ósemki', 'Dziewiątki', 'Dziesiątki', 'Walety', 'Damy', 'Króle', 'Asy'],
};
const SUITS = {
  de: ['Pik', 'Herz', 'Karo', 'Kreuz'],
  en: ['Spades', 'Hearts', 'Diamonds', 'Clubs'],
  pl: ['Pik', 'Kier', 'Karo', 'Trefl'],
};
export const CATEGORIES = {
  de: ['Höchste Karte', 'Ein Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush', 'Royal Flush'],
  en: ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'],
  pl: ['Wysoka karta', 'Para', 'Dwie pary', 'Trójka', 'Strit', 'Kolor', 'Full', 'Kareta', 'Poker', 'Poker królewski'],
};

const D = {
  de: {
    'app.coach': 'Coach',
    'nav.training': 'Training',
    'nav.matrix': 'Starthände',
    'nav.quiz': 'Quiz',
    'nav.stats': 'Statistik',
    'nav.back': '← Poker Pro',
    'seat.you': 'Du',
    'seat.bot': 'KI',
    'street.preflop': 'Preflop', 'street.flop': 'Flop', 'street.turn': 'Turn', 'street.river': 'River', 'street.showdown': 'Showdown', 'street.over': 'Hand beendet',
    'pot': 'Pot', 'pot.paid': 'ausgezahlt',
    'btn.fold': 'Fold', 'btn.foldSure': 'Wirklich folden? Check ist gratis', 'btn.check': 'Check', 'btn.call': 'Call {n}', 'btn.allin': 'All-in {n}',
    'btn.bet': 'Bet {n}', 'btn.raiseTo': 'Raise auf {n}', 'btn.raise': 'Raise', 'btn.tip': 'Tipp vom Coach', 'btn.next': 'Nächste Hand',
    'preset.third': '⅓ Pot', 'preset.half': '½ Pot', 'preset.twothirds': '⅔ Pot', 'preset.pot': 'Pot', 'preset.allin': 'All-in',
    'log.title': 'Verlauf dieser Hand', 'log.blinds': 'Blinds 1/2 · deine Karten',
    'set.title': 'Einstellungen', 'set.level': 'Gegner', 'set.live': 'Live-Feedback nach jeder Aktion', 'set.reveal': 'Gegnerkarten nach jeder Hand zeigen',
    'set.madeHand': 'Meine aktuelle Hand anzeigen', 'set.speed': 'Tempo der KI', 'speed.fast': 'Schnell', 'speed.normal': 'Normal', 'speed.slow': 'Langsam',
    'set.newGame': 'Neues Spiel (Stacks zurücksetzen)', 'set.confirmNew': 'Neues Spiel starten? Beide Stacks werden auf 200 zurückgesetzt.',
    'level.easy': 'Locker', 'level.normal': 'Solide', 'level.hard': 'Aggressiv',
    'level.easy.desc': 'Callt viel, blufft selten, setzt nur mit starken Händen.',
    'level.normal.desc': 'Spielt nah an der Empfehlung des Coaches, blufft manchmal.',
    'level.hard.desc': 'Raist oft, blufft häufig, setzt groß – du musst öfter mutig callen.',
    'coach.intro': 'Spiel deine erste Hand. Mit „Tipp“ siehst du vor deiner Entscheidung, was der Coach machen würde. Nach jeder Aktion bekommst du Feedback.',
    'coach.yourTurn': 'Du bist dran. Brauchst du Hilfe? Tippe auf „Tipp vom Coach“ (Taste T).',
    'coach.botThinking': 'Die KI überlegt …', 'coach.thinking': 'Coach rechnet …',
    'coach.rec': 'Empfehlung', 'coach.alsoOk': 'Auch vertretbar: {list}',
    'coach.equity': 'Deine Equity', 'coach.need': 'benötigt',
    'review.title': 'Handrückblick', 'review.none': 'Du musstest in dieser Hand nichts entscheiden.', 'review.botCards': 'Karten der KI',
    'review.you': 'Du', 'review.coach': 'Coach', 'review.board': 'Board', 'review.toCall': 'zu callen', 'review.why': 'Warum?',
    'result.split': 'Split Pot', 'result.youWin': 'Du gewinnst {n}', 'result.botWins': 'KI gewinnt {n}', 'result.botFolded': 'Die KI hat gefoldet.',
    'result.youFolded': 'Du hast gefoldet.', 'result.net': 'Bilanz',
    'gameover.broke': 'Du bist pleite', 'gameover.won': 'Du hast alle Chips der KI gewonnen!', 'gameover.restart': 'Neues Spiel: beide starten wieder mit 200 Chips.',
    'verdict.good': 'Gut', 'verdict.ok': 'Vertretbar', 'verdict.bad': 'Fehler',
    'act.fold': 'Fold', 'act.check': 'Check', 'act.call': 'Call {n}', 'act.bet': 'Bet {n}', 'act.raise': 'Raise auf {n}', 'act.allin': 'All-in ({n})', 'act.betraise': 'Bet/Raise',
    'judge.good': '{a} – genau richtig.', 'judge.ok': '{a} ist vertretbar. Empfehlung: {r}.', 'judge.bad': '{a} war ein Fehler. Besser: {r}.',
    'judge.small': 'Richtige Idee, aber eher zu klein gesetzt – ca. {n} wäre besser, damit schlechtere Hände mehr zahlen und Draws keinen günstigen Preis bekommen.',
    'judge.big': 'Richtige Idee, aber sehr groß gesetzt – mit ca. {n} bezahlen dich mehr schlechtere Hände.',
    'judge.foldCheck': 'Niemand hat gesetzt – Check kostet nichts. Folden ist hier nie besser, du gibst den Pot kampflos ab.',
    'judge.evFold': 'Ein Call hätte im Schnitt etwa +{n} Chips gebracht.', 'judge.evCall': 'Der Call kostet im Schnitt etwa {n} Chips.',
    'r.rank': '{cls} gehört zu den besten {p} % aller Starthände.',
    'r.sbOpen': 'Im Heads-up ist der Small Blind (Button) in Position – eröffne mit einem Raise auf ca. 2,5 Big Blinds, um den Pot zu gewinnen oder mit Initiative zu spielen.',
    'r.sbLimp': 'Zu schwach zum Raisen, aber für einen halben Big Blind lohnt sich ein günstiger Blick auf den Flop (Limp).',
    'r.sbFold': 'Diese Hand gehört zu den schwächsten – auch im Heads-up lohnt sich hier selbst der halbe Big Blind kaum.',
    'r.bbIso': 'Der Gegner hat nur gelimpt (schwache Range). Mit einer starken Hand raist du auf ca. 4 Big Blinds für Value.',
    'r.bbCheck': 'Gratis-Flop: Check ist hier nie ein Fehler; ein Raise würde nur gegen bessere Hände bezahlt.',
    'r.range': 'Gegner-Range geschätzt: Top {p} % der Starthände{narrowed}. Deine Equity dagegen: {eq}.',
    'r.narrowed': ', durch seine Bets eingeengt',
    'r.odds': 'Pot Odds: {call} zahlen in einen Pot von {pot} → du brauchst {need} Equity.',
    'r.realize': 'Ohne Position realisierst du nur ca. {r} deiner Equity.',
    'r.reraise': 'Deine Hand ist stark genug für einen Re-Raise (Value): Du baust den Pot auf, während du vorne liegst.',
    'r.preCall': 'Die Equity reicht für einen Call.', 'r.preFold': 'Die Equity reicht nicht für den Preis – Fold spart Chips.',
    'r.draw': '{kind}: {outs} Outs ≈ {pct} % (Regel {mult}×Outs, {span}).', 'r.span.flop': 'Flop bis River', 'r.span.turn': 'nur noch River',
    'draw.fd': 'Flush-Draw', 'draw.oesd': 'Open-Ended Straight-Draw', 'draw.gut': 'Gutshot', 'draw.fdoesd': 'Flush-Draw + Open-Ender', 'draw.fdgut': 'Flush-Draw + Gutshot',
    'r.postRaise': 'Du bist klar vorne: Raise für Value, damit schlechtere Hände mehr bezahlen.',
    'r.postCall': 'Deine Equity ({eq}) liegt über dem Preis ({need}) – Call ist profitabel.',
    'r.implied': 'Knapp zu teuer, aber mit einem starken Draw gewinnst du später oft mehr, wenn du triffst (Implied Odds).',
    'r.postFold': 'Die Equity ({eq}) reicht nicht für den Preis ({need}) – Fold.',
    'r.value': 'Du liegst wahrscheinlich vorne: Bet für Value ({size}), damit schlechtere Hände bezahlen{draws}.',
    'r.size.pot': 'Pot-Größe', 'r.size.twothirds': 'ca. ⅔ Pot', 'r.value.draws': ' und Draws teuer werden',
    'r.semibluff': 'Semi-Bluff: Mit einem starken Draw setzt du ca. ½ Pot – entweder der Gegner foldet sofort, oder du triffst noch.',
    'r.potControl': 'Mittelstarke Hand: Check hält den Pot klein (Pot-Kontrolle) – zu setzen würde meist nur von besseren Händen bezahlt.',
    'r.weak': 'Zu schwach für Value: Check und billig weitersehen ist hier am besten.',
    'r.noRaise': 'Erhöhen ist nicht mehr möglich (Gegner ist all-in oder dein Stack reicht nicht).',
    'mistake.tooTight': 'Zu tight gefoldet', 'mistake.tooLoose': 'Zu loose gecallt', 'mistake.tooPassive': 'Zu passiv', 'mistake.tooAggressive': 'Zu aggressiv',
    'mistake.overplay': 'Überspielt', 'mistake.sizing': 'Bet-Größe', 'mistake.foldCheck': 'Fold statt Check', 'mistake.other': 'Andere Aktion',
    'tip.tooTight': 'Achte auf die Pot Odds: Wenn du nur wenig zahlen musst, reicht oft schon eine geringe Equity.',
    'tip.tooLoose': 'Rechne vor dem Call: zu callen ÷ (Pot + zu callen). Liegt deine Equity darunter, ist Fold richtig.',
    'tip.tooPassive': 'Mit starken Händen setzen und raisen – sonst bekommst du zu wenig Value.',
    'tip.tooAggressive': 'Bluffs brauchen einen Grund (Draw, gute Story, Position). Mittelstarke Hände lieber checken.',
    'tip.overplay': 'Nicht jede gute Hand ist einen Raise wert – oft ist Call besser, damit schwächere Hände im Pot bleiben.',
    'tip.sizing': 'Value-Bets meist ½ bis ⅔ Pot; zu kleine Bets geben Draws einen günstigen Preis.',
    'tip.foldCheck': 'Wenn niemand gesetzt hat, kannst du gratis checken – nie folden.',
    'tip.other': 'Schau dir im Handrückblick an, was der Coach empfohlen hätte.',
    'm.title': 'Starthände im Heads-up',
    'm.intro': 'Oben rechts suited (gleiche Farbe, „s“), unten links offsuit („o“), auf der Diagonale Paare. A = Ass, K = König, Q = Dame, J = Bube, T = Zehn. Tippe auf eine Hand für Details.',
    'm.view.sb': 'Small Blind: erste Aktion', 'm.view.bb': 'Big Blind gegen Raise', 'm.view.strength': 'Stärke',
    'm.raise': 'Raise (2,5 BB)', 'm.limp': 'Limp', 'm.fold': 'Fold', 'm.3bet': '3-Bet', 'm.call': 'Call', 'm.strong': 'stark', 'm.mid': 'mittel', 'm.weak': 'schwach',
    'm.type': 'Typ', 'm.pair': 'Paar', 'm.suited': 'suited (gleiche Farbe)', 'm.offsuit': 'offsuit', 'm.combos': '{n} Kombinationen',
    'm.rank': 'Rang', 'm.rankVal': '{r} von 169 (Top {p} %)', 'm.eqRandom': 'Equity vs. zufällige Hand',
    'm.sbFirst': 'Small Blind, erste Aktion', 'm.bbLimp': 'Big Blind gegen Limp', 'm.bbRaise': 'Big Blind gegen Raise',
    'm.a.raise25': 'Raise auf 2,5 BB', 'm.a.limp': 'Limp', 'm.a.fold': 'Fold', 'm.a.raise4': 'Raise auf 4 BB', 'm.a.check': 'Check', 'm.a.3bet': '3-Bet auf ca. 7,5 BB', 'm.a.call': 'Call',
    'm.n.premium': 'Premium-Paar: fast immer vorne. Baue den Pot auf!',
    'm.n.pair': 'Paare treffen auf dem Flop in ca. 12 % der Fälle ein Set (Drilling) – dann oft sehr profitabel.',
    'm.n.suited': 'Suited bringt ca. 2–3 % Equity extra (Flush-Chancen), wird aber oft überschätzt.',
    'm.n.ace': 'Ein Ass ist im Heads-up viel wert, weil der Gegner oft gar nichts trifft.',
    'm.n.connector': 'Connector: gute Chancen auf Straßen.',
    'q.mode.winner': 'Wer gewinnt?', 'q.mode.name': 'Was habe ich?', 'q.mode.odds': 'Pot Odds', 'q.mode.preflop': 'Preflop',
    'q.correct': 'Richtig', 'q.streak': 'Serie', 'q.right': 'Richtig!', 'q.wrong': 'Leider falsch.', 'q.next': 'Nächste Frage',
    'q.board': 'Board', 'q.yourCards': 'Deine Karten', 'q.playerA': 'Spieler A', 'q.playerB': 'Spieler B', 'q.split': 'Split Pot',
    'q.winner.q': 'Welcher Spieler gewinnt den Pot?', 'q.winner.ex': 'Spieler A: {a} · Spieler B: {b}.', 'q.winner.split': 'Beide haben exakt gleich starke 5 Karten.', 'q.winner.hl': 'Die besten 5 Karten sind hervorgehoben.',
    'q.name.q': 'Was ist deine beste 5-Karten-Hand?', 'q.name.ex': 'Du hast {h}.',
    'q.odds.q': '{street}: Der Gegner setzt {bet} und ist damit all-in. Call oder Fold?', 'q.odds.pot': 'Pot inkl. Bet: {pot} · zu callen: {bet}',
    'q.odds.assume': 'Annahme: Der Gegner hat schon eine bessere Hand, du gewinnst nur, wenn du deinen Draw triffst ({draw}).',
    'q.odds.ex': 'Benötigt: {bet} ÷ ({pot} + {bet}) = {need}. Deine Chance mit {outs} Outs {when}: {eq} (Faustregel {rule}). {verdict}',
    'q.odds.flop': 'am Flop (zwei Karten)', 'q.odds.turn': 'am Turn (eine Karte)', 'q.odds.callV': 'Die Chance ist höher als der Preis → Call.', 'q.odds.foldV': 'Der Preis ist zu hoch → Fold.',
    'q.draw.set': 'Pocket-Paar, das ein Set braucht',
    'q.pre.sb': 'Du bist Small Blind (Button) und als Erster dran. Was machst du?',
    'q.pre.bblimp': 'Du bist Big Blind. Der Gegner hat nur gelimpt. Was machst du?',
    'q.pre.bbraise': 'Du bist Big Blind. Der Gegner raist auf 2,5 BB (5 Chips). Was machst du?',
    'q.pre.o.raise25': 'Raise auf 2,5 BB', 'q.pre.o.limp': 'Limp (Call)', 'q.pre.o.fold': 'Fold', 'q.pre.o.raise4': 'Raise auf 4 BB', 'q.pre.o.check': 'Check', 'q.pre.o.3bet': '3-Bet', 'q.pre.o.call': 'Call',
    'q.pre.ex.sb': '{cls} gehört zu den besten {p} aller Hände. Im Heads-up raist der Button etwa die besten 65 %, limpt bis ca. 85 % und foldet den Rest.',
    'q.pre.ex.bblimp': '{cls} ist Top {p}. Gegen einen Limp raist man mit den besten ca. 30 % für Value, sonst Check – Folden wäre nie richtig, der Flop ist gratis.',
    'q.pre.ex.bbraise': 'Du zahlst 3 in einen Pot von 7 → du brauchst 30 % Equity. {cls} hat gegen die typische Raise-Range (Top 70 %) ca. {eq}; ohne Position realisierst du etwa 85 % davon (≈ {eff}). {v}',
    'q.pre.v.3bet': 'Die Hand ist sogar stark genug für eine 3-Bet (Top 12 %).', 'q.pre.v.call': 'Das reicht für einen Call.', 'q.pre.v.fold': 'Das reicht nicht – Fold.',
    's.hands': 'Gespielte Hände', 's.won': 'davon gewonnen: {p}', 's.net': 'Bilanz', 's.bb100': 'Chips ({n} BB/100 Hände)', 's.good': 'Gute Entscheidungen',
    's.rated': '{n} bewertete Entscheidungen', 's.vpip': 'VPIP / PFR', 's.vpipDesc': 'freiwillig investiert / Preflop-Raise', 's.sd': 'Showdowns gewonnen', 's.sdDesc': '{n} Showdowns',
    's.quiz': 'Quiz', 's.quizDesc': '{n} Fragen · beste Serie {s}', 's.byStreet': 'Entscheidungen nach Straße', 's.legend': 'Grün = gut, gelb = vertretbar, rot = Fehler',
    's.mistakes': 'Deine häufigsten Fehler', 's.noMistakes': 'Noch keine Fehler erfasst – spiel ein paar Hände!', 's.reset': 'Statistik zurücksetzen',
    's.confirmReset': 'Statistik wirklich zurücksetzen?', 's.local': 'Die Coach-Statistik wird nur in diesem Browser gespeichert.',
  },
  en: {
    'app.coach': 'Coach',
    'nav.training': 'Training', 'nav.matrix': 'Hands', 'nav.quiz': 'Quiz', 'nav.stats': 'Stats', 'nav.back': '← Poker Pro',
    'seat.you': 'You', 'seat.bot': 'AI',
    'street.preflop': 'Preflop', 'street.flop': 'Flop', 'street.turn': 'Turn', 'street.river': 'River', 'street.showdown': 'Showdown', 'street.over': 'Hand over',
    'pot': 'Pot', 'pot.paid': 'paid out',
    'btn.fold': 'Fold', 'btn.foldSure': 'Really fold? Check is free', 'btn.check': 'Check', 'btn.call': 'Call {n}', 'btn.allin': 'All-in {n}',
    'btn.bet': 'Bet {n}', 'btn.raiseTo': 'Raise to {n}', 'btn.raise': 'Raise', 'btn.tip': 'Coach tip', 'btn.next': 'Next hand',
    'preset.third': '⅓ pot', 'preset.half': '½ pot', 'preset.twothirds': '⅔ pot', 'preset.pot': 'Pot', 'preset.allin': 'All-in',
    'log.title': 'Hand history', 'log.blinds': 'Blinds 1/2 · your cards',
    'set.title': 'Settings', 'set.level': 'Opponent', 'set.live': 'Live feedback after every action', 'set.reveal': 'Show opponent cards after each hand',
    'set.madeHand': 'Show my current hand', 'set.speed': 'AI speed', 'speed.fast': 'Fast', 'speed.normal': 'Normal', 'speed.slow': 'Slow',
    'set.newGame': 'New game (reset stacks)', 'set.confirmNew': 'Start a new game? Both stacks are reset to 200.',
    'level.easy': 'Loose', 'level.normal': 'Solid', 'level.hard': 'Aggressive',
    'level.easy.desc': 'Calls a lot, rarely bluffs, bets only with strong hands.',
    'level.normal.desc': 'Plays close to the coach’s advice, bluffs sometimes.',
    'level.hard.desc': 'Raises often, bluffs a lot, bets big – you need to call down more.',
    'coach.intro': 'Play your first hand. Tap “Coach tip” to see what the coach would do before you decide. You get feedback after every action.',
    'coach.yourTurn': 'Your turn. Need help? Tap “Coach tip” (key T).',
    'coach.botThinking': 'The AI is thinking …', 'coach.thinking': 'Coach is calculating …',
    'coach.rec': 'Recommendation', 'coach.alsoOk': 'Also fine: {list}',
    'coach.equity': 'Your equity', 'coach.need': 'needed',
    'review.title': 'Hand review', 'review.none': 'You had no decision to make in this hand.', 'review.botCards': 'AI cards',
    'review.you': 'You', 'review.coach': 'Coach', 'review.board': 'Board', 'review.toCall': 'to call', 'review.why': 'Why?',
    'result.split': 'Split pot', 'result.youWin': 'You win {n}', 'result.botWins': 'AI wins {n}', 'result.botFolded': 'The AI folded.',
    'result.youFolded': 'You folded.', 'result.net': 'Net',
    'gameover.broke': 'You’re out of chips', 'gameover.won': 'You won all of the AI’s chips!', 'gameover.restart': 'New game: both players start with 200 chips again.',
    'verdict.good': 'Good', 'verdict.ok': 'Acceptable', 'verdict.bad': 'Mistake',
    'act.fold': 'Fold', 'act.check': 'Check', 'act.call': 'Call {n}', 'act.bet': 'Bet {n}', 'act.raise': 'Raise to {n}', 'act.allin': 'All-in ({n})', 'act.betraise': 'Bet/Raise',
    'judge.good': '{a} – exactly right.', 'judge.ok': '{a} is acceptable. Recommended: {r}.', 'judge.bad': '{a} was a mistake. Better: {r}.',
    'judge.small': 'Right idea, but a bit small – about {n} is better so worse hands pay more and draws don’t get a cheap price.',
    'judge.big': 'Right idea, but very big – at about {n} more worse hands will call you.',
    'judge.foldCheck': 'Nobody bet – checking is free. Folding is never better here; you give the pot away.',
    'judge.evFold': 'Calling would have won about +{n} chips on average.', 'judge.evCall': 'This call loses about {n} chips on average.',
    'r.rank': '{cls} is in the top {p} % of starting hands.',
    'r.sbOpen': 'Heads-up, the small blind (button) has position – open with a raise to about 2.5 big blinds to win the pot or play it with the initiative.',
    'r.sbLimp': 'Too weak to raise, but for half a big blind a cheap look at the flop is worth it (limp).',
    'r.sbFold': 'This is one of the weakest hands – even heads-up it is barely worth half a big blind.',
    'r.bbIso': 'The opponent only limped (weak range). With a strong hand, raise to about 4 big blinds for value.',
    'r.bbCheck': 'Free flop: checking is never a mistake here; a raise would mostly get called by better hands.',
    'r.range': 'Estimated opponent range: top {p} % of starting hands{narrowed}. Your equity against it: {eq}.',
    'r.narrowed': ', narrowed by their bets',
    'r.odds': 'Pot odds: {call} to call into a pot of {pot} → you need {need} equity.',
    'r.realize': 'Out of position you only realize about {r} of your equity.',
    'r.reraise': 'Your hand is strong enough to re-raise for value: build the pot while you’re ahead.',
    'r.preCall': 'Your equity is enough to call.', 'r.preFold': 'Your equity isn’t worth the price – folding saves chips.',
    'r.draw': '{kind}: {outs} outs ≈ {pct} % ({mult}× outs rule, {span}).', 'r.span.flop': 'flop to river', 'r.span.turn': 'river only',
    'draw.fd': 'Flush draw', 'draw.oesd': 'Open-ended straight draw', 'draw.gut': 'Gutshot', 'draw.fdoesd': 'Flush draw + open-ender', 'draw.fdgut': 'Flush draw + gutshot',
    'r.postRaise': 'You’re clearly ahead: raise for value so worse hands pay more.',
    'r.postCall': 'Your equity ({eq}) is above the price ({need}) – calling is profitable.',
    'r.implied': 'Slightly too expensive, but a strong draw often wins more later when it hits (implied odds).',
    'r.postFold': 'Your equity ({eq}) isn’t enough for the price ({need}) – fold.',
    'r.value': 'You’re probably ahead: bet for value ({size}) so worse hands pay{draws}.',
    'r.size.pot': 'pot size', 'r.size.twothirds': 'about ⅔ pot', 'r.value.draws': ' and draws pay a high price',
    'r.semibluff': 'Semi-bluff: with a strong draw, bet about ½ pot – either they fold now or you can still hit.',
    'r.potControl': 'Medium-strength hand: checking keeps the pot small (pot control) – a bet would mostly get called by better hands.',
    'r.weak': 'Too weak to bet for value: check and see the next card cheaply.',
    'r.noRaise': 'Raising isn’t possible any more (opponent is all-in or your stack is too short).',
    'mistake.tooTight': 'Folded too tight', 'mistake.tooLoose': 'Called too loose', 'mistake.tooPassive': 'Too passive', 'mistake.tooAggressive': 'Too aggressive',
    'mistake.overplay': 'Overplayed', 'mistake.sizing': 'Bet sizing', 'mistake.foldCheck': 'Fold instead of check', 'mistake.other': 'Other action',
    'tip.tooTight': 'Watch the pot odds: when you only have to pay a little, small equity is often enough.',
    'tip.tooLoose': 'Do the math before calling: to call ÷ (pot + to call). If your equity is lower, fold.',
    'tip.tooPassive': 'Bet and raise your strong hands – otherwise you don’t get enough value.',
    'tip.tooAggressive': 'Bluffs need a reason (draw, good story, position). Check medium hands instead.',
    'tip.overplay': 'Not every good hand is worth a raise – calling often keeps weaker hands in the pot.',
    'tip.sizing': 'Value bets are usually ½ to ⅔ pot; small bets give draws a cheap price.',
    'tip.foldCheck': 'When nobody has bet, you can check for free – never fold.',
    'tip.other': 'Check the hand review to see what the coach recommended.',
    'm.title': 'Heads-up starting hands',
    'm.intro': 'Top right: suited (same suit, “s”), bottom left: offsuit (“o”), diagonal: pairs. A = Ace, K = King, Q = Queen, J = Jack, T = Ten. Tap a hand for details.',
    'm.view.sb': 'Small blind: first action', 'm.view.bb': 'Big blind vs. raise', 'm.view.strength': 'Strength',
    'm.raise': 'Raise (2.5 BB)', 'm.limp': 'Limp', 'm.fold': 'Fold', 'm.3bet': '3-bet', 'm.call': 'Call', 'm.strong': 'strong', 'm.mid': 'medium', 'm.weak': 'weak',
    'm.type': 'Type', 'm.pair': 'Pair', 'm.suited': 'suited (same suit)', 'm.offsuit': 'offsuit', 'm.combos': '{n} combinations',
    'm.rank': 'Rank', 'm.rankVal': '{r} of 169 (top {p} %)', 'm.eqRandom': 'Equity vs. random hand',
    'm.sbFirst': 'Small blind, first action', 'm.bbLimp': 'Big blind vs. limp', 'm.bbRaise': 'Big blind vs. raise',
    'm.a.raise25': 'Raise to 2.5 BB', 'm.a.limp': 'Limp', 'm.a.fold': 'Fold', 'm.a.raise4': 'Raise to 4 BB', 'm.a.check': 'Check', 'm.a.3bet': '3-bet to ~7.5 BB', 'm.a.call': 'Call',
    'm.n.premium': 'Premium pair: almost always ahead. Build the pot!',
    'm.n.pair': 'Pairs flop a set about 12 % of the time – often very profitable.',
    'm.n.suited': 'Suited adds about 2–3 % equity (flush chances), but is often overrated.',
    'm.n.ace': 'An ace is worth a lot heads-up because the opponent often hits nothing.',
    'm.n.connector': 'Connector: good straight chances.',
    'q.mode.winner': 'Who wins?', 'q.mode.name': 'What do I have?', 'q.mode.odds': 'Pot odds', 'q.mode.preflop': 'Preflop',
    'q.correct': 'Correct', 'q.streak': 'Streak', 'q.right': 'Correct!', 'q.wrong': 'Not quite.', 'q.next': 'Next question',
    'q.board': 'Board', 'q.yourCards': 'Your cards', 'q.playerA': 'Player A', 'q.playerB': 'Player B', 'q.split': 'Split pot',
    'q.winner.q': 'Which player wins the pot?', 'q.winner.ex': 'Player A: {a} · Player B: {b}.', 'q.winner.split': 'Both have exactly the same five cards in strength.', 'q.winner.hl': 'The best five cards are highlighted.',
    'q.name.q': 'What is your best five-card hand?', 'q.name.ex': 'You have {h}.',
    'q.odds.q': '{street}: The opponent bets {bet} and is all-in. Call or fold?', 'q.odds.pot': 'Pot incl. bet: {pot} · to call: {bet}',
    'q.odds.assume': 'Assume the opponent already has a better hand – you only win if you hit your draw ({draw}).',
    'q.odds.ex': 'Needed: {bet} ÷ ({pot} + {bet}) = {need}. Your chance with {outs} outs {when}: {eq} (rule of thumb {rule}). {verdict}',
    'q.odds.flop': 'on the flop (two cards to come)', 'q.odds.turn': 'on the turn (one card to come)', 'q.odds.callV': 'Your chance beats the price → call.', 'q.odds.foldV': 'The price is too high → fold.',
    'q.draw.set': 'Pocket pair needing a set',
    'q.pre.sb': 'You are the small blind (button) and first to act. What do you do?',
    'q.pre.bblimp': 'You are the big blind. The opponent only limped. What do you do?',
    'q.pre.bbraise': 'You are the big blind. The opponent raises to 2.5 BB (5 chips). What do you do?',
    'q.pre.o.raise25': 'Raise to 2.5 BB', 'q.pre.o.limp': 'Limp (call)', 'q.pre.o.fold': 'Fold', 'q.pre.o.raise4': 'Raise to 4 BB', 'q.pre.o.check': 'Check', 'q.pre.o.3bet': '3-bet', 'q.pre.o.call': 'Call',
    'q.pre.ex.sb': '{cls} is in the top {p} of hands. Heads-up the button raises about the best 65 %, limps up to about 85 % and folds the rest.',
    'q.pre.ex.bblimp': '{cls} is top {p}. Against a limp you raise the best ~30 % for value, otherwise check – folding is never right, the flop is free.',
    'q.pre.ex.bbraise': 'You pay 3 into a pot of 7 → you need 30 % equity. {cls} has about {eq} against a typical raising range (top 70 %); out of position you realize about 85 % of it (≈ {eff}). {v}',
    'q.pre.v.3bet': 'It’s even strong enough to 3-bet (top 12 %).', 'q.pre.v.call': 'That’s enough to call.', 'q.pre.v.fold': 'Not enough – fold.',
    's.hands': 'Hands played', 's.won': 'won: {p}', 's.net': 'Net', 's.bb100': 'chips ({n} BB/100 hands)', 's.good': 'Good decisions',
    's.rated': '{n} rated decisions', 's.vpip': 'VPIP / PFR', 's.vpipDesc': 'voluntarily invested / preflop raise', 's.sd': 'Showdowns won', 's.sdDesc': '{n} showdowns',
    's.quiz': 'Quiz', 's.quizDesc': '{n} questions · best streak {s}', 's.byStreet': 'Decisions by street', 's.legend': 'Green = good, yellow = acceptable, red = mistake',
    's.mistakes': 'Your most common mistakes', 's.noMistakes': 'No mistakes recorded yet – play a few hands!', 's.reset': 'Reset stats',
    's.confirmReset': 'Really reset the stats?', 's.local': 'Coach stats are stored in this browser only.',
  },
  pl: {
    'app.coach': 'Trener',
    'nav.training': 'Trening', 'nav.matrix': 'Ręce', 'nav.quiz': 'Quiz', 'nav.stats': 'Statystyki', 'nav.back': '← Poker Pro',
    'seat.you': 'Ty', 'seat.bot': 'AI',
    'street.preflop': 'Preflop', 'street.flop': 'Flop', 'street.turn': 'Turn', 'street.river': 'River', 'street.showdown': 'Showdown', 'street.over': 'Koniec rozdania',
    'pot': 'Pula', 'pot.paid': 'wypłacona',
    'btn.fold': 'Fold', 'btn.foldSure': 'Na pewno fold? Check jest za darmo', 'btn.check': 'Check', 'btn.call': 'Call {n}', 'btn.allin': 'All-in {n}',
    'btn.bet': 'Bet {n}', 'btn.raiseTo': 'Raise do {n}', 'btn.raise': 'Raise', 'btn.tip': 'Wskazówka trenera', 'btn.next': 'Następne rozdanie',
    'preset.third': '⅓ puli', 'preset.half': '½ puli', 'preset.twothirds': '⅔ puli', 'preset.pot': 'Pula', 'preset.allin': 'All-in',
    'log.title': 'Przebieg rozdania', 'log.blinds': 'Blindy 1/2 · twoje karty',
    'set.title': 'Ustawienia', 'set.level': 'Przeciwnik', 'set.live': 'Ocena na żywo po każdej akcji', 'set.reveal': 'Pokaż karty przeciwnika po rozdaniu',
    'set.madeHand': 'Pokaż mój aktualny układ', 'set.speed': 'Tempo AI', 'speed.fast': 'Szybko', 'speed.normal': 'Normalnie', 'speed.slow': 'Wolno',
    'set.newGame': 'Nowa gra (reset stacków)', 'set.confirmNew': 'Zacząć nową grę? Oba stacki wrócą do 200.',
    'level.easy': 'Luźny', 'level.normal': 'Solidny', 'level.hard': 'Agresywny',
    'level.easy.desc': 'Dużo sprawdza, rzadko blefuje, betuje tylko silnymi rękami.',
    'level.normal.desc': 'Gra blisko zaleceń trenera, czasem blefuje.',
    'level.hard.desc': 'Często podbija, dużo blefuje, gra duże bety – musisz częściej odważnie sprawdzać.',
    'coach.intro': 'Zagraj pierwsze rozdanie. „Wskazówka trenera” pokaże, co zrobiłby trener, zanim podejmiesz decyzję. Po każdej akcji dostaniesz ocenę.',
    'coach.yourTurn': 'Twój ruch. Potrzebujesz pomocy? Dotknij „Wskazówka trenera” (klawisz T).',
    'coach.botThinking': 'AI się zastanawia …', 'coach.thinking': 'Trener liczy …',
    'coach.rec': 'Zalecenie', 'coach.alsoOk': 'Też w porządku: {list}',
    'coach.equity': 'Twoje equity', 'coach.need': 'potrzebne',
    'review.title': 'Analiza rozdania', 'review.none': 'W tym rozdaniu nie musiałeś nic decydować.', 'review.botCards': 'Karty AI',
    'review.you': 'Ty', 'review.coach': 'Trener', 'review.board': 'Stół', 'review.toCall': 'do sprawdzenia', 'review.why': 'Dlaczego?',
    'result.split': 'Podział puli', 'result.youWin': 'Wygrywasz {n}', 'result.botWins': 'AI wygrywa {n}', 'result.botFolded': 'AI spasowało.',
    'result.youFolded': 'Spasowałeś.', 'result.net': 'Bilans',
    'gameover.broke': 'Skończyły ci się żetony', 'gameover.won': 'Wygrałeś wszystkie żetony AI!', 'gameover.restart': 'Nowa gra: obaj zaczynają znów z 200 żetonami.',
    'verdict.good': 'Dobrze', 'verdict.ok': 'W porządku', 'verdict.bad': 'Błąd',
    'act.fold': 'Fold', 'act.check': 'Check', 'act.call': 'Call {n}', 'act.bet': 'Bet {n}', 'act.raise': 'Raise do {n}', 'act.allin': 'All-in ({n})', 'act.betraise': 'Bet/Raise',
    'judge.good': '{a} – dokładnie tak.', 'judge.ok': '{a} jest w porządku. Zalecenie: {r}.', 'judge.bad': '{a} to był błąd. Lepiej: {r}.',
    'judge.small': 'Dobry pomysł, ale za mały bet – lepiej ok. {n}, żeby słabsze ręce płaciły więcej, a drawy nie dostały taniej ceny.',
    'judge.big': 'Dobry pomysł, ale bardzo duży bet – przy ok. {n} sprawdzi cię więcej słabszych rąk.',
    'judge.foldCheck': 'Nikt nie betował – check nic nie kosztuje. Fold nigdy nie jest tu lepszy, oddajesz pulę bez walki.',
    'judge.evFold': 'Call dałby średnio ok. +{n} żetonów.', 'judge.evCall': 'Ten call kosztuje średnio ok. {n} żetonów.',
    'r.rank': '{cls} należy do najlepszych {p} % rąk startowych.',
    'r.sbOpen': 'W heads-upie small blind (button) ma pozycję – otwórz raise do ok. 2,5 big blinda, żeby wygrać pulę albo grać z inicjatywą.',
    'r.sbLimp': 'Za słaba na raise, ale za pół big blinda tani flop się opłaca (limp).',
    'r.sbFold': 'To jedna z najsłabszych rąk – nawet w heads-upie nie warto dopłacać pół big blinda.',
    'r.bbIso': 'Przeciwnik tylko limpnął (słaby zakres). Silną ręką podbij do ok. 4 big blindów dla value.',
    'r.bbCheck': 'Darmowy flop: check nigdy nie jest tu błędem; raise sprawdzałyby głównie lepsze ręce.',
    'r.range': 'Szacowany zakres przeciwnika: top {p} % rąk startowych{narrowed}. Twoje equity przeciwko niemu: {eq}.',
    'r.narrowed': ', zawężony przez jego bety',
    'r.odds': 'Pot odds: {call} do sprawdzenia przy puli {pot} → potrzebujesz {need} equity.',
    'r.realize': 'Bez pozycji realizujesz tylko ok. {r} swojego equity.',
    'r.reraise': 'Twoja ręka jest wystarczająco silna na re-raise dla value: buduj pulę, gdy prowadzisz.',
    'r.preCall': 'Equity wystarcza na call.', 'r.preFold': 'Equity nie jest warte tej ceny – fold oszczędza żetony.',
    'r.draw': '{kind}: {outs} outów ≈ {pct} % (zasada {mult}× outy, {span}).', 'r.span.flop': 'od flopa do rivera', 'r.span.turn': 'tylko river',
    'draw.fd': 'Flush draw', 'draw.oesd': 'Open-ended straight draw', 'draw.gut': 'Gutshot', 'draw.fdoesd': 'Flush draw + open-ender', 'draw.fdgut': 'Flush draw + gutshot',
    'r.postRaise': 'Wyraźnie prowadzisz: raise dla value, żeby słabsze ręce zapłaciły więcej.',
    'r.postCall': 'Twoje equity ({eq}) jest wyższe niż cena ({need}) – call się opłaca.',
    'r.implied': 'Trochę za drogo, ale silny draw często wygrywa później więcej, gdy trafi (implied odds).',
    'r.postFold': 'Equity ({eq}) nie wystarcza na tę cenę ({need}) – fold.',
    'r.value': 'Prawdopodobnie prowadzisz: bet dla value ({size}), żeby słabsze ręce płaciły{draws}.',
    'r.size.pot': 'wielkość puli', 'r.size.twothirds': 'ok. ⅔ puli', 'r.value.draws': ', a drawy płaciły drogo',
    'r.semibluff': 'Semi-blef: z silnym drawem betuj ok. ½ puli – albo przeciwnik spasuje od razu, albo jeszcze trafisz.',
    'r.potControl': 'Średnia ręka: check trzyma małą pulę (kontrola puli) – bet sprawdzałyby głównie lepsze ręce.',
    'r.weak': 'Za słaba na value: check i tanio zobacz następną kartę.',
    'r.noRaise': 'Podbicie nie jest już możliwe (przeciwnik jest all-in albo masz za mało żetonów).',
    'mistake.tooTight': 'Za ciasny fold', 'mistake.tooLoose': 'Za luźny call', 'mistake.tooPassive': 'Za pasywnie', 'mistake.tooAggressive': 'Za agresywnie',
    'mistake.overplay': 'Za mocno zagrane', 'mistake.sizing': 'Wielkość betu', 'mistake.foldCheck': 'Fold zamiast check', 'mistake.other': 'Inna akcja',
    'tip.tooTight': 'Patrz na pot odds: gdy musisz dopłacić mało, często wystarcza niewielkie equity.',
    'tip.tooLoose': 'Policz przed callem: do sprawdzenia ÷ (pula + do sprawdzenia). Jeśli equity jest niższe – fold.',
    'tip.tooPassive': 'Betuj i podbijaj silne ręce – inaczej tracisz value.',
    'tip.tooAggressive': 'Blef potrzebuje powodu (draw, dobra historia, pozycja). Średnie ręce raczej checkuj.',
    'tip.overplay': 'Nie każda dobra ręka jest warta raise – call często trzyma słabsze ręce w puli.',
    'tip.sizing': 'Bety dla value zwykle ½ do ⅔ puli; małe bety dają drawom tanią cenę.',
    'tip.foldCheck': 'Gdy nikt nie betował, możesz checkować za darmo – nigdy nie pasuj.',
    'tip.other': 'Zobacz w analizie rozdania, co zalecił trener.',
    'm.title': 'Ręce startowe w heads-upie',
    'm.intro': 'Prawy górny róg: suited (ten sam kolor, „s”), lewy dolny: offsuit („o”), przekątna: pary. A = As, K = Król, Q = Dama, J = Walet, T = Dziesiątka. Dotknij rękę, aby zobaczyć szczegóły.',
    'm.view.sb': 'Small blind: pierwsza akcja', 'm.view.bb': 'Big blind vs raise', 'm.view.strength': 'Siła',
    'm.raise': 'Raise (2,5 BB)', 'm.limp': 'Limp', 'm.fold': 'Fold', 'm.3bet': '3-bet', 'm.call': 'Call', 'm.strong': 'silna', 'm.mid': 'średnia', 'm.weak': 'słaba',
    'm.type': 'Typ', 'm.pair': 'Para', 'm.suited': 'suited (ten sam kolor)', 'm.offsuit': 'offsuit', 'm.combos': '{n} kombinacji',
    'm.rank': 'Ranking', 'm.rankVal': '{r} ze 169 (top {p} %)', 'm.eqRandom': 'Equity vs losowa ręka',
    'm.sbFirst': 'Small blind, pierwsza akcja', 'm.bbLimp': 'Big blind vs limp', 'm.bbRaise': 'Big blind vs raise',
    'm.a.raise25': 'Raise do 2,5 BB', 'm.a.limp': 'Limp', 'm.a.fold': 'Fold', 'm.a.raise4': 'Raise do 4 BB', 'm.a.check': 'Check', 'm.a.3bet': '3-bet do ok. 7,5 BB', 'm.a.call': 'Call',
    'm.n.premium': 'Para premium: prawie zawsze prowadzi. Buduj pulę!',
    'm.n.pair': 'Pary trafiają seta na flopie w ok. 12 % przypadków – wtedy często bardzo opłacalnie.',
    'm.n.suited': 'Suited daje ok. 2–3 % equity więcej (szanse na kolor), ale bywa przeceniane.',
    'm.n.ace': 'As jest w heads-upie dużo wart, bo przeciwnik często nic nie trafia.',
    'm.n.connector': 'Connector: dobre szanse na strita.',
    'q.mode.winner': 'Kto wygrywa?', 'q.mode.name': 'Co mam?', 'q.mode.odds': 'Pot odds', 'q.mode.preflop': 'Preflop',
    'q.correct': 'Poprawnie', 'q.streak': 'Seria', 'q.right': 'Dobrze!', 'q.wrong': 'Niestety źle.', 'q.next': 'Następne pytanie',
    'q.board': 'Stół', 'q.yourCards': 'Twoje karty', 'q.playerA': 'Gracz A', 'q.playerB': 'Gracz B', 'q.split': 'Podział puli',
    'q.winner.q': 'Który gracz wygrywa pulę?', 'q.winner.ex': 'Gracz A: {a} · Gracz B: {b}.', 'q.winner.split': 'Obaj mają dokładnie tak samo silne 5 kart.', 'q.winner.hl': 'Najlepsze 5 kart jest podświetlone.',
    'q.name.q': 'Jaki jest twój najlepszy układ 5 kart?', 'q.name.ex': 'Masz: {h}.',
    'q.odds.q': '{street}: Przeciwnik betuje {bet} i jest all-in. Call czy fold?', 'q.odds.pot': 'Pula z betem: {pot} · do sprawdzenia: {bet}',
    'q.odds.assume': 'Założenie: przeciwnik ma już lepszą rękę – wygrywasz tylko, gdy trafisz draw ({draw}).',
    'q.odds.ex': 'Potrzebne: {bet} ÷ ({pot} + {bet}) = {need}. Twoja szansa z {outs} outami {when}: {eq} (zasada kciuka {rule}). {verdict}',
    'q.odds.flop': 'na flopie (dwie karty)', 'q.odds.turn': 'na turnie (jedna karta)', 'q.odds.callV': 'Szansa jest wyższa niż cena → call.', 'q.odds.foldV': 'Cena jest za wysoka → fold.',
    'q.draw.set': 'Para w ręku, która potrzebuje seta',
    'q.pre.sb': 'Jesteś small blindem (button) i działasz pierwszy. Co robisz?',
    'q.pre.bblimp': 'Jesteś big blindem. Przeciwnik tylko limpnął. Co robisz?',
    'q.pre.bbraise': 'Jesteś big blindem. Przeciwnik podbija do 2,5 BB (5 żetonów). Co robisz?',
    'q.pre.o.raise25': 'Raise do 2,5 BB', 'q.pre.o.limp': 'Limp (call)', 'q.pre.o.fold': 'Fold', 'q.pre.o.raise4': 'Raise do 4 BB', 'q.pre.o.check': 'Check', 'q.pre.o.3bet': '3-bet', 'q.pre.o.call': 'Call',
    'q.pre.ex.sb': '{cls} należy do najlepszych {p} rąk. W heads-upie button podbija ok. 65 % najlepszych rąk, limpuje do ok. 85 % i pasuje resztę.',
    'q.pre.ex.bblimp': '{cls} to top {p}. Przeciw limpowi podbijasz ok. 30 % najlepszych rąk dla value, inaczej check – fold nigdy nie jest dobry, flop jest za darmo.',
    'q.pre.ex.bbraise': 'Płacisz 3 do puli 7 → potrzebujesz 30 % equity. {cls} ma ok. {eq} przeciw typowemu zakresowi raise (top 70 %); bez pozycji realizujesz ok. 85 % (≈ {eff}). {v}',
    'q.pre.v.3bet': 'Ręka jest nawet wystarczająco silna na 3-bet (top 12 %).', 'q.pre.v.call': 'To wystarcza na call.', 'q.pre.v.fold': 'To za mało – fold.',
    's.hands': 'Rozegrane rozdania', 's.won': 'wygrane: {p}', 's.net': 'Bilans', 's.bb100': 'żetonów ({n} BB/100 rozdań)', 's.good': 'Dobre decyzje',
    's.rated': '{n} ocenionych decyzji', 's.vpip': 'VPIP / PFR', 's.vpipDesc': 'dobrowolnie w puli / raise preflop', 's.sd': 'Wygrane showdowny', 's.sdDesc': '{n} showdownów',
    's.quiz': 'Quiz', 's.quizDesc': '{n} pytań · najlepsza seria {s}', 's.byStreet': 'Decyzje według ulicy', 's.legend': 'Zielony = dobrze, żółty = w porządku, czerwony = błąd',
    's.mistakes': 'Twoje najczęstsze błędy', 's.noMistakes': 'Brak zapisanych błędów – zagraj kilka rozdań!', 's.reset': 'Resetuj statystyki',
    's.confirmReset': 'Na pewno zresetować statystyki?', 's.local': 'Statystyki trenera są zapisane tylko w tej przeglądarce.',
  },
};

function detect() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch { /* kein Speicher */ }
  const nav = (navigator.language || 'de').slice(0, 2).toLowerCase();
  return LANGS.includes(nav) ? nav : 'de';
}

let lang = detect();
export const getLang = () => lang;

export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* kein Speicher */ }
}

export function t(key, params = {}) {
  const s = D[lang][key] ?? D.de[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : ''));
}

export const pct = (x) => `${Math.round(x * 100)} %`;
export const rankName = (r) => RANKS[lang][r];
export const suitName = (s) => SUITS[lang][s];
export const cardName = (c) => `${SUITS[lang][c & 3]} ${RANKS[lang][rankOf(c)]}`;

const B5 = 16 ** 5;
const rankAt = (score, i) => Math.floor(score / 16 ** (4 - i)) % 16;

/** Kategorie-Index 0–9 (9 = Royal Flush). */
export function categoryIndex(score) {
  const cat = Math.floor(score / B5);
  return cat === 8 && rankAt(score, 0) === 12 ? 9 : cat;
}
export const categoryLabel = (score) => CATEGORIES[lang][categoryIndex(score)];

/** Übersetzter Handname wie „Two Pair, Aces and Kings“. */
export function handNameT(score) {
  const ci = categoryIndex(score);
  const r0 = rankAt(score, 0);
  const r1 = rankAt(score, 1);
  const C = CATEGORIES[lang][ci];
  const R = RANKS[lang];
  const P = RANKS_PL[lang];
  if (ci === 9) return C;
  if (lang === 'en') {
    switch (ci) {
      case 8: return `${C}, ${R[r0]} high`;
      case 7: return `${C}, ${P[r0]}`;
      case 6: return `${C}, ${P[r0]} full of ${P[r1]}`;
      case 5: return `${C}, ${R[r0]} high`;
      case 4: return `${C}, ${R[r0]} high`;
      case 3: return `${C}, ${P[r0]}`;
      case 2: return `${C}, ${P[r0]} and ${P[r1]}`;
      case 1: return `${C} of ${P[r0]}`;
      default: return `${C}, ${R[r0]}`;
    }
  }
  if (lang === 'pl') {
    switch (ci) {
      case 8: case 5: case 4: return `${C}, najwyższa: ${R[r0]}`;
      case 7: case 3: case 1: return `${C}: ${P[r0]}`;
      case 6: return `${C}: ${P[r0]} i ${P[r1]}`;
      case 2: return `${C}: ${P[r0]} i ${P[r1]}`;
      default: return `${C}: ${R[r0]}`;
    }
  }
  switch (ci) {
    case 8: return `${C} bis ${R[r0]}`;
    case 7: return `${C}, ${P[r0]}`;
    case 6: return `${C}, ${P[r0]} über ${P[r1]}`;
    case 5: return `${C}, ${R[r0]} hoch`;
    case 4: return `${C} bis ${R[r0]}`;
    case 3: return `${C}, ${P[r0]}`;
    case 2: return `${C}, ${P[r0]} und ${P[r1]}`;
    case 1: return `${C}, ${P[r0]}`;
    default: return `${C} ${R[r0]}`;
  }
}
