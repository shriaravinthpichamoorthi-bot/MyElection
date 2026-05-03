import { partyColor, getPartyInitials } from '../utils/helpers';
import PartyIcon from './PartyIcon';

export default function PartyBadge({ party, partyColors = {}, size = 'sm', showIcon = true }) {
  if (!party) return <span style={{ color:'#475569', fontSize:12 }}>—</span>;
  const color = partyColor(party, partyColors);
  const initials = getPartyInitials(party);
  const pad = size === 'xs' ? '2px 7px' : '3px 9px';
  const fs = size === 'xs' ? 10 : 11;
  const iconSize = size === 'xs' ? 11 : 13;
  return (
    <span title={party} style={{
      display:'inline-flex', alignItems:'center', gap: showIcon ? 4 : 0,
      padding:pad, borderRadius:6,
      fontSize:fs, fontWeight:700, letterSpacing:'0.04em',
      color, background:`${color}1a`, border:`1px solid ${color}40`,
      boxShadow:`0 0 8px ${color}18`,
      whiteSpace:'nowrap',
      cursor: 'default',
    }}>
      {showIcon && <PartyIcon party={party} color={color} size={iconSize} />}
      {initials}
    </span>
  );
}
