// Backend-Schicht: Supabase (echt) oder Demo-Modus (nur localStorage, wenn keine Konfiguration da ist).

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
export const MIN_PASSWORD = 8;

export async function createBackend() {
  let cfg = null;
  try {
    cfg = await import('./config.js');
  } catch {
    cfg = null;
  }
  const url = (cfg?.SUPABASE_URL || '').trim();
  const key = (cfg?.SUPABASE_ANON_KEY || '').trim();
  if (url && key && !url.includes('DEIN-PROJEKT')) {
    const { createClient } = await import(SUPABASE_JS);
    return new SupabaseBackend(createClient, url, key, (cfg.PSEUDO_EMAIL_DOMAIN || 'kevin-game.local').trim());
  }
  return new DemoBackend();
}

export function validateCredentials(username, password, password2, isRegister) {
  if (!USERNAME_RE.test(username)) {
    return 'Benutzername: 3–20 Zeichen, nur Buchstaben (ohne Umlaute), Zahlen und _.';
  }
  if (password.length < MIN_PASSWORD) return `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`;
  if (isRegister && password !== password2) return 'Die beiden Passwörter sind nicht gleich.';
  return null;
}

function translateAuthError(err) {
  const m = String(err?.message || '').toLowerCase();
  const code = err?.code || '';
  if (m.includes('invalid login credentials') || code === 'invalid_credentials') {
    return new Error('Benutzername oder Passwort ist falsch.');
  }
  if (m.includes('already registered') || code === 'user_already_exists' || code === 'email_exists') {
    return new Error('Dieser Benutzername ist leider schon vergeben.');
  }
  if (m.includes('email not confirmed') || code === 'email_not_confirmed') {
    return new Error('Der Server verlangt eine E-Mail-Bestätigung. Admin: In Supabase „Confirm email“ ausschalten (siehe Anleitung).');
  }
  if (code === 'email_address_invalid' || (m.includes('email') && m.includes('invalid'))) {
    return new Error('Der Server lehnt die interne Spiel-Adresse ab. Admin: siehe Anleitung → Fehlerbehebung.');
  }
  if (code === 'weak_password' || (m.includes('password') && (m.includes('at least') || m.includes('weak')))) {
    return new Error('Das Passwort ist zu schwach. Bitte länger oder mit Zahlen/Sonderzeichen.');
  }
  if (err?.status === 429 || m.includes('rate limit') || code === 'over_request_rate_limit') {
    return new Error('Zu viele Versuche. Bitte kurz warten und nochmal probieren.');
  }
  if (m.includes('signups not allowed') || code === 'signup_disabled') {
    return new Error('Registrieren ist gerade deaktiviert.');
  }
  if (m.includes('database error')) {
    return new Error('Der Server konnte den Account nicht anlegen. Ist das SQL-Setup ausgeführt?');
  }
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) {
    return new Error('Keine Verbindung zum Server. Bist du online?');
  }
  return new Error(`Fehler: ${err?.message || 'unbekannt'}`);
}

