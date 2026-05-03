export const PARTY_COLORS = {
  // Tamil Nadu
  DMK: '#e53935', INC: '#1565c0', AIADMK: '#1b5e20', ADMK: '#1b5e20',
  BJP: '#f57c00', CPM: '#b71c1c', CPI: '#c62828', PMK: '#ff8f00',
  MDMK: '#6a1b9a', VCK: '#0d47a1', DMDK: '#f9a825', MNM: '#00838f',
  NTK: '#a78bfa', TVK: '#00695c',
  // Bihar
  'JD(U)': '#2E8B57', 'LJP-RV': '#FFD700', HAM: '#A0522D',
  RJD: '#008000', 'CPI(ML)L': '#FF0000', 'CPI(ML)(L)': '#FF0000',
  'CPI(M)': '#FF0000', 'CPI-ML': '#FF0000', JSP: '#FFD700',
  AIMIM: '#008000', BSP: '#0000FF', AAP: '#66CCFF',
  'Jan Suraaj Party': '#FFD700',
  // Fallback
  IND: '#607d8b', Others: '#607d8b',
};

export const PARTY_TO_ALLIANCE = {
  // NDA
  'Bharatiya Janata Party': 'NDA', BJP: 'NDA',
  'Janata Dal (United)': 'NDA', 'JD(U)': 'NDA',
  'Lok Janshakti Party (Ram Vilas)': 'NDA', 'LJP-RV': 'NDA',
  'Hindustani Awam Morcha': 'NDA', HAM: 'NDA',
  'Hindustani Awam Morcha (Secular)': 'NDA', 'HAM-S': 'NDA',
  'Rashtriya Lok Morcha': 'NDA', RLM: 'NDA',
  // MGB
  'Rashtriya Janata Dal': 'MGB', RJD: 'MGB',
  'Indian National Congress': 'MGB', INC: 'MGB',
  'Communist Party of India (Marxist–Leninist) Liberation': 'MGB', 'CPI(ML)L': 'MGB',
  'Communist Party of India (Marxist-Leninist) (Liberation)': 'MGB',
  'Communist Party of India': 'MGB', CPI: 'MGB',
  'Communist Party of India (Marxist)': 'MGB', 'CPI(M)': 'MGB',
  'Indian Inclusive Party': 'MGB', IIP: 'MGB',
  // GDA
  'All India Majlis-e-Ittehadul Muslimeen': 'GDA', AIMIM: 'GDA',
  'Rashtriya Lok Janshakti Party': 'GDA', RLJP: 'GDA',
  // Others
  'Jan Suraaj Party': 'Others', JSP: 'Others',
  'Bahujan Samaj Party': 'Others', BSP: 'Others',
  'Aam Aadmi Party': 'Others', AAP: 'Others',
  Independents: 'Others', IND: 'Others',
};

// Generate a party color tinted by its alliance color
export function partyColorByAlliance(party, allianceColors = {}) {
  const alliance = PARTY_TO_ALLIANCE[party];
  const baseColor = PARTY_COLORS[party] || '#607d8b';
  const allianceColor = allianceColors[alliance] || ALLIANCE_COLORS[alliance] || '#607d8b';
  // Return the alliance color for chart consistency, but we could blend them
  return allianceColor;
}

export const ALLIANCE_COLORS = {
  // Tamil Nadu
  'DMK Alliance': '#e53935', 'AIADMK Alliance': '#1b5e20',
  'ADMK Alliance': '#1b5e20', 'BJP Alliance': '#f57c00',
  NTK: '#a78bfa', DMDK: '#f9a825',
  // Bihar
  NDA: '#2E8B57', MGB: '#228B22',
  'Mahagathbandhan (Grand Alliance)': '#228B22',
  // Fallback
  Others: '#607d8b', IND: '#607d8b',
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

export function formatName(str) {
  if (!str) return str;
  const tokens = str.replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const initials = tokens.filter(t => t.length === 1).map(t => t.toUpperCase());
  const words = tokens.filter(t => t.length > 1).map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
  return [...initials, ...words].join(' ');
}

export const PARTY_INITIALS = {
  // Tamil Nadu
  DMK: 'DMK', INC: 'INC', AIADMK: 'AIADMK', ADMK: 'ADMK',
  BJP: 'BJP', CPM: 'CPM', CPI: 'CPI', PMK: 'PMK',
  MDMK: 'MDMK', VCK: 'VCK', DMDK: 'DMDK', MNM: 'MNM',
  NTK: 'NTK', TVK: 'TVK',
  // Bihar
  'JD(U)': 'JDU', 'LJP-RV': 'LJP', HAM: 'HAM',
  RJD: 'RJD', 'CPI(ML)L': 'CPI(ML)L', 'CPI(ML)(L)': 'CPI(ML)L',
  'CPI(M)': 'CPIM', 'CPI-ML': 'CPI-ML', JSP: 'JSP',
};

export function getPartyInitials(party) {
  return PARTY_INITIALS[party] || party;
}

export const YEARS = [2001, 2006, 2011, 2016, 2021, 2026];

export const YEAR_COLORS = {
  2001: '#6366f1', 2006: '#0ea5e9', 2011: '#10b981',
  2016: '#f59e0b', 2021: '#ef4444', 2026: '#ec4899',
};
