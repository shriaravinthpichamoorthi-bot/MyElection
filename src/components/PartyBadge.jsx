import { partyColor } from '../utils/helpers';

export default function PartyBadge({ party, partyColors = {}, size = 'sm' }) {
  if (!party) return <span className="text-slate-600 text-xs">—</span>;
  const color = partyColor(party, partyColors);
  const sizeClass = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5 font-semibold tracking-wide'
    : 'text-xs px-2.5 py-1 font-semibold tracking-wide';
  return (
    <span
      className={`inline-flex items-center rounded-lg ${sizeClass} transition-all`}
      style={{
        background: color + '18',
        color,
        border: `1px solid ${color}40`,
        boxShadow: `0 0 8px ${color}15`,
      }}>
      {party}
    </span>
  );
}
