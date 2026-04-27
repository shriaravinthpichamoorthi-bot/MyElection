import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import PartyBadge from '../components/PartyBadge';
import { formatNumber, formatPct, partyColor, allianceColor, slugify, YEARS } from '../utils/helpers';

export default function Home() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);

  if (loading) return <LoadingSpinner />;

  const { stateSummary, byYear, alliancePerf, womenStats, partyPerf, partyColors, allianceColors, battlegrounds, strongholds, districts } = data;

  const summary = stateSummary.find(s => s.year === selYear) || stateSummary[0];
  const yearRecs = byYear[selYear] || [];

  // Alliance seats chart data for selected year
  const allianceData = Object.entries(alliancePerf[selYear] || {})
    .map(([name, seats]) => ({ name, seats }))
    .sort((a, b) => b.seats - a.seats)
    .slice(0, 6);

  // Turnout trend
  const turnoutTrend = stateSummary.map(s => ({
    year: s.year, turnout: s.turnout_pct,
  }));

  // Top party performers in selected year
  const topParties = Object.entries(partyPerf[selYear] || {})
    .map(([party, d]) => ({ party, seats: d.seats }))
    .filter(p => p.seats > 0)
    .sort((a, b) => b.seats - a.seats)
    .slice(0, 8);

  // Women stats chart
  const womenChart = YEARS.filter(y => y !== 2026).map(y => ({
    year: y,
    winners: womenStats[y]?.femaleWinners || 0,
    pct: womenStats[y] ? ((womenStats[y].femaleCandidates / womenStats[y].totalCandidates) * 100).toFixed(1) : 0,
  }));

  // Top battlegrounds — dynamic per selected year (exclude 2026, no results yet)
  const tgSeats = selYear === 2026
    ? []
    : (byYear[selYear] || [])
        .filter(r => r.margin_pct != null)
        .sort((a, b) => a.margin_pct - b.margin_pct)
        .slice(0, 8);

  // Stronghold count by party
  const strongholdByParty = {};
  Object.values(strongholds).forEach(s => {
    strongholdByParty[s.party] = (strongholdByParty[s.party] || 0) + 1;
  });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8 border-b border-slate-800">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Tamil Nadu Election Intelligence Portal
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Comprehensive analytics for all Tamil Nadu Assembly Elections 2001–2026.
          234 constituencies · 38 districts · 1,402 election records.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {YEARS.map(y => (
            <button key={y} onClick={() => setSelYear(y)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selYear === y ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}>
              {y}{y === 2026 ? ' ★' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Key stats for selected year */}
      <div>
        <h2 className="text-lg font-semibold text-slate-300 mb-4">{selYear} Election — State Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Electors" value={formatNumber(summary?.total_electors)} icon="👥" color="blue" />
          <StatCard label="Votes Cast" value={formatNumber(summary?.total_votes)} icon="🗳️" color="green" />
          <StatCard label="Turnout" value={formatPct(summary?.turnout_pct)} icon="📊" color="yellow" />
          <StatCard label="Constituencies" value={summary?.constituencies} icon="📍" color="purple" />
          <StatCard label="Women Winners" value={womenStats[selYear]?.femaleWinners || '—'} icon="♀️" color="pink" />
          <StatCard label="Districts" value={districts.length} icon="🗺️" color="red" />
        </div>
      </div>

      {/* Alliance Seats + Turnout Trend */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Alliance Seats — {selYear}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={allianceData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={120} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Bar dataKey="seats" radius={[0, 4, 4, 0]}>
                {allianceData.map((d, i) => (
                  <Cell key={i} fill={allianceColor(d.name, allianceColors)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Voter Turnout Trend (2001–2026)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={turnoutTrend}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={[50, 95]} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
                formatter={v => [v.toFixed(1) + '%', 'Turnout']} />
              <Line type="monotone" dataKey="turnout" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Party Performance + Women */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Party Seats — {selYear}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topParties}>
              <XAxis dataKey="party" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Bar dataKey="seats" radius={[4, 4, 0, 0]}>
                {topParties.map((d, i) => (
                  <Cell key={i} fill={partyColor(d.party, partyColors)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Women Winners per Election</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={womenChart}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Bar dataKey="winners" fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Battlegrounds + Strongholds */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Top Battleground Seats — {selYear} <span className="text-slate-500 font-normal text-xs">(tightest margins)</span>
          </h3>
          <div className="space-y-2">
            {tgSeats.length === 0
              ? <p className="text-slate-500 text-sm italic py-4 text-center">Results pending for {selYear}</p>
              : tgSeats.map((r, i) => (
                <Link key={i} to={`/constituency/${slugify(r.name)}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-500 text-xs w-4">{i + 1}</span>
                    <span className="text-sm text-slate-200 truncate">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" />
                    <span className={`text-xs font-semibold ${r.margin_pct < 3 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {formatPct(r.margin_pct)}
                    </span>
                  </div>
                </Link>
              ))
            }
          </div>
          <Link to="/analytics#battlegrounds" className="block mt-3 text-center text-blue-400 text-xs hover:text-blue-300">
            View all battlegrounds →
          </Link>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Party Strongholds (3+ consecutive wins)</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {Object.entries(strongholdByParty)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([party, count]) => (
                <div key={party} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800">
                  <PartyBadge party={party} partyColors={partyColors} size="xs" />
                  <span className="text-white font-semibold text-sm">{count}</span>
                </div>
              ))}
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {Object.entries(strongholds).slice(0, 10).map(([name, info]) => (
              <Link key={name} to={`/constituency/${slugify(name)}`}
                className="flex items-center justify-between p-2 rounded bg-slate-800/50 hover:bg-slate-800 text-xs">
                <span className="text-slate-300 truncate">{name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <PartyBadge party={info.party} partyColors={partyColors} size="xs" />
                  <span className="text-slate-500">{info.streak}×</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { to: '/districts', label: 'Browse Districts', sub: '38 districts', icon: '🗺️', color: 'bg-blue-900/30 border-blue-800' },
          { to: '/constituencies', label: 'All Constituencies', sub: '234 seats', icon: '📍', color: 'bg-green-900/30 border-green-800' },
          { to: '/analytics', label: 'Analytics Hub', sub: 'Swing · Margins · Trends', icon: '📊', color: 'bg-purple-900/30 border-purple-800' },
          { to: '/compare', label: 'Compare Tool', sub: 'Constituency · Party · Candidate', icon: '⚖️', color: 'bg-yellow-900/30 border-yellow-800' },
        ].map(({ to, label, sub, icon, color }) => (
          <Link key={to} to={to}
            className={`${color} border rounded-xl p-4 hover:opacity-80 transition-opacity text-center`}>
            <div className="text-3xl mb-2">{icon}</div>
            <div className="font-semibold text-white text-sm">{label}</div>
            <div className="text-xs text-slate-400 mt-1">{sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
