// Alles, was Cäsar so von sich gibt.

export const CAESAR = {
  idle: [
    'Mehr Sand als vorher, Kevin. Typisch.',
    'Ich sehe immer noch Sand. Überall. Sand.',
    'Rom wurde nicht an einem Tag erbaut. Aber es wurde wenigstens erbaut, Kevin.',
    'Ist das eine Schaufel oder ein Teelöffel?',
    'Ich kam, ich sah – ich sah Sand.',
    'Kleopatra fragt, ob du überhaupt schon angefangen hast.',
    'Bei dem Tempo bist du in vier Millionen Jahren fertig. Grob geschätzt.',
    'Mein Senat schaufelt schneller. Und der schläft.',
    'Das Kamel da hinten arbeitet mehr als du.',
    'Schneller, Kevin! Die Pyramiden sehen schon ganz staubig aus.',
    'Hast du mal überlegt, die Wüste einfach umzubenennen?',
    'Weißt du, was Brutus jetzt sagen würde? Ich auch nicht. Schaufel weiter.',
    'Ich habe 30 Tage gesagt, nicht 30 Jahrhunderte.',
    'Jedes Sandkorn zählt, Kevin. Das hier zählt ungefähr gar nicht.',
    'Ich zähle die Sandkörner persönlich nach. Alle.',
  ],
  bought: {
    eimer: 'Ein Eimer. Wow. Ganz Rom ist beeindruckt.',
    schaufel: 'Eine echte Schaufel! Kevin wird erwachsen.',
    ventilator: 'Ein Ventilator in der Wüste. Genial. Wirklich.',
    kamel: 'Ein Kamel? Hoffentlich ist es klüger als du.',
    bagger: 'Ein Bagger! Was soll da schon schiefgehen?',
    zauberer: 'Ein Zauberer. Ich habe kein gutes Gefühl dabei.',
    raumschiff: 'Ein Raumschiff?! Woher hast du … egal. SCHAUFELN!',
  },
  stormFail: [
    'Mehr Sand als vorher, Kevin. Typisch.',
    'Der Sandsturm war … ein Sandsturm. Wer hätte das gedacht.',
    'Großartig. Jetzt ist auch noch Sand in meiner Toga.',
  ],
  stormWin: [
    'Hm. Das war … akzeptabel. Sag es keinem.',
    'Zauberei! Ich lasse den Zauberer trotzdem prüfen.',
  ],
  baggerStuck: [
    'Der Bagger steckt fest. Natürlich steckt er fest.',
    'Wer hat dem Bagger gesagt, dass er IN die Düne fahren soll?',
  ],
  baggerFree: [
    'Der Bagger ist frei. Ein Wunder. Weiter!',
  ],
  sunset: [
    'Feierabend? Ich kenne keinen Feierabend, Kevin!',
    'Er schläft. Im Sand. Auf der Arbeit. Unglaublich.',
  ],
  newDay: (day) => `Tag ${day}. Ich zähle mit, Kevin.`,
  overtime: (day) => `Tag ${day} von 30. Das nennt man Überstunden, Kevin.`,
  welcomeBack: [
    'Ah, Kevin ist wieder da. Der Sand hat dich vermisst.',
    'Du warst weg? Hab ich gar nicht gemerkt. Der Sand auch nicht.',
  ],
  camelTap: [
    'Lass das Kamel in Ruhe und schaufel!',
    'Das Kamel ignoriert dich. Kluges Tier.',
  ],
  milestones: [
    [100, 'Hundert Sand. Schon? Fast hätte ich es bemerkt.'],
    [1000, 'Tausend Sand! Ich lasse schon mal die Triumphparade planen. Für in 3000 Jahren.'],
    [10000, 'Zehntausend. Ägypten merkt langsam … nichts.'],
    [100000, 'Hunderttausend Sand. Die Wüste lacht über dich, Kevin.'],
    [1000000, 'Eine Million! Das sind fast 0,0002 %. Fast.'],
    [10000000, 'Zehn Millionen. Ich bin … fast nicht enttäuscht.'],
    [100000000, 'Hundert Millionen Sand. Kevin, ich bin sprachlos. Fast.'],
  ],
};

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}
