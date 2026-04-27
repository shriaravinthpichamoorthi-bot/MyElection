import { YEAR_COLORS } from '../utils/helpers';

export default function YearBadge({ year, onClick, active }) {
  const color = YEAR_COLORS[year] || '#64748b';
  return (
    <button
      onClick={onClick}
      style={{ borderColor: active ? color : 'transparent', color: active ? color : undefined }}
      className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition-all ${
        active ? 'bg-slate-800' : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
      }`}
    >
      {year}
    </button>
  );
}
