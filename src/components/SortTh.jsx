export default function SortTh({ label, col, activeCol, dir, onSort, className = '' }) {
  const active = col === activeCol;
  return (
    <th onClick={() => onSort(col)} className={className}
      style={{ cursor:'pointer', userSelect:'none', whiteSpace:'nowrap', color: active ? '#818cf8' : '#475569' }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
        {label}
        <span style={{ fontSize:10, opacity: active ? 1 : 0.4 }}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}
