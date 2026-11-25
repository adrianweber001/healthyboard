// Reine Spiellogik – kein DOM, keine Netzwerkzugriffe.
// WICHTIG: Preise, Wachstumsfaktor und Werte müssen zu supabase/schema.sql passen
// (dort wird der Spielstand serverseitig plausibilisiert).

export const EGYPT_SAND = 5e11;          // so viele Schaufeln Sand hat Ägypten (grob geschätzt von Kevin)
export const DAY_LENGTH = 180;           // ein Spieltag = 3 Minuten aktives Spielen
export const MAX_DAYS = 30;
export const OFFLINE_CAP = 8 * 3600;     // max. 8 Stunden Offline-Fortschritt
export const CAMEL_OFFLINE_RATE = 3;     // das Kamel selbst schaufelt 3 Sand/s, solange du weg bist
export const PRICE_GROWTH = 1.15;        // jede weitere Stufe kostet 15 % mehr
export const MIN_TAP_INTERVAL = 45;      // ms – max. ~22 Tipps pro Sekunde
export const STORM_COOLDOWN = 30;        // s
export const STORM_DURATION = 10;        // s
export const STORM_MULTIPLIER = 10;
export const BAGGER_STUCK_CHANCE = 0.03; // pro Tipp
export const BAGGER_FREE_TAPS = 5;

export const UPGRADES = [
  { id: 'eimer',      name: 'Eimer',         base: 10,    stack: true,  desc: '+1 Sand pro Tipp' },
  { id: 'schaufel',   name: 'Schaufel',      base: 50,    stack: true,  desc: '+5 Sand pro Tipp' },
  { id: 'ventilator', name: 'Ventilator',    base: 200,   stack: true,  desc: 'Automatisch +2 Sand pro Sekunde' },
  { id: 'kamel',      name: 'Kamel-Gehilfe', base: 300,   stack: false, desc: 'Schaufelt weiter, während du offline bist (max. 8 Std.)' },
  { id: 'bagger',     name: 'Bagger',        base: 1000,  stack: true,  desc: '+50 Sand pro Tipp – bleibt aber manchmal in der Düne stecken' },
  { id: 'zauberer',   name: 'Zauberer',      base: 5000,  stack: false, desc: 'Sandsturm: 50 % Chance auf x10 Sand, sonst kommt Sand zurück' },
  { id: 'raumschiff', name: 'Raumschiff',    base: 20000, stack: true,  desc: 'Traktorstrahl: +500 Sand pro Sekunde' },
];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export function priceOf(id, level) {
  const up = UPGRADE_BY_ID[id];
  return Math.floor(up.base * Math.pow(PRICE_GROWTH, level));
}

export function sanitizeUpgrades(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const up of UPGRADES) {
    let lvl = Math.floor(Number(raw[up.id]) || 0);
    lvl = Math.max(0, Math.min(up.stack ? 500 : 1, lvl));
    if (lvl > 0) out[up.id] = lvl;
  }
  return out;
}

export function totalSpent(upgrades) {
  let sum = 0;
  for (const [id, lvl] of Object.entries(upgrades)) {
    for (let i = 0; i < lvl; i++) sum += priceOf(id, i);
  }
  return sum;
}

const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

export class Game {
  constructor(data = {}, emit = () => {}) {
    this.emit = emit;
    this.s = {
      gold: num(data.gold),
      goldEarned: num(data.gold_earned),
      sandRemoved: num(data.sand_removed),
      upgrades: sanitizeUpgrades(data.upgrades),
      day: Math.max(1, Math.floor(num(data.day)) || 1),
      daySeconds: Math.min(DAY_LENGTH, num(data.day_seconds)),
      sleeping: !!data.sleeping,
    };
    this.r = { baggerStuck: false, freeTaps: 0, stormUntil: 0, stormReadyAt: 0, lastTap: -Infinity };
  }

  lvl(id) { return this.s.upgrades[id] || 0; }
  has(id) { return this.lvl(id) > 0; }

  stormActive(now = performance.now()) { return now < this.r.stormUntil; }

  perTapBase() {
    return 1 + this.lvl('eimer') + 5 * this.lvl('schaufel') + (this.r.baggerStuck ? 0 : 50 * this.lvl('bagger'));
  }
  perTap(now = performance.now()) {
    return this.perTapBase() * (this.stormActive(now) ? STORM_MULTIPLIER : 1);
  }
  perSecond() { return 2 * this.lvl('ventilator') + 500 * this.lvl('raumschiff'); }
  offlineRate() { return this.has('kamel') ? CAMEL_OFFLINE_RATE + this.perSecond() : 0; }

  earn(amount) {
    this.s.gold += amount;
    this.s.goldEarned += amount;
    this.s.sandRemoved += amount;
  }

