import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, MapPin, Map } from 'lucide-react';

const TABS = [
  { to: '/live',                 label: 'Dashboard',      icon: LayoutDashboard, exact: true },
  { to: '/live/constituencies',  label: 'Constituencies', icon: List },
  { to: '/live/districts',       label: 'Districts',      icon: MapPin },
  { to: '/live-map',             label: 'Map',            icon: Map },
];

export default function LiveTabBar() {
  const { pathname } = useLocation();

  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #1e293b' }}>
      {TABS.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? pathname === to : pathname.startsWith(to);
        return (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', fontSize: 13, fontWeight: active ? 700 : 500,
              color: active ? '#f87171' : '#64748b',
              borderBottom: `2px solid ${active ? '#ef4444' : 'transparent'}`,
              marginBottom: -1, cursor: 'pointer', transition: 'color 0.12s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#94a3b8'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#64748b'; }}>
              <Icon size={14} />
              {label}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
