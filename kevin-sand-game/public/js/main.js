import {
  Game, UPGRADES, MAX_DAYS, OFFLINE_CAP, STORM_DURATION, EGYPT_SAND,
} from './game.js';
import { createBackend, validateCredentials } from './backend.js';
import * as audio from './audio.js';
import { fmt, fmtRate, fmtPercent, fmtDuration, escapeHtml } from './format.js';
import { ART, ICONS } from './art.js';
import { CAESAR, pick } from './texts.js';

const $ = (sel) => document.querySelector(sel);
const AUTOSAVE_MS = 10_000;

let backend = null;
let user = null;
let game = null;
let rafId = 0;
let autosaveTimer = 0;
let saving = false;
let saveQueued = false;
let purchaseSaveTimer = 0;
let lastFrame = 0;
let lastUi = 0;
let lastSky = 0;
let lastCaesarAt = 0;
let caesarHideTimer = 0;
let idleCaesarTimer = 0;
let camelTimer = 0;
let sceneRect = null;
let skewMs = 0;
let lastSandForMilestone = 0;
let hasTapped = false;
const shopCache = new Map();

// ---------------------------------------------------------------- Start
// Module laufen erst nach dem Parsen des HTML – das DOM ist also schon da.
async function boot() {
  injectArt();
  wireStaticUi();
  try {
    backend = await createBackend();
  } catch (e) {
    console.error(e);
    $('#loading-text').textContent = 'Der Server ist gerade nicht erreichbar. Bitte Seite neu laden.';
    return;
  }
  if (backend.mode === 'demo') $('#demo-banner').hidden = false;
  try {
    user = await backend.currentUser();
  } catch {
    user = null;
  }
  if (user) startGame();
  else showScreen('auth');
}

function injectArt(root = document) {
  root.querySelectorAll('[data-art]').forEach((el) => { el.innerHTML = ART[el.dataset.art] || ''; });
  root.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon] || ''; });
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
}

// ---------------------------------------------------------------- Auth
function wireStaticUi() {
  let mode = 'login';
  const authScreen = $('#screen-auth');
  const submit = $('#auth-submit');
  const err = $('#auth-error');

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      authScreen.classList.toggle('register', mode === 'register');
      submit.textContent = mode === 'register' ? 'Account anlegen' : 'Einloggen';
      $('#auth-pass').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
      err.textContent = '';
    });
  });

  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    audio.unlock();
    const username = $('#auth-user').value.trim();
    const password = $('#auth-pass').value;
    const password2 = $('#auth-pass2').value;
    const problem = validateCredentials(username, password, password2, mode === 'register');
    if (problem) { err.textContent = problem; return; }
    err.textContent = '';
    submit.disabled = true;
    submit.textContent = mode === 'register' ? 'Lege Account an …' : 'Logge ein …';
    try {
      user = mode === 'register' ? await backend.register(username, password) : await backend.login(username, password);
      $('#auth-pass').value = '';
      $('#auth-pass2').value = '';
      await startGame();
    } catch (ex) {
      err.textContent = ex.message || 'Das hat nicht geklappt.';
    } finally {
      submit.disabled = false;
      submit.textContent = mode === 'register' ? 'Account anlegen' : 'Einloggen';
    }
  });

  // Spiel-UI
  const dune = $('#dune');
  dune.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    doTap(e.clientX, e.clientY);
  });
  dune.addEventListener('click', (e) => {
    if (e.detail === 0) { const r = dune.getBoundingClientRect(); doTap(r.left + r.width / 2, r.top + r.height / 2); }
  });
  dune.addEventListener('contextmenu', (e) => e.preventDefault());

  $('#bagger').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!game) return;
    if (game.r.baggerStuck) {
      audio.unlock();
      const left = game.freeBagger();
      audio.sfx.freeTick();
      shake($('#bagger'));
      if (left > 0) floater(e.clientX, e.clientY, `noch ${left}×`, 'bad');
    } else {
      doTap(e.clientX, e.clientY);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!game || !$('#screen-game').classList.contains('active') || !$('#modal').hidden) return;
    if (e.target instanceof HTMLInputElement) return;
    if ((e.code === 'Space' || e.key === ' ') && !e.repeat) {
      e.preventDefault();
      const r = $('#dune').getBoundingClientRect();
      doTap(r.left + r.width * (0.35 + Math.random() * 0.3), r.top + r.height * 0.45);
    }
  });

  $('#btn-shop').addEventListener('click', () => toggleDropdown('shop'));
  $('#btn-menu').addEventListener('click', () => toggleDropdown('menu'));
  $('#scene').addEventListener('pointerdown', () => closeDropdowns(), { capture: true });

  $('#btn-mute').addEventListener('click', () => {
    audio.unlock();
    audio.setMuted(!audio.isMuted());
    renderMute();
    if (!audio.isMuted()) audio.sfx.click();
  });
  renderMute();

  $('#btn-leaderboard').addEventListener('click', () => { closeDropdowns(); showLeaderboard(); });
  $('#btn-help').addEventListener('click', () => { closeDropdowns(); showHelp(); });
  $('#btn-logout').addEventListener('click', logout);

  $('#storm-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); castStorm(); });
  $('#btn-newday').addEventListener('click', startNewDay);

  $('#bg-camel').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    audio.unlock();
    audio.sfx.camel();
    caesarSay(pick(CAESAR.camelTap), true);
  });
  $('#bg-camel').addEventListener('animationend', (e) => {
    if (e.animationName === 'camelwalk') $('#bg-camel').classList.remove('walking');
  });

  $('#modal').addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (e.target === $('#modal') || target?.closest('[data-close]')) closeModal();
  });

  window.addEventListener('resize', () => { sceneRect = null; });

  document.addEventListener('visibilitychange', () => {
    if (!game) return;
    if (document.visibilityState === 'hidden') saveKeepalive();
  });
  window.addEventListener('pagehide', () => { if (game) saveKeepalive(); });
}