  tap(now = performance.now()) {
    if (this.s.sleeping) return null;
    if (now - this.r.lastTap < MIN_TAP_INTERVAL) return null;
    this.r.lastTap = now;
    const amount = this.perTap(now);
    this.earn(amount);
    let stuck = false;
    if (this.has('bagger') && !this.r.baggerStuck && Math.random() < BAGGER_STUCK_CHANCE) {
      this.r.baggerStuck = true;
      this.r.freeTaps = BAGGER_FREE_TAPS;
      stuck = true;
      this.emit('baggerStuck');
    }
    return { amount, storm: this.stormActive(now), stuck };
  }

  freeBagger() {
    if (!this.r.baggerStuck) return 0;
    this.r.freeTaps -= 1;
    if (this.r.freeTaps <= 0) {
      this.r.baggerStuck = false;
      this.emit('baggerFree');
    }
    return Math.max(0, this.r.freeTaps);
  }

  price(id) { return priceOf(id, this.lvl(id)); }
  isMaxed(id) { return !UPGRADE_BY_ID[id].stack && this.has(id); }
  canBuy(id) { return !this.isMaxed(id) && this.s.gold >= this.price(id); }

  buy(id) {
    if (!UPGRADE_BY_ID[id] || !this.canBuy(id)) return false;
    this.s.gold -= this.price(id);
    this.s.upgrades[id] = this.lvl(id) + 1;
    this.emit('bought', { id, level: this.lvl(id) });
    return true;
  }

  stormReady(now = performance.now()) {
    return this.has('zauberer') && !this.s.sleeping && now >= this.r.stormReadyAt;
  }
  stormCooldownLeft(now = performance.now()) {
    return Math.max(0, (this.r.stormReadyAt - now) / 1000);
  }
  storm(now = performance.now()) {
    if (!this.stormReady(now)) return null;
    this.r.stormReadyAt = now + STORM_COOLDOWN * 1000;
    if (Math.random() < 0.5) {
      this.r.stormUntil = now + STORM_DURATION * 1000;
      return { success: true };
    }
    // Sand kommt zurück: entfernter Sand sinkt, Gold bleibt (Cäsar hat's schon kassiert).
    const loss = Math.min(this.s.sandRemoved, Math.max(50, this.perTapBase() * 30 + this.perSecond() * 20));
    this.s.sandRemoved -= loss;
    return { success: false, loss };
  }

  tick(dt) {
    const ps = this.perSecond();
    if (ps > 0) this.earn(ps * dt);
    if (!this.s.sleeping) {
      this.s.daySeconds += dt;
      if (this.s.daySeconds >= DAY_LENGTH) {
        this.s.daySeconds = DAY_LENGTH;
        this.s.sleeping = true;
        this.r.baggerStuck = false;
        this.r.stormUntil = 0;
        this.emit('sunset', { day: this.s.day });
      }
    }
  }

  applyOffline(seconds) {
    const secs = Math.min(Math.max(0, seconds || 0), OFFLINE_CAP);
    const amount = this.offlineRate() * secs;
    if (amount > 0) this.earn(amount);
    return { seconds: secs, amount };
  }

  newDay() {
    if (!this.s.sleeping) return false;
    this.s.day += 1;
    this.s.daySeconds = 0;
    this.s.sleeping = false;
    this.emit('newDay', { day: this.s.day });
    return true;
  }

  dayProgress() { return Math.min(1, this.s.daySeconds / DAY_LENGTH); }
  percentRemoved() { return (this.s.sandRemoved / EGYPT_SAND) * 100; }

  toSave() {
    const r2 = (n) => Math.floor(n * 100) / 100;
    return {
      gold: r2(this.s.gold),
      gold_earned: r2(this.s.goldEarned),
      sand_removed: r2(this.s.sandRemoved),
      upgrades: { ...this.s.upgrades },
      day: this.s.day,
      day_seconds: Math.round(this.s.daySeconds * 10) / 10,
      sleeping: this.s.sleeping,
    };
  }

  // Der Server hat korrigiert (unplausibler Sprung). Server-Stand übernehmen und
  // alles, was seit dem Absenden lokal passiert ist, wieder obendrauf rechnen.
  applyServerCorrection(sent, row) {
    const s = this.s;
    const earnedSince = s.goldEarned - sent.gold_earned;
    const sandSince = s.sandRemoved - sent.sand_removed;
    const ups = sanitizeUpgrades(row.upgrades);
    for (const up of UPGRADES) {
      const boughtSince = this.lvl(up.id) - (sent.upgrades[up.id] || 0);
      if (boughtSince > 0) ups[up.id] = (ups[up.id] || 0) + boughtSince;
    }
    const spentSince = totalSpent(s.upgrades) - totalSpent(sent.upgrades);
    s.upgrades = sanitizeUpgrades(ups);
    s.goldEarned = num(row.gold_earned) + Math.max(0, earnedSince);
    s.gold = Math.max(0, num(row.gold) + Math.max(0, earnedSince) - Math.max(0, spentSince));
    s.sandRemoved = Math.max(0, num(row.sand_removed) + sandSince);
  }
}
