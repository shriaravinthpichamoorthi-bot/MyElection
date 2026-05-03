import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, CalendarClock, ChevronLeft, ChevronRight, Radio, Trophy } from 'lucide-react';
import { useLiveResults } from '../context/LiveResultsContext';
import { useLiveBasePath } from '../hooks/useLiveBasePath';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import { getConstituencyDetail as defaultGetConstituencyDetail } from '../utils/api';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

function cleanName(str) {
  if (!str) return str;
  return str.replace(/^[-–—•·►▸\s*]+/, '').trim();
}

function CandidateRow({ candidate, rank, liveVotes, maxVotes, totalVotes, isWinner, allianceColors }) {
  const color = allianceColors[candidate.alliance] ?? '#607d8b';
  const voteBarWidth = maxVotes > 0 ? ((liveVotes || 0) / maxVotes) * 100 : 0;
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reduceMotion ? {} : { delay: rank * 0.03 }}
      style={{
        padding: '12px 14px', borderRadius: 10,
        background: isWinner ? 'rgba(16,185,129,0.06)' : (rank === 0 ? 'rgba(255,255,255,0.03)' : '#080d1a'),
        border: `1px solid ${isWinner ? 'rgba(16,185,129,0.25)' : (rank === 0 ? '#1e293b' : '#0f172a')}`,
        marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
      {/* Rank badge */}
      <div style={{ width: 26, height: 26, borderRadius: 7, background: isWinner ? 'rgba(16,185,129,0.2)' : '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isWinner ? '#34d399' : (rank === 0 ? '#a5b4fc' : 'var(--text-subtle)') }}>
          {isWinner ? 'W' : `#${rank + 1}`}
        </span>
      </div>

      {/* Name + party info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p title={candidate.name} style={{ fontSize: 13, fontWeight: 700, color: isWinner ? '#34d399' : (rank === 0 ? '#f8fafc' : '#cbd5e1'), marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {candidate.name}
          {isWinner && <Trophy size={12} style={{ marginLeft: 6, color: '#34d399', display: 'inline', verticalAlign: 'middle' }} />}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '2px 7px', borderRadius: 4, border: `1px solid ${color}33` }}>
            {candidate.party}
          </span>
          {candidate.alliance && candidate.alliance !== 'IND' && candidate.alliance !== 'Others' && (
            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{candidate.alliance}</span>
          )}
          {candidate.symbol && (
            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>· {candidate.symbol}</span>
          )}
        </div>

        {/* Vote bar (shown when live data available) */}
        {liveVotes !== null && liveVotes !== undefined && totalVotes > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#1e293b', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${voteBarWidth}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums', minWidth: 50, textAlign: 'right' }}>
                {liveVotes.toLocaleString('en-IN')}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
              {((liveVotes / totalVotes) * 100).toFixed(1)}% of counted votes
            </span>
          </div>
        )}
      </div>

      {/* Status badge */}
      {isWinner ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 8px', borderRadius: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
          Won
        </span>
      ) : rank === 0 && liveVotes > 0 ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', padding: '3px 8px', borderRadius: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
          Leading
        </span>
      ) : (
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', background: '#1e293b', border: '1px solid #334155', padding: '3px 8px', borderRadius: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
          Awaiting
        </span>
      )}
    </motion.div>
  );
}