// ---------------------------------------------------------------- Spielstart
async function startGame() {
  showScreen('loading');
  $('#loading-text').textContent = 'Spielstand wird geladen …';
  let row;
  try {
    row = await backend.loadGame();
  } catch (e) {
    console.error(e);
    $('#loading-text').textContent = 'Spielstand konnte nicht geladen werden. Ist das Supabase-SQL ausgeführt? Seite neu laden zum Wiederholen.';
    return;
  }

  skewMs = row.server_time ? Date.parse(row.server_time) - Date.now() : 0;
  let offlineSeconds = Number(row.offline_seconds) || 0;

  // Lokale Sicherung neuer als der Server? (z. B. Speichern beim Schließen ging nicht durch)
  const local = readBackup();
  if (local && local.savedAt + skewMs > Date.parse(row.updated_at) + 3000) {
    row = { ...row, ...local.state };
    offlineSeconds = Math.max(0, (Date.now() - local.savedAt) / 1000);
  }

  game = new Game(row, onGameEvent);
  lastSandForMilestone = game.s.sandRemoved;
  hasTapped = game.s.goldEarned > 0;
  $('#dune-hint').hidden = hasTapped;
  $('#menu-username').textContent = user.username;

  const offline = game.applyOffline(offlineSeconds);

  shopCache.clear();
  buildShop();
  showScreen('game');
  sceneRect = null;
  renderAll(true);

  cancelAnimationFrame(rafId);
  lastFrame = performance.now();
  rafId = requestAnimationFrame(frame);

  clearInterval(autosaveTimer);
  autosaveTimer = setInterval(() => save(), AUTOSAVE_MS);
  scheduleIdleCaesar();
  scheduleCamel(4000);

  if (game.s.goldEarned === 0 && game.s.day === 1) {
    showIntro();
  } else if (offline.seconds >= 60) {
    showWelcomeBack(offline);
  } else {
    caesarSay(pick(CAESAR.welcomeBack));
  }
  if (offline.amount > 0) save();
}

function onGameEvent(type, data) {
  switch (type) {
    case 'bought':
      audio.sfx.buy();
      caesarSay(CAESAR.bought[data.id], true);
      break;
    case 'baggerStuck':
      audio.sfx.stuck();
      caesarSay(pick(CAESAR.baggerStuck), true);
      break;
    case 'baggerFree':
      audio.sfx.free();
      caesarSay(pick(CAESAR.baggerFree), true);
      break;
    case 'sunset':
      audio.sfx.sunset();
      onSunset(data.day);
      break;
    case 'newDay':
      audio.sfx.morning();
      caesarSay(data.day > MAX_DAYS ? CAESAR.overtime(data.day) : CAESAR.newDay(data.day), true);
      break;
    default:
  }
}

