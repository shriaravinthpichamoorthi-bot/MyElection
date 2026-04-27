import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import YearBadge from '../components/YearBadge';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import { formatNumber, formatPct, partyColor, allianceColor, marginClass, slugify } from '../utils/helpers';

export default function DistrictDetail() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const [selYear, setSelYear] = useState(Number(sp.get('year')) || 2021);
  const [search, setSearch] = useState('');
  const { data, loading } = useData();

  if (loading) return <LoadingSpinner />;

  const { districts, byDistrictYear, partyColors, allianceColors, YEARS, years } = data;

  const district = districts.find(d =>
    d.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug
  );

  if (!district) return <div className="text-red-400 p-8">District not found.</div>;

  const allRecs = byDistrictYear[`${district}||${selYear}`] || [];
  const recs = search
    ? allRecs.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : allRecs;
  const { sorted: sortedRecs, col: sortCol, dir: sortDir, toggle: sortToggle } = useSortable(recs, 'constituency_no');

  // Turnout trend across years
  const turnoutTrend = [2001,2006,2011,2016,2021,2026].map(y => {
    const r = byDistrictYear[`${district}||${y}`] || [];
    const avg = r.length ? (r.reduce((s, x) => s + (x.turnout_pct || 0), 0) / r.length) : null;
    return { year: y, turnout: avg ? +avg.toFixed(2) : null };
  });

  // Alliance distribution for selected year
  const allianceCounts = {};
  recs.forEach(r => {
    const a = r.winner_alliance || 'Others';
    allianceCounts[a] = (allianceCounts[a] || 0) + 1;
  });
  const allianceData = Object.entries(allianceCounts)
    .map(([name, seats]) => ({ name, seats }))
    .sort((a, b) => b.seats - a.seats);

  // Party distribution
  const partyCounts = {};
  recs.forEach(r => {
    if (r.winner_party) partyCounts[r.winner_party] = (partyCounts[r.winner_party] || 0) + 1;
  });
  const partyData = Object.entries(partyCounts)
    .map(([party, seats]) => ({ party, seats }))
    .sort((a, b) => b.seats - a.seats);

  const avgTurnout = allRecs.length ? (allRecs.reduce((s, r) => s + (r.turnout_pct || 0), 0) / allRecs.length).toFixed(1) : '—';
  const avgMargin = allRecs.filter(r => r.margin_pct).length
    ? (allRecs.filter(r => r.margin_pct).reduce((s, r) => s + r.margin_pct, 0) / allRecs.filter(r => r.margin_pct).length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/districts" className="hover:text-blue-400">Districts</Link>
        <span>/</span>
        <span className="text-white">{district}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{district}</h1>
          <p className="text-slate-400 text-sm">{recs.length} constituencies · {selYear} election</p>
        </div>
        <div className="sm:ml-auto flex flex-wrap gap-2">
          {[2001,2006,2011,2016,2021,2026].map(y => (
            <YearBadge key={y} year={y} active={selYear === y} onClick={() => setSelYear(y)} />
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Constituencies', value: recs.length },
          { label: 'Avg Turnout', value: avgTurnout + '%' },
          { label: 'Avg Margin', value: avgMargin + '%' },
          { label: 'Leading Party', value: partyData[0]?.party || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Alliance Seats — {selYear}</h3>
          {allianceData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={allianceData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={130} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Bar dataKey="seats" radius={[0, 4, 4, 0]}>
                  {allianceData.map((d, i) => (
                    <Cell key={i} fill={allianceColor(d.name, allianceColors)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-sm">No result data for {selYear}</p>}
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Average Turnout Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={turnoutTrend}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }}
                formatter={v => [v ? v.toFixed(1) + '%' : '—', 'Avg Turnout']} />
              <Line type="monotone" dataKey="turnout" stroke="#3b82f6" strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Constituency table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="font-semibold text-white">Constituency Results — {selYear}</h3>
          <div className="sm:ml-auto flex items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search constituency…"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44" />
            {search && <span className="text-slate-500 text-xs">{recs.length} of {allRecs.length}</span>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <SortTh label="#" col="constituency_no" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Constituency" col="name" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Winner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Party</th>
                <SortTh label="Votes" col="winner_votes" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Runner-Up</th>
                <SortTh label="Margin" col="margin" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Margin%" col="margin_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Turnout" col="turnout_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Category</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecs.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  {selYear === 2026 ? 'Results pending — turnout data available' : 'No data'}
                </td></tr>
              )}
              {sortedRecs.map((r, i) => {
                const mc = marginClass(r.margin_pct);
                return (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.constituency_no}</td>
                    <td className="px-4 py-3">
                      <Link to={`/constituency/${slugify(r.name)}`}
                        className="text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                      {r.winner_name || <span className="text-slate-600">Pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.winner_party ? <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /> : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatNumber(r.winner_votes)}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{r.runner_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{formatNumber(r.margin)}</td>
                    <td className="px-4 py-3">
                      {r.margin_pct != null
                        ? <span className={`font-medium ${mc.color}`}>{r.margin_pct.toFixed(1)}%</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatPct(r.turnout_pct)}</td>
                    <td className="px-4 py-3">
                      {r.margin_pct != null
                        ? <span className={`text-xs px-1.5 py-0.5 rounded ${mc.bg} ${mc.color}`}>{mc.label}</span>
                        : <span className="text-xs text-slate-600">{r.category_2026 || '—'}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