class SupabaseBackend {
  constructor(createClient, url, key, domain) {
    this.mode = 'supabase';
    this.url = url.replace(/\/+$/, '');
    this.key = key;
    this.domain = domain;
    this.session = null;
    this.sb = createClient(this.url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'kevin-sand-auth' },
    });
    this.sb.auth.onAuthStateChange((_event, session) => { this.session = session; });
  }

  emailFor(username) { return `${username.toLowerCase()}@${this.domain}`; }

  userInfo(user) {
    const fromMeta = user?.user_metadata?.username;
    const local = (user?.email || '').split('@')[0];
    return { id: user.id, username: fromMeta && fromMeta.toLowerCase() === local ? fromMeta : local };
  }

  async currentUser() {
    const { data } = await this.sb.auth.getSession();
    this.session = data.session;
    return data.session ? this.userInfo(data.session.user) : null;
  }

  async register(username, password) {
    const { data, error } = await this.sb.auth.signUp({
      email: this.emailFor(username),
      password,
      options: { data: { username } },
    });
    if (error) throw translateAuthError(error);
    if (data.session) {
      this.session = data.session;
      return this.userInfo(data.user);
    }
    // Keine Session zurück -> E-Mail-Bestätigung ist (noch) aktiv. Direkt einloggen probieren.
    return this.login(username, password);
  }

  async login(username, password) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email: this.emailFor(username), password });
    if (error) throw translateAuthError(error);
    this.session = data.session;
    return this.userInfo(data.user);
  }

  async logout() {
    await this.sb.auth.signOut().catch(() => {});
    this.session = null;
  }

  async loadGame() {
    let { data, error } = await this.sb.rpc('load_game');
    if (error) throw error;
    if (!data) {
      // Falls der Account vor dem SQL-Setup angelegt wurde: Spielstand nachträglich anlegen.
      const { data: s } = await this.sb.auth.getSession();
      const user = s.session.user;
      const ins = await this.sb.from('game_saves').insert({ user_id: user.id, username: this.userInfo(user).username });
      if (ins.error && ins.error.code !== '23505') throw ins.error;
      ({ data, error } = await this.sb.rpc('load_game'));
      if (error) throw error;
      if (!data) throw new Error('Spielstand konnte nicht angelegt werden.');
    }
    return data;
  }

  async saveGame(payload) {
    const { data: s } = await this.sb.auth.getSession();
    if (!s.session) throw new Error('Nicht eingeloggt');
    const { data, error } = await this.sb
      .from('game_saves')
      .update(payload)
      .eq('user_id', s.session.user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Für pagehide/visibilitychange: fetch mit keepalive überlebt das Schließen der Seite.
  saveKeepalive(payload) {
    const s = this.session;
    if (!s?.access_token) return;
    try {
      fetch(`${this.url}/rest/v1/game_saves?user_id=eq.${encodeURIComponent(s.user.id)}`, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${s.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch { /* Seite wird geschlossen – egal */ }
  }

  async leaderboard() {
    const [top, mine] = await Promise.all([this.sb.rpc('get_leaderboard'), this.sb.rpc('get_my_rank')]);
    if (top.error) throw top.error;
    return { rows: top.data || [], myRank: mine.error ? null : mine.data };
  }
}

// ---------------------------------------------------------------------------
// Demo-Modus: läuft ohne Server, z. B. zum lokalen Ausprobieren.
// Passwörter werden auch hier nur gehasht (SHA-256 + Salt) gespeichert.
// ---------------------------------------------------------------------------
class DemoBackend {
  constructor() {
    this.mode = 'demo';
    this.user = null;
  }

  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* voll/privat */ }
  }

  async hash(password, salt) {
    const text = `${salt}:${password}`;
    if (window.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return `weak-${h}`;
  }

  async currentUser() {
    const id = this.read('kevin-demo-session', null);
    const users = this.read('kevin-demo-users', {});
    const u = Object.values(users).find((x) => x.id === id);
    this.user = u ? { id: u.id, username: u.username } : null;
    return this.user;
  }

  async register(username, password) {
    const users = this.read('kevin-demo-users', {});
    const k = username.toLowerCase();
    if (users[k]) throw new Error('Dieser Benutzername ist leider schon vergeben.');
    const salt = Math.random().toString(36).slice(2);
    const id = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    users[k] = { id, username, salt, hash: await this.hash(password, salt) };
    this.write('kevin-demo-users', users);
    this.write(`kevin-demo-save-${id}`, this.freshRow(id, username));
    this.write('kevin-demo-session', id);
    this.user = { id, username };
    return this.user;
  }

  async login(username, password) {
    const users = this.read('kevin-demo-users', {});
    const u = users[username.toLowerCase()];
    if (!u || u.hash !== (await this.hash(password, u.salt))) throw new Error('Benutzername oder Passwort ist falsch.');
    this.write('kevin-demo-session', u.id);
    this.user = { id: u.id, username: u.username };
    return this.user;
  }

  async logout() {
    this.write('kevin-demo-session', null);
    this.user = null;
  }

  freshRow(id, username) {
    return {
      user_id: id, username, gold: 0, gold_earned: 0, sand_removed: 0, upgrades: {},
      day: 1, day_seconds: 0, sleeping: false, updated_at: new Date().toISOString(),
    };
  }

  async loadGame() {
    const row = this.read(`kevin-demo-save-${this.user.id}`, null) || this.freshRow(this.user.id, this.user.username);
    const offline = Math.max(0, (Date.now() - Date.parse(row.updated_at)) / 1000);
    return { ...row, offline_seconds: offline, server_time: new Date().toISOString() };
  }

  async saveGame(payload) {
    const key = `kevin-demo-save-${this.user.id}`;
    const row = { ...this.read(key, this.freshRow(this.user.id, this.user.username)), ...payload, updated_at: new Date().toISOString() };
    this.write(key, row);
    return row;
  }

  saveKeepalive(payload) {
    if (this.user) this.saveGame(payload);
  }

  async leaderboard() {
    const users = Object.values(this.read('kevin-demo-users', {}));
    const rows = users
      .map((u) => ({ username: u.username, sand_removed: this.read(`kevin-demo-save-${u.id}`, {}).sand_removed || 0 }))
      .sort((a, b) => b.sand_removed - a.sand_removed)
      .slice(0, 20)
      .map((r, i) => ({ rank: i + 1, ...r }));
    const myIdx = rows.findIndex((r) => r.username === this.user?.username);
    return { rows, myRank: myIdx >= 0 ? myIdx + 1 : null };
  }
}
