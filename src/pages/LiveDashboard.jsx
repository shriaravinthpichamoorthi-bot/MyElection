import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveBasePath } from '../hooks/useLiveBasePath';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CalendarClock, Users, Map, BarChart3, Globe, Activity, Trophy, Clock, AlertCircle } from 'lucide-react';
import { useLiveResults } from '../context/LiveResultsContext';
import { PARTY_COLORS, PARTY_TO_ALLIANCE } from '../utils/helpers';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

const TT = { contentStyle: { background: '#1e293b', border: '1px solid #475569', borderRadius: 10, color: '#f8fafc', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' } };

const TN_ALLIANCES_ORDER = ['DMK Alliance', 'AIADMK', 'NTK', 'TVK', 'NDA', 'AMMK', 'Others', 'IND'];

function StatusCard({ label, count, color, icon: Icon, to }) {
  const navigate = useNavigate();
  return (
    <motion.div whileHover={{ y: -2 }} onClick={() => navigate(to)}
      style={{ cursor: 'pointer', padding: '20px', borderRadius: 14, background: 'rgba(15,23,42,0.6)', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'border-color 0.15s, background 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}44`; e.currentTarget.style.background = `${color}11`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.background = 'rgba(15,23,42,0.6)'; }}>
      <Icon size={18} style={{ color }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 800, color }}>{count}</span>
    </motion.div>
  );
}

function SeatChart({ title, data, filterKey, basePath }) {
  const navigate = useNavigate();
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{title}</h3>
      {data.length === 0 ? (
        <p style={{ fontSize: 13, color: '#334155', textAlign: 'center', padding: '40px 0' }}>No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...TT} formatter={(v) => [`${v} seats`, '']} labelStyle={{ color: '#e2e8f0' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} onClick={(d) => navigate(`${basePath}/constituencies?${filterKey}=${encodeURIComponent(d.name)}`)}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.target.style.fillOpacity = '1'; }} onMouseLeave={(e) => { e.target.style.fillOpacity = '0.85'; }} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, sub }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <motion.div whileHover={{ y: -2 }} className="card"
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} style={{ color: '#818cf8' }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{label}</p>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{sub}</p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>→</span>
      </motion.div>
    </Link>
  );
}

export default function LiveDashboard({
  title = 'Tamil Nadu Assembly Elections 2026',
  year = '2026',
  totalConstituencies: propTotalConstituencies,
  alliancesOrder = TN_ALLIANCES_ORDER,
  showAllianceChart = true,
  declaredTitle = null,
}) {
  const { loading, allResults, liveMeta, lastUpdated, allianceColors, apiError } = useLiveResults();
  const basePath = useLiveBasePath();

  const { nominations, totalCandidates } = useMemo(() => {
    if (!allResults) return { nominations: {}, totalCandidates: 0 };
    const nom = {};
    let total = 0;
    Object.values(allResults).forEach(r => {
      (r.candidates ?? []).forEach(c => {
        const a = c.alliance ?? 'Others';
        nom[a] = (nom[a] || 0) + 1;
        total++;
      });
    });
    return { nominations: nom, totalCandidates: total };
  }, [allResults]);

  const constituencyNominations = useMemo(() => {
    if (!allResults) return {};
    const nom = {};
    Object.values(allResults).forEach(r => {
      const firstAlliance = r.candidates?.[0]?.alliance;
      if (firstAlliance) nom[firstAlliance] = (nom[firstAlliance] || 0) + 1;
    });
    return nom;
  }, [allResults]);

  const totalConstituencies = propTotalConstituencies ?? (allResults ? Object.keys(allResults).length : 0);

  const hasLiveData = liveMeta && liveMeta.status !== 'awaiting';
  const allianceTally = liveMeta ? (liveMeta.alliance_tally || {}) : {};
  const partyTally = liveMeta ? (liveMeta.party_tally || {}) : {};
  const declared = liveMeta?.declared ?? 0;
  const counting = liveMeta?.counting ?? 0;
  const awaiting = liveMeta?.awaiting ?? totalConstituencies;

  const timeAgo = useMemo(() => {
    if (!lastUpdated) return '';
    const s = Math.floor((Date.now() - lastUpdated) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }, [lastUpdated]);

  const allianceChartData = useMemo(() => {
    return Object.entries(allianceTally)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: allianceColors[name] || '#607d8b' }))
      .sort((a, b) => b.value - a.value);
  }, [allianceTally, allianceColors]);

  const partyChartData = useMemo(() => {
    return Object.entries(partyTally)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => {
        const alliance = PARTY_TO_ALLIANCE[name] || 'Others';
        return { name, value, color: allianceColors[alliance] || PARTY_COLORS[name] || '#607d8b', alliance };
      })
      .sort((a, b) => b.value - a.value);
  }, [partyTally, allianceColors]);

  // Group party tally by alliance for the companion pane
  const partyBreakdown = useMemo(() => {
    const groups = {};
    Object.entries(partyTally)
      .filter(([_, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([party, seats]) => {
        const alliance = PARTY_TO_ALLIANCE[party] || 'Others';
        if (!groups[alliance]) groups[alliance] = [];
        groups[alliance].push({ party, seats, color: allianceColors[alliance] || '#607d8b' });
      });
    return groups;
  }, [partyTally, allianceColors]);

  if (loading) return <LoadingSpinner />;
  if (!allResults) return <div style={{ color: '#f87171', padding: 32 }}>Failed to load data.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <LiveTabBar />

      {/* API Error Banner */}
      {apiError && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>
            ⚠ Live data unavailable. Showing last known results.
          </p>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.6s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', letterSpacing: '0.12em', textTransform: 'uppercase' }}>LIVE 2026</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>{title}</h1>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
          {totalConstituencies} constituencies · {totalCandidates.toLocaleString('en-IN')} candidates nominated
          {hasLiveData && <span> · Updated {timeAgo}</span>}
        </p>
      </div>

      {/* Live status banner */}
      {hasLiveData && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '18px 22px', borderRadius: 14, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.22)', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={20} style={{ color: '#34d399' }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#34d399', marginBottom: 3 }}>
              Counting in Progress · {declared} of {totalConstituencies} Declared
            </p>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              {counting} still counting · {awaiting} awaiting · Last update: {timeAgo}
            </p>
          </div>
        </motion.div>
      )}

      {/* Nominations banner */}
      {!hasLiveData && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '18px 22px', borderRadius: 14, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.22)', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarClock size={20} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#a5b4fc', marginBottom: 3 }}>Live results pending</p>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Nominations are confirmed for all {totalConstituencies} constituencies. Live vote counts and declared results will update automatically once counting begins.
            </p>
          </div>
        </motion.div>
      )}

      {/* Status cards - only when live */}
      {hasLiveData && (
        <div style={{ display: 'grid', gap: 16, marginBottom: 24 }} id="status-grid">
          <style>{`#status-grid{grid-template-columns:repeat(3,1fr)}@media(max-width:640px){#status-grid{grid-template-columns:1fr}}`}</style>
          <StatusCard label="Declared" count={declared} color="#34d399" icon={Trophy} to={`${basePath}/constituencies?status=declared`} />
          <StatusCard label="Counting" count={counting} color="#fbbf24" icon={Clock} to={`${basePath}/constituencies?status=counting`} />
          <StatusCard label="Awaiting" count={awaiting} color="#64748b" icon={AlertCircle} to={`${basePath}/constituencies?status=awaiting`} />
        </div>
      )}

      {/* Charts - only when live */}
      {hasLiveData && (
        <div style={{ display: 'grid', gap: 16, marginBottom: 24 }} id="charts-grid">
          <style>{`#charts-grid{grid-template-columns:1fr 1fr}@media(max-width:860px){#charts-grid{grid-template-columns:1fr}}`}</style>
          <SeatChart title="Alliance Seats" data={allianceChartData} filterKey="alliance" basePath={basePath} />
          {/* Live Results moved here (was left panel) */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              {declaredTitle || `Live Results — ${declared} Declared`}
            </h2>
            {/* Stacked bar */}
            <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', gap: 1, marginBottom: 16 }}>
              {alliancesOrder.filter(a => allianceTally[a]).map(a => {
                const color = allianceColors[a] ?? '#607d8b';
                const count = allianceTally[a] ?? 0;
                const pct = totalConstituencies ? (count / totalConstituencies) * 100 : 0;
                return (
                  <Link key={a} to={`${basePath}/constituencies?alliance=${encodeURIComponent(a)}`} style={{ width: `${pct}%`, background: color, position: 'relative', minWidth: count > 3 ? 2 : 0, display: 'block' }} title={`${a}: ${count}`}>
                    {count > 8 && (
                      <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 10, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
            <div>
              {alliancesOrder.filter(a => allianceTally[a]).map(a => (
                <Link key={a} to={`${basePath}/constituencies?alliance=${encodeURIComponent(a)}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ padding: '10px 0', borderBottom: '1px solid #0f172a', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: allianceColors[a] ?? '#607d8b', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{a}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: allianceColors[a] ?? '#607d8b' }}>{allianceTally[a] ?? 0}</span>
                      <span style={{ fontSize: 10, color: '#475569' }}>seats →</span>
                    </div>
                    <div style={{ marginLeft: 20, height: 3, borderRadius: 99, background: '#1e293b', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${totalConstituencies ? ((allianceTally[a] ?? 0) / totalConstituencies) * 100 : 0}%`, background: `${allianceColors[a] ?? '#607d8b'}88`, borderRadius: 99 }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#334155', marginTop: 10 }}>
              Click any alliance to view their leading constituencies →
            </p>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gap: 16 }} id="dash-grid">
        <style>{`#dash-grid{grid-template-columns:1.4fr 1fr}@media(max-width:860px){#dash-grid{grid-template-columns:1fr}}`}</style>

        {/* Left: Party Breakdown (moved from above) OR Nominations */}
        {hasLiveData && Object.keys(partyBreakdown).length > 0 ? (
          <div className="card" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Party Breakdown
            </h3>
            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {alliancesOrder.filter(a => partyBreakdown[a]).map(alliance => (
                <div key={alliance}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: allianceColors[alliance] ?? '#607d8b' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{alliance}</span>
                    <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>{allianceTally[alliance] ?? 0} seats</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {partyBreakdown[alliance].map(({ party, seats, color }) => (
                      <Link key={party} to={`${basePath}/constituencies?party=${encodeURIComponent(party)}`}
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                          <span style={{ fontSize: 12, color: '#cbd5e1' }}>{party}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{seats}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '20px 24px' }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Alliance Nominations — {totalConstituencies} Constituencies
            </h2>
            <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', gap: 1, marginBottom: 16 }}>
              {alliancesOrder.filter(a => constituencyNominations[a]).map(a => {
                const color = allianceColors[a] ?? '#607d8b';
                const count = constituencyNominations[a] ?? 0;
                const pct = totalConstituencies ? (count / totalConstituencies) * 100 : 0;
                return (
                  <Link key={a} to={`${basePath}/constituencies?alliance=${encodeURIComponent(a)}`} style={{ width: `${pct}%`, background: color, position: 'relative', minWidth: count > 0 ? 3 : 0, display: 'block' }} title={`${a}: ${count}`}>
                    {count > 8 && (
                      <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 10, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
            <div>
              {alliancesOrder.filter(a => constituencyNominations[a]).map(a => (
                <Link key={a} to={`${basePath}/constituencies?alliance=${encodeURIComponent(a)}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ padding: '10px 0', borderBottom: '1px solid #0f172a', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: allianceColors[a] ?? '#607d8b', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{a}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: allianceColors[a] ?? '#607d8b' }}>{constituencyNominations[a] ?? 0}</span>
                      <span style={{ fontSize: 10, color: '#475569' }}>seats →</span>
                    </div>
                    <div style={{ marginLeft: 20, height: 3, borderRadius: 99, background: '#1e293b', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${totalConstituencies ? ((constituencyNominations[a] ?? 0) / totalConstituencies) * 100 : 0}%`, background: `${allianceColors[a] ?? '#607d8b'}88`, borderRadius: 99 }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#334155', marginTop: 10 }}>
              Click any alliance to view their constituencies →
            </p>
          </div>
        )}

        {/* Right column: Quick links only (Election Status removed) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '20px 24px' }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              <Users size={12} style={{ display: 'inline', marginRight: 6 }} />
              Candidate Nominations
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alliancesOrder.filter(a => nominations[a]).map(a => {
                const color = allianceColors[a] ?? '#607d8b';
                return (
                  <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{a}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                      {nominations[a]}
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
                <span>{totalConstituencies} constituencies</span>
                <span>{totalCandidates.toLocaleString('en-IN')} total candidates</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <QuickLink to={`${basePath}/constituencies`} icon={Globe} label="All Constituencies" sub={hasLiveData ? `Browse live results for all ${totalConstituencies}` : `Browse all ${totalConstituencies} with nominations`} />
            <QuickLink to={`${basePath}/districts`} icon={BarChart3} label="By District" sub="Districts at a glance" />
            {basePath === '/live' && <QuickLink to="/live-map" icon={Map} label="Map View" sub={hasLiveData ? "Map coloured by leading alliance" : "Map coloured by alliance"} />}
          </div>
        </div>
      </div>
    </div>
  );
}
