const PARTY_SYMBOLS = {
  DMK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <line x1="2" y1="14" x2="18" y2="14" stroke={c} strokeWidth="1.3"/>
      <path d="M4,14 A6,6 0 0,1 16,14" fill={c}/>
      <line x1="10" y1="5.5" x2="10" y2="3.5" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="6.2" y1="7" x2="4.8" y2="5.8" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="13.8" y1="7" x2="15.2" y2="5.8" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="3.5" y1="10.5" x2="1.5" y2="10.5" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="16.5" y1="10.5" x2="18.5" y2="10.5" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  AIADMK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <path d="M7,17 C5,13 4.5,9 6.5,5.5 C8,3 10.5,3.5 10,8 C9.5,12.5 8.5,16 7,17Z" fill={c}/>
      <path d="M13,17 C15,13 15.5,9 13.5,5.5 C12,3 9.5,3.5 10,8 C10.5,12.5 11.5,16 13,17Z" fill={c}/>
    </svg>
  ),
  ADMK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <path d="M7,17 C5,13 4.5,9 6.5,5.5 C8,3 10.5,3.5 10,8 C9.5,12.5 8.5,16 7,17Z" fill={c}/>
      <path d="M13,17 C15,13 15.5,9 13.5,5.5 C12,3 9.5,3.5 10,8 C10.5,12.5 11.5,16 13,17Z" fill={c}/>
    </svg>
  ),
  BJP: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <path d="M10,3 C9,6.5 7,10.5 8,13.5 C8.8,16 11.2,16 12,13.5 C13,10.5 11,6.5 10,3Z" fill={c}/>
      <path d="M4.5,8 C3,11 3.5,14.5 6.5,16 C8.5,17 10.5,15.5 10,13 C8,11.5 6,9.5 4.5,8Z" fill={c} opacity="0.8"/>
      <path d="M15.5,8 C17,11 16.5,14.5 13.5,16 C11.5,17 9.5,15.5 10,13 C12,11.5 14,9.5 15.5,8Z" fill={c} opacity="0.8"/>
      <path d="M4.5,17.5 Q10,15.5 15.5,17.5" stroke={c} strokeWidth="1.1" fill="none"/>
    </svg>
  ),
  INC: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <rect x="6.5" y="3" width="2" height="8" rx="1" fill={c}/>
      <rect x="9" y="2" width="2" height="9" rx="1" fill={c}/>
      <rect x="11.5" y="3" width="2" height="8" rx="1" fill={c}/>
      <rect x="14" y="6" width="2" height="5" rx="1" fill={c}/>
      <path d="M5,11 Q5,17 10,17.5 Q15,17 15,11" fill={c}/>
    </svg>
  ),
  CPM: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <path d="M3,16 L3,9 L7,9 L7,16 M3,12 L7,12" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9,16 L9,4 L17,4 M9,4 L9,16" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="9" y1="10" x2="16" y2="10" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  CPI: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.4"/>
      <path d="M10,3.5 L10,16.5 M3.5,10 L16.5,10 M5.5,5.5 L14.5,14.5 M14.5,5.5 L5.5,14.5" stroke={c} strokeWidth="1.1"/>
    </svg>
  ),
  PMK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <path d="M10,3 C6,3 3,6 3,9 C3,12 5,14 8,14.5 L8,17 L10,17 L10,14.5 C13,14 17,12 17,9 C17,6 14,3 10,3Z" fill={c}/>
      <path d="M7,9 Q10,6 13,9" stroke="#fff" strokeWidth="1" fill="none" opacity="0.6"/>
    </svg>
  ),
  VCK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <circle cx="10" cy="10" r="7" fill={c} opacity="0.15" stroke={c} strokeWidth="1.2"/>
      <path d="M7,10 L10,7 L13,10 L10,13 Z" fill={c}/>
      <circle cx="10" cy="10" r="2" fill={c} opacity="0.4"/>
    </svg>
  ),
  MDMK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <rect x="9" y="3" width="2" height="14" fill={c}/>
      <rect x="5" y="3" width="8" height="5" rx="1" fill={c} opacity="0.7"/>
      <path d="M6,8 L10,14 L14,8" fill={c} opacity="0.8"/>
    </svg>
  ),
  TVK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <path d="M10,2 L11.5,7.5 L17.5,7.5 L12.8,11 L14.5,17 L10,13.5 L5.5,17 L7.2,11 L2.5,7.5 L8.5,7.5 Z" fill={c}/>
    </svg>
  ),
  NTK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <path d="M10,3 L10,17" stroke={c} strokeWidth="1.4"/>
      <path d="M6,3 L6,12 C6,14.5 8,16 10,16 C12,16 14,14.5 14,12 L14,3" stroke={c} strokeWidth="1.4" fill="none"/>
      <path d="M6,7 L14,7" stroke={c} strokeWidth="1.2"/>
    </svg>
  ),
  DMDK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <path d="M4,4 L4,16 L10,16 C14,16 17,14 17,10 C17,6 14,4 10,4 Z" stroke={c} strokeWidth="1.4" fill="none"/>
      <path d="M7.5,7.5 L7.5,12.5 L10,12.5 C12,12.5 13.5,11.5 13.5,10 C13.5,8.5 12,7.5 10,7.5 Z" fill={c}/>
    </svg>
  ),
  AMMK: ({ c }) => (
    <svg viewBox="0 0 20 20" width="100%" height="100%" fill="none">
      <circle cx="10" cy="9" r="5.5" stroke={c} strokeWidth="1.3"/>
      <path d="M10,3.5 L10,14.5 M4.5,9 L15.5,9" stroke={c} strokeWidth="1.1" opacity="0.5"/>
      <circle cx="10" cy="9" r="2" fill={c}/>
      <path d="M7,15.5 L10,17.5 L13,15.5" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
};

export default function PartyIcon({ party, color, size = 16 }) {
  const Symbol = PARTY_SYMBOLS[party] || PARTY_SYMBOLS[party?.replace('ADMK', 'AIADMK')];
  if (!Symbol) {
    return (
      <svg viewBox="0 0 20 20" width={size} height={size} fill="none">
        <circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.4" opacity="0.5"/>
        <text x="10" y="14" textAnchor="middle" fontSize="8" fill={color} fontWeight="700">
          {(party || '?').slice(0, 2)}
        </text>
      </svg>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0 }}>
      <Symbol c={color} />
    </span>
  );
}
