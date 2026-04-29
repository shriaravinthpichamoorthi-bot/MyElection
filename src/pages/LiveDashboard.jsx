import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarClock, Users, Map, BarChart3, Globe } from 'lucide-react';
import { useLiveResults, ALLIANCE_COLORS } from '../context/LiveResultsContext';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

const ALLIANCES_ORDER = ['DMK Alliance', 'AIADMK', 'NTK', 'TVK', 'NDA', 'AMMK', 'Others', 'IND'];

function AllianceNominationRow({ alliance, constituencies, total }) {
  const color = ALLIANCE_COLORS[alliance] ?? '#607d8b';
  const pct = total ? (constituencies / total) * 100 : 0;
  const enc = encodeURIComponent(alliance);
  return (
    <Link to={`/live/constituencies?alliance=${enc}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ padding: '10px 0', borderBottom: '1px solid #0f172a', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{alliance}</span>
          <span style={{ fontSize: 15, fontWeight: 800, color }}>{constituencies}</span>
          <span style={{ fontSize: 10, color: '#475569' }}>seats →</span>
        </div>
        <div style={{ marginLeft: 20, height: 3, borderRadius: 99, background: '#1e293b', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `${color}88`, borderRadius: 99 }} />
        </div>
      </div>
    </Link>
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

export default function LiveDashboard() {
  const { loading, allResults } = useLiveResults();

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

  const totalConstituencies = allResults ? Object.keys(allResults).length : 0;

  if (loading) return <LoadingSpinner />;
  if (!allResults) return <div style={{ color: '#f87171', padding: 32 }}>Failed to load data.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <LiveTabBar />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.6s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', letterSpacing: '0.12em', textTransform: 'uppercase' }}>LIVE 2026</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>Tamil Nadu Assembly Elections 2026</h1>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
          {totalConstituencies} constituencies · {totalCandidates.toLocaleString('en-IN')} candidates nominated
        </p>
      </div>

      {/* Data coming soon banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ padding: '18px 22px', borderRadius: 14, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.22)', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarClock size={20} style={{ color: '#818cf8' }} />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#a5b4fc', marginBottom: 3 }}>Results will appear here on election day</p>
          <p style={{ fontSize: 12, color: '#64748b' }}>
            Nominations are confirmed for all {totalConstituencies} constituencies. Live vote counts and declared results will update automatically once counting begins.
          </p>
        </div>
      </motion.div>

      {/* Main grid */}
      <div style={{ display: 'grid', gap: 16 }} id="dash-grid">
        <style>{`#dash-grid{grid-template-columns:1.4fr 1fr}@media(max-width:860px){#dash-grid{grid-template-columns:1fr}}`}</style>

        {/* Alliance nominations */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Alliance Nominations — {totalConstituencies} Constituencies
          </h2>

          {/* Stacked bar */}
          <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', gap: 1, marginBottom: 16 }}>
            {ALLIANCES_ORDER.filter(a => constituencyNominations[a]).map(a => {
              const color = ALLIANCE_COLORS[a] ?? '#607d8b';
              const count = constituencyNominations[a] ?? 0;
              const pct = (count / totalConstituencies) * 100;
              return (
                <div key={a} title={`${a}: ${count}`}
                  style={{ width: `${pct}%`, background: color, position: 'relative', minWidth: count > 3 ? 2 : 0 }}>
                  {count > 8 && (
                    <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 10, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            {ALLIANCES_ORDER.filter(a => constituencyNominations[a]).map(a => (
              <AllianceNominationRow
                key={a}
                alliance={a}
                constituencies={constituencyNominations[a]}
                total={totalConstituencies}
              />
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#334155', marginTop: 10 }}>
            Click any alliance to view their constituencies →
          </p>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Candidate stats */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              <Users size={12} style={{ display: 'inline', marginRight: 6 }} />
              Candidate Nominations
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ALLIANCES_ORDER.filter(a => nominations[a]).map(a => {
                const color = ALLIANCE_COLORS[a] ?? '#607d8b';
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
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
              <span>{totalConstituencies} constituencies</span>
              <span>{totalCandidates.toLocaleString('en-IN')} total candidates</span>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <QuickLink to="/live/constituencies" icon={Globe} label="All Constituencies" sub="Browse all 234 with nominations" />
            <QuickLink to="/live/districts" icon={BarChart3} label="By District" sub="38 districts at a glance" />
            <QuickLink to="/live-map" icon={Map} label="Map View" sub="TN map coloured by alliance" />
          </div>
        </div>
      </div>
    </div>
  );
}
