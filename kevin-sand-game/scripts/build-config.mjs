// Wird von Netlify beim Deploy ausgeführt: schreibt public/js/config.js aus den Umgebungsvariablen.
// Es landet NUR die öffentliche Supabase-URL und der anon-/publishable-Key im Frontend.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_ANON_KEY || '').trim();
const domain = (process.env.PSEUDO_EMAIL_DOMAIN || 'kevin-game.local').trim();

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (!url || !key) fail('SUPABASE_URL und SUPABASE_ANON_KEY müssen als Umgebungsvariablen gesetzt sein (Netlify → Site configuration → Environment variables).');
if (!/^https:\/\/.+/.test(url)) fail('SUPABASE_URL muss mit https:// beginnen, z. B. https://abcdefgh.supabase.co');

// Schutz: niemals den geheimen service_role-/secret-Key ins Frontend packen.
if (key.startsWith('sb_secret_')) fail('Das ist ein geheimer Key (sb_secret_…). Bitte den "anon public" bzw. "publishable" Key verwenden!');
if (key.split('.').length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
    if (payload.role && payload.role !== 'anon') fail(`Der Key hat die Rolle "${payload.role}". Bitte den "anon public" Key verwenden – niemals service_role!`);
  } catch { /* kein JWT – ok */ }
}

const out = `// Automatisch erzeugt von scripts/build-config.mjs – nicht von Hand bearbeiten.
export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};
export const PSEUDO_EMAIL_DOMAIN = ${JSON.stringify(domain)};
`;
const target = fileURLToPath(new URL('../public/js/config.js', import.meta.url));
writeFileSync(target, out);
console.log(`✅ config.js geschrieben (${url})`);
