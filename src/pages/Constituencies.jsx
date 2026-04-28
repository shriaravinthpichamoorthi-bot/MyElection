import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MapFragmentIcon from '../components/MapFragmentIcon';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import { formatPct, marginClass, slugify, partyColor } from '../utils/helpers';
import { loadConstituencyAsset } from '../utils/mapAssets';

const YEARS = [2001, 2006, 2011, 2016, 2021, 2026];

export default function Constituencies() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [constituencyGeometries, setConstituencyGeometries] = useState(new Map());

  useEffect(() => {
    let cancelled = false;
    loadConstituencyAsset().then(g => { if (!cancelled) setConstituencyGeometries(g); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingSpinner />;

  const { byYear, districts, partyColors } = data;
  const recs = byYear[selYear] || [];
  const districtList = ['', ...districts];
  const partyList = useMemo(() => {
    const parties = [...new Set(recs.map(r => r.winner_party).filter(Boolean))].sort();
    return ['', ...parties];
  }, [recs]);

  const filtered = useMemo(() => {
    let rows = recs;
    if (search) rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (filterDistrict) rows = rows.filter(r => r.district === filterDistrict);
    if (filterParty) rows = rows.filter(r => r.winner_party === filterParty);
    return rows;
  }, [recs, search, filterDistrict, filterParty]);

  const { sorted, col: sortCol, dir: sortDir, toggle: sortToggle } = useSortable(filtered, 'constituency_no');

  const selectStyle = "px-3 py-2.5 bg-white/5 border border-white/8 hover:border-white/15 focus:border-indigo-500/50 rounded-xl text-sm text-slate-300 focus:outline-none transition-colors appearance-none cursor-pointer";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Constituencies</h1>
          </div>
          <p className="text-slate-500 text-sm pl-12">234 assembly segments across 38 districts</p>
        </div>

        <div className="sm:ml-auto flex flex-wrap gap-2">
          {YEARS.map(y => (
            <motion.button key={y} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
              onClick={() => setSelYear(y)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selYear === y ? 'year-pill-active text-white' : 'bg-white/5 text-slate-400 hover:text-white border border-white/8'
              }`}>
              {y}{y === 2026 ? ' ★' : ''}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name…"
              className="pl-8 pr-3 py-2.5 bg-white/5 border border-white/8 hover:border-white/15 focus:border-indigo-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors w-44" />
          </div>

          <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className={selectStyle}>
            <option value="">All Districts</option>
            {districtList.slice(1).map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={filterParty} onChange={e => setFilterParty(e.target.value)} className={selectStyle}>
            <option value="">All Parties</option>
            {partyList.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-600 tabular-nums">
              <span className="text-slate-300 font-semibold">{filtered.length}</span> results
            </span>

            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden border border-white/8">
              {[['table', List], ['grid', LayoutGrid]].map(([mode, Icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-2 transition-colors ${viewMode === mode ? 'bg-indigo-600/30 text-indigo-300' : 'bg-white/3 text-slate-500 hover:text-slate-300'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table view */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div key="table"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <SortTh label="#" col="constituency_no" activeCol={sortCol} dir={sortDir} onSort={sortToggle}
                      className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider" />
                    <SortTh label="Constituency" col="name" activeCol={sortCol} dir={sortDir} onSort={sortToggle}
                      className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider" />
                    <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">District</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cat.</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Winner</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Party</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Alliance</th>
                    <SortTh label="Margin%" col="margin_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle}
                      className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider" />
                    <SortTh label="Turnout%" col="turnout_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle}
                      className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => {
                    const mc = marginClass(r.margin_pct);
                    return (
                      <tr key={i} className="border-b border-white/4 table-row-hover transition-colors">
                        <td className="px-4 py-3 text-slate-600 text-xs font-mono">{r.constituency_no}</td>
                        <td className="px-4 py-3">
                          <Link to={`/constituency/${slugify(r.name)}`}
                            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap transition-colors">
                            <MapFragmentIcon
                              geometry={constituencyGeometries.get(r.constituency_no)}
                              className="h-4 w-4 shrink-0 opacity-80"
                              fill="#818cf8"
                              background="transparent"
                            />
                            <span>{r.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {r.district ? (
                            <Link to={`/district/${slugify(r.district)}?year=${selYear}`}
                              className="text-slate-500 hover:text-slate-300 text-xs whitespace-nowrap transition-colors">
                              {r.district}
                            </Link>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{r.category || '—'}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                          {r.winner_name || <span className="text-slate-700 italic">Pending</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.winner_party ? <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /> : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap hidden xl:table-cell">
                          {r.winner_alliance || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {r.margin_pct != null
                            ? <span className={`font-semibold text-xs tabular-nums ${mc.color}`}>{r.margin_pct.toFixed(1)}%</span>
                            : <span className="text-slate-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs tabular-nums">{formatPct(r.turnout_pct)}</td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-600 text-sm">
                        No results match the current filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          /* Card grid view */
          <motion.div key="grid"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sorted.map((r, i) => {
              const mc = marginClass(r.margin_pct);
              const color = r.winner_party ? partyColor(r.winner_party, partyColors) : '#6366f1';
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                  <Link to={`/constituency/${slugify(r.name)}`}
                    className="block glass rounded-xl p-4 hover:scale-[1.02] transition-all duration-200 group"
                    style={{ borderColor: color + '20' }}>
                    <div className="flex items-start gap-2 mb-3">
                      <MapFragmentIcon
                        geometry={constituencyGeometries.get(r.constituency_no)}
                        className="h-6 w-6 shrink-0 mt-0.5"
                        fill={color}
                        background="transparent"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white group-hover:text-indigo-300 truncate transition-colors leading-tight">
                          {r.name}
                        </p>
                        <p className="text-[11px] text-slate-600">{r.district}</p>
                      </div>
                    </div>

                    {r.winner_name ? (
                      <p className="text-xs text-slate-400 truncate mb-2">{r.winner_name}</p>
                    ) : (
                      <p className="text-xs text-slate-700 italic mb-2">Pending</p>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      {r.winner_party
                        ? <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" />
                        : <span />}
                      <div className="flex items-center gap-2 text-xs">
                        {r.margin_pct != null && (
                          <span className={`font-semibold tabular-nums ${mc.color}`}>{r.margin_pct.toFixed(1)}%</span>
                        )}
                        <span className="text-slate-600">{formatPct(r.turnout_pct)}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            {sorted.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-600 text-sm">
                No results match the current filters
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