// ---------------------------------------------------------------- Game Loop
function frame(now) {
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;
  if (dt > 5) {
    // Tab war im Hintergrund – das zählt als offline (nur das Kamel arbeitet).
    const off = game.applyOffline(dt);
    if (off.amount > 0) toast(`Dein Kamel hat ${fmt(off.amount)} Sand geschaufelt, während du weg warst.`);
  } else if (dt > 0) {
    game.tick(dt);
  }
  if (now - lastUi > 100) {
    lastUi = now;
    renderHud(now);
  }
  if (now - lastSky > 1000) {
    lastSky = now;
    renderSky();
  }
  rafId = requestAnimationFrame(frame);
}

function doTap(x, y) {
  if (!game) return;
  audio.unlock();
  const res = game.tap();
  if (!res) {
    if (game.s.sleeping) toast('Pssst … Kevin schläft. Tippe auf „Neuer Tag“.');
    return;
  }
  if (!hasTapped) { hasTapped = true; $('#dune-hint').hidden = true; }
  audio.sfx.dig();
  digAnimation();
  spawnGrains(x, y, res.storm ? 9 : 5);
  floater(x, y, `+${fmt(res.amount)}`, res.storm ? 'big' : '');
  const coin = $('#hud .coin');
  coin.classList.remove('pop');
  void coin.offsetWidth;
  coin.classList.add('pop');
  if (game.has('bagger') && !game.r.baggerStuck) {
    const b = $('#bagger');
    b.classList.remove('digging');
    void b.offsetWidth;
    b.classList.add('digging');
  }
  checkMilestones();
}

const kevinAnim = { tool: null, dune: null };
function digAnimation() {
  const tool = $('#kevin .kevin-tool');
  const duneArt = $('#dune .dune-art');
  if (tool?.animate) {
    kevinAnim.tool?.cancel();
    kevinAnim.tool = tool.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(18deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0deg)' }],
      { duration: 220, easing: 'ease-out' },
    );
  }
  if (duneArt?.animate) {
    kevinAnim.dune?.cancel();
    kevinAnim.dune = duneArt.animate(
      [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.03, .96)' }, { transform: 'scale(1, 1)' }],
      { duration: 160, easing: 'ease-out' },
    );
  }
}

// ---------------------------------------------------------------- Effekte
function sceneOffset() {
  if (!sceneRect) sceneRect = $('#scene').getBoundingClientRect();
  return sceneRect;
}

const MAX_FX = 48;
function spawnGrains(x, y, n) {
  const fx = $('#fx');
  if (fx.childElementCount > MAX_FX) return;
  const r = sceneOffset();
  for (let i = 0; i < n; i++) {
    const g = document.createElement('span');
    g.className = 'grain';
    g.style.left = `${x - r.left}px`;
    g.style.top = `${y - r.top}px`;
    g.style.setProperty('--dx', `${(Math.random() - 0.5) * 140}px`);
    g.style.setProperty('--dy', `${-40 - Math.random() * 90}px`);
    g.addEventListener('animationend', () => g.remove(), { once: true });
    fx.appendChild(g);
  }
}

function floater(x, y, text, cls = '') {
  const fx = $('#fx');
  if (fx.childElementCount > MAX_FX + 10) return;
  const r = sceneOffset();
  const el = document.createElement('span');
  el.className = `floater ${cls}`;
  el.textContent = text;
  el.style.left = `${x - r.left + (Math.random() - 0.5) * 30}px`;
  el.style.top = `${y - r.top - 30}px`;
  el.addEventListener('animationend', () => el.remove(), { once: true });
  fx.appendChild(el);
}

function shake(el) {
  el.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 180 });
}

// ---------------------------------------------------------------- Rendering
function renderAll(force = false) {
  renderHud(performance.now(), force);
  renderSky();
  renderScene();
}

