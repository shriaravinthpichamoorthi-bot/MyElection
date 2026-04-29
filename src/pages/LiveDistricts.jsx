import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Search, ChevronRight, CalendarClock } from 'lucide-react';
import { useLiveResults, ALLIANCE_COLORS } from '../context/LiveResultsContext';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

function useDistrictSummaries(data, allResults) {
  return useMemo(() => {
    if (!data || !allResults) return {};
    const summaries = {};
    data.districts.forEach(district => {
      const recs = data.byDistrictYear[`${district}||2026`] ?? [];
      const names = recs.map(r => r.name);
      const allianceNoms = {};
      let totalCandidates = 0;

      names.forEach(name => {
        const candidates = allResults[name]?.candidates ?? [];
        totalCandidates += candidates.length;
        const leader = candidates[0];
        if (leader) {
          const a = leader.alliance ?? 'Others';
          if (!allianceNoms[a]) allianceNoms[a] = { count: 0, color: ALLIANCE_COLORS[a] ?? '#607d8b' };
          allianceNoms[a].count++;
        }
      });

      const topAlliance = Object.entries(allianceNoms)
        .map(([n, d]) => ({ n, ...d }))
        .sort((a, b) => b.count - a.count)[0] ?? null;

      summaries[district] = { names, total: names.length, totalCandidates, topAlliance, allianceNoms };
    });
    return summaries;
  }, [data, allResults]);
}

function DistrictCard({ district, summary, index }) {
  const { total, totalCandidates, topAlliance } = summary;
  const accent = topAlliance?.color ?? '#334155';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10px' }}
      transition={{ delay: Math.min(index * 0.025, 0.35) }}>
      <Link to={`/live/district/${slugify(district)}`} style={{ textDecoration: 'none' }}>
        <div className="card-hover" style={{ padding: '16px 18px', borderColor: `${accent}28`, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}18`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={14} style={{ color: accent }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{district}</p>
              <p style={{ fontSize: 10, color: '#475569' }}>{total} constituencies · {totalCandidates} candidates</p>
            </div>
            <ChevronRight size={13} style={{ color: '#334155', flexShrink: 0 }} />
          </div>

          {/* Top nominated alliance */}
          {topAlliance ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: accent, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topAlliance.n}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{topAlliance.count} seats</span>
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#334155', fontStyle: 'italic' }}>No data</p>
          )}

          {/* Nomination bar */}
          <div style={{ height: 4, borderRadius: 99, background: '#1e293b', overflow: 'hidden', display: 'flex', gap: 0.5 }}>
            {Object.entries(summary.allianceNoms)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([a, d]) => (
                <div key={a}
                  style={{ height: '100%', width: `${(d.count / total) * 100}%`, background: d.color }} />
              ))}
          </div>

          <p style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>Awaiting results</p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function LiveDistricts() {
  const { loading: liveLoading, allResults } = useLiveResults();
  const { data, loading: dataLoading } = useData();
  const [search, setSearch] = useState('');

  const summaries = useDistrictSummaries(data, allResults);

  if (liveLoading || dataLoading) return <LoadingSpinner />;
  if (!data) return <div style={{ color: '#f87171', padding: 32 }}>Failed to load.</div>;

  const filtered = data.districts.filter(d => d.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <LiveTabBar />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>Districts — 2026</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>38 districts · click to see constituency breakdown</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter districts…"
            className="field" style={{ paddingLeft: 28, height: 34, fontSize: 12, width: 180 }} />
        </div>
      </div>

      {/* Data coming soon notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', marginBottom: 16 }}>
        <CalendarClock size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>Results will appear here on election day · Showing 2026 nomination data</p>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gap: 12 }} id="ld-grid">
        <style>{`#ld-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}`}</style>
        {filtered.map((district, i) => {
          const summary = summaries[district];
          if (!summary) return null;
          return <DistrictCard key={district} district={district} summary={summary} index={i} />;
        })}
        {filtered.length === 0 && (
          <p style={{ color: '#334155', fontSize: 13, padding: '32px 0' }}>No districts match</p>
        )}
      </div>
    </div>
  );
}
