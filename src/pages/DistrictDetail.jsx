import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';
import { MapPinned, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MapFragmentIcon from '../components/MapFragmentIcon';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import { formatNumber, formatPct, allianceColor, marginClass, slugify, formatName } from '../utils/helpers';
import { loadDistrictAsset } from '../utils/mapAssets';

const YEARS = [2001, 2006, 2011, 2016, 2021, 2026];
const TT = { contentStyle: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, color: '#e2e8f0', fontSize: 12 } };
const selectStyle = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, color: '#e2e8f0', fontSize: 13, padding: '8px 12px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' };

export default function DistrictDetail() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const [selYear, setSelYear] = useState(Number(sp.get('year')) || 2021);
  const [search, setSearch] = useState('');
  const [districtGeometry, setDistrictGeometry] = useState(null);
  const { data, loading } = useData();

  const districts = data?.districts || [];
  const byDistrictYear = data?.byDistrictYear || {};
  const partyColors = data?.partyColors || {};
  const allianceColors = data?.allianceColors || {};

  const district = useMemo(
    () => districts.find((d) => d.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug) || null,
    [districts, slug]
  );

  useEffect(() => {
    let cancelled = false;
    loadDistrictAsset().then((geometries) => {
      if (!cancelled) setDistrictGeometry(district ? geometries.get(district) || null : null);
    });
    return () => { cancelled = true; };
  }, [district]);

  const allRecs = district ? byDistrictYear[`${district}||${selYear}`] || [] : [];
  const recs = search ? allRecs.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())) : allRecs;
  const { sorted: sortedRecs, col: sortCol, dir: sortDir, toggle: sortToggle } = useSortable(recs, 'constituency_no');

  const turnoutTrend = YEARS.map((y) => {
    const rows = district ? byDistrictYear[`${district}||${y}`] || [] : [];
    const avg = rows.length ? rows.reduce((s, x) => s + (x.turnout_pct || 0), 0) / rows.length : null;
    return { year: y, turnout: avg != null ? +avg.toFixed(2) : null };
  });

  const allianceData = Object.entries(
    recs.reduce((acc, row) => {
      const key = row.winner_alliance || 'Others';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, seats]) => ({ name, seats })).sort((a, b) => b.seats - a.seats);

  const partyData = Object.entries(
    recs.reduce((acc, row) => {
      if (row.winner_party) acc[row.winner_party] = (acc[row.winner_party] || 0) + 1;
      return acc;
    }, {})
  ).map(([party, seats]) => ({ party, seats })).sort((a, b) => b.seats - a.seats);

  const avgTurnout = allRecs.length
    ? (allRecs.reduce((s, r) => s + (r.turnout_pct || 0), 0) / allRecs.length).toFixed(1) : '—';
  const avgMargin = allRecs.filter((r) => r.margin_pct != null).length
    ? (allRecs.filter((r) => r.margin_pct != null).reduce((s, r) => s + r.margin_pct, 0) /
        allRecs.filter((r) => r.margin_pct != null).length).toFixed(1) : '—';

  if (loading) return <LoadingSpinner />;
  if (!district) return <div style={{ padding: 32, color: '#f87171' }}>District not found.</div>;

  const stats = [
    { label: 'Constituencies', value: recs.length, color: '#818cf8', bg: '#1e1b4b' },
    { label: 'Avg Turnout', value: `${avgTurnout}%`, color: '#34d399', bg: '#0a1f18' },
    { label: 'Avg Margin', value: `${avgMargin}%`, color: '#fbbf24', bg: '#1c1208' },
    { label: 'Leading Party', value: partyData[0]?.party || '—', color: '#60a5fa', bg: '#0c1a2e' },
  ];

  return (
    <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
        <Link to="/districts" style={{ color: '#818cf8', textDecoration: 'none' }}
          onMouseEnter={e => e.target.style.color = '#a5b4fc'} onMouseLeave={e => e.target.style.color = '#818cf8'}>
          Districts
        </Link>
        <span>/</span>
        <span style={{ color: '#f8fafc' }}>{district}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapFragmentIcon geometry={districtGeometry} className="h-6 w-6" fill="#60a5fa" background="transparent" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>{district}</h1>
            <p style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{allRecs.length} constituencies · {selYear} election</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {YEARS.map(y => (
            <motion.button key={y} whileTap={{ scale: 0.94 }} onClick={() => setSelYear(y)}
              className={selYear === y ? 'pill-active' : 'pill-idle'}
              style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {y}{y === 2026 ? ' ★' : ''}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gap: 12 }} id="dd-stats">
        <style>{`#dd-stats{grid-template-columns:repeat(2,1fr)}@media(min-width:768px){#dd-stats{grid-template-columns:repeat(4,1fr)}}`}</style>
        {stats.map(({ label, value, color, bg }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="card" style={{ padding: '20px 22px', background: bg, borderColor: `${color}30` }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color }}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gap: 16 }} id="dd-charts">
        <style>{`#dd-charts{grid-template-columns:1fr}@media(min-width:900px){#dd-charts{grid-template-columns:1fr 1fr}}`}</style>

        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Alliance Seats — {selYear}</p>
          {allianceData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={allianceData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
                <Tooltip {...TT} />
                <Bar dataKey="seats" radius={[0, 5, 5, 0]}>
                  {allianceData.map((d, i) => <Cell key={i} fill={allianceColor(d.name, allianceColors)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#334155', fontSize: 13, fontStyle: 'italic' }}>No result data for {selYear}</p>
          )}
        </div>

        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Average Turnout Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={turnoutTrend}>
              <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#475569', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={(v) => [v ? `${v.toFixed(1)}%` : '—', 'Avg Turnout']} />
              <Line type="monotone" dataKey="turnout" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Constituency Results Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Constituency Results — {selYear}</p>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
                className="field" style={{ paddingLeft: 30, width: 160 }} />
            </div>
            {search && <span style={{ fontSize: 12, color: '#475569' }}>{recs.length} of {allRecs.length}</span>}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="tbl-head">
                <SortTh label="#" col="constituency_no" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Constituency" col="name" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' }}>Winner</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Party</th>
                <SortTh label="Votes" col="winner_votes" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' }}>Runner-Up</th>
                <SortTh label="Margin" col="margin" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Margin%" col="margin_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Turnout" col="turnout_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
              </tr>
            </thead>
            <tbody>
              {sortedRecs.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: '#334155', fontSize: 13 }}>
                  {selYear === 2026 ? 'Results pending — turnout data available' : 'No data'}
                </td></tr>
              )}
              {sortedRecs.map((r, i) => (
                <tr key={i} className="tbl-row">
                  <td style={{ color: '#334155', fontFamily: 'monospace', fontSize: 12 }}>{r.constituency_no}</td>
                  <td>
                    <Link to={`/constituency/${slugify(r.name)}`}
                      style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {r.name}
                    </Link>
                  </td>
                  <td style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {r.winner_name ? formatName(r.winner_name) : <span style={{ color: '#334155', fontStyle: 'italic' }}>Pending</span>}
                  </td>
                  <td>{r.winner_party ? <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /> : <span style={{ color: '#334155' }}>—</span>}</td>
                  <td style={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.winner_votes)}</td>
                  <td style={{ color: '#475569', fontSize: 11, whiteSpace: 'nowrap' }}>{r.runner_name || '—'}</td>
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
    </div>
  );
}
