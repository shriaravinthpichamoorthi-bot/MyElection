import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PartyBadge from '../components/PartyBadge';
import { formatNumber, formatPct, partyColor, slugify } from '../utils/helpers';

export default function CandidateProfile() {
  const { slug } = useParams();
  const { data, loading } = useData();

  if (loading) return <LoadingSpinner />;

  const { candidateMap, partyColors } = data;

  const candidate = Object.values(candidateMap).find(c => slugify(c.name) === slug);
  if (!candidate) return <div className="text-red-400 p-8">Candidate not found.</div>;

  const { name, sex, party, contests } = candidate;
  const sorted = [...contests].sort((a,b) => a.year - b.year);
  const wins = contests.filter(c => c.won);
  const losses = contests.filter(c => !c.won);
  const winRate = contests.length ? ((wins.length/contests.length)*100).toFixed(0) : 0;
  const avgVotePct = contests.length ? (contests.reduce((s,c) => s+(c.vote_pct||0),0)/contests.length).toFixed(1) : 0;
  const parties = [...new Set(contests.map(c => c.party))];
  const partyChanges = parties.length > 1;
  const constits = [...new Set(contests.map(c => c.constituency))];

  const voteChart = sorted.map(c => ({
    year: c.year, pct: c.vote_pct, won: c.won,
    label: c.constituency.length > 12 ? c.constituency.slice(0,12)+'…' : c.constituency,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/candidates" className="hover:text-blue-400">Candidates</Link>
        <span>/</span>
        <span className="text-white">{name}</span>
      </div>

      {/* Profile header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-2xl shrink-0">
            {sex === 'F' ? '👩' : '👨'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <PartyBadge party={party} partyColors={partyColors} />
              <span className="text-slate-400 text-sm">{sex === 'F' ? 'Female' : 'Male'}</span>
              {partyChanges && <span className="text-yellow-400 text-xs bg-yellow-900/30 px-2 py-0.5 rounded">Party changes: {parties.join(' → ')}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
              {[
                { label: 'Elections', value: contests.length, color: 'text-white' },
                { label: 'Wins', value: wins.length, color: 'text-green-400' },
                { label: 'Win Rate', value: winRate + '%', color: 'text-blue-400' },
                { label: 'Avg Vote%', value: avgVotePct + '%', color: 'text-purple-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800 rounded-lg p-3 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vote % chart */}
      {voteChart.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Vote Share per Election</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={voteChart}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
                formatter={(v, n, p) => [v.toFixed(1) + '%', p.payload.label]}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {voteChart.map((d, i) => (
                  <Cell key={i} fill={d.won ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span><span className="inline-block w-3 h-3 rounded-sm bg-green-500 mr-1" />Won</span>
            <span><span className="inline-block w-3 h-3 rounded-sm bg-red-500 mr-1" />Lost</span>
          </div>
        </div>
      )}

      {/* Contest history */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">Election History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Year','Constituency','District','Party','Alliance','Result','Vote%','Margin'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={i} className={`border-b border-slate-800/50 hover:bg-slate-800/30 ${c.won ? 'bg-green-900/5' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-slate-200">{c.year}</td>
                  <td className="px-4 py-3">
                    <Link to={`/constituency/${slugify(c.constituency)}`}
                      className="text-blue-400 hover:text-blue-300 whitespace-nowrap">
                      {c.constituency}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{c.district || '—'}</td>
                  <td className="px-4 py-3"><PartyBadge party={c.party} partyColors={partyColors} size="xs" /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.alliance}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      c.won ? 'bg-green-900/40 text-green-400' :
                      c.rank === 2 ? 'bg-yellow-900/40 text-yellow-400' :
                      'bg-slate-800 text-slate-500'
                    }`}>
                      {c.won ? '✓ WON' : c.rank === 2 ? '2nd' : `#${c.rank}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatPct(c.vote_pct)}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {c.won && c.margin ? formatNumber(c.margin) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Constituencies contested */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Constituencies Contested</h3>
        <div className="flex flex-wrap gap-2">
          {constits.map(c => (
            <Link key={c} to={`/constituency/${slugify(c)}`}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300">
              {c}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
