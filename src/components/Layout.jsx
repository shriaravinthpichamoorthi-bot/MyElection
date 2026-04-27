import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, BarChart3, MapPin, Users, TrendingUp, GitCompare, Home, Globe } from 'lucide-react';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/districts', label: 'Districts', icon: MapPin },
  { to: '/constituencies', label: 'Constituencies', icon: Globe },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/map', label: 'Map', icon: TrendingUp },
];

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const { data } = useData();
  const loc = useLocation();
  const nav = useNavigate();
  const ref = useRef();

  useEffect(() => { setMenuOpen(false); }, [loc.pathname]);

  useEffect(() => {
    if (!query.trim() || !data) { setResults([]); return; }
    const q = query.toLowerCase();
    const cResults = data.constituencies
      .filter(c => c.toLowerCase().includes(q))
      .slice(0, 5)
      .map(c => ({ type: 'constituency', label: c, to: `/constituency/${slugify(c)}` }));
    const dResults = data.districts
      .filter(d => d.toLowerCase().includes(q))
      .slice(0, 3)
      .map(d => ({ type: 'district', label: d, to: `/district/${slugify(d)}` }));
    const candKeys = Object.keys(data.candidateMap)
      .filter(k => k.includes(q))
      .slice(0, 3);
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
      if (ref.current && !ref.current.contains(e.target)) setResults([]);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🗳️</span>
            <span className="font-bold text-white hidden sm:block text-sm leading-tight">
              TN Election<br/><span className="text-blue-400 font-normal text-xs">Intelligence Portal</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {NAV.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  loc.pathname === to ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}>
                {label}
              </Link>
            ))}
          </nav>

          <div ref={ref} className="flex-1 relative max-w-md ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search constituency, district, candidate…"
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {results.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                {results.map((r, i) => (
                  <button key={i} onClick={() => pick(r.to)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 text-left text-sm">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      r.type === 'constituency' ? 'bg-blue-900 text-blue-300' :
                      r.type === 'district' ? 'bg-green-900 text-green-300' :
                      'bg-purple-900 text-purple-300'
                    }`}>{r.type}</span>
                    <span className="text-slate-100">{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 text-slate-400 hover:text-white">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-900">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-4 py-3 text-sm border-b border-slate-800 ${
                  loc.pathname === to ? 'text-blue-400 bg-slate-800' : 'text-slate-400'
                }`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-slate-800 mt-12 py-6 text-center text-slate-500 text-sm">
        Tamil Nadu Election Intelligence Portal · 2001–2026 · Data coverage: 234 constituencies, 38 districts
      </footer>
    </div>
  );
}
