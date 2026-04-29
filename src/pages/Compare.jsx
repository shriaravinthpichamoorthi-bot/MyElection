import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { GitCompare } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PartyBadge from '../components/PartyBadge';
import { formatNumber, formatPct, partyColor, slugify } from '../utils/helpers';

const MODES = ['Constituency', 'District', 'Party', 'Candidate'];
const TT = { contentStyle: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, color: '#e2e8f0', fontSize: 12 } };
const selectStyle = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, color: '#e2e8f0', fontSize: 13, padding: '10px 14px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%' };

export default function Compare() {
  const { data, loading } = useData();
  const [mode, setMode] = useState('Constituency');

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitCompare size={18} color="#818cf8" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc' }}>Compare</h1>
        </div>
        <p style={{ fontSize: 13, color: '#475569', paddingLeft: 48 }}>Side-by-side analytics across constituencies, districts, parties, or candidates</p>
      </div>

      {/* Mode tabs */}
      <div className="card" style={{ padding: '6px 8px', display: 'flex', gap: 4 }}>
        {MODES.map(m => (
          <motion.button key={m} whileTap={{ scale: 0.94 }} onClick={() => setMode(m)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              background: mode === m ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: mode === m ? '#818cf8' : '#475569',
              transition: 'all 0.15s',
            }}>
            {m}
          </motion.button>
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
  const YEARS = [2001, 2006, 2011, 2016, 2021, 2026];

  const histA = a ? (byConstituency[a] || []).sort((x, y) => x.year - y.year) : [];
  const histB = b ? (byConstituency[b] || []).sort((x, y) => x.year - y.year) : [];

  const turnoutChart = YEARS.map(y => ({
    year: y,
    [a || 'A']: histA.find(r => r.year === y)?.turnout_pct || null,
    [b || 'B']: histB.find(r => r.year === y)?.turnout_pct || null,
  }));

  const marginChart = YEARS.filter(y => y !== 2026).map(y => ({
    year: y,
    [a || 'A']: histA.find(r => r.year === y)?.margin_pct || null,
    [b || 'B']: histB.find(r => r.year === y)?.margin_pct || null,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gap: 14 }} id="cc-selects">
        <style>{`#cc-selects{grid-template-columns:1fr}@media(min-width:640px){#cc-selects{grid-template-columns:1fr 1fr}}`}</style>
        {[['A', a, setA, '#6366f1'], ['B', b, setB, '#f59e0b']].map(([label, val, set, color]) => (
          <div key={label}>
            <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 6, verticalAlign: 'middle' }} />
              Constituency {label}
            </p>
            <select value={val} onChange={e => set(e.target.value)} style={selectStyle}>
              <option value="">Select constituency…</option>
              {constituencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      {a && b && (
        <>
          <div style={{ display: 'grid', gap: 16 }} id="cc-charts">
            <style>{`#cc-charts{grid-template-columns:1fr}@media(min-width:900px){#cc-charts{grid-template-columns:1fr 1fr}}`}</style>
            <div className="card" style={{ padding: 22 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Turnout Comparison</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={turnoutChart}>
                  <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                  <Bar dataKey={a} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={b} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Winning Margin Comparison</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={marginChart}>
                  <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                  <Bar dataKey={a} fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={b} fill="#f472b6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }} id="cc-tables">
            <style>{`#cc-tables{grid-template-columns:1fr}@media(min-width:768px){#cc-tables{grid-template-columns:1fr 1fr}}`}</style>
            {[[a, histA], [b, histB]].map(([cname, hist]) => (
              <div key={cname} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e293b' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{cname}</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="tbl-head">
                        {['Year', 'Winner', 'Party', 'Margin%', 'Turnout'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hist.map((r, i) => (
                        <tr key={i} className="tbl-row">
                          <td style={{ fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{r.year}</td>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{r.winner_name || '—'}</td>
                          <td><PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /></td>
                          <td style={{ fontSize: 12, fontWeight: 600, color: r.margin_pct < 3 ? '#f87171' : r.margin_pct < 8 ? '#fbbf24' : '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                            {r.margin_pct != null ? r.margin_pct.toFixed(1) + '%' : '—'}
                          </td>
                          <td style={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatPct(r.turnout_pct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DistrictCompare({ data }) {
  const { districts, byDistrictYear } = data;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const YEARS = [2001, 2006, 2011, 2016, 2021, 2026];

  function districtStats(district, year) {
    const recs = byDistrictYear[`${district}||${year}`] || [];
    if (!recs.length) return null;
    return { turnout: +(recs.reduce((s, r) => s + (r.turnout_pct || 0), 0) / recs.length).toFixed(1) };
  }

  const turnoutChart = YEARS.map(y => ({
    year: y,
    [a || 'A']: districtStats(a, y)?.turnout || null,
    [b || 'B']: districtStats(b, y)?.turnout || null,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gap: 14 }} id="dc-selects">
        <style>{`#dc-selects{grid-template-columns:1fr}@media(min-width:640px){#dc-selects{grid-template-columns:1fr 1fr}}`}</style>
        {[['A', a, setA, '#6366f1'], ['B', b, setB, '#f59e0b']].map(([label, val, set, color]) => (
          <div key={label}>
            <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 6, verticalAlign: 'middle' }} />
              District {label}
            </p>
            <select value={val} onChange={e => set(e.target.value)} style={selectStyle}>
              <option value="">Select district…</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        ))}
      </div>

      {a && b && (
        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Average Turnout — {a} vs {b}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={turnoutChart}>
              <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <Bar dataKey={a} fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey={b} fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function PartyCompare({ data }) {
  const { partyPerf, partyColors, stateSummary } = data;
  const YEARS = [2001, 2006, 2011, 2016, 2021];
  const allParties = [...new Set(YEARS.flatMap(y => Object.keys(partyPerf[y] || {})))].sort();
  const [parties, setParties] = useState(['DMK', 'AIADMK']);

  const toggle = p => setParties(prev =>
    prev.includes(p) ? prev.filter(x => x !== p) : prev.length < 4 ? [...prev, p] : prev
  );

  const trendData = YEARS.map(y => {
    const obj = { year: y };
    parties.forEach(p => { obj[p] = partyPerf[y]?.[p]?.seats || 0; });
    return obj;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card" style={{ padding: 18 }}>
        <p style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>Select up to 4 parties to compare:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allParties.filter(p => YEARS.some(y => (partyPerf[y]?.[p]?.seats || 0) > 0)).slice(0, 20).map(p => {
            const color = partyColor(p, partyColors);
            const active = parties.includes(p);
            return (
              <motion.button key={p} whileTap={{ scale: 0.94 }} onClick={() => toggle(p)}
                style={{
                  padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? color : '#1e293b'}`,
                  background: active ? `${color}20` : 'transparent', color: active ? color : '#475569', fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                {p}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Seats Won — All Elections</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trendData}>
            <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...TT} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            {parties.map(p => <Bar key={p} dataKey={p} fill={partyColor(p, partyColors)} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Party Performance Summary</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="tbl-head">
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Party</th>
                {YEARS.map(y => <th key={y} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>{y}</th>)}
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {parties.map(p => {
                const total = YEARS.reduce((s, y) => s + (partyPerf[y]?.[p]?.seats || 0), 0);
                return (
                  <tr key={p} className="tbl-row">
                    <td><PartyBadge party={p} partyColors={partyColors} size="xs" /></td>
                    {YEARS.map(y => (
                      <td key={y} style={{ textAlign: 'center', fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                        {partyPerf[y]?.[p]?.seats || 0}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>{total}</td>
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

  const matchA = searchA.length > 2 ? Object.values(candidateMap).filter(c => c.name.toLowerCase().includes(searchA.toLowerCase())).slice(0, 8) : [];
  const matchB = searchB.length > 2 ? Object.values(candidateMap).filter(c => c.name.toLowerCase().includes(searchB.toLowerCase())).slice(0, 8) : [];

  const candA = a ? candidateMap[a.toLowerCase()] : null;
  const candB = b ? candidateMap[b.toLowerCase()] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gap: 16 }} id="candc-selects">
        <style>{`#candc-selects{grid-template-columns:1fr}@media(min-width:640px){#candc-selects{grid-template-columns:1fr 1fr}}`}</style>
        {[['A', searchA, setSearchA, matchA, a, setA, candA, '#6366f1'], ['B', searchB, setSearchB, matchB, b, setB, candB, '#f59e0b']].map(
          ([label, srch, setSrch, match, val, setVal, cand, color]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 6, verticalAlign: 'middle' }} />
                Candidate {label}
              </p>
              <input value={srch} onChange={e => setSrch(e.target.value)} placeholder="Type to search candidate…"
                className="field" style={{ width: '100%' }} />
              {match.length > 0 && (
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' }}>
                  {match.map((c, i) => (
                    <button key={i} onClick={() => { setVal(c.name); setSrch(''); }}
                      style={{ width: '100%', padding: '10px 14px', textAlign: 'left', fontSize: 13, background: 'transparent', border: 'none', borderBottom: i < match.length - 1 ? '1px solid #1e293b' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontFamily: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#141e33'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span>{c.name}</span>
                      <PartyBadge party={c.party} partyColors={partyColors} size="xs" />
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>{c.contests.length} elections</span>
                    </button>
                  ))}
                </div>
              )}
              {cand && (
                <div className="card" style={{ padding: 18 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>{cand.name}</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <PartyBadge party={cand.party} partyColors={partyColors} size="xs" />
                    <span style={{ color: '#475569', fontSize: 12 }}>{cand.sex === 'F' ? '♀' : '♂'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cand.contests.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: '#141e33', borderRadius: 8 }}>
                        <span style={{ color: '#475569' }}>{c.year} · {c.constituency}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#64748b' }}>#{c.rank}</span>
                          {c.won && <span style={{ color: '#34d399', fontWeight: 700 }}>Won</span>}
                          <span style={{ color: '#475569' }}>{c.vote_pct?.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {candA && candB && (
        <div style={{ display: 'grid', gap: 16 }} id="candc-cards">
          <style>{`#candc-cards{grid-template-columns:1fr}@media(min-width:768px){#candc-cards{grid-template-columns:1fr 1fr}}`}</style>
          {[candA, candB].map(cand => {
            const wins = cand.contests.filter(c => c.won).length;
            const total = cand.contests.length;
            const avgVotePct = cand.contests.reduce((s, c) => s + (c.vote_pct || 0), 0) / total;
            return (
              <div key={cand.name} className="card" style={{ padding: 22 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>{cand.name}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Wins', value: wins, color: '#34d399', bg: '#0a1f18' },
                    { label: 'Elections', value: total, color: '#e2e8f0', bg: '#141e33' },
                    { label: 'Avg Vote%', value: avgVotePct.toFixed(1) + '%', color: '#818cf8', bg: '#1e1b4b' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{ background: bg, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
                      <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{label}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cand.contests.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '7px 10px', background: '#141e33', borderRadius: 8 }}>
                      <span style={{ color: '#475569' }}>{c.year}</span>
                      <span style={{ color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 10px' }}>{c.constituency}</span>
                      <span style={{ fontWeight: 700, color: c.won ? '#34d399' : '#475569' }}>{c.won ? 'WON' : `#${c.rank}`}</span>
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