let lastGoldText = '';
let lastPctText = '';
function renderHud(now, force = false) {
  if (!game) return;
  const s = game.s;
  const goldText = fmt(s.gold);
  if (goldText !== lastGoldText || force) { $('#gold').textContent = goldText; lastGoldText = goldText; }

  const pct = game.percentRemoved();
  const pctText = fmtPercent(pct);
  if (pctText !== lastPctText || force) {
    $('#percent').textContent = pctText;
    $('#progress-fill').style.width = `${Math.min(100, pct)}%`;
    lastPctText = pctText;
  }

  const badge = $('#day-badge');
  const badgeText = `TAG ${s.day}/${MAX_DAYS}`;
  if (badge.textContent !== badgeText) badge.textContent = badgeText;
  badge.classList.toggle('overtime', s.day > MAX_DAYS);

  $('#per-tap').textContent = fmt(game.perTap(now));
  $('#per-sec').textContent = fmtRate(game.perSecond());

  updateShop();
  renderStorm(now);

  const scene = $('#scene');
  scene.classList.toggle('storming', game.stormActive(now));
  $('#bagger').classList.toggle('stuck', game.r.baggerStuck);
}

function renderScene() {
  const s = game.s;
  const fan = game.lvl('ventilator');
  const ufo = game.lvl('raumschiff');
  const bag = game.lvl('bagger');
  $('#fan').hidden = fan === 0;
  $('#fan-count').textContent = fan > 1 ? `×${fan}` : '';
  $('#ufo').hidden = ufo === 0;
  $('#ufo-count').textContent = ufo > 1 ? `×${ufo}` : '';
  $('#bagger').hidden = bag === 0;
  $('#bagger-count').textContent = bag > 1 ? `×${bag}` : '';
  $('#helper-camel').hidden = !game.has('kamel');
  $('#storm-btn').hidden = !game.has('zauberer');
  $('#scene').classList.toggle('has-storm', game.has('zauberer'));
  $('#scene').classList.toggle('night', s.sleeping);
  if (s.sleeping) showNightCard(); else $('#night-card').hidden = true;
}

function renderMute() {
  const m = audio.isMuted();
  $('#btn-mute').innerHTML = m ? ICONS.soundOff : ICONS.soundOn;
  $('#btn-mute').setAttribute('aria-label', m ? 'Ton an' : 'Ton aus');
}

// Himmel & Sonne passend zur Tageszeit
const SKY = [
  [0.0, '#ffad7a', '#ffe0b0'],
  [0.15, '#7fc8f5', '#ffe7b0'],
  [0.72, '#7fc8f5', '#ffe7b0'],
  [0.88, '#ff8a5c', '#ffcf7a'],
  [1.0, '#6b3a7a', '#ff9a5c'],
];
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hexToRgb(a); const B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
function renderSky() {
  if (!game) return;
  const scene = $('#scene');
  const p = game.dayProgress();
  let top; let bottom;
  if (game.s.sleeping) {
    top = '#141038'; bottom = '#4a2c5e';
  } else {
    let i = 0;
    while (i < SKY.length - 2 && p > SKY[i + 1][0]) i++;
    const [p0, t0, b0] = SKY[i];
    const [p1, t1, b1] = SKY[i + 1];
    const t = Math.max(0, Math.min(1, (p - p0) / (p1 - p0)));
    top = mix(t0, t1, t);
    bottom = mix(b0, b1, t);
  }
  scene.style.setProperty('--sky-top', top);
  scene.style.setProperty('--sky-bottom', bottom);
  const sun = $('#sun');
  const x = 8 + p * 84;
  const y = game.s.sleeping ? 80 : 58 - Math.sin(p * Math.PI) * 42;
  sun.style.left = `${x}%`;
  sun.style.top = `${y}%`;
}

function renderStorm(now) {
  if (!game.has('zauberer')) return;
  const btn = $('#storm-btn');
  const active = game.stormActive(now);
  const cd = game.stormCooldownLeft(now);
  const ready = game.stormReady(now);
  btn.classList.toggle('ready', ready);
  btn.classList.toggle('cooldown', !ready);
  $('#storm-text').textContent = active ? 'x10!' : 'Sandsturm';
  $('#storm-cd').textContent = active
    ? `${Math.ceil((game.r.stormUntil - now) / 1000)} s`
    : (cd > 0 ? `${Math.ceil(cd)} s` : 'bereit');
}

