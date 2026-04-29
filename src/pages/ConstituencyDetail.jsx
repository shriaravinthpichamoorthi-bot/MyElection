import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Radio, User } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useLiveResults } from '../context/LiveResultsContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MapFragmentIcon from '../components/MapFragmentIcon';
import PartyBadge from '../components/PartyBadge';
import PartyIcon from '../components/PartyIcon';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import { formatNumber, formatPct, partyColor, marginClass, slugify, YEAR_COLORS, formatName } from '../utils/helpers';
import { loadConstituencyAsset } from '../utils/mapAssets';

const TT = { contentStyle: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, color: '#e2e8f0', fontSize: 12 } };

export default function ConstituencyDetail() {
  const { slug } = useParams();
  const { data, loading } = useData();
  const { allResults } = useLiveResults();
  const [candYear, setCandYear] = useState(null);
  const [constituencyGeometry, setConstituencyGeometry] = useState(null);

  const byConstituency = data?.byConstituency || {};
  const constituencies = data?.constituencies || [];
  const partyColors = data?.partyColors || {};
  const name = useMemo(() => constituencies.find((c) => slugify(c) === slug) || null, [constituencies, slug]);
  const history = useMemo(
    () => (name ? [...(byConstituency[name] || [])].sort((a, b) => a.year - b.year) : []),
    [byConstituency, name]
  );
  const latest = history[history.length - 1] || null;

  useEffect(() => {
    let cancelled = false;
    loadConstituencyAsset().then((geometries) => {
      if (!cancelled) setConstituencyGeometry(latest?.constituency_no ? geometries.get(latest.constituency_no) || null : null);
    });
    return () => { cancelled = true; };
  }, [latest?.constituency_no]);

  // 2026 candidates: prefer DataContext injection, fall back to LiveResultsContext
  const live2026Candidates = useMemo(() => {
    if (!name || !allResults?.[name]?.candidates) return [];
    return allResults[name].candidates.map(c => ({
      sl: c.sl, name: c.name, party: c.party, partyFull: c.partyFull,
      alliance: c.alliance, symbol: c.symbol,
      rank: null, votes: null, vote_pct: null, sex: null,
    }));
  }, [name, allResults]);

  const yearsWithCandidates = history.filter((r) => r.candidates && r.candidates.length > 0);
  // Add 2026 to picker if live data has candidates and it's not already there
  const has2026InHistory = yearsWithCandidates.some(r => r.year === 2026);
  const showLive2026 = !has2026InHistory && live2026Candidates.length > 0;
  const allCandYears = showLive2026
    ? [...yearsWithCandidates, { year: 2026, candidates: live2026Candidates }]
    : yearsWithCandidates;

  const selectedCandYear = candYear ?? (allCandYears[allCandYears.length - 1]?.year ?? null);
  const selectedRec = history.find((r) => r.year === selectedCandYear) || null;
  const candidates = selectedCandYear === 2026 && showLive2026
    ? live2026Candidates
    : (selectedRec?.candidates || []);

  const turnoutTrend = history.map((r) => ({ year: r.year, turnout: r.turnout_pct }));
  const marginTrend = history.filter((r) => r.margin_pct != null).map((r) => ({ year: r.year, margin: r.margin_pct }));

  if (loading) return <LoadingSpinner />;
  if (!name) return <div style={{ padding: 32, color: '#f87171' }}>Constituency not found.</div>;

  const stats = [
    { label: 'Total Electors', value: formatNumber(latest?.total_electors), color: '#818cf8', bg: '#1e1b4b' },
    { label: 'Votes Polled', value: formatNumber(latest?.votes_polled), color: '#60a5fa', bg: '#0c1a2e' },
    { label: 'Turnout', value: formatPct(latest?.turnout_pct), color: '#34d399', bg: '#0a1f18' },
    { label: 'Winning Margin', value: latest?.margin_pct != null ? `${latest.margin_pct.toFixed(1)}%` : '—', color: '#fbbf24', bg: '#1c1208' },
  ];

  return (
    <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', flexWrap: 'wrap' }}>
        <Link to="/constituencies" style={{ color: '#818cf8', textDecoration: 'none' }}>Constituencies</Link>
        <span>/</span>
        {latest?.district && (
          <>
            <Link to={`/district/${slugify(latest.district)}`} style={{ color: '#818cf8', textDecoration: 'none' }}>{latest.district}</Link>
            <span>/</span>
          </>
        )}
        <span style={{ color: '#f8fafc' }}>{name}</span>
      </div>

      {/* Hero card */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapFragmentIcon geometry={constituencyGeometry} className="h-6 w-6" fill="#818cf8" background="transparent" />
              </div>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>{name}</h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: '#475569' }}>
                  {latest?.district && <span>📍 {latest.district}</span>}
                  <span>Category: {latest?.category}</span>
                  <span style={{ color: '#334155' }}>#{latest?.constituency_no}</span>
                </div>
              </div>
            </div>
          </div>
          {latest?.winner_name && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Latest Winner ({latest.year})</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>{formatName(latest.winner_name)}</p>
              <PartyBadge party={latest.winner_party} partyColors={partyColors} />
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gap: 10 }} id="cd-stats">
          <style>{`#cd-stats{grid-template-columns:repeat(2,1fr)}@media(min-width:640px){#cd-stats{grid-template-columns:repeat(4,1fr)}}`}</style>
          {stats.map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${color}28`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gap: 16 }} id="cd-charts">
        <style>{`#cd-charts{grid-template-columns:1fr}@media(min-width:900px){#cd-charts{grid-template-columns:1fr 1fr}}`}</style>

        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Voter Turnout 2001–2026</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={turnoutTrend}>
              <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#475569', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={(v) => [formatPct(v), 'Turnout']} />
              <Line type="monotone" dataKey="turnout" stroke="#6366f1" strokeWidth={2.5} connectNulls
                dot={({ cx, cy, payload }) => <circle key={payload.year} cx={cx} cy={cy} r={4} fill={YEAR_COLORS?.[payload.year] || '#6366f1'} strokeWidth={0} />} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Winning Margin % Trend</p>
          {marginTrend.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={marginTrend}>
                <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip {...TT} formatter={(v) => [`${v.toFixed(1)}%`, 'Margin']} />
                <Bar dataKey="margin" radius={[5, 5, 0, 0]}>
                  {marginTrend.map((d, i) => (
                    <Cell key={i} fill={d.margin < 3 ? '#f87171' : d.margin < 8 ? '#fbbf24' : '#34d399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#334155', fontSize: 13, fontStyle: 'italic' }}>No margin data available</p>
          )}
        </div>
      </div>

      <HistoricalTable history={history} partyColors={partyColors} />

      {allCandYears.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
              {selectedCandYear === 2026 ? '2026 Nominations' : 'All Candidates'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 'auto' }}>
              {allCandYears.map((r) => (
                <motion.button key={r.year} whileTap={{ scale: 0.94 }} onClick={() => setCandYear(r.year)}
                  className={selectedCandYear === r.year ? 'pill-active' : 'pill-idle'}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {r.year}{r.year === 2026 ? ' ★' : ''}
                </motion.button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#475569' }}>{candidates.length} candidates</span>
          </div>
          {selectedCandYear === 2026 && showLive2026
            ? <Nominations2026Table candidates={candidates} partyColors={partyColors} />
            : <CandidateTable candidates={candidates} partyColors={partyColors} rec={selectedRec} />}
        </div>
      )}
    </div>
  );
}

function Nominations2026Table({ candidates, partyColors }) {
  const [search, setSearch] = useState('');
  const filtered = search
    ? candidates.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.party?.toLowerCase().includes(search.toLowerCase()))
    : candidates;

  return (
    <>
      <div style={{ padding: '12px 22px', borderBottom: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter candidate or party…"
          className="field" style={{ width: 200 }} />
        <span style={{ fontSize: 12, color: '#475569', marginLeft: 'auto' }}>Nominations · results pending</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="tbl-head">
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>#</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Candidate</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Party</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Alliance</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Symbol</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i} className="tbl-row">
                <td style={{ color: '#334155', fontVariantNumeric: 'tabular-nums' }}>{c.sl ?? i + 1}</td>
                <td style={{ color: '#e2e8f0', fontWeight: 500 }}>{c.name}</td>
                <td><PartyBadge party={c.party} partyColors={partyColors} size="xs" /></td>
                <td style={{ color: '#475569', fontSize: 12 }}>{c.alliance ?? '—'}</td>
                <td style={{ color: '#64748b', fontSize: 12 }}>{c.symbol ?? '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '36px 16px', textAlign: 'center', color: '#334155' }}>No candidates match</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HistoricalTable({ history, partyColors }) {
  const [search, setSearch] = useState('');
  const { sorted, col, dir, toggle } = useSortable(history, 'year', 'desc');

  const filtered = search
    ? sorted.filter((r) => r.winner_name?.toLowerCase().includes(search.toLowerCase()) || r.winner_party?.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Historical Winners</p>
        <div style={{ marginLeft: 'auto' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter winner or party…"
            className="field" style={{ width: 200 }} />
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="tbl-head">
              <SortTh label="Year" col="year" activeCol={col} dir={dir} onSort={toggle} />
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Winner</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Party</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' }}>Alliance</th>
              <SortTh label="Votes" col="winner_votes" activeCol={col} dir={dir} onSort={toggle} />
              <SortTh label="Vote%" col="winner_vote_pct" activeCol={col} dir={dir} onSort={toggle} />
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' }}>Runner-Up</th>
              <SortTh label="Margin" col="margin" activeCol={col} dir={dir} onSort={toggle} />
              <SortTh label="Margin%" col="margin_pct" activeCol={col} dir={dir} onSort={toggle} />
              <SortTh label="Turnout%" col="turnout_pct" activeCol={col} dir={dir} onSort={toggle} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="tbl-row">
                <td style={{ fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{r.year}</td>
                <td style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontSize: 13 }}>
                  {r.winner_name
                    ? <Link to={`/candidate/${slugify(formatName(r.winner_name))}`} style={{ color: '#818cf8', textDecoration: 'none' }}>{formatName(r.winner_name)}</Link>
                    : <span style={{ color: '#334155', fontStyle: 'italic' }}>Pending</span>}
                </td>
                <td>{r.winner_party ? <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /> : <span style={{ color: '#334155' }}>—</span>}</td>
                <td style={{ color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{r.winner_alliance || '—'}</td>
                <td style={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.winner_votes)}</td>
                <td style={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatPct(r.winner_vote_pct)}</td>
                <td style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                  {r.runner_name
                    ? <><Link to={`/candidate/${slugify(formatName(r.runner_name))}`} style={{ color: '#64748b', textDecoration: 'none' }}>{formatName(r.runner_name)}</Link> <span style={{ color: '#334155' }}>({r.runner_party})</span></>
                    : '—'}
                </td>
                <td style={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.margin)}</td>
                <td>
                  {r.margin_pct != null
                    ? <span style={{ fontSize: 12, fontWeight: 600, color: r.margin_pct < 3 ? '#f87171' : r.margin_pct < 8 ? '#fbbf24' : '#34d399', fontVariantNumeric: 'tabular-nums' }}>{r.margin_pct.toFixed(1)}%</span>
                    : <span style={{ color: '#334155' }}>—</span>}
                </td>
                <td style={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatPct(r.turnout_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CandidateTable({ candidates, partyColors, rec }) {
  const [search, setSearch] = useState('');
  const { sorted, col, dir, toggle } = useSortable(candidates, 'rank', 'asc');

  const filtered = search
    ? sorted.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.party?.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  return (
    <>
      <div style={{ padding: '12px 22px', borderBottom: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter candidate or party…"
          className="field" style={{ width: 200 }} />
        {rec && (
          <span style={{ fontSize: 12, color: '#475569', marginLeft: 'auto' }}>
            Total polled: {formatNumber(rec.votes_polled)} · Turnout: {formatPct(rec.turnout_pct)}
          </span>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="tbl-head">
              <SortTh label="Rank" col="rank" activeCol={col} dir={dir} onSort={toggle} />
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Candidate</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Gender</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Party</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Alliance</th>
              <SortTh label="Votes" col="votes" activeCol={col} dir={dir} onSort={toggle} />
              <SortTh label="Vote%" col="vote_pct" activeCol={col} dir={dir} onSort={toggle} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, ci) => (
              <tr key={ci} className="tbl-row" style={c.rank === 1 ? { background: 'rgba(52,211,153,0.04)' } : {}}>
                <td style={{ color: '#475569', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{c.rank}</td>
                <td>
                  <Link to={`/candidate/${slugify(c.name)}`}
                    style={{ color: c.rank === 1 ? '#34d399' : '#818cf8', textDecoration: 'none', fontWeight: c.rank === 1 ? 700 : 500 }}>
                    {c.name}
                  </Link>
                </td>
                <td style={{ color: '#475569', fontSize: 13 }}>{c.sex === 'F' ? '♀' : c.sex === 'M' ? '♂' : '—'}</td>
                <td><PartyBadge party={c.party} partyColors={partyColors} size="xs" /></td>
                <td style={{ color: '#334155', fontSize: 12 }}>{c.alliance}</td>
                <td style={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(c.votes)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 64, height: 5, borderRadius: 3, background: '#1e293b', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(c.vote_pct || 0, 100)}%`, background: partyColor(c.party, partyColors) }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{formatPct(c.vote_pct)}</span>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: '#334155', fontSize: 13 }}>No candidates match filter</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
