import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PartyBadge from '../components/PartyBadge';
import { formatNumber, formatPct, partyColor, marginClass, slugify } from '../utils/helpers';

const MODES = ['Constituency', 'District', 'Party', 'Candidate'];

export default function Compare() {
  const { data, loading } = useData();
  const [mode, setMode] = useState('Constituency');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Compare Tool</h1>
        <p className="text-slate-400 text-sm">Side-by-side analytics across constituencies, districts, parties, or candidates</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {MODES.map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${mode===m?'bg-blue-600 text-white':'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {m}
          </button>
        ))}
      </div>
      {mode === 'Constituency' && <ConstituencyCompare data={data} />}
      {mode === 'District' && <DistrictCompare data={data} />}
      {mode === 'Party' && <PartyCompare data={data} />}
      {mode === 'Candidate' && <CandidateCompare data={data} />}
    </div>
  );
}

function ConstituencyCompare({ data }) {
  const { constituencies, byConstituency, partyColors } = data;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const YEARS = [2001,2006,2011,2016,2021,2026];

  const histA = a ? (byConstituency[a] || []).sort((x,y) => x.year-y.year) : [];
  const histB = b ? (byConstituency[b] || []).sort((x,y) => x.year-y.year) : [];

  const turnoutChart = YEARS.map(y => ({
    year: y,
    [a || 'A']: histA.find(r=>r.year===y)?.turnout_pct || null,
    [b || 'B']: histB.find(r=>r.year===y)?.turnout_pct || null,
  }));

  const marginChart = YEARS.filter(y=>y!==2026).map(y => ({
    year: y,
    [a || 'A']: histA.find(r=>r.year===y)?.margin_pct || null,
    [b || 'B']: histB.find(r=>r.year===y)?.margin_pct || null,
  }));

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {[['A', a, setA], ['B', b, setB]].map(([label, val, set]) => (
          <div key={label}>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Constituency {label}</label>
            <select value={val} onChange={e => set(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500">
              <option value="">Select constituency…</option>
              {constituencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      {a && b && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Turnout Comparison</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={turnoutChart}>
                  <XAxis dataKey="year" tick={{fill:'#94a3b8',fontSize:11}} />
                  <YAxis tick={{fill:'#94a3b8',fontSize:11}} unit="%" />
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',color:'#e2e8f0'}} />
                  <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}} />
                  <Bar dataKey={a} fill="#3b82f6" />
                  <Bar dataKey={b} fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Winning Margin Comparison</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={marginChart}>
                  <XAxis dataKey="year" tick={{fill:'#94a3b8',fontSize:11}} />
                  <YAxis tick={{fill:'#94a3b8',fontSize:11}} unit="%" />
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',color:'#e2e8f0'}} />
                  <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}} />
                  <Bar dataKey={a} fill="#10b981" />
                  <Bar dataKey={b} fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[[a, histA], [b, histB]].map(([name, hist]) => (
              <div key={name} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 font-semibold text-white">{name}</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Year','Winner','Party','Margin%','Turnout'].map(h=>(
                        <th key={h} className="px-3 py-2 text-left text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hist.map((r,i) => (
                      <tr key={i} className="border-b border-slate-800/40">
                        <td className="px-3 py-2 font-semibold text-slate-200">{r.year}</td>
                        <td className="px-3 py-2 text-slate-300">{r.winner_name || '—'}</td>
                        <td className="px-3 py-2"><PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /></td>
                        <td className="px-3 py-2">{r.margin_pct!=null ? r.margin_pct.toFixed(1)+'%' : '—'}</td>
                        <td className="px-3 py-2">{formatPct(r.turnout_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DistrictCompare({ data }) {
  const { districts, byDistrictYear, partyColors } = data;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const YEARS = [2001,2006,2011,2016,2021,2026];

  function districtStats(district, year) {
    const recs = byDistrictYear[`${district}||${year}`] || [];
    if (!recs.length) return null;
    return {
      turnout: +(recs.reduce((s,r) => s+(r.turnout_pct||0),0)/recs.length).toFixed(1),
      seats: recs.length,
      topParty: Object.entries(recs.reduce((acc,r) => {
        if(r.winner_party) acc[r.winner_party]=(acc[r.winner_party]||0)+1; return acc;
      },{})).sort((x,y)=>y[1]-x[1])[0],
    };
  }

  const turnoutChart = YEARS.map(y => ({
    year: y,
    [a || 'A']: districtStats(a, y)?.turnout || null,
    [b || 'B']: districtStats(b, y)?.turnout || null,
  }));

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {[['A', a, setA], ['B', b, setB]].map(([label, val, set]) => (
          <div key={label}>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">District {label}</label>
            <select value={val} onChange={e => set(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500">
              <option value="">Select district…</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        ))}
      </div>

      {a && b && (
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Average Turnout — {a} vs {b}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={turnoutChart}>
              <XAxis dataKey="year" tick={{fill:'#94a3b8',fontSize:11}} />
              <YAxis tick={{fill:'#94a3b8',fontSize:11}} unit="%" />
              <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',color:'#e2e8f0'}} />
              <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}} />
              <Bar dataKey={a} fill="#3b82f6" />
              <Bar dataKey={b} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function PartyCompare({ data }) {
  const { partyPerf, partyColors, stateSummary } = data;
  const YEARS = [2001,2006,2011,2016,2021];
  const allParties = [...new Set(YEARS.flatMap(y => Object.keys(partyPerf[y]||{})))].sort();
  const [parties, setParties] = useState(['DMK','AIADMK']);

  const toggle = p => setParties(prev =>
    prev.includes(p) ? prev.filter(x=>x!==p) : prev.length < 4 ? [...prev,p] : prev
  );

  const trendData = YEARS.map(y => {
    const obj = { year: y };
    parties.forEach(p => { obj[p] = partyPerf[y]?.[p]?.seats || 0; });
    return obj;
  });

  const totalSeats = YEARS.reduce((s,y) => s + (stateSummary.find(x=>x.year===y)?.constituencies||234), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400 mb-2">Select up to 4 parties to compare:</p>
        <div className="flex flex-wrap gap-2">
          {allParties.filter(p => YEARS.some(y => (partyPerf[y]?.[p]?.seats||0) > 0)).slice(0,20).map(p => (
            <button key={p} onClick={() => toggle(p)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                parties.includes(p)
                  ? 'border-transparent text-white'
                  : 'border-slate-700 text-slate-400 hover:text-white'
              }`}
              style={parties.includes(p) ? { background: partyColor(p, partyColors), borderColor: partyColor(p, partyColors) } : {}}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Seats Won — All Elections</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trendData}>
            <XAxis dataKey="year" tick={{fill:'#94a3b8',fontSize:11}} />
            <YAxis tick={{fill:'#94a3b8',fontSize:11}} />
            <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',color:'#e2e8f0'}} />
            <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}} />
            {parties.map(p => (
              <Bar key={p} dataKey={p} fill={partyColor(p, partyColors)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h3 className="font-semibold text-white text-sm">Party Performance Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-4 py-2 text-left text-slate-400 text-xs">Party</th>
                {YEARS.map(y => <th key={y} className="px-3 py-2 text-center text-slate-400 text-xs">{y}</th>)}
                <th className="px-3 py-2 text-center text-slate-400 text-xs">Total</th>
              </tr>
            </thead>
            <tbody>
              {parties.map(p => {
                const total = YEARS.reduce((s,y) => s+(partyPerf[y]?.[p]?.seats||0),0);
                return (
                  <tr key={p} className="border-b border-slate-800/40">
                    <td className="px-4 py-2"><PartyBadge party={p} partyColors={partyColors} size="xs" /></td>
                    {YEARS.map(y => (
                      <td key={y} className="px-3 py-2 text-center font-semibold text-slate-200">
                        {partyPerf[y]?.[p]?.seats || 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold text-white">{total}</td>
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

function CandidateCompare({ data }) {
  const { candidateMap, partyColors } = data;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');

  const matchA = searchA.length > 2 ? Object.values(candidateMap).filter(c => c.name.toLowerCase().includes(searchA.toLowerCase())).slice(0,8) : [];
  const matchB = searchB.length > 2 ? Object.values(candidateMap).filter(c => c.name.toLowerCase().includes(searchB.toLowerCase())).slice(0,8) : [];

  const candA = a ? candidateMap[a.toLowerCase()] : null;
  const candB = b ? candidateMap[b.toLowerCase()] : null;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {[['A', searchA, setSearchA, matchA, a, setA, candA], ['B', searchB, setSearchB, matchB, b, setB, candB]].map(([label, search, setSearch, match, val, setVal, cand]) => (
          <div key={label} className="space-y-2">
            <label className="text-xs text-slate-400 uppercase tracking-wide block">Candidate {label}</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type to search candidate…"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500" />
            {match.length > 0 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                {match.map((c, i) => (
                  <button key={i} onClick={() => { setVal(c.name); setSearch(''); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center gap-2 border-b border-slate-700/50 last:border-0">
                    <span className="text-slate-200">{c.name}</span>
                    <PartyBadge party={c.party} partyColors={partyColors} size="xs" />
                    <span className="text-slate-500 text-xs ml-auto">{c.contests.length} elections</span>
                  </button>
                ))}
              </div>
            )}
            {cand && (
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <p className="font-semibold text-white">{cand.name}</p>
                <div className="flex gap-2 mt-1">
                  <PartyBadge party={cand.party} partyColors={partyColors} size="xs" />
                  <span className="text-slate-500 text-xs">{cand.sex === 'F' ? '♀' : '♂'}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {cand.contests.map((c,i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{c.year} · {c.constituency}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">#{c.rank}</span>
                        {c.won && <span className="text-green-400 font-bold">Won</span>}
                        <span className="text-slate-400">{c.vote_pct?.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {candA && candB && (
        <div className="grid md:grid-cols-2 gap-6">
          {[candA, candB].map(cand => {
            const wins = cand.contests.filter(c=>c.won).length;
            const total = cand.contests.length;
            const avgVotePct = cand.contests.reduce((s,c)=>s+(c.vote_pct||0),0)/total;
            return (
              <div key={cand.name} className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h3 className="font-semibold text-white mb-4">{cand.name}</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-400">{wins}</p>
                    <p className="text-xs text-slate-400">Wins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">{total}</p>
                    <p className="text-xs text-slate-400">Elections</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-400">{avgVotePct.toFixed(1)}%</p>
                    <p className="text-xs text-slate-400">Avg Vote%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {cand.contests.map((c,i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-slate-800">
                      <span className="text-slate-400">{c.year}</span>
                      <span className="text-slate-300 truncate mx-2">{c.constituency}</span>
                      <span className={c.won ? 'text-green-400 font-bold' : 'text-slate-500'}>
                        {c.won ? 'WON' : `#${c.rank}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
