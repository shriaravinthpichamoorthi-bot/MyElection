export default function SortTh({ label, col, activeCol, dir, onSort, className = '' }) {
  const active = col === activeCol;
  return (
    <th onClick={() => onSort(col)} className={className}
      style={{ cursor:'pointer', userSelect:'none', whiteSpace:'nowrap', color: active ? '#a5b4fc' : '#475569', padding:'10px 12px', background: active ? 'rgba(99,102,241,0.08)' : 'transparent', borderRadius: 6, transition: 'background 0.12s, color 0.12s' }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight: active ? 700 : 600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
        {label}
        <span style={{ fontSize:10, opacity: active ? 1 : 0.4, color: active ? '#818cf8' : '#475569' }}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}
