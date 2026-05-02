import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, MapPin, Map } from 'lucide-react';

export default function LiveTabBar() {
  const { pathname } = useLocation();
  const isBihar = pathname.startsWith('/bihar');
  const basePath = isBihar ? '/bihar/live' : '/live';

  const TABS = [
    { to: basePath, label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: `${basePath}/constituencies`, label: 'Constituencies', icon: List },
    { to: `${basePath}/districts`, label: 'Districts', icon: MapPin },
  ];

  // Only show Map tab for Tamil Nadu (Bihar map ignored per user request)
  if (!isBihar) {
    TABS.push({ to: '/live-map', label: 'Map', icon: MapPin });
  }

  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #1e293b' }}>
      {TABS.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? pathname === to : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={active ? 'live-tab-active' : 'live-tab-idle'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? '#818cf8' : '#64748b',
              borderBottom: `2px solid ${active ? '#6366f1' : 'transparent'}`,
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color 0.12s, border-color 0.12s',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              outline: 'none',
            }}>
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
