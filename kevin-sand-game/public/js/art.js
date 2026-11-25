// Alle Grafiken als handgeschriebenes SVG – keine fremden Bilder.

const INK = '#3a2414';

function laurel(cx, cy, r, from, to, count) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = from + ((to - from) * i) / (count - 1);
    const rad = (a * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6.5" ry="3.2" transform="rotate(${(a + 60).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#4f9a3a" stroke="#2d5e20" stroke-width="1.4"/>`;
  }
  return s;
}

export const ART = {
  coin: `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="url(#cg)" stroke="#8a5600" stroke-width="2.5"/><circle cx="20" cy="20" r="12.5" fill="none" stroke="#b97400" stroke-width="1.8"/><path d="M12 25 L20 12 L28 25 Z" fill="#e0a000" stroke="#8a5600" stroke-width="1.6" stroke-linejoin="round"/><path d="M20 12 L28 25 L22 25 Z" fill="#c07d00"/></svg>`,

  kevin: `<svg viewBox="0 0 150 225" aria-hidden="true">
    <ellipse cx="62" cy="214" rx="40" ry="7" fill="rgba(110,60,15,.25)"/>
    <path d="M50 150 L45 204" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
    <path d="M72 150 L78 204" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
    <path d="M50 150 L45 204" stroke="#f6c9a0" stroke-width="10" stroke-linecap="round"/>
    <path d="M72 150 L78 204" stroke="#f6c9a0" stroke-width="10" stroke-linecap="round"/>
    <path d="M32 209 q2-9 14-8 q10 1 8 9 z" fill="#7a4a21" stroke="${INK}" stroke-width="2.5"/>
    <path d="M70 210 q0-9 12-9 q12 0 12 9 z" fill="#7a4a21" stroke="${INK}" stroke-width="2.5"/>
    <path d="M38 126 h48 l4 34 h-23 l-5-15 l-5 15 h-23 z" fill="#2f6fd6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M44 134 l6 6 M76 134 l-4 8" stroke="#1d4fa8" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 82 q22-12 44 0 l4 50 h-52 z" fill="#ffffff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M52 82 q10 10 20 0" fill="none" stroke="${INK}" stroke-width="2.5"/>
    <ellipse cx="66" cy="112" rx="7" ry="5" fill="#e9c58f" opacity=".8"/>
    <circle cx="52" cy="102" r="3" fill="#e9c58f" opacity=".8"/>
    <g class="kevin-head">
      <circle cx="38" cy="54" r="7" fill="#f6c9a0" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="63" cy="52" rx="28" ry="29" fill="#f6c9a0" stroke="${INK}" stroke-width="3"/>
      <path d="M35 46 q-4-26 22-30 q8-9 18-1 q16-2 17 13 q9 5 2 15 q-6-11-17-9 q-6-8-15-2 q-8-6-15 4 q-7-2-12 10z" fill="#8b4a1c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M50 22 l-4-8 M62 16 l2-9 M74 18 l6-7" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <g class="kevin-eyes">
        <ellipse cx="68" cy="50" rx="6" ry="7" fill="#fff" stroke="${INK}" stroke-width="2.2"/>
        <ellipse cx="83" cy="50" rx="6" ry="7" fill="#fff" stroke="${INK}" stroke-width="2.2"/>
        <circle cx="70.5" cy="51" r="2.8" fill="#1b1b1b"/>
        <circle cx="85.5" cy="51" r="2.8" fill="#1b1b1b"/>
      </g>
      <path class="kevin-sleep-eyes" d="M63 51 q5 4 10 0 M78 51 q5 4 10 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="88" cy="61" rx="7" ry="5.5" fill="#ef7d6a" stroke="${INK}" stroke-width="2.2"/>
      <ellipse cx="55" cy="63" rx="6" ry="3.5" fill="#f19c8a" opacity=".7"/>
      <path d="M68 70 q9 7 18 0" stroke="${INK}" stroke-width="3" fill="#a3362c" stroke-linecap="round"/>
      <path class="kevin-sweat" d="M42 32 q-5 7 0 10 q5-3 0-10z" fill="#7cc8ff" stroke="#2f7fb8" stroke-width="1.2"/>
    </g>
    <g class="kevin-tool">
      <path d="M46 92 q24 26 60 18" stroke="${INK}" stroke-width="15" fill="none" stroke-linecap="round"/>
      <path d="M46 92 q24 26 60 18" stroke="#f6c9a0" stroke-width="10" fill="none" stroke-linecap="round"/>
      <line x1="100" y1="82" x2="126" y2="184" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
      <line x1="100" y1="82" x2="126" y2="184" stroke="#a8692f" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M93 80 h15" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <path d="M112 178 l27-9 l7 27 q-14 15-31 7 z" fill="#c3ccd6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M119 182 l16-5" stroke="#eef3f7" stroke-width="3" stroke-linecap="round"/>
      <path d="M79 90 q14 8 23 0" stroke="${INK}" stroke-width="15" fill="none" stroke-linecap="round"/>
      <path d="M79 90 q14 8 23 0" stroke="#f6c9a0" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="103" cy="92" r="7" fill="#f6c9a0" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="107" cy="110" r="7" fill="#f6c9a0" stroke="${INK}" stroke-width="2.5"/>
    </g>
  </svg>`,

  caesar: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="47" fill="#fbe3b5" stroke="#9a5b22" stroke-width="3"/>
    <g clip-path="url(#caesar-clip)">
      <path d="M10 104 q4-30 40-32 q36 2 40 32z" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <path d="M26 80 q22 20 52-4 l8 30 h-48 z" fill="#b3202a" stroke="${INK}" stroke-width="2.5"/>
      <rect x="43" y="62" width="14" height="14" fill="#efbd8a" stroke="${INK}" stroke-width="2.5"/>
    </g>
    <ellipse cx="50" cy="44" rx="21" ry="24" fill="#f1c18f" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="29" cy="46" rx="4" ry="6" fill="#f1c18f" stroke="${INK}" stroke-width="2.5"/>
    <ellipse cx="71" cy="46" rx="4" ry="6" fill="#f1c18f" stroke="${INK}" stroke-width="2.5"/>
    <path d="M35 33 l11 5 M65 33 l-11 5" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="42" cy="42" r="2.7" fill="#1b1b1b"/>
    <circle cx="58" cy="42" r="2.7" fill="#1b1b1b"/>
    <path d="M51 40 q9 11 2 15 q-4 1-6-1" fill="#e6a873" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M41 60 q9-6 18 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M36 52 l4 2 M64 52 l-4 2" stroke="#c98a5a" stroke-width="2" stroke-linecap="round"/>
    ${laurel(50, 40, 24, 160, 265, 6)}
    ${laurel(50, 40, 24, 380, 275, 6)}
  </svg>`,

  camel: `<svg viewBox="0 0 130 100" aria-hidden="true">
    <g class="camel-legs" stroke="${INK}" stroke-width="2.5" fill="#b77d47">
      <rect class="leg leg-a" x="30" y="58" width="8" height="34" rx="3"/>
      <rect class="leg leg-b" x="42" y="58" width="8" height="34" rx="3"/>
      <rect class="leg leg-a" x="74" y="58" width="8" height="34" rx="3"/>
      <rect class="leg leg-b" x="86" y="58" width="8" height="34" rx="3"/>
    </g>
    <path d="M24 46 q-8 4-10 16" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M22 62 q-2-24 18-26 q8-22 22-6 q12-18 26 2 q12 4 14 22 q0 10-10 10 h-60 q-10 0-10-2z" fill="#c8915a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M92 52 q8-6 10-20 q2-10 10-12" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
    <path d="M92 52 q8-6 10-20 q2-10 10-12" fill="none" stroke="#c8915a" stroke-width="10" stroke-linecap="round"/>
    <path d="M104 14 q10-6 20 2 q4 6-2 9 l-16 2 q-6-4-2-13z" fill="#c8915a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M106 12 l-1-6 l5 4" fill="#b77d47" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="114" cy="15" r="2" fill="#1b1b1b"/>
    <path d="M110 13 q4-2 7 0" stroke="${INK}" stroke-width="1.6" fill="none"/>
    <path d="M122 22 q-3 2-6 1" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M44 36 q8-4 12 2" stroke="#a46c38" stroke-width="2" fill="none"/>
  </svg>`,

  helperCamel: `<svg viewBox="0 0 150 110" aria-hidden="true">
    <ellipse cx="72" cy="102" rx="54" ry="6" fill="rgba(110,60,15,.22)"/>
    <path d="M22 98 q-4-30 20-34 q8-24 24-8 q14-18 30 2 q14 6 14 30 q0 10-10 10 h-70 q-8 0-8 0z" fill="#c8915a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 92 q10 6 22 0 M78 94 q10 6 20 0" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M104 82 q10-8 12-24 q2-12 12-14" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
    <path d="M104 82 q10-8 12-24 q2-12 12-14" fill="none" stroke="#c8915a" stroke-width="10" stroke-linecap="round"/>
    <path d="M120 38 q10-6 22 2 q4 7-2 10 l-18 2 q-6-5-2-14z" fill="#c8915a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M126 41 q4 3 8 0" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M138 47 q-3 2-6 1" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M44 62 h34 l-4 26 h-26 z" fill="#d9a441" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M47 70 h28 M48 78 h26" stroke="#a87420" stroke-width="2"/>
    <path d="M46 62 q16-10 30 0" fill="#f2c56b" stroke="${INK}" stroke-width="2.5"/>
    <path d="M60 40 l-2 -10 q6-4 10 2 l-2 8" fill="#2f6fd6" stroke="${INK}" stroke-width="2"/>
  </svg>`,

  pyramids: `<svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path d="M30 120 L105 30 L180 120 Z" fill="#e7b46a"/>
    <path d="M105 30 L180 120 L130 120 Z" fill="#c98d45"/>
    <path d="M165 120 L250 12 L335 120 Z" fill="#f0c27a"/>
    <path d="M250 12 L335 120 L278 120 Z" fill="#cf9449"/>
    <path d="M200 76 h70 M188 92 h100 M212 60 h52 M224 44 h28" stroke="#d9a35a" stroke-width="1.5" opacity=".6"/>
    <path d="M310 120 L350 72 L390 120 Z" fill="#e3ad62"/>
    <path d="M350 72 L390 120 L364 120 Z" fill="#c4873f"/>
  </svg>`,

  dune: `<svg viewBox="0 0 400 230" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 230 L0 170 Q50 120 110 70 Q170 20 230 40 Q300 66 340 120 Q370 160 400 165 L400 230 Z" fill="url(#duneg)" stroke="#b97830" stroke-width="3"/>
    <path d="M230 40 Q300 66 340 120 Q370 160 400 165 L400 230 L250 230 Q290 150 230 40Z" fill="#d99a45" opacity=".55"/>
    <path d="M70 160 q40-20 80-8 M120 120 q35-18 70-6 M60 196 q60-22 120-6 M180 90 q30-12 50 0 M200 170 q40-14 80 0" stroke="#fff1c8" stroke-width="4" fill="none" stroke-linecap="round" opacity=".75"/>
    <circle cx="150" cy="200" r="3" fill="#c78535"/><circle cx="260" cy="190" r="2.5" fill="#c78535"/><circle cx="96" cy="182" r="2" fill="#c78535"/>
  </svg>`,

  bagger: `<svg viewBox="0 0 170 120" aria-hidden="true">
    <rect x="18" y="88" width="96" height="24" rx="12" fill="#3b3b3b" stroke="${INK}" stroke-width="3"/>
    <circle cx="32" cy="100" r="7" fill="#777"/><circle cx="66" cy="100" r="7" fill="#777"/><circle cx="100" cy="100" r="7" fill="#777"/>
    <rect x="28" y="64" width="78" height="26" rx="4" fill="#ffc21a" stroke="${INK}" stroke-width="3"/>
    <path d="M36 64 v-32 h34 l10 32 z" fill="#ffc21a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M42 60 v-22 h24 l7 22 z" fill="#9ad7ff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M28 74 h78" stroke="#1b1b1b" stroke-width="3" stroke-dasharray="7 7"/>
    <g class="bagger-arm">
      <path d="M96 70 L128 30 L156 58" fill="none" stroke="${INK}" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M96 70 L128 30 L156 58" fill="none" stroke="#ffc21a" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M146 56 l22 4 l-6 26 q-18 4-24-10 z" fill="#8c8c8c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M145 84 l3 6 M153 86 l2 6 M161 85 l1 6" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    </g>
  </svg>`,

  fan: `<svg viewBox="0 0 90 130" aria-hidden="true">
    <path d="M45 70 L45 118" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    <path d="M45 70 L45 118" stroke="#5aa0d6" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="45" cy="122" rx="26" ry="7" fill="#5aa0d6" stroke="${INK}" stroke-width="3"/>
    <circle cx="45" cy="42" r="38" fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="3"/>
    <g class="fan-blades">
      <path d="M45 42 q-6-28 6-32 q10 6-6 32z" fill="#7cc4f2" stroke="${INK}" stroke-width="2"/>
      <path d="M45 42 q28-6 32 6 q-6 10-32-6z" fill="#7cc4f2" stroke="${INK}" stroke-width="2"/>
      <path d="M45 42 q6 28-6 32 q-10-6 6-32z" fill="#7cc4f2" stroke="${INK}" stroke-width="2"/>
      <path d="M45 42 q-28 6-32-6 q6-10 32 6z" fill="#7cc4f2" stroke="${INK}" stroke-width="2"/>
    </g>
    <circle cx="45" cy="42" r="6" fill="#ffc21a" stroke="${INK}" stroke-width="2.5"/>
    <path d="M14 30 a34 34 0 0 1 18-20 M76 54 a34 34 0 0 1-18 20" stroke="${INK}" stroke-width="1.5" fill="none" opacity=".5"/>
  </svg>`,

  ufo: `<svg viewBox="0 0 170 80" aria-hidden="true">
    <ellipse cx="85" cy="34" rx="34" ry="28" fill="#b9f3ff" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="76" cy="24" rx="9" ry="6" fill="#fff" opacity=".8"/>
    <circle cx="85" cy="34" r="10" fill="#7fdc5a" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="82" cy="32" r="2.5" fill="#111"/><circle cx="89" cy="32" r="2.5" fill="#111"/>
    <ellipse cx="85" cy="50" rx="80" ry="20" fill="#9aa6b5" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="85" cy="46" rx="62" ry="10" fill="#c6d0dc"/>
    <g class="ufo-lights"><circle cx="30" cy="54" r="5" fill="#ffd23f"/><circle cx="58" cy="60" r="5" fill="#ff6f61"/><circle cx="85" cy="63" r="5" fill="#7fdc5a"/><circle cx="112" cy="60" r="5" fill="#ff6f61"/><circle cx="140" cy="54" r="5" fill="#ffd23f"/></g>
  </svg>`,
};

// Kleine Icons für den Shop
export const ICONS = {
  eimer: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 16 h28 l-4 26 h-20 z" fill="#ff8a3d" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 24 h24" stroke="#ffb27a" stroke-width="3"/><path d="M12 16 q12-16 24 0" fill="none" stroke="${INK}" stroke-width="2.5"/><ellipse cx="24" cy="16" rx="14" ry="3.5" fill="#f2c56b" stroke="${INK}" stroke-width="2.5"/></svg>`,
  schaufel: `<svg viewBox="0 0 48 48" aria-hidden="true"><line x1="10" y1="8" x2="30" y2="30" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><line x1="10" y1="8" x2="30" y2="30" stroke="#a8692f" stroke-width="3" stroke-linecap="round"/><path d="M6 6 l8 -2 l-2 8z" fill="${INK}"/><path d="M26 30 l8-8 l10 10 q0 12-12 10z" fill="#c3ccd6" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  ventilator: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="20" r="16" fill="#e6f5ff" stroke="${INK}" stroke-width="2.5"/><path d="M24 20 q-3-13 3-14 q4 3-3 14z M24 20 q13-3 14 3 q-3 4-14-3z M24 20 q3 13-3 14 q-4-3 3-14z M24 20 q-13 3-14-3 q3-4 14 3z" fill="#7cc4f2" stroke="${INK}" stroke-width="1.5"/><circle cx="24" cy="20" r="3" fill="#ffc21a"/><path d="M24 36 v6 M14 44 h20" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></svg>`,
  kamel: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 38 q-1-12 8-13 q3-9 9-3 q5-7 10 1 q5 2 5 12 q0 4-4 4 h-24 q-4 0-4-1z" fill="#c8915a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M36 30 q4-3 4-10 q1-5 5-6" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M36 30 q4-3 4-10 q1-5 5-6" fill="none" stroke="#c8915a" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="13" r="4" fill="#c8915a" stroke="${INK}" stroke-width="2"/><path d="M10 40 v5 M16 40 v5 M28 40 v5 M34 40 v5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></svg>`,
  bagger: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="34" width="28" height="9" rx="4.5" fill="#3b3b3b" stroke="${INK}" stroke-width="2"/><rect x="6" y="24" width="24" height="10" rx="2" fill="#ffc21a" stroke="${INK}" stroke-width="2"/><path d="M9 24 v-12 h10 l3 12z" fill="#9ad7ff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M28 26 L36 12 L44 22" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M28 26 L36 12 L44 22" fill="none" stroke="#ffc21a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M40 21 l7 1 l-2 9 q-6 1-8-4z" fill="#8c8c8c" stroke="${INK}" stroke-width="2"/></svg>`,
  zauberer: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 2 L36 34 H12 Z" fill="#6c3fc5" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="24" cy="35" rx="20" ry="5" fill="#5530a0" stroke="${INK}" stroke-width="2.5"/><path d="M22 14 l1.5 3 l3 .4 l-2.3 2 l.6 3 l-2.8-1.5 l-2.8 1.5 l.6-3 l-2.3-2 l3-.4z" fill="#ffd23f"/><circle cx="28" cy="26" r="2" fill="#ffd23f"/><path d="M16 40 q8 8 16 0" fill="#fff" stroke="${INK}" stroke-width="2"/></svg>`,
  raumschiff: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 30 L8 46 H40 L34 30z" fill="rgba(160,255,140,.45)"/><ellipse cx="24" cy="18" rx="10" ry="9" fill="#b9f3ff" stroke="${INK}" stroke-width="2.2"/><ellipse cx="24" cy="25" rx="21" ry="7" fill="#9aa6b5" stroke="${INK}" stroke-width="2.2"/><circle cx="12" cy="26" r="2" fill="#ffd23f"/><circle cx="24" cy="29" r="2" fill="#ff6f61"/><circle cx="36" cy="26" r="2" fill="#ffd23f"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10 V7 a4 4 0 0 1 8 0 v3" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`,
  soundOn: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9 h4 l5-4 v14 l-5-4 h-4z" fill="currentColor"/><path d="M16 8.5 q3 3.5 0 7 M18.5 6 q5 6 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9 h4 l5-4 v14 l-5-4 h-4z" fill="currentColor"/><path d="M16 9 l6 6 M22 9 l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6 h16 M4 12 h16 M4 18 h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3 h10 v5 a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5 H3 q0 5 5 5 M17 5 h4 q0 5-5 5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 13 v4 M8 21 h8 l-1-4 h-6z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  door: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3 H5 v18 h9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 12 h11 M17 8 l4 4 l-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  help: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9.2 9.5 a3 3 0 1 1 4.2 2.7 q-1.4.7-1.4 2.3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.4" fill="currentColor"/></svg>`,
  storm: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 14 q16-8 32 0 M6 22 q18-8 36 0 M10 30 q14-6 28 0 M16 38 q8-4 16 0" fill="none" stroke="#fff3c4" stroke-width="3.5" stroke-linecap="round"/></svg>`,
};
