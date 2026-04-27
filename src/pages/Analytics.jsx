import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ScatterChart, Scatter, ZAxis, PieChart, Pie, Legend,
} from 'recharts';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import { formatNumber, formatPct, partyColor, allianceColor, marginClass, slugify } from '../utils/helpers';

const TABS = ['Overview', 'Swing', 'Margins', 'Incumbency', 'Strongholds', 'Women', 'Turnout'];

export default function Analytics() {
  const { data, loading } = useData();
  const [tab, setTab] = useState('Overview');
  const [swingYear1, setSwingYear1] = useState(2016);
  const [swingYear2, setSwingYear2] = useState(2021);

  if (loading) return <LoadingSpinner />;

  const { byYear, partyColors, allianceColors, swingData, incumbencyData, strongholds,
    womenStats, stateSummary, constituencies, battlegrounds, partyPerf, alliancePerf } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics Hub</h1>
        <p className="text-slate-400 text-sm">Swing · Margins · Incumbency · Strongholds · Women Representation</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab data={data} />}
      {tab === 'Swing' && <SwingTab data={data} swingYear1={swingYear1} setSwingYear1={setSwingYear1} swingYear2={swingYear2} setSwingYear2={setSwingYear2} />}
      {tab === 'Margins' && <MarginsTab data={data} />}
      {tab === 'Incumbency' && <IncumbencyTab data={data} />}
      {tab === 'Strongholds' && <StrongholdsTab data={data} />}
      {tab === 'Women' && <WomenTab data={data} />}
      {tab === 'Turnout' && <TurnoutTab data={data} />}
    </div>
  );
}