// ---------------------------------------------------------------- Shop
function buildShop() {
  const list = $('#shop-list');
  list.innerHTML = '';
  for (const up of UPGRADES) {
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.dataset.id = up.id;
    item.innerHTML = `
      <div class="icon">${ICONS[up.id]}</div>
      <div class="info">
        <div class="name">${escapeHtml(up.name)} <span class="lvl" hidden></span></div>
        <div class="desc">${escapeHtml(up.desc)}</div>
      </div>
      <button type="button" class="buy">
        <span class="price"><span class="coin-sm">${ART.coin}</span><span class="p"></span></span>
        <span class="sub"></span>
      </button>`;
    item.querySelector('.buy').addEventListener('click', () => buyUpgrade(up.id, item));
    list.appendChild(item);
  }
}

function updateShop() {
  let affordable = 0;
  for (const up of UPGRADES) {
    const maxed = game.isMaxed(up.id);
    const price = game.price(up.id);
    const can = game.canBuy(up.id);
    const lvl = game.lvl(up.id);
    if (can) affordable++;
    const missing = Math.max(0, Math.ceil(price - game.s.gold));
    const sig = `${maxed}|${price}|${can}|${lvl}|${can || maxed ? '' : fmt(missing)}`;
    if (shopCache.get(up.id) === sig) continue;
    shopCache.set(up.id, sig);
    const item = $(`.shop-item[data-id="${up.id}"]`);
    if (!item) continue;
    item.classList.toggle('locked', !can && !maxed);
    item.classList.toggle('owned', maxed);
    const lvlEl = item.querySelector('.lvl');
    lvlEl.hidden = lvl === 0 || !up.stack;
    lvlEl.textContent = `Stufe ${lvl}`;
    const btn = item.querySelector('.buy');
    const priceEl = item.querySelector('.price');
    const sub = item.querySelector('.sub');
    if (maxed) {
      priceEl.style.display = 'none';
      sub.textContent = 'Gekauft ✓';
      btn.setAttribute('aria-label', `${up.name}: gekauft`);
    } else {
      priceEl.style.display = '';
      item.querySelector('.p').textContent = fmt(price);
      if (can) {
        sub.textContent = 'Kaufen';
      } else {
        sub.innerHTML = `<span class="lock">${ICONS.lock}</span> noch ${fmt(missing)}`;
        sub.style.display = 'flex';
        sub.style.alignItems = 'center';
        sub.style.gap = '3px';
      }
      btn.setAttribute('aria-label', `${up.name} kaufen für ${fmt(price)} Gold${can ? '' : ' (gesperrt)'}`);
    }
  }
  const badge = $('#shop-badge');
  badge.hidden = affordable === 0;
  badge.textContent = String(affordable);
}

function buyUpgrade(id, item) {
  audio.unlock();
  if (game.isMaxed(id)) return;
  if (!game.buy(id)) {
    audio.sfx.locked();
    shake(item);
    toast(`Dafür fehlen dir noch ${fmt(game.price(id) - game.s.gold)} Gold.`);
    return;
  }
  item.classList.remove('flash');
  void item.offsetWidth;
  item.classList.add('flash');
  renderScene();
  renderHud(performance.now(), true);
  clearTimeout(purchaseSaveTimer);
  purchaseSaveTimer = setTimeout(() => save(), 1500);
}

function toggleDropdown(which) {
  const shop = $('#shop');
  const menu = $('#menu');
  const openShop = which === 'shop' ? shop.hidden : false;
  const openMenu = which === 'menu' ? menu.hidden : false;
  shop.hidden = !openShop;
  menu.hidden = !openMenu;
  $('#btn-shop').setAttribute('aria-expanded', String(openShop));
  $('#btn-menu').setAttribute('aria-expanded', String(openMenu));
  audio.unlock();
  audio.sfx.click();
}
function closeDropdowns() {
  if ($('#shop').hidden && $('#menu').hidden) return;
  $('#shop').hidden = true;
  $('#menu').hidden = true;
  $('#btn-shop').setAttribute('aria-expanded', 'false');
  $('#btn-menu').setAttribute('aria-expanded', 'false');
}

