import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import { formatNumber, formatPct, partyColor, marginClass, slugify, YEAR_COLORS } from '../utils/helpers';

export default function ConstituencyDetail() {
  const { slug } = useParams();
  const { data, loading } = useData();
  const [candYear, setCandYear] = useState(null); // null = most recent with candidates

  if (loading) return <LoadingSpinner />;

  const { byConstituency, constituencies, partyColors, incumbencyData, swingData } = data;

  const name = constituencies.find(c => slugify(c) === slug);
  if (!name) return <div className="text-red-400 p-8">Constituency not found.</div>;

  const history = (byConstituency[name] || []).sort((a, b) => a.year - b.year);
  const latest = history[history.length - 1];

  const yearsWithCandidates = history.filter(r => r.candidates && r.candidates.length > 0);
  const selectedCandYear = candYear ?? (yearsWithCandidates[yearsWithCandidates.length - 1]?.year ?? null);
  const selectedRec = history.find(r => r.year === selectedCandYear);
  const candidates = selectedRec?.candidates || [];

  // Charts
  const turnoutTrend = history.map(r => ({ year: r.year, turnout: r.turnout_pct }));
  const marginTrend = history.filter(r => r.margin_pct != null).map(r => ({
    year: r.year, margin: r.margin_pct,
  }));

  const incRecs = incumbencyData[name] || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/constituencies" className="hover:text-blue-400">Constituencies</Link>
        <span>/</span>
        {latest?.district && (
          <>
            <Link to={`/district/${slugify(latest.district)}`} className="hover:text-blue-400">{latest.district}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-white">{name}</span>
      </div>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
              {latest?.district && <span>📍 {latest.district}</span>}
              <span>Category: {latest?.category}</span>
              <span>#{latest?.constituency_no}</span>
            </div>
          </div>
          {latest?.winner_name && (
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Latest Winner ({latest.year})</p>
              <p className="text-lg font-semibold text-white">{latest.winner_name}</p>
              <PartyBadge party={latest.winner_party} partyColors={partyColors} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Total Electors', value: formatNumber(latest?.total_electors) },
            { label: 'Votes Polled', value: formatNumber(latest?.votes_polled) },
            { label: 'Turnout', value: formatPct(latest?.turnout_pct) },
            { label: 'Winning Margin', value: latest?.margin_pct != null ? `${latest.margin_pct.toFixed(1)}%` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-lg font-bold text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Voter Turnout (2001–2026)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={turnoutTrend}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
                formatter={v => [formatPct(v), 'Turnout']} />
              <Line type="monotone" dataKey="turnout" stroke="#3b82f6" strokeWidth={2}
                dot={({ cx, cy, payload }) => (
                  <circle key={payload.year} cx={cx} cy={cy} r={4} fill={YEAR_COLORS[payload.year] || '#3b82f6'} />
                )} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Winning Margin % Trend</h3>
          {marginTrend.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={marginTrend}>
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
                  formatter={v => [v.toFixed(1) + '%', 'Margin']} />
                <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
                  {marginTrend.map((d, i) => (
                    <Cell key={i} fill={d.margin < 3 ? '#ef4444' : d.margin < 8 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-sm">No margin data available</p>}
        </div>
      </div>

      {/* Historical winners */}
      <HistoricalTable history={history} incRecs={incRecs} partyColors={partyColors} />

      {/* Unified candidate table with year switcher */}
      {yearsWithCandidates.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
            <h3 className="font-semibold text-white">All Candidates</h3>
            <div className="flex flex-wrap gap-1.5 sm:ml-auto">
              {yearsWithCandidates.map(r => (
                <button key={r.year} onClick={() => setCandYear(r.year)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    selectedCandYear === r.year
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}>
                  {r.year}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 sm:ml-0">{candidates.length} candidates</span>
          </div>
          <CandidateTable candidates={candidates} partyColors={partyColors} year={selectedCandYear} rec={selectedRec} />
        </div>
      )}
    </div>
  );
}

function HistoricalTable({ history, incRecs, partyColors }) {
  const [search, setSearch] = useState('');
  const { sorted, col, dir, toggle } = useSortable(history, 'year', 'desc');

  const filtered = search
    ? sorted.filter(r => r.winner_name?.toLowerCase().includes(search.toLowerCase()) || r.winner_party?.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
        <h3 className="font-semibold text-white">Historical Winners</h3>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter by winner or party…"
          className="sm:ml-auto px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <SortTh label="Year" col="year" activeCol={col} dir={dir} onSort={toggle} />
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Winner</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Party</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Alliance</th>
              <SortTh label="Votes" col="winner_votes" activeCol={col} dir={dir} onSort={toggle} />
              <SortTh label="Vote%" col="winner_vote_pct" activeCol={col} dir={dir} onSort={toggle} />
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Runner-Up</th>
              <SortTh label="Margin" col="margin" activeCol={col} dir={dir} onSort={toggle} />
              <SortTh label="Margin%" col="margin_pct" activeCol={col} dir={dir} onSort={toggle} />
              <SortTh label="Turnout%" col="turnout_pct" activeCol={col} dir={dir} onSort={toggle} />
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const mc = marginClass(r.margin_pct);
              const inc = incRecs.find(x => x.year === r.year);
              return (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-3 py-3 font-semibold text-slate-200">{r.year}</td>
                  <td className="px-3 py-3 text-slate-100 whitespace-nowrap">
                    {r.winner_name
                      ? <Link to={`/candidate/${slugify(r.winner_name)}`} className="hover:text-blue-400">{r.winner_name}</Link>
                      : <span className="text-slate-600 italic">Pending</span>}
                  </td>
                  <td className="px-3 py-3">
                    {r.winner_party ? <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /> : '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{r.winner_alliance || '—'}</td>
                  <td className="px-3 py-3 text-slate-300">{formatNumber(r.winner_votes)}</td>
                  <td className="px-3 py-3 text-slate-300">{formatPct(r.winner_vote_pct)}</td>
                  <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {r.runner_name
                      ? <><Link to={`/candidate/${slugify(r.runner_name)}`} className="hover:text-blue-400">{r.runner_name}</Link> <span className="text-slate-600">({r.runner_party})</span></>
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{formatNumber(r.margin)}</td>
                  <td className="px-3 py-3">
                    {r.margin_pct != null
                      ? <span className={`font-medium ${mc.color}`}>{r.margin_pct.toFixed(1)}%</span>
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{formatPct(r.turnout_pct)}</td>
                  <td className="px-3 py-3">
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
  );
}

function CandidateTable({ candidates, partyColors, year, rec }) {
  const [search, setSearch] = useState('');
  const { sorted, col, dir, toggle } = useSortable(candidates, 'rank', 'asc');

  const filtered = search
    ? sorted.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.party?.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  return (
    <>
      <div className="px-5 py-2 flex items-center gap-3 border-b border-slate-800/50">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter candidate or party…"
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48" />
        {rec && (
          <span className="text-xs text-slate-500 ml-auto">
            Total polled: {formatNumber(rec.votes_polled)} · Turnout: {formatPct(rec.turnout_pct)}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <SortTh label="Rank" col="rank" activeCol={col} dir={dir} onSort={toggle} />
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Candidate</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Gender</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Party</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase">Alliance</th>
              <SortTh label="Votes" col="votes" activeCol={col} dir={dir} onSort={toggle} />
              <SortTh label="Vote%" col="vote_pct" activeCol={col} dir={dir} onSort={toggle} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, ci) => (
              <tr key={ci} className={`border-b border-slate-800/40 hover:bg-slate-800/30 ${c.rank === 1 ? 'bg-green-900/10' : ''}`}>
                <td className="px-3 py-2.5 text-slate-400 font-semibold">{c.rank}</td>
                <td className="px-3 py-2.5">
                  <Link to={`/candidate/${slugify(c.name)}`}
                    className={`hover:text-blue-400 ${c.rank === 1 ? 'text-green-400 font-semibold' : 'text-slate-200'}`}>
                    {c.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-slate-400">{c.sex === 'F' ? '♀' : c.sex === 'M' ? '♂' : '—'}</td>
                <td className="px-3 py-2.5"><PartyBadge party={c.party} partyColors={partyColors} size="xs" /></td>
                <td className="px-3 py-2.5 text-slate-500 text-xs">{c.alliance}</td>
                <td className="px-3 py-2.5 text-slate-200">{formatNumber(c.votes)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{
                        width: `${Math.min(c.vote_pct || 0, 100)}%`,
                        background: partyColor(c.party, partyColors),
                      }} />
                    </div>
                    <span className="text-slate-300 text-xs">{formatPct(c.vote_pct)}</span>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">No candidates match filter</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
