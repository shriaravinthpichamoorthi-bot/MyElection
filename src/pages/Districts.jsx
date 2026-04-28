import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPinned, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MapFragmentIcon from '../components/MapFragmentIcon';
import PartyBadge from '../components/PartyBadge';
import { formatPct, slugify, allianceColor } from '../utils/helpers';
import { loadDistrictAsset } from '../utils/mapAssets';

const YEARS = [2001, 2006, 2011, 2016, 2021, 2026];

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.04 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

export default function Districts() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);
  const [search, setSearch] = useState('');
  const [districtGeometries, setDistrictGeometries] = useState(new Map());

  useEffect(() => {
    let cancelled = false;
    loadDistrictAsset().then(g => { if (!cancelled) setDistrictGeometries(g); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingSpinner />;

  const { districts, byDistrictYear, partyColors, allianceColors, district2026 } = data;
  const filtered = districts.filter(d => d.toLowerCase().includes(search.toLowerCase()));

  function getStats(district, year) {
    const recs = byDistrictYear[`${district}||${year}`] || [];
    if (!recs.length) return null;
    const turnout = (recs.reduce((s, r) => s + (r.turnout_pct || 0), 0) / recs.length).toFixed(1);
    const winners = {};
    recs.forEach(r => { if (r.winner_party) winners[r.winner_party] = (winners[r.winner_party] || 0) + 1; });
    const topParty = Object.entries(winners).sort((a, b) => b[1] - a[1])[0];
    const alliances = {};
    recs.forEach(r => { if (r.winner_alliance) alliances[r.winner_alliance] = (alliances[r.winner_alliance] || 0) + 1; });
    const topAlliance = Object.entries(alliances).sort((a, b) => b[1] - a[1])[0];
    return { seats: recs.length, turnout, topParty, topAlliance };
  }

  const d26map = {};
  district2026.forEach(d => { d26map[d.district] = d; });

  const turnoutColor = (pct) =>
    pct >= 80 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <MapPinned className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Districts</h1>
          </div>
          <p className="text-slate-500 text-sm pl-12">38 districts · constituency-wise results</p>
        </div>

        {/* Year pills */}
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

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter districts…"
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/8 hover:border-white/15 focus:border-indigo-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors" />
      </div>

      {/* Grid */}
      <motion.div variants={stagger.container} initial="hidden" animate="show"
        className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(district => {
          const stats = getStats(district, selYear);
          const d26 = d26map[district];
          const topAllianceName = stats?.topAlliance?.[0];
          const topAllianceColor = topAllianceName ? allianceColor(topAllianceName, allianceColors) : '#6366f1';

          return (
            <motion.div key={district} variants={stagger.item}>
              <Link to={`/district/${slugify(district)}?year=${selYear}`}
                className="block glass rounded-2xl p-5 hover:scale-[1.015] transition-all duration-200 group"
                style={{ borderColor: topAllianceColor + '18' }}>
                {/* Top accent line */}
                <div className="absolute top-0 left-5 right-5 h-px rounded-full opacity-60"
                  style={{ background: `linear-gradient(90deg, transparent, ${topAllianceColor}60, transparent)` }} />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-800/60 border border-white/8 flex items-center justify-center">
                      <MapFragmentIcon
                        geometry={districtGeometries.get(district)}
                        className="h-6 w-6"
                        fill={topAllianceColor}
                        background="transparent"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors text-sm leading-tight">
                        {district}
                      </h3>
                      <p className="text-[11px] text-slate-600">{stats?.seats || 0} constituencies</p>
                    </div>
                  </div>

                  {selYear === 2026 && d26 ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{
                        color: turnoutColor(d26.turnout_pct || 0),
                        background: turnoutColor(d26.turnout_pct || 0) + '18',
                        border: `1px solid ${turnoutColor(d26.turnout_pct || 0)}30`,
                      }}>
                      {d26.turnout_pct?.toFixed(1)}%
                    </span>
                  ) : stats ? (
                    <span className="text-xs text-slate-500">{stats.turnout}% turnout</span>
                  ) : null}
                </div>

                {selYear === 2026 && d26 ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Electors', `${(d26.total_electors / 100000).toFixed(1)}L`],
                      ['Voted', `${(d26.votes_polled / 100000).toFixed(1)}L`],
                      ['Category', d26.category, 'col-span-2'],
                    ].map(([k, v, cls = '']) => (
                      <div key={k} className={cls}>
                        <span className="text-slate-600">{k}: </span>
                        <span className="text-slate-300 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : stats ? (
                  <div className="space-y-2.5">
                    {stats.topAlliance && (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: allianceColor(stats.topAlliance[0], allianceColors), boxShadow: `0 0 6px ${allianceColor(stats.topAlliance[0], allianceColors)}` }} />
                        <span className="text-xs text-slate-400 truncate flex-1">{stats.topAlliance[0]}</span>
                        <span className="text-xs font-bold text-white">{stats.topAlliance[1]} seats</span>
                      </div>
                    )}
                    {stats.topParty && (
                      <div className="flex items-center gap-2">
                        <PartyBadge party={stats.topParty[0]} partyColors={partyColors} size="xs" />
                        <span className="text-xs text-slate-600 ml-auto">{stats.topParty[1]} wins</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">No data available</p>
                )}
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