// ---------------------------------------------------------------- Sandsturm
function castStorm() {
  if (!game) return;
  audio.unlock();
  const now = performance.now();
  if (!game.stormReady(now)) {
    if (game.s.sleeping) toast('Nachts zaubert der Zauberer nicht.');
    else if (game.stormActive(now)) toast('Der Sandsturm tobt schon! Schaufeln!');
    else toast(`Der Zauberer braucht noch ${Math.ceil(game.stormCooldownLeft(now))} Sekunden.`);
    return;
  }
  const res = game.storm(now);
  audio.sfx.storm();
  const r = $('#dune').getBoundingClientRect();
  if (res.success) {
    audio.sfx.stormWin();
    floater(r.left + r.width / 2, r.top + r.height * 0.3, `x10 für ${STORM_DURATION} s!`, 'big');
    caesarSay(pick(CAESAR.stormWin), true);
  } else {
    audio.sfx.fail();
    floater(r.left + r.width / 2, r.top + r.height * 0.3, `−${fmt(res.loss)} Sand zurück!`, 'bad');
    const duneArt = $('#dune .dune-art');
    duneArt.animate?.([{ transform: 'scale(1,1)' }, { transform: 'scale(1.08,1.15)' }, { transform: 'scale(1,1)' }], { duration: 900, easing: 'ease-in-out' });
    const scene = $('#scene');
    scene.classList.add('storming');
    setTimeout(() => scene.classList.remove('storming'), 1200);
    caesarSay(pick(CAESAR.stormFail), true);
  }
  renderHud(now, true);
}

// ---------------------------------------------------------------- Tag & Nacht
function onSunset(day) {
  renderScene();
  renderSky();
  caesarSay(pick(CAESAR.sunset), true);
  save();
  if (day === MAX_DAYS) {
    setTimeout(() => showFinale(), 1200);
  }
}

function showNightCard() {
  const card = $('#night-card');
  const day = game.s.day;
  if (day === MAX_DAYS) {
    $('#night-text').textContent = 'Tag 30 ist vorbei! Kevin liegt im Sand und träumt von weniger Sand.';
    $('#btn-newday').textContent = 'Überstunden machen 😅';
  } else if (day > MAX_DAYS) {
    $('#night-text').textContent = `Überstunden-Tag ${day} geschafft. Kevin schnarcht im Sand.`;
    $('#btn-newday').textContent = 'Weiter geht\'s ☀';
  } else {
    $('#night-text').textContent = `Tag ${day} ist vorbei. Die Sonne geht unter und Kevin schläft erschöpft im Sand ein …`;
    $('#btn-newday').textContent = `Tag ${day + 1} beginnen ☀`;
  }
  card.hidden = false;
}

function startNewDay() {
  audio.unlock();
  if (!game.newDay()) return;
  renderAll(true);
  save();
}

// ---------------------------------------------------------------- Cäsar
function caesarSay(text, priority = false) {
  const now = Date.now();
  if (!priority && now - lastCaesarAt < 6000) return;
  lastCaesarAt = now;
  const bubble = $('#bubble');
  bubble.textContent = text;
  bubble.classList.add('show');
  const bust = $('.caesar-bust');
  bust.classList.remove('talk');
  void bust.offsetWidth;
  bust.classList.add('talk');
  clearTimeout(caesarHideTimer);
  caesarHideTimer = setTimeout(() => bubble.classList.remove('show'), Math.max(3500, text.length * 70));
  scheduleIdleCaesar();
}

function scheduleIdleCaesar() {
  clearTimeout(idleCaesarTimer);
  idleCaesarTimer = setTimeout(() => {
    if (game && document.visibilityState === 'visible') caesarSay(pick(CAESAR.idle));
    scheduleIdleCaesar();
  }, 18000 + Math.random() * 14000);
}

function checkMilestones() {
  const now = game.s.sandRemoved;
  for (const [limit, text] of CAESAR.milestones) {
    if (lastSandForMilestone < limit && now >= limit) caesarSay(text, true);
  }
  lastSandForMilestone = now;
}

// ---------------------------------------------------------------- Kamel im Hintergrund
function scheduleCamel(delay) {
  clearTimeout(camelTimer);
  camelTimer = setTimeout(() => {
    const camel = $('#bg-camel');
    if (game && !camel.classList.contains('walking') && document.visibilityState === 'visible') {
      camel.classList.add('walking');
    }
    scheduleCamel(20000 + Math.random() * 25000);
  }, delay);
}

