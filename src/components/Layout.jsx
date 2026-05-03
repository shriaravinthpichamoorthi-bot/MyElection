import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search, Menu, X, BarChart3, MapPin, Users, TrendingUp,
  GitCompare, Home, Globe, Map, Zap, ChevronRight, ChevronLeft, Radio,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import LiveResultsBanner from './LiveResultsBanner';

const NAV = [
  { group: 'Live 2026', items: [
    { to: '/live', label: 'Live Results', icon: Radio, badge: 'LIVE', live: true },
  ]},
  { group: 'Explore', items: [
    { to: '/',               label: 'Dashboard',     icon: Home },
    { to: '/map',            label: 'Map View',       icon: Map },
    { to: '/districts',      label: 'Districts',      icon: MapPin },
    { to: '/constituencies', label: 'Constituencies', icon: Globe },
  ]},
  { group: 'Analyze', items: [
    { to: '/analytics',   label: 'Analytics',    icon: BarChart3 },
    { to: '/compare',     label: 'Compare',      icon: GitCompare },
    { to: '/candidates',  label: 'Candidates',   icon: Users },
    { to: '/predictions', label: 'Predictions',  icon: TrendingUp, badge: '2026' },
  ]},
];

function SidebarContent({ onNav, collapsed, onToggle }) {
  const { pathname } = useLocation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 0' }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '0 0 24px' : '0 16px 24px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10 }}>
        <Link to="/" onClick={onNav} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', overflow: 'hidden' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.4)', flexShrink: 0 }}>
            <Zap size={16} color="#fff" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc', lineHeight: 1.2, whiteSpace: 'nowrap' }}>TN Election</div>
              <div style={{ fontWeight: 600, fontSize: 11, color: '#6366f1', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Intelligence Portal</div>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '0 8px' : '0 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: collapsed ? 4 : 20 }}>
        {NAV.map(({ group, items }) => (
          <div key={group}>
            {!collapsed && (
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px 6px' }}>
                {group}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.map(({ to, label, icon: Icon, badge, live }) => {
                const active = live
                  ? (pathname === to || pathname.startsWith('/live'))
                  : pathname === to;
                return (
                  <Link key={to} to={to} onClick={onNav}
                    className={active ? 'nav-active' : 'nav-idle'}
                    title={collapsed ? label : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, padding: collapsed ? '9px 0' : '9px 10px', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 500, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                    <Icon size={15} style={{ color: active ? (live ? '#f87171' : '#818cf8') : 'var(--text-subtle)', flexShrink: 0 }} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>{label}</span>
                        {badge && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: live ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)', color: live ? '#fca5a5' : '#a5b4fc', border: `1px solid ${live ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.3)'}`, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {live && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.6s ease-in-out infinite' }} />}
                            {badge}
                          </span>
                        )}
                        {active && <ChevronRight size={12} style={{ color: live ? '#ef4444' : '#6366f1', opacity: 0.6 }} />}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer + collapse toggle */}
      <div style={{ padding: collapsed ? '16px 8px 0' : '16px 20px 0', borderTop: '1px solid #1e293b', marginTop: 16 }}>
        {!collapsed && (
          <p style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.6, marginBottom: 10 }}>
            234 constituencies · 38 districts<br />2001–2026
          </p>
        )}
        {onToggle && (
          <button onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px 0', borderRadius: 9, border: '1px solid #1e293b', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#141e33'; e.currentTarget.style.color = '#cbd5e1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-subtle)'; }}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const reduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const { data } = useData();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const searchRef = useRef();

  const SIDEBAR_W = collapsed ? 64 : 240;

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Route search to live pages when user is on a live page
  const isLivePage = pathname.startsWith('/live') || pathname.startsWith('/bihar/live');
  const liveBase = pathname.startsWith('/bihar/live') ? '/bihar/live' : '/live';

  useEffect(() => {
    if (!query.trim() || !data) { setResults([]); return; }
    const q = query.toLowerCase();
    const c = data.constituencies.filter(x => x.toLowerCase().includes(q)).slice(0, 4)
      .map(x => ({ type: 'constituency', label: x, to: isLivePage ? `${liveBase}/${slugify(x)}` : `/constituency/${slugify(x)}` }));
    const d = data.districts.filter(x => x.toLowerCase().includes(q)).slice(0, 2)
      .map(x => ({ type: 'district', label: x, to: isLivePage ? `${liveBase}/district/${slugify(x)}` : `/district/${slugify(x)}` }));
    const k = Object.keys(data.candidateMap).filter(x => x.includes(q)).slice(0, 2)
      .map(x => ({ type: 'candidate', label: data.candidateMap[x].name, to: `/candidate/${slugify(data.candidateMap[x].name)}` }));
    setResults([...c, ...d, ...k]);
  }, [query, data, isLivePage, liveBase]);

  function pick(to) { setQuery(''); setResults([]); nav(to); }

  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }

  useEffect(() => {
    const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setResults([]); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const typeBg = { constituency: 'rgba(99,102,241,0.15)', district: 'rgba(16,185,129,0.15)', candidate: 'rgba(139,92,246,0.15)' };
  const typeColor = { constituency: '#818cf8', district: '#34d399', candidate: '#a78bfa' };

  return (
    <div className="app-bg" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <aside
        className="sidebar"
        style={{ flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 40, overflow: 'hidden', display: 'none', width: SIDEBAR_W, transition: 'width 0.25s ease' }}
        id="desktop-sidebar">
        <SidebarContent onNav={() => {}} collapsed={collapsed} onToggle={toggleCollapse} />
      </aside>

      <style>{`@media(min-width:1024px){#desktop-sidebar{display:block!important}}`}</style>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40 }}
              onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
              className="sidebar" style={{ position: 'fixed', top: 0, left: 0, height: '100vh', width: 240, zIndex: 50, overflowY: 'auto' }}>
              <button onClick={() => setMobileOpen(false)}
                style={{ position: 'absolute', top: 12, right: 12, padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={16} />
              </button>
              <SidebarContent onNav={() => setMobileOpen(false)} collapsed={false} onToggle={null} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
        id="main-content">
        <style>{`@media(min-width:1024px){#main-content{padding-left:${SIDEBAR_W}px;transition:padding-left 0.25s ease}}@media(max-width:1023px){#main-content{padding-left:0}}`}</style>

        {/* Top bar */}
        <header className="topbar" style={{ position: 'sticky', top: 0, zIndex: 30, height: 56, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' }}>
          <button onClick={() => setMobileOpen(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b', cursor: 'pointer', color: '#64748b' }}
            id="mobile-menu-btn">
            <Menu size={16} />
          </button>
          <style>{`@media(min-width:1024px){#mobile-menu-btn{display:none!important}}`}</style>

          {/* Search */}
          <div ref={searchRef} style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search constituency, district, candidate…"
              className="field" style={{ width: '100%', paddingLeft: 36 }} />
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden', zIndex: 50, boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
                  {results.map((r, i) => (
                    <button key={i} onClick={() => pick(r.to)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #1e293b', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: typeBg[r.type], color: typeColor[r.type], textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                        {r.type}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-body)' }}>{r.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live badge — topbar chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', flexShrink: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0, animation: 'pulse 1.6s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em' }}>2026 LIVE</span>
          </div>
        </header>

        {/* Live results banner */}
        <LiveResultsBanner />

        {/* Content */}
        <main style={{ flex: 1, padding: '32px' }} id="main-pad">
          <style>{`@media(max-width:640px){#main-pad{padding:16px!important}}`}</style>
          <motion.div key={pathname} initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? {} : { duration: 0.22, ease: 'easeOut' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
              {children}
            </div>
          </motion.div>
        </main>

        <footer style={{ padding: '20px 32px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
            {pathname.startsWith('/bihar') ? 'Bihar' : 'Tamil Nadu'} Election Intelligence Portal · 2001–2026 · {pathname.startsWith('/bihar') ? '243' : '234'} constituencies · 38 districts
          </p>
        </footer>
      </div>
    </div>
  );
}
