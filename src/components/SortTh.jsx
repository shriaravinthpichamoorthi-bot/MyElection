export default function SortTh({ label, col, activeCol, dir, onSort, className = '' }) {
  const active = col === activeCol;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wide cursor-pointer select-none whitespace-nowrap group ${
        active ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
      } ${className}`}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={`text-xs ${active ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}
