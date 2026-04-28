import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Menu, X, BarChart3, MapPin, Users, TrendingUp,
  GitCompare, Home, Globe, Map, ChevronRight, Zap,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';

const NAV_GROUPS = [
  {
    label: 'Explore',
    items: [
      { to: '/', label: 'Dashboard', icon: Home },
      { to: '/map', label: 'Map View', icon: Map },
      { to: '/districts', label: 'Districts', icon: MapPin },
      { to: '/constituencies', label: 'Constituencies', icon: Globe },
    ],
  },
  {
    label: 'Analyze',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/compare', label: 'Compare', icon: GitCompare },
      { to: '/candidates', label: 'Candidates', icon: Users },
      { to: '/predictions', label: 'Predictions', icon: TrendingUp, badge: '2026' },
    ],
  },
];

function NavItem({ to, label, icon: Icon, badge, active, onClick }) {
  return (
    <Link to={to} onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
        active
          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
      }`}>
      {active && (
        <motion.div layoutId="nav-indicator"
          className="absolute inset-0 rounded-xl bg-indigo-600/15 border border-indigo-500/30"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
      )}
      <Icon className={`w-4 h-4 shrink-0 relative z-10 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
      <span className="relative z-10 flex-1">{label}</span>
      {badge && (
        <span className="relative z-10 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
          {badge}
        </span>
      )}
      {active && <ChevronRight className="w-3 h-3 text-indigo-400 relative z-10 opacity-60" />}
    </Link>
  );
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const { data } = useData();
  const loc = useLocation();
  const nav = useNavigate();
  const searchRef = useRef();

  useEffect(() => { setSidebarOpen(false); }, [loc.pathname]);

  useEffect(() => {
    if (!query.trim() || !data) { setResults([]); return; }
    const q = query.toLowerCase();
    const cResults = data.constituencies
      .filter(c => c.toLowerCase().includes(q)).slice(0, 4)
      .map(c => ({ type: 'constituency', label: c, to: `/constituency/${slugify(c)}` }));
    const dResults = data.districts
      .filter(d => d.toLowerCase().includes(q)).slice(0, 2)
      .map(d => ({ type: 'district', label: d, to: `/district/${slugify(d)}` }));
    const candKeys = Object.keys(data.candidateMap).filter(k => k.includes(q)).slice(0, 2);
    const cands = candKeys.map(k => ({
      type: 'candidate', label: data.candidateMap[k].name,
      to: `/candidate/${slugify(data.candidateMap[k].name)}`,
    }));
    setResults([...cResults, ...dResults, ...cands]);
  }, [query, data]);

  function pick(to) {
    setQuery(''); setResults([]);
    nav(to);
  }

  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResults([]); setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const typeStyles = {
    constituency: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20',
    district: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
    candidate: 'bg-violet-500/15 text-violet-300 border border-violet-500/20',
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : 'py-6'}`}>
      {/* Logo */}
      <div className={`px-4 ${mobile ? 'py-5 border-b border-white/5 mb-4' : 'mb-8'}`}>
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">TN Election</div>
            <div className="text-[10px] font-medium tracking-wider text-indigo-400 uppercase">Intelligence Portal</div>
          </div>
        </Link>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase px-3 mb-2">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} {...item}
                  active={loc.pathname === item.to}
                  onClick={() => setSidebarOpen(false)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 mt-6 pt-4 border-t border-white/5">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          234 constituencies · 38 districts<br />
          Data: 2001–2026
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen mesh-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-xl fixed top-0 left-0 h-screen z-40">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="fixed top-0 left-0 h-screen w-72 z-50 bg-slate-950/95 backdrop-blur-xl border-r border-white/10 lg:hidden overflow-y-auto">
              <Sidebar mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 lg:pl-64 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 flex items-center gap-4 px-4 lg:px-6 border-b border-white/5 bg-black/30 backdrop-blur-xl">
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div ref={searchRef} className="flex-1 relative max-w-lg">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchFocused ? 'text-indigo-400' : 'text-slate-500'}`} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search constituency, district, candidate…"
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm text-slate-100 placeholder-slate-500 transition-all duration-200 ${
                searchFocused
                  ? 'bg-slate-900/80 border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                  : 'bg-white/5 border border-white/8 hover:border-white/15'
              } focus:outline-none`}
            />
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-2 w-full glass rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                  {results.map((r, i) => (
                    <motion.button key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => pick(r.to)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left transition-colors border-b border-white/5 last:border-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${typeStyles[r.type]}`}>
                        {r.type}
                      </span>
                      <span className="text-sm text-slate-200">{r.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-xs text-emerald-400 font-medium">2026 Live</span>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 lg:px-8 py-6 lg:py-8">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}>
            {children}
          </motion.div>
        </main>

        <footer className="px-6 py-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-600">
            Tamil Nadu Election Intelligence Portal · 2001–2026 · 234 constituencies · 38 districts
          </p>
        </footer>
      </div>
    </div>
  );
}
