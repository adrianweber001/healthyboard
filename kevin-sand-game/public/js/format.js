const intFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const bigFmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 9, maximumFractionDigits: 9 });

const UNITS = [
  [1e18, 'Trio.'],
  [1e15, 'Brd.'],
  [1e12, 'Bio.'],
  [1e9, 'Mrd.'],
  [1e6, 'Mio.'],
];

export function fmt(n) {
  n = Math.floor(Number(n) || 0);
  if (Math.abs(n) < 1e6) return intFmt.format(n);
  for (const [v, unit] of UNITS) {
    if (Math.abs(n) >= v) return `${bigFmt.format(n / v)} ${unit}`;
  }
  return intFmt.format(n);
}

export function fmtRate(n) {
  if (n > 0 && n < 10 && !Number.isInteger(n)) return n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  return fmt(n);
}

export function fmtPercent(p) {
  return `${pctFmt.format(p)} %`;
}

export function fmtDuration(seconds) {
  seconds = Math.floor(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} Std. ${m} Min.`;
  if (m > 0) return `${m} Min.`;
  return `${seconds} Sek.`;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
