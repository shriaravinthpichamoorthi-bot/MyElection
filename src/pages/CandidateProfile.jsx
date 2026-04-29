import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PartyBadge from '../components/PartyBadge';
import { formatNumber, formatPct, partyColor, slugify, formatName } from '../utils/helpers';

const TT = { contentStyle: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, color: '#e2e8f0', fontSize: 12 } };

export default function CandidateProfile() {
  const { slug } = useParams();
  const { data, loading } = useData();

  if (loading) return <LoadingSpinner />;

  const { candidateMap, partyColors } = data;

  // Try exact slug match first, then fall back to partial match
  const candidate = Object.values(candidateMap).find(c => slugify(c.name) === slug)
    || Object.values(candidateMap).find(c => slugify(c.name).startsWith(slug.slice(0, 8)));

  if (!candidate) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <p style={{ fontSize: 16, color: '#f87171', marginBottom: 8 }}>Candidate not found</p>
      <Link to="/candidates" style={{ fontSize: 13, color: '#818cf8', textDecoration: 'none' }}>← Back to Candidates</Link>
    </div>
  );

  const { name, sex, party, contests } = candidate;
  const sorted = [...contests].sort((a, b) => a.year - b.year);
  const wins = contests.filter(c => c.won);
  const winRate = contests.length ? ((wins.length / contests.length) * 100).toFixed(0) : '0';
  const avgVotePct = contests.length
    ? (contests.reduce((s, c) => s + (c.vote_pct || 0), 0) / contests.length).toFixed(1) : '0';
  const parties = [...new Set(contests.map(c => c.party).filter(Boolean))];
  const partyChanges = parties.length > 1;
  const constits = [...new Set(contests.map(c => c.constituency).filter(Boolean))];

  const voteChart = sorted
    .filter(c => c.vote_pct != null)
    .map(c => ({
      year: c.year,
      pct: c.vote_pct,
      won: c.won,
      label: (c.constituency || '').length > 14 ? (c.constituency || '').slice(0, 14) + '…' : (c.constituency || ''),
    }));

  const statItems = [
    { label: 'Elections', value: contests.length, color: '#818cf8', bg: '#1e1b4b' },
    { label: 'Wins', value: wins.length, color: '#34d399', bg: '#0a1f18' },
    { label: 'Win Rate', value: winRate + '%', color: '#60a5fa', bg: '#0c1a2e' },
    { label: 'Avg Vote%', value: avgVotePct + '%', color: '#c084fc', bg: '#1a0f2e' },
  ];

  return (
    <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
        <Link to="/candidates" style={{ color: '#818cf8', textDecoration: 'none' }}>Candidates</Link>
        <span>/</span>
        <span style={{ color: '#f8fafc' }}>{name}</span>
      </div>

      {/* Profile hero */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
            {sex === 'F' ? '👩' : '👨'}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>{name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <PartyBadge party={party} partyColors={partyColors} />
              <span style={{ fontSize: 13, color: '#475569' }}>{sex === 'F' ? 'Female' : 'Male'}</span>
              {partyChanges && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                  Party changes: {parties.join(' → ')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10 }} id="cp-stats">
          <style>{`#cp-stats{grid-template-columns:repeat(2,1fr)}@media(min-width:640px){#cp-stats{grid-template-columns:repeat(4,1fr)}}`}</style>
          {statItems.map(({ label, value, color, bg }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              style={{ background: bg, border: `1px solid ${color}28`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>{value}</p>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Vote % chart */}
      {voteChart.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Vote Share per Election</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={voteChart}>
              <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={(v, n, p) => [v != null ? v.toFixed(1) + '%' : '—', p?.payload?.label || '']} />
              <Bar dataKey="pct" radius={[5, 5, 0, 0]}>
                {voteChart.map((d, i) => <Cell key={i} fill={d.won ? '#34d399' : '#f87171'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, fontSize: 12, color: '#475569' }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#34d399', marginRight: 5, verticalAlign: 'middle' }} />Won</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#f87171', marginRight: 5, verticalAlign: 'middle' }} />Lost</span>
          </div>
        </div>
      )}

      {/* Election history */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Election History</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="tbl-head">
                {['Year', 'Constituency', 'District', 'Party', 'Alliance', 'Result', 'Vote%', 'Margin'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: '#334155', fontSize: 13 }}>No election history</td></tr>
              )}
              {sorted.map((c, i) => (
                <tr key={i} className="tbl-row" style={c.won ? { background: 'rgba(52,211,153,0.04)' } : {}}>
                  <td style={{ fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{c.year}</td>
                  <td>
                    {c.constituency
                      ? <Link to={`/constituency/${slugify(c.constituency)}`} style={{ color: '#818cf8', textDecoration: 'none', whiteSpace: 'nowrap' }}>{c.constituency}</Link>
                      : <span style={{ color: '#334155' }}>—</span>}
                  </td>
                  <td style={{ color: '#475569', fontSize: 12 }}>{c.district || '—'}</td>
                  <td>{c.party ? <PartyBadge party={c.party} partyColors={partyColors} size="xs" /> : <span style={{ color: '#334155' }}>—</span>}</td>
                  <td style={{ color: '#334155', fontSize: 12 }}>{c.alliance || '—'}</td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                      background: c.won ? 'rgba(52,211,153,0.12)' : c.rank === 2 ? 'rgba(251,191,36,0.12)' : 'rgba(30,41,59,0.6)',
                      color: c.won ? '#34d399' : c.rank === 2 ? '#fbbf24' : '#475569',
                    }}>
                      {c.won ? '✓ WON' : c.rank === 2 ? '2nd' : `#${c.rank}`}
                    </span>
                  </td>
                  <td style={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatPct(c.vote_pct)}</td>
                  <td style={{ color: '#475569', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    {c.won && c.margin ? formatNumber(c.margin) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Constituencies contested */}
      {constits.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Constituencies Contested</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {constits.map(c => (
              <Link key={c} to={`/constituency/${slugify(c)}`}
                style={{ padding: '6px 14px', background: '#141e33', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12, color: '#94a3b8', textDecoration: 'none', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#94a3b8'; }}>
                {c}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
