import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import YearBadge from '../components/YearBadge';
import PartyBadge from '../components/PartyBadge';
import { formatPct, slugify, allianceColor, partyColor } from '../utils/helpers';

export default function Districts() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);
  const [search, setSearch] = useState('');

  if (loading) return <LoadingSpinner />;

  const { districts, byDistrictYear, partyColors, allianceColors, district2026 } = data;

  const filtered = districts.filter(d => d.toLowerCase().includes(search.toLowerCase()));

  function getDistrictStats(district, year) {
    const recs = byDistrictYear[`${district}||${year}`] || [];
    if (!recs.length) return null;
    const turnout = (recs.reduce((s, r) => s + (r.turnout_pct || 0), 0) / recs.length).toFixed(1);
    const winners = {};
    recs.forEach(r => {
      if (r.winner_party) winners[r.winner_party] = (winners[r.winner_party] || 0) + 1;
    });
    const topParty = Object.entries(winners).sort((a, b) => b[1] - a[1])[0];
    const alliances = {};
    recs.forEach(r => {
      if (r.winner_alliance) alliances[r.winner_alliance] = (alliances[r.winner_alliance] || 0) + 1;
    });
    const topAlliance = Object.entries(alliances).sort((a, b) => b[1] - a[1])[0];
    return { seats: recs.length, turnout, topParty, topAlliance, recs };
  }

  // 2026 district data
  const d26map = {};
  district2026.forEach(d => { d26map[d.district] = d; });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Districts</h1>
          <p className="text-slate-400 text-sm">38 districts · constituency-wise results</p>
        </div>
        <div className="sm:ml-auto flex flex-wrap gap-2">
          {[2001,2006,2011,2016,2021,2026].map(y => (
            <YearBadge key={y} year={y} active={selYear === y} onClick={() => setSelYear(y)} />
          ))}
        </div>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Filter districts…"
        className="w-full max-w-xs px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(district => {
          const stats = getDistrictStats(district, selYear);
          const d26 = d26map[district];
          return (
            <Link key={district} to={`/district/${slugify(district)}?year=${selYear}`}
              className="bg-slate-900 border border-slate-800 hover:border-blue-700 rounded-xl p-4 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{district}</h3>
                  <p className="text-xs text-slate-500">{stats?.seats || 0} constituencies</p>
                </div>
                {selYear === 2026 && d26 ? (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    d26.turnout_pct >= 80 ? 'bg-green-900/50 text-green-400' :
                    d26.turnout_pct >= 65 ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>{d26.turnout_pct?.toFixed(1)}%</span>
                ) : (
                  stats && <span className="text-xs text-slate-400">{stats.turnout}% turnout</span>
                )}
              </div>

              {selYear === 2026 && d26 ? (
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>Electors: <span className="text-slate-200">{(d26.total_electors/100000).toFixed(1)}L</span></div>
                  <div>Voted: <span className="text-slate-200">{(d26.votes_polled/100000).toFixed(1)}L</span></div>
                  <div className="col-span-2">Category: <span className="text-slate-200">{d26.category}</span></div>
                </div>
              ) : stats ? (
                <div className="space-y-2">
                  {stats.topAlliance && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: allianceColor(stats.topAlliance[0], allianceColors) }} />
                      <span className="text-xs text-slate-300 truncate">{stats.topAlliance[0]}</span>
                      <span className="text-xs font-semibold text-white ml-auto">{stats.topAlliance[1]} seats</span>
                    </div>
                  )}
                  {stats.topParty && (
                    <div className="flex items-center gap-2">
                      <PartyBadge party={stats.topParty[0]} partyColors={partyColors} size="xs" />
                      <span className="text-xs text-slate-400 ml-auto">{stats.topParty[1]} wins</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No data</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
