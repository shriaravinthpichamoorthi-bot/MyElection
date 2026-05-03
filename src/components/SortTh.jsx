export default function SortTh({ label, col, activeCol, dir, onSort, className = '' }) {
  const active = col === activeCol;
  return (
    <th onClick={() => onSort(col)} className={className}
      style={{ cursor:'pointer', userSelect:'none', whiteSpace:'nowrap', color: active ? '#a5b4fc' : '#475569', padding:'12px 16px', fontSize: 11, fontWeight: active ? 700 : 600, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom: '1px solid #1e293b', background: 'transparent', textAlign: 'left' }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
        {label}
        <span style={{ fontSize:10, opacity: active ? 1 : 0.4, color: active ? '#818cf8' : '#475569' }}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}
