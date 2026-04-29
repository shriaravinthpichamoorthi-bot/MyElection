import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarClock, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { useLiveResults, ALLIANCE_COLORS } from '../context/LiveResultsContext';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

function CandidateRow({ candidate, rank }) {
  const color = ALLIANCE_COLORS[candidate.alliance] ?? '#607d8b';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      style={{
        padding: '12px 14px', borderRadius: 10,
        background: rank === 0 ? 'rgba(255,255,255,0.03)' : '#080d1a',
        border: `1px solid ${rank === 0 ? '#1e293b' : '#0f172a'}`,
        marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
      {/* Rank badge */}
      <div style={{ width: 26, height: 26, borderRadius: 7, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: rank === 0 ? '#a5b4fc' : '#475569' }}>#{rank + 1}</span>
      </div>

      {/* Name + party info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: rank === 0 ? '#f8fafc' : '#cbd5e1', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {candidate.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, padding: '2px 7px', borderRadius: 4, border: `1px solid ${color}33` }}>
            {candidate.party}
          </span>
          {candidate.alliance && candidate.alliance !== 'IND' && candidate.alliance !== 'Others' && (
            <span style={{ fontSize: 10, color: '#64748b' }}>{candidate.alliance}</span>
          )}
          {candidate.symbol && (
            <span style={{ fontSize: 10, color: '#334155' }}>· {candidate.symbol}</span>
          )}
        </div>
      </div>

      {/* Awaiting badge */}
      <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', background: '#1e293b', border: '1px solid #334155', padding: '3px 8px', borderRadius: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
        Awaiting
      </span>
    </motion.div>
  );
}

export default function LiveConstituency() {
  const { slug } = useParams();
  const { loading, allResults } = useLiveResults();
  const { data } = useData();

  if (loading) return <LoadingSpinner />;

  const allNames = Object.keys(allResults || {});
  const name = allNames.find(n => slugify(n) === slug);

  if (!name) return (
    <div style={{ padding: 32, color: '#f87171' }}>
      <Link to="/live" style={{ color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Live Dashboard
      </Link>
      Constituency not found.
    </div>
  );

  const resultData = allResults[name];
  const candidates = resultData?.candidates ?? [];

  // Previous/next constituency navigation
  const sortedNames = [...allNames].sort();
  const idx = sortedNames.indexOf(name);
  const prevName = idx > 0 ? sortedNames[idx - 1] : null;
  const nextName = idx < sortedNames.length - 1 ? sortedNames[idx + 1] : null;

  // Historical 2021 data
  const history = data?.byConstituency?.[name] ?? [];
  const prev2021 = history.find(r => r.year === 2021);

  // Leading alliance from nominations
  const leadAlliance = candidates[0]?.alliance;
  const leadColor = leadAlliance ? (ALLIANCE_COLORS[leadAlliance] ?? '#607d8b') : '#475569';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <LiveTabBar />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Breadcrumb + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <Link to="/live" style={{ color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <ArrowLeft size={13} /> Live Dashboard
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            {prevName && (
              <Link to={`/live/${slugify(prevName)}`} style={{ textDecoration: 'none' }}>
                <button className="pill-idle" style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronLeft size={12} /> {prevName}
                </button>
              </Link>
            )}
            {nextName && (
              <Link to={`/live/${slugify(nextName)}`} style={{ textDecoration: 'none' }}>
                <button className="pill-idle" style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {nextName} <ChevronRight size={12} />
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>{name}</h1>
            <p style={{ fontSize: 12, color: '#475569' }}>
              {candidates.length} candidates nominated
              {prev2021 && <span> · 2021 winner: <span style={{ color: '#818cf8' }}>{prev2021.winner_name} ({prev2021.winner_party})</span></span>}
            </p>
          </div>
          {leadAlliance && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: `${leadColor}12`, border: `1px solid ${leadColor}33` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: leadColor }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: leadColor }}>{leadAlliance}</span>
            </div>
          )}
        </div>

        {/* Data coming soon notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
          <CalendarClock size={18} style={{ color: '#818cf8', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 1 }}>Results will appear here on election day</p>
            <p style={{ fontSize: 11, color: '#64748b' }}>Live vote counts and the declared winner will update automatically once counting begins.</p>
          </div>
        </div>

        {/* Candidates list */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Radio size={14} style={{ color: '#ef4444' }} />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Candidates — 2026 Nominations
            </h2>
          </div>

          {candidates.map((c, i) => (
            <CandidateRow key={c.name + c.party} candidate={c} rank={i} />
          ))}

          {candidates.length === 0 && (
            <p style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No candidate data available</p>
          )}
        </div>

        {/* 2021 historical context */}
        {prev2021 && (
          <div className="card" style={{ padding: '18px 22px' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              2021 Result — Context
            </h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Winner', value: prev2021.winner_name, color: '#f8fafc' },
                { label: 'Party', value: prev2021.winner_party, color: '#818cf8' },
                prev2021.winner_votes && { label: 'Votes', value: prev2021.winner_votes.toLocaleString('en-IN'), color: '#f8fafc' },
                prev2021.margin && { label: 'Margin', value: `+${prev2021.margin.toLocaleString('en-IN')}`, color: '#34d399' },
                prev2021.turnout_pct && { label: 'Turnout', value: `${prev2021.turnout_pct.toFixed(1)}%`, color: '#fbbf24' },
              ].filter(Boolean).map(s => (
                <div key={s.label}>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>{s.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
