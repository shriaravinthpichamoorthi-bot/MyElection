export default function SortTh({ label, col, activeCol, dir, onSort, className = '' }) {
  const active = col === activeCol;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap group transition-colors ${
        active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
      } ${className}`}>
      <span className="flex items-center gap-1">
        {label}
        <span className={`text-[10px] transition-colors ${active ? 'text-indigo-400' : 'text-slate-700 group-hover:text-slate-500'}`}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}
