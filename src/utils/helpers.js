export const PARTY_COLORS = {
  DMK: '#e53935', INC: '#1565c0', AIADMK: '#1b5e20', ADMK: '#1b5e20',
  BJP: '#f57c00', CPM: '#b71c1c', CPI: '#c62828', PMK: '#ff8f00',
  MDMK: '#6a1b9a', VCK: '#0d47a1', DMDK: '#f9a825', MNM: '#00838f',
  NTK: '#4a148c', TVK: '#00695c', IND: '#607d8b', Others: '#607d8b',
};

export const ALLIANCE_COLORS = {
  'DMK Alliance': '#e53935', 'AIADMK Alliance': '#1b5e20',
  'ADMK Alliance': '#1b5e20', 'BJP Alliance': '#f57c00',
  NTK: '#4a148c', DMDK: '#f9a825', Others: '#607d8b',
};

export function partyColor(party, partyColors = {}) {
  return partyColors[party] || PARTY_COLORS[party] || '#607d8b';
}

export function allianceColor(alliance, allianceColors = {}) {
  return allianceColors[alliance] || ALLIANCE_COLORS[alliance] || '#607d8b';
}

export function formatNumber(n) {
  if (n == null) return '—';
  return n.toLocaleString('en-IN');
}

export function formatPct(n, decimals = 1) {
  if (n == null) return '—';
  return n.toFixed(decimals) + '%';
}

export function marginClass(pct) {
  if (pct == null) return { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-800' };
  if (pct < 3) return { label: 'Toss-Up', color: 'text-red-400', bg: 'bg-red-900/30' };
  if (pct < 8) return { label: 'Battleground', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
  return { label: 'Safe', color: 'text-green-400', bg: 'bg-green-900/30' };
}

export function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const YEARS = [2001, 2006, 2011, 2016, 2021, 2026];

export const YEAR_COLORS = {
  2001: '#6366f1', 2006: '#0ea5e9', 2011: '#10b981',
  2016: '#f59e0b', 2021: '#ef4444', 2026: '#ec4899',
};
