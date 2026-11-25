// Alle Sounds werden live mit der Web Audio API erzeugt – keine Audiodateien.

const MUTE_KEY = 'kevin-muted';
let ctx = null;
let master = null;
let noiseBuffer = null;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* privat-Modus */ }

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Muss bei einer Nutzer-Geste aufgerufen werden (iOS!). */
export function unlock() { ensure(); }

export function isMuted() { return muted; }

export function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* egal */ }
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.02);
}

function tone(freq, dur, { type = 'sine', vol = 0.25, when = 0, slideTo = null, attack = 0.005 } = {}) {
  if (muted || !ensure()) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.3, freq = 1200, q = 0.8, type = 'bandpass', when = 0, sweepTo = null } = {}) {
  if (muted || !ensure()) return;
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.3);
  src.stop(t + dur + 0.02);
}

let tapCount = 0;
export const sfx = {
  dig() {
    tapCount++;
    noise(0.11, { vol: 0.35, freq: 900 + Math.random() * 900, q: 0.7 });
    tone(140 + Math.random() * 30, 0.06, { type: 'triangle', vol: 0.12 });
    if (tapCount % 8 === 0) sfx.coin();
  },
  coin() {
    tone(1318.5, 0.07, { type: 'square', vol: 0.06 });
    tone(1975.5, 0.18, { type: 'square', vol: 0.06, when: 0.06 });
  },
  buy() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.22, when: i * 0.07 }));
  },
  locked() {
    tone(220, 0.12, { type: 'square', vol: 0.08 });
    tone(180, 0.16, { type: 'square', vol: 0.08, when: 0.1 });
  },
  storm() {
    noise(1.2, { vol: 0.35, freq: 300, sweepTo: 3000, q: 1.5 });
  },
  stormWin() {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.2, { type: 'sine', vol: 0.2, when: 0.5 + i * 0.06 }));
  },
  fail() {
    tone(440, 0.6, { type: 'sawtooth', vol: 0.12, slideTo: 70, when: 0.4 });
    tone(330, 0.6, { type: 'sawtooth', vol: 0.08, slideTo: 55, when: 0.45 });
  },
  stuck() {
    tone(90, 0.35, { type: 'square', vol: 0.12, slideTo: 60 });
    noise(0.3, { vol: 0.25, freq: 200, q: 2 });
  },
  free() {
    tone(300, 0.12, { type: 'triangle', vol: 0.2, slideTo: 900 });
  },
  freeTick() {
    tone(200 + Math.random() * 60, 0.05, { type: 'square', vol: 0.08 });
  },
  sunset() {
    [261.63, 329.63, 392, 493.88].forEach((f) => tone(f, 2.2, { type: 'sine', vol: 0.08, attack: 0.6 }));
  },
  morning() {
    [392, 493.88, 587.33, 783.99].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.15, when: i * 0.12 }));
  },
  camel() {
    tone(160, 0.4, { type: 'sawtooth', vol: 0.12, slideTo: 85 });
    noise(0.35, { vol: 0.12, freq: 400, q: 3 });
  },
  click() {
    tone(660, 0.04, { type: 'triangle', vol: 0.1 });
  },
};
