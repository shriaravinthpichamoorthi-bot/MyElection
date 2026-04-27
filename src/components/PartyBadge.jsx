import { partyColor } from '../utils/helpers';

export default function PartyBadge({ party, partyColors = {}, size = 'sm' }) {
  if (!party) return <span className="text-slate-500">—</span>;
  const color = partyColor(party, partyColors);
  const sz = size === 'xs' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return (
    <span
      className={`inline-flex items-center rounded font-semibold ${sz}`}
      style={{ background: color + '30', color, border: `1px solid ${color}60` }}
    >
      {party}
    </span>
  );
}