export default function LiveConstituency() {
  const { slug } = useParams();
  const { loading, allResults, liveMeta, nameToIdMap, allianceColors, apiClient } = useLiveResults();
  const basePath = useLiveBasePath();
  const { data } = useData();
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const reduceMotion = useReducedMotion();

  const name = useMemo(() => {
    if (loading) return null;
    const allNames = Object.keys(allResults || {});
    return allNames.find(n => slugify(n) === slug) || null;
  }, [loading, allResults, slug]);

  useEffect(() => {
    if (!name || !nameToIdMap[name]) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    const fetchDetail = apiClient
      ? apiClient.getConstituencyDetail(nameToIdMap[name])
      : defaultGetConstituencyDetail(nameToIdMap[name]);
    fetchDetail
      .then(res => {
        if (!cancelled) {
          setDetail(res.constituency || null);
          setDetailLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
          setDetailLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [name, nameToIdMap]);

  // Derive display data (must be before any early returns to obey Rules of Hooks)
  const resultData = allResults?.[name];
  const candidates = resultData?.candidates ?? [];
  const live = resultData?._live;
  const hasLiveData = liveMeta && liveMeta.status !== 'awaiting';
  const isDeclared = live?.status === 'declared';
  const liveCandidates = detail?.candidates || live?.candidates;

  // Build sorted candidates with live vote data
  const candidateRows = useMemo(() => {
    const rows = candidates.map(c => {
      const liveCandidate = liveCandidates?.find(lc =>
        lc.name.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(lc.name.toLowerCase())
      );
      return { candidate: c, liveVotes: liveCandidate?.votes ?? 0 };
    });
    // Sort by live votes descending when live data available
    if (liveCandidates && liveCandidates.length > 0) {
      return [...rows].sort((a, b) => b.liveVotes - a.liveVotes);
    }
    return rows;
  }, [candidates, liveCandidates]);

  if (loading) return <LoadingSpinner variant="detail" />;
  if (!name) return (
    <div style={{ padding: 32, color: '#f87171' }}>
      <Link to={basePath} style={{ color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Live Dashboard
      </Link>
      Constituency not found.
    </div>
  );

  // Format last updated time
  const detailUpdated = detail?.last_updated || live?.last_updated;
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  // Previous/next constituency navigation
  const allNames = Object.keys(allResults || {});
  const sortedNames = [...allNames].sort();
  const idx = sortedNames.indexOf(name);
  const prevName = idx > 0 ? sortedNames[idx - 1] : null;
  const nextName = idx < sortedNames.length - 1 ? sortedNames[idx + 1] : null;

  // Historical 2021 data
  const history = data?.byConstituency?.[name] ?? [];
  const prev2021 = history.find(r => r.year === 2021);

  // Leading info
  const declaredWinner = isDeclared && liveCandidates?.length
    ? liveCandidates.reduce((max, c) => (c.votes > max.votes ? c : max), liveCandidates[0])
    : null;
  const leadAlliance = live?.leading_alliance ?? candidates[0]?.alliance;
  const leadColor = leadAlliance ? (allianceColors[leadAlliance] ?? '#607d8b') : '#475569';
  const rawLeadName = declaredWinner?.name ?? live?.leading_candidate ?? candidates[0]?.name;
  const rawLeadParty = declaredWinner?.party ?? live?.leading_party ?? candidates[0]?.party;
  const leadName = cleanName(rawLeadName);
  const leadParty = cleanName(rawLeadParty);

  const maxVotes = Math.max(...candidateRows.map(r => r.liveVotes), 1);
  const totalCountedVotes = candidateRows.reduce((a, r) => a + r.liveVotes, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <LiveTabBar />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Breadcrumb + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <Link to={basePath} style={{ color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <ArrowLeft size={13} /> Live Dashboard
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            {prevName && (
              <Link to={`${basePath}/${slugify(prevName)}`} style={{ textDecoration: 'none' }}>
                <div className="pill-idle" style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronLeft size={12} /> {prevName}
                </div>
              </Link>
            )}
            {nextName && (
              <Link to={`${basePath}/${slugify(nextName)}`} style={{ textDecoration: 'none' }}>
                <div className="pill-idle" style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {nextName} <ChevronRight size={12} />
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>{name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
              {candidates.length} candidates nominated
              {prev2021 && <span> · 2021 winner: <span style={{ color: '#818cf8' }}>{prev2021.winner_name} ({prev2021.winner_party})</span></span>}
              {live?.round && <span> · Round {live.round}</span>}
            </p>
          </div>
          {leadAlliance && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: `${leadColor}12`, border: `1px solid ${leadColor}33` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: leadColor }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: leadColor }}>{isDeclared ? 'Won · ' : ''}{leadAlliance}</span>
            </div>
          )}
        </div>

        {/* Live data banner */}
        {hasLiveData && live && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '14px 18px', borderRadius: 12, background: isDeclared ? 'rgba(16,185,129,0.06)' : 'rgba(99,102,241,0.06)', border: `1px solid ${isDeclared ? 'rgba(16,185,129,0.18)' : 'rgba(99,102,241,0.18)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: isDeclared ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Radio size={18} style={{ color: isDeclared ? '#34d399' : '#818cf8' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: isDeclared ? '#34d399' : '#a5b4fc', marginBottom: 2 }}>
                  {isDeclared
                    ? `${leadName} (${leadParty}) declared winner`
                    : `${leadName} (${leadParty}) is leading`
                  }
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
                  {live.margin > 0 && <span>Margin: +{live.margin.toLocaleString('en-IN')} votes · </span>}
                  {live.status === 'counting' && <span>Counting in progress · </span>}
                  {live.round && <span>Round {live.round}{live.total_rounds ? ` of ${live.total_rounds}` : ''} · </span>}
                  {totalCountedVotes > 0 && <span>{totalCountedVotes.toLocaleString('en-IN')} votes counted · </span>}
                  {detailUpdated && <span>Updated {timeAgo(detailUpdated)}</span>}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Race summary */}
        {hasLiveData && liveCandidates && liveCandidates.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card" style={{ padding: '16px 20px' }}>
            <h3 className="eyebrow" style={{ marginBottom: 12 }}>Race Summary</h3>
            {(() => {
              const sorted = [...liveCandidates].sort((a, b) => b.votes - a.votes);
              const first = sorted[0];
              const second = sorted[1];
              const diff = first.votes - second.votes;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: 4 }}>1st</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>{cleanName(first.name)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>({first.party})</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{first.votes.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', padding: '2px 6px', borderRadius: 4 }}>2nd</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{cleanName(second.name)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>({second.party})</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{second.votes.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ paddingTop: 8, borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Difference</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: isDeclared ? '#34d399' : '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>+{diff.toLocaleString('en-IN')} votes</span>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Nominations banner (when no live data) */}
        {!hasLiveData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <CalendarClock size={18} style={{ color: '#818cf8', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 1 }}>Live results pending</p>
              <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Live vote counts and the declared winner will update automatically once counting begins.</p>
            </div>
          </div>
        )}

        {/* Candidates list */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={14} style={{ color: '#ef4444' }} />
              <h2 className="eyebrow">
                {hasLiveData ? 'Live Results — 2026' : 'Candidates — 2026 Nominations'}
              </h2>
            </div>
            {detailUpdated && (
              <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
                Updated {timeAgo(detailUpdated)}
              </span>
            )}
          </div>

          {detailLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px 0' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => (
                  <motion.span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1', display: 'block' }}
                    animate={reduceMotion ? {} : { y: [0, -6, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Fetching live vote details…</span>
            </div>
          )}

          {candidateRows.map(({ candidate, liveVotes }, i) => (
            <CandidateRow
              key={candidate.name + candidate.party}
              candidate={candidate}
              rank={i}
              liveVotes={liveVotes}
              maxVotes={maxVotes}
              totalVotes={totalCountedVotes}
              isWinner={i === 0 && isDeclared && liveVotes > 0}
              allianceColors={allianceColors}
            />
          ))} 

          {candidates.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No candidate data available</p>
          )}
        </div>

        {/* 2021 historical context */}
        {prev2021 && (
          <div className="card" style={{ padding: '18px 22px' }}>
            <h2 className="eyebrow" style={{ marginBottom: 12 }}>2021 Result — Context</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Winner', value: prev2021.winner_name, color: '#f8fafc' },
                { label: 'Party', value: prev2021.winner_party, color: '#818cf8' },
                prev2021.winner_votes && { label: 'Votes', value: prev2021.winner_votes.toLocaleString('en-IN'), color: '#f8fafc' },
                prev2021.margin && { label: 'Margin', value: `+${prev2021.margin.toLocaleString('en-IN')}`, color: '#34d399' },
                prev2021.turnout_pct && { label: 'Turnout', value: `${prev2021.turnout_pct.toFixed(1)}%`, color: '#fbbf24' },
              ].filter(Boolean).map(s => (
                <div key={s.label}>
                  <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 2 }}>{s.label}</p>
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