function OverviewTab({ data }) {
  const { partyPerf, alliancePerf, stateSummary, partyColors, allianceColors } = data;
  const YEARS = [2001,2006,2011,2016,2021,2026];

  // Seats over time for top parties
  const TOP_PARTIES = ['DMK','AIADMK','INC','BJP','PMK','CPM','DMDK'];
  const partyTrend = YEARS.map(y => {
    const perf = partyPerf[y] || {};
    const obj = { year: y };
    TOP_PARTIES.forEach(p => { obj[p] = perf[p]?.seats || 0; });
    return obj;
  });

  // Alliance seats trend
  const ALLIANCES = ['DMK Alliance','AIADMK Alliance','ADMK Alliance'];
  const allianceTrend = YEARS.map(y => {
    const perf = alliancePerf[y] || {};
    return {
      year: y,
      'DMK Alliance': perf['DMK Alliance'] || 0,
      'AIADMK/ADMK Alliance': (perf['AIADMK Alliance'] || 0) + (perf['ADMK Alliance'] || 0),
      'Others': Object.entries(perf).filter(([k]) => !k.includes('DMK') && !k.includes('ADMK')).reduce((s,[,v]) => s+v, 0),
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Party Seats — All Elections</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={partyTrend}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {TOP_PARTIES.map(p => (
                <Line key={p} type="monotone" dataKey={p} stroke={partyColor(p, {})}
                  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Alliance Seats — All Elections</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={allianceTrend}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="DMK Alliance" fill="#e53935" stackId="a" />
              <Bar dataKey="AIADMK/ADMK Alliance" fill="#1b5e20" stackId="a" />
              <Bar dataKey="Others" fill="#607d8b" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">State Summary — All Elections</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Year','Total Electors','Total Votes','Turnout','Seats'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">{h}</th>
                ))}
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Alliance Results</th>
              </tr>
            </thead>
            <tbody>
              {stateSummary.map((s, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-semibold text-slate-200">{s.year}</td>
                  <td className="px-4 py-3 text-slate-300">{formatNumber(s.total_electors)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatNumber(s.total_votes)}</td>
                  <td className="px-4 py-3 font-semibold text-blue-400">{formatPct(s.turnout_pct)}</td>
                  <td className="px-4 py-3 text-slate-300">{s.constituencies}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(s.alliance_seats || {}).filter(([k,v]) => k !== 'null' && v > 0).map(([k,v]) => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{ background: allianceColor(k, {}) + '30', color: allianceColor(k, {}) }}>
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SwingTab({ data, swingYear1, setSwingYear1, swingYear2, setSwingYear2 }) {
  const { constituencies, byConstituency, partyColors } = data;
  const YEARS = [2001,2006,2011,2016,2021];
  const [swingSearch, setSwingSearch] = useState('');

  const swingRows = useMemo(() => {
    return constituencies.map(name => {
      const hist = byConstituency[name] || [];
      const r1 = hist.find(r => r.year === swingYear1);
      const r2 = hist.find(r => r.year === swingYear2);
      if (!r1 || !r2) return null;
      return {
        name,
        district: r2.district,
        party1: r1.winner_party, party2: r2.winner_party,
        flipped: r1.winner_party !== r2.winner_party,
        marginSwing: (r2.margin_pct || 0) - (r1.margin_pct || 0),
        turnoutSwing: (r2.turnout_pct || 0) - (r1.turnout_pct || 0),
        winner1: r1.winner_name, winner2: r2.winner_name,
        margin1: r1.margin_pct, margin2: r2.margin_pct,
      };
    }).filter(Boolean);
  }, [constituencies, byConstituency, swingYear1, swingYear2]);

  const flipped = swingRows.filter(r => r.flipped &&
    (!swingSearch || r.name.toLowerCase().includes(swingSearch.toLowerCase()) || (r.district || '').toLowerCase().includes(swingSearch.toLowerCase()))
  );
  const held = swingRows.filter(r => !r.flipped);
  const { sorted: sortedFlipped, col: flipCol, dir: flipDir, toggle: flipToggle } = useSortable(flipped, 'name');

  const flipsByParty = {};
  flipped.forEach(r => {
    flipsByParty[r.party2] = (flipsByParty[r.party2] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">From:</label>
          <select value={swingYear1} onChange={e => setSwingYear1(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 focus:outline-none">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">To:</label>
          <select value={swingYear2} onChange={e => setSwingYear2(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 focus:outline-none">
            {YEARS.filter(y => y > swingYear1).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-red-400 font-semibold">{flipped.length} seats flipped</span>
          <span className="text-green-400 font-semibold">{held.length} seats held</span>
        </div>
      </div>

      {/* Flips by party gaining */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Seats Gained ({swingYear1}→{swingYear2})</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(flipsByParty).sort((a,b) => b[1]-a[1]).map(([party, count]) => (
            <div key={party} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
              <PartyBadge party={party} partyColors={partyColors} size="xs" />
              <span className="text-white font-bold">+{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flipped seats table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="font-semibold text-white">Flipped Seats ({swingYear1} → {swingYear2})</h3>
          <div className="sm:ml-auto">
            <input value={swingSearch} onChange={e => setSwingSearch(e.target.value)}
              placeholder="Search constituency/district…"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <SortTh label="Constituency" col="name" activeCol={flipCol} dir={flipDir} onSort={flipToggle} />
                <SortTh label="District" col="district" activeCol={flipCol} dir={flipDir} onSort={flipToggle} />
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">{swingYear1} Winner</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">{swingYear1} Party</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">{swingYear2} Winner</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">{swingYear2} Party</th>
                <SortTh label="Margin Swing" col="marginSwing" activeCol={flipCol} dir={flipDir} onSort={flipToggle} />
                <SortTh label="Turnout Swing" col="turnoutSwing" activeCol={flipCol} dir={flipDir} onSort={flipToggle} />
              </tr>
            </thead>
            <tbody>
              {sortedFlipped.map((r, i) => (
                <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                  <td className="px-3 py-2.5">
                    <Link to={`/constituency/${slugify(r.name)}`} className="text-blue-400 hover:text-blue-300 text-xs">{r.name}</Link>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 text-xs">{r.district}</td>
                  <td className="px-3 py-2.5 text-slate-300 text-xs whitespace-nowrap">{r.winner1}</td>
                  <td className="px-3 py-2.5"><PartyBadge party={r.party1} partyColors={partyColors} size="xs" /></td>
                  <td className="px-3 py-2.5 text-slate-300 text-xs whitespace-nowrap">{r.winner2}</td>
                  <td className="px-3 py-2.5"><PartyBadge party={r.party2} partyColors={partyColors} size="xs" /></td>
                  <td className="px-3 py-2.5">
                    <span className={r.marginSwing > 0 ? 'text-green-400' : 'text-red-400'}>
                      {r.marginSwing > 0 ? '+' : ''}{r.marginSwing.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={r.turnoutSwing > 0 ? 'text-blue-400' : 'text-yellow-400'}>
                      {r.turnoutSwing > 0 ? '+' : ''}{r.turnoutSwing.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MarginsTab({ data }) {
  const { byYear, partyColors, classifyMargin, constituencies, byConstituency } = data;
  const [selYear, setSelYear] = useState(2021);
  const recs = (byYear[selYear] || []).filter(r => r.margin_pct != null);
  const tossups = recs.filter(r => classifyMargin(r.margin_pct) === 'toss-up');
  const battlegrounds = recs.filter(r => classifyMargin(r.margin_pct) === 'battleground');
  const safe = recs.filter(r => classifyMargin(r.margin_pct) === 'safe');

  const dist = [
    { name: 'Toss-Up (<3%)', value: tossups.length, fill: '#ef4444' },
    { name: 'Battleground (3-8%)', value: battlegrounds.length, fill: '#f59e0b' },
    { name: 'Safe (>8%)', value: safe.length, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-400">Year:</label>
        <div className="flex flex-wrap gap-2">
          {[2001,2006,2011,2016,2021].map(y => (
            <button key={y} onClick={() => setSelYear(y)}
              className={`px-3 py-1.5 rounded text-sm ${selYear===y?'bg-blue-600 text-white':'bg-slate-800 text-slate-400'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {dist.map(d => (
          <div key={d.name} className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-center">
            <div className="text-3xl font-bold" style={{color: d.fill}}>{d.value}</div>
            <div className="text-sm text-slate-400 mt-1">{d.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {recs.length ? ((d.value/recs.length)*100).toFixed(1) + '% of seats' : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Margin Distribution — {selYear}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={dist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value}) => `${value}`}>
                {dist.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 text-red-400">Top 10 Tightest — {selYear}</h3>
          <div className="space-y-2">
            {recs.sort((a,b)=>a.margin_pct-b.margin_pct).slice(0,10).map((r,i) => (
              <Link key={i} to={`/constituency/${slugify(r.name)}`}
                className="flex items-center justify-between p-2 rounded bg-slate-800 hover:bg-slate-700 text-xs">
                <span className="text-slate-300">{r.name}</span>
                <div className="flex items-center gap-2">
                  <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" />
                  <span className="text-red-400 font-bold">{r.margin_pct.toFixed(2)}%</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IncumbencyTab({ data }) {
  const { incumbencyData, byConstituency, partyColors, constituencies } = data;
  const YEARS = [2001,2006,2011,2016,2021];

  // For each election, how many incumbents won vs lost?
  const incStats = YEARS.slice(1).map(y => {
    let incumbentWon = 0, incumbentLost = 0;
    constituencies.forEach(name => {
      const hist = byConstituency[name] || [];
      const prev = hist.find(r => r.year === YEARS[YEARS.indexOf(y)-1]);
      const curr = hist.find(r => r.year === y);
      if (!prev || !curr) return;
      if (prev.winner_party === curr.winner_party) incumbentWon++;
      else incumbentLost++;
    });
    return { year: y, won: incumbentWon, lost: incumbentLost,
      rate: incumbentWon + incumbentLost ? ((incumbentWon/(incumbentWon+incumbentLost))*100).toFixed(1) : 0 };
  });

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Incumbency Retention Rate</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incStats}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="won" name="Retained" fill="#10b981" stackId="a" />
              <Bar dataKey="lost" name="Flipped" fill="#ef4444" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Retention Rate by Election</h3>
          <div className="space-y-3">
            {incStats.map(s => (
              <div key={s.year} className="flex items-center gap-3">
                <span className="text-slate-400 text-sm w-12">{s.year}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-3">
                  <div className="h-3 rounded-full bg-green-500"
                    style={{ width: `${s.rate}%` }} />
                </div>
                <span className="text-green-400 font-semibold text-sm w-16">{s.rate}%</span>
                <span className="text-slate-500 text-xs">{s.won}W/{s.lost}L</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StrongholdsTab({ data }) {
  const { strongholds, partyColors } = data;
  const byParty = {};
  Object.entries(strongholds).forEach(([name, info]) => {
    if (!byParty[info.party]) byParty[info.party] = [];
    byParty[info.party].push({ name, streak: info.streak });
  });

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(byParty).sort((a,b) => b[1].length - a[1].length).map(([party, seats]) => (
          <div key={party} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <PartyBadge party={party} partyColors={partyColors} />
              <span className="text-white font-bold text-lg">{seats.length} seats</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {seats.sort((a,b) => b.streak - a.streak).map((s, i) => (
                <Link key={i} to={`/constituency/${slugify(s.name)}`}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800 text-xs">
                  <span className="text-slate-300">{s.name}</span>
                  <span className="text-slate-500">{s.streak}× wins</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WomenTab({ data }) {
  const { womenStats, byYear } = data;
  const YEARS = [2001,2006,2011,2016,2021];
  const chartData = YEARS.map(y => {
    const s = womenStats[y] || {};
    return {
      year: y,
      candidates: s.femaleCandidates || 0,
      winners: s.femaleWinners || 0,
      candPct: s.totalCandidates ? +((s.femaleCandidates/s.totalCandidates)*100).toFixed(1) : 0,
      winPct: s.seats ? +((s.femaleWinners/s.seats)*100).toFixed(1) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        {chartData.map(d => (
          <div key={d.year} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <p className="text-slate-400 text-xs font-medium">{d.year}</p>
            <p className="text-pink-400 text-xl font-bold mt-1">{d.winners} winners</p>
            <p className="text-slate-500 text-xs">{d.candidates} candidates ({d.candPct}%)</p>
            <p className="text-slate-500 text-xs">{d.winPct}% of seats</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Women Winners Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Line type="monotone" dataKey="candidates" stroke="#a855f7" strokeWidth={2} name="Female Candidates" />
              <Line type="monotone" dataKey="winners" stroke="#ec4899" strokeWidth={2} name="Female Winners" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Female % of Candidates vs Winners</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
                formatter={v => [v + '%']} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="candPct" name="Candidates %" fill="#a855f7" />
              <Bar dataKey="winPct" name="Winners %" fill="#ec4899" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TurnoutTab({ data }) {
  const { byYear, districts, byDistrictYear } = data;
  const YEARS = [2001,2006,2011,2016,2021,2026];

  // High-turnout anomalies (top 20 constituencies by turnout in each year)
  const [selYear, setSelYear] = useState(2026);
  const recs = (byYear[selYear] || []).filter(r => r.turnout_pct != null).sort((a,b) => b.turnout_pct - a.turnout_pct);

  // District turnout heatmap data
  const districtTurnout = districts.map(d => {
    const obj = { district: d };
    YEARS.forEach(y => {
      const r = byDistrictYear[`${d}||${y}`] || [];
      obj[y] = r.length ? +(r.reduce((s,x) => s+(x.turnout_pct||0), 0)/r.length).toFixed(1) : null;
    });
    return obj;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-400">Year:</label>
        <div className="flex flex-wrap gap-2">
          {YEARS.map(y => (
            <button key={y} onClick={() => setSelYear(y)}
              className={`px-3 py-1.5 rounded text-sm ${selYear===y?'bg-blue-600 text-white':'bg-slate-800 text-slate-400'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Highest Turnout Constituencies — {selYear}</h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {recs.slice(0, 20).map((r, i) => (
              <Link key={i} to={`/constituency/${slugify(r.name)}`}
                className="flex items-center gap-3 p-2 rounded bg-slate-800 hover:bg-slate-700 text-xs">
                <span className="text-slate-500 w-5">{i+1}</span>
                <span className="text-slate-200 flex-1">{r.name}</span>
                <span className="text-slate-400">{r.district}</span>
                <span className={`font-bold ${r.turnout_pct >= 80 ? 'text-green-400' : r.turnout_pct >= 65 ? 'text-yellow-400' : 'text-slate-300'}`}>
                  {r.turnout_pct?.toFixed(1)}%
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Lowest Turnout — {selYear}</h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {recs.slice(-20).reverse().map((r, i) => (
              <Link key={i} to={`/constituency/${slugify(r.name)}`}
                className="flex items-center gap-3 p-2 rounded bg-slate-800 hover:bg-slate-700 text-xs">
                <span className="text-slate-500 w-5">{i+1}</span>
                <span className="text-slate-200 flex-1">{r.name}</span>
                <span className="text-slate-400">{r.district}</span>
                <span className="text-red-400 font-bold">{r.turnout_pct?.toFixed(1)}%</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* District turnout table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h3 className="font-semibold text-white text-sm">District Average Turnout — All Years</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-4 py-2 text-left text-slate-400 font-medium">District</th>
                {YEARS.map(y => <th key={y} className="px-3 py-2 text-center text-slate-400 font-medium">{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {districtTurnout.map((row, i) => (
                <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                  <td className="px-4 py-2">
                    <Link to={`/district/${slugify(row.district)}`} className="text-blue-400 hover:text-blue-300">
                      {row.district}
                    </Link>
                  </td>
                  {YEARS.map(y => {
                    const v = row[y];
                    const color = v == null ? 'text-slate-600' : v >= 80 ? 'text-green-400' : v >= 65 ? 'text-yellow-400' : 'text-red-400';
                    return <td key={y} className={`px-3 py-2 text-center font-medium ${color}`}>{v != null ? v + '%' : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
