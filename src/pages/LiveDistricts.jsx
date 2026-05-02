import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MapPin, Search, ChevronRight, CalendarClock, Radio } from 'lucide-react';
import { useLiveResults } from '../context/LiveResultsContext';
import { useLiveBasePath } from '../hooks/useLiveBasePath';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

function useDistrictSummaries(data, districtMap, allResults, liveMeta, allianceColors) {
  const hasLiveData = liveMeta && liveMeta.status !== 'awaiting';
  return useMemo(() => {
    if (!allResults) return {};

    // Bihar mode: derive districts from districtMap
    if (districtMap && Object.keys(districtMap).length > 0) {
      const summaries = {};
      Object.entries(districtMap).forEach(([name, district]) => {
        if (!summaries[district]) {
          summaries[district] = {
            names: [], total: 0, totalCandidates: 0,
            allianceNoms: {}, allianceLive: {},
            declaredCount: 0, countingCount: 0, hasLiveData,
          };
        }
        const s = summaries[district];
        s.names.push(name);
        s.total++;
        const candidates = allResults[name]?.candidates ?? [];
        s.totalCandidates += candidates.length;

        const leader = candidates[0];
        if (leader) {
          const a = leader.alliance ?? 'Others';
          if (!s.allianceNoms[a]) s.allianceNoms[a] = { count: 0, color: allianceColors[a] ?? '#607d8b' };
          s.allianceNoms[a].count++;
        }

        const live = allResults[name]?._live;
        if (hasLiveData && live) {
          const la = live.leading_alliance ?? 'Others';
          if (!s.allianceLive[la]) s.allianceLive[la] = { count: 0, color: allianceColors[la] ?? '#607d8b' };
          s.allianceLive[la].count++;
          if (live.status === 'declared') s.declaredCount++;
          if (live.status === 'counting') s.countingCount++;
        }
      });
      // Compute topAlliance for each
      Object.values(summaries).forEach(s => {
        s.topAlliance = Object.entries(hasLiveData ? s.allianceLive : s.allianceNoms)
          .map(([n, d]) => ({ n, ...d }))
          .sort((a, b) => b.count - a.count)[0] ?? null;
      });
      return summaries;
    }

    // TN mode: derive from static data
    if (!data) return {};
    const summaries = {};
    data.districts.forEach(district => {
      const recs = data.byDistrictYear[`${district}||2026`] ?? [];
      const names = recs.map(r => r.name);
      const allianceNoms = {};
      const allianceLive = {};
      let totalCandidates = 0;
      let declaredCount = 0;
      let countingCount = 0;

      names.forEach(name => {
        const candidates = allResults[name]?.candidates ?? [];
        const live = allResults[name]?._live;
        totalCandidates += candidates.length;

        const leader = candidates[0];
        if (leader) {
          const a = leader.alliance ?? 'Others';
          if (!allianceNoms[a]) allianceNoms[a] = { count: 0, color: allianceColors[a] ?? '#607d8b' };
          allianceNoms[a].count++;
        }

        if (hasLiveData && live) {
          const la = live.leading_alliance ?? 'Others';
          if (!allianceLive[la]) allianceLive[la] = { count: 0, color: allianceColors[la] ?? '#607d8b' };
          allianceLive[la].count++;
          if (live.status === 'declared') declaredCount++;
          if (live.status === 'counting') countingCount++;
        }
      });

      const topAlliance = Object.entries(hasLiveData ? allianceLive : allianceNoms)
        .map(([n, d]) => ({ n, ...d }))
        .sort((a, b) => b.count - a.count)[0] ?? null;

      summaries[district] = {
        names, total: names.length, totalCandidates, topAlliance, allianceNoms,
        allianceLive, declaredCount, countingCount, hasLiveData,
      };
    });
    return summaries;
  }, [data, districtMap, allResults, liveMeta, hasLiveData, allianceColors]);
}

function DistrictCard({ district, summary, index, basePath }) {
  const { total, totalCandidates, topAlliance, declaredCount, countingCount, hasLiveData } = summary;
  const accent = topAlliance?.color ?? '#334155';
  const liveCount = declaredCount + countingCount;
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10px' }}
      transition={reduceMotion ? {} : { delay: Math.min(index * 0.025, 0.35) }}>
      <Link to={`${basePath}/district/${slugify(district)}`} style={{ textDecoration: 'none' }}>
        <div className="card-hover district-card-fallback" style={{ padding: '16px 18px', borderColor: `${accent}28`, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}18`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={14} style={{ color: accent }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p title={district} style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{district}</p>
              <p style={{ fontSize: 10, color: '#475569' }}>{total} constituencies · {totalCandidates} candidates</p>
            </div>
            <ChevronRight size={13} style={{ color: '#334155', flexShrink: 0 }} />
          </div>

          {/* Top alliance */}
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
            {Object.entries(summary.hasLiveData ? summary.allianceLive : summary.allianceNoms)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([a, d]) => (
                <div key={a}
                  style={{ height: '100%', width: `${(d.count / total) * 100}%`, background: d.color }} />
              ))}
          </div>

          {/* Live status */}
          {hasLiveData ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={11} style={{ color: declaredCount > 0 ? '#34d399' : '#fbbf24' }} />
              <span style={{ fontSize: 10, color: declaredCount > 0 ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                {declaredCount} declared · {countingCount} counting
              </span>
            </div>
          ) : (
            <p style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>Awaiting results</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function LiveDistricts() {
  const { loading: liveLoading, allResults, liveMeta, allianceColors, districtMap, apiError } = useLiveResults();
  const basePath = useLiveBasePath();
  const { data, loading: dataLoading } = useData();
  const [search, setSearch] = useState('');

  const summaries = useDistrictSummaries(data, districtMap, allResults, liveMeta, allianceColors);

  // Determine if we're in Bihar mode (districtMap available) or TN mode
  const isBiharMode = districtMap && Object.keys(districtMap).length > 0;

  if (liveLoading) return <LoadingSpinner variant="table" />;
  if (!isBiharMode && dataLoading) return <LoadingSpinner variant="table" />;
  if (!allResults) return <div style={{ color: '#f87171', padding: 32 }}>Failed to load.</div>;

  const districtList = isBiharMode
    ? [...new Set(Object.values(districtMap))].sort()
    : (data?.districts ?? []);

  const filtered = districtList.filter(d => d.toLowerCase().includes(search.toLowerCase()));

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>Districts — {isBiharMode ? '2025' : '2026'}</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>{districtList.length} districts · click to see constituency breakdown</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter districts…"
            className="field" style={{ paddingLeft: 28, height: 34, fontSize: 12, width: '100%', minWidth: 160, maxWidth: 260 }} />
        </div>
      </div>

      {/* Data notice */}
      {(!liveMeta || liveMeta.status === 'awaiting') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', marginBottom: 16 }}>
          <CalendarClock size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>Live results pending · Showing {isBiharMode ? '2025' : '2026'} nomination data</p>
        </div>
      )}

      {/* Grid */}
      <style>{`.district-card-fallback{opacity:1!important}`}</style>
      <div style={{ display: 'grid', gap: 12 }} id="ld-grid">
        <style>{`#ld-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}`}</style>
        {filtered.map((district, i) => {
          const summary = summaries[district];
          if (!summary) return null;
          return <DistrictCard key={district} district={district} summary={summary} index={i} basePath={basePath} />;
        })}
        {filtered.length === 0 && (
          <p style={{ color: '#334155', fontSize: 13, padding: '32px 0' }}>No districts match</p>
        )}
      </div>
    </div>
  );
}