// ---------------------------------------------------------------- Speichern
function backupKey() { return `kevin-backup-${user?.id}`; }
function writeBackup(state) {
  try { localStorage.setItem(backupKey(), JSON.stringify({ savedAt: Date.now(), state })); } catch { /* egal */ }
}
function readBackup() {
  try { return JSON.parse(localStorage.getItem(backupKey())); } catch { return null; }
}

function setSaveStatus(kind) {
  const el = $('#save-status');
  el.classList.toggle('err', kind === 'error');
  if (kind === 'saving') el.textContent = 'Speichert …';
  else if (kind === 'ok') {
    const t = new Date();
    el.textContent = `✓ ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    el.title = 'Gespeichert';
  } else if (kind === 'error') el.textContent = '⚠ nicht gespeichert';
}

async function save() {
  if (!game || !backend) return;
  if (saving) { saveQueued = true; return; }
  const sent = game.toSave();
  writeBackup(sent);
  saving = true;
  setSaveStatus('saving');
  try {
    const row = await backend.saveGame(sent);
    reconcile(sent, row);
    setSaveStatus('ok');
  } catch (e) {
    console.warn('Speichern fehlgeschlagen', e);
    setSaveStatus('error');
  } finally {
    saving = false;
    if (saveQueued) { saveQueued = false; save(); }
  }
}

function reconcile(sent, row) {
  if (!row || !game) return;
  const upgradesDiffer = UPGRADES.some((u) => (Number(row.upgrades?.[u.id]) || 0) !== (sent.upgrades[u.id] || 0));
  const corrected = upgradesDiffer
    || Number(row.gold_earned) < sent.gold_earned - 1
    || Number(row.gold) < sent.gold - 1
    || Number(row.sand_removed) < sent.sand_removed - 1;
  if (corrected) {
    game.applyServerCorrection(sent, row);
    shopCache.clear();
    renderScene();
    renderHud(performance.now(), true);
    caesarSay('Ich habe nachgezählt, Kevin. Da stimmte etwas nicht. Korrigiert!', true);
  }
}

function saveKeepalive() {
  if (!game || !backend) return;
  const state = game.toSave();
  writeBackup(state);
  backend.saveKeepalive(state);
}

async function logout() {
  closeDropdowns();
  if (!game) return;
  const btn = $('#btn-logout');
  btn.disabled = true;
  await save();
  stopGame();
  await backend.logout();
  user = null;
  btn.disabled = false;
  showScreen('auth');
  toast('Abgemeldet. Der Sand wartet auf dich.');
}

function stopGame() {
  cancelAnimationFrame(rafId);
  clearInterval(autosaveTimer);
  clearTimeout(idleCaesarTimer);
  clearTimeout(camelTimer);
  clearTimeout(purchaseSaveTimer);
  game = null;
  $('#fx').innerHTML = '';
  $('#bubble').classList.remove('show');
}

// ---------------------------------------------------------------- Modals & Toast
function openModal(html) {
  $('#modal-content').innerHTML = html;
  injectArt($('#modal-content'));
  $('#modal').hidden = false;
}
function closeModal() { $('#modal').hidden = true; }

function caesarBox(text) {
  return `<div class="modal-caesar"><div class="mini" data-art="caesar"></div><p>${escapeHtml(text)}</p></div>`;
}

function showIntro() {
  openModal(`
    <h2>Willkommen, Kevin!</h2>
    ${caesarBox('Kevin! Du hast 30 Tage, um ganz Ägypten vom Sand zu befreien. Ganz. Ägypten. Los!')}
    <p>Tippe auf die <b>Düne</b>, um Sand zu schaufeln. Jeder Sand bringt dir <b>1 Gold</b>.</p>
    <p>Mit Gold kaufst du im <b>Upgrade-Shop</b> oben bessere Ausrüstung.</p>
    <button type="button" class="btn btn-primary" data-close>Ich schaufel ja schon!</button>`);
}

function showWelcomeBack(off) {
  const capped = off.seconds >= OFFLINE_CAP ? ' (mehr als 8 Stunden zählen leider nicht)' : '';
  const body = off.amount > 0
    ? `<p>Du warst <b>${fmtDuration(off.seconds)}</b> weg${capped}. Dein Kamel-Gehilfe hat in der Zeit geschaufelt:</p>
       <p class="big-number">+${fmt(off.amount)} Sand &amp; Gold</p>`
    : `<p>Du warst <b>${fmtDuration(off.seconds)}</b> weg. Ohne <b>Kamel-Gehilfe</b> hat leider niemand geschaufelt.</p>
       <p>Tipp: Das Kamel gibt's im Shop für 300 Gold – dann wird auch geschaufelt, während du schläfst.</p>`;
  openModal(`
    <h2>Willkommen zurück!</h2>
    ${caesarBox(pick(CAESAR.welcomeBack))}
    ${body}
    <button type="button" class="btn btn-primary" data-close>Weiterschaufeln</button>`);
}

function showFinale() {
  if (!game) return;
  openModal(`
    <h2>30 Tage sind um!</h2>
    <p>Kevin hat <b>${fmt(game.s.sandRemoved)} Sand</b> entfernt.</p>
    <p>Ägypten ist damit zu <b>${fmtPercent(game.percentRemoved())}</b> sandfrei.</p>
    ${caesarBox('Kevin. KEVIN. Das ist nicht mal ein Prozent. Das ist nicht mal ein Prozent von einem Prozent. Du machst Überstunden.')}
    <button type="button" class="btn btn-primary" data-close>Okay, Cäsar …</button>`);
}

function showHelp() {
  openModal(`
    <h2>So geht's</h2>
    <ul class="help-list">
      <li><b>Düne antippen</b> = Sand schaufeln. 1 Sand = 1 Gold.</li>
      <li>Im <b>Upgrade-Shop</b> oben kaufst du Ausrüstung. Grau = noch zu teuer.</li>
      <li>Eimer, Schaufel, Ventilator, Bagger und Raumschiff kannst du mehrfach kaufen – jede Stufe kostet 15 % mehr.</li>
      <li>Der <b>Bagger</b> bleibt manchmal stecken: Tippe ihn 5× an, um ihn zu befreien.</li>
      <li>Der <b>Zauberer</b> beschwört alle 30 s einen Sandsturm: 50 % Chance auf x10 Sand für 10 s – sonst kommt Sand zurück.</li>
      <li>Das <b>Kamel</b> schaufelt, während du offline bist (bis zu 8 Stunden).</li>
      <li>Ein Spieltag dauert 3 Minuten. Bei Sonnenuntergang schläft Kevin ein.</li>
      <li>Leertaste schaufelt am Computer auch.</li>
      <li>Dein Spielstand wird alle 10 Sekunden gespeichert.</li>
    </ul>
    <button type="button" class="btn btn-primary" data-close>Verstanden</button>`);
}

async function showLeaderboard() {
  openModal('<h2>Rangliste</h2><p>Lade die besten Schaufler …</p>');
  await save();
  try {
    const { rows, myRank } = await backend.leaderboard();
    const items = rows.map((r) => {
      const me = r.username.toLowerCase() === user.username.toLowerCase();
      const pct = (Number(r.sand_removed) / EGYPT_SAND) * 100;
      return `<li class="${me ? 'me' : ''}"><span class="rank">${r.rank}.</span><span class="name">${escapeHtml(r.username)}</span><span class="score">${fmt(r.sand_removed)}<small>${fmtPercent(pct)}</small></span></li>`;
    }).join('');
    const mine = myRank ? `<p>Dein Platz: <b>${myRank}</b></p>` : '';
    openModal(`
      <h2>Rangliste – Top 20</h2>
      <p>Nach entferntem Sand.</p>
      <ol class="lb">${items || '<li>Noch niemand hat geschaufelt.</li>'}</ol>
      ${mine}
      <button type="button" class="btn btn-primary" data-close>Zurück zur Düne</button>`);
  } catch (e) {
    console.error(e);
    openModal(`<h2>Rangliste</h2><p>Die Rangliste konnte nicht geladen werden. Bist du online?</p><button type="button" class="btn btn-primary" data-close>Schließen</button>`);
  }
}

let toastTimer = 0;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// Nur im Demo-Modus: Zugriff für Tests über die Konsole
boot();

Object.defineProperty(window, '__kevin', { get: () => (backend?.mode === 'demo' ? { game, save } : undefined) });
