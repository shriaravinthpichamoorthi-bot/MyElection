import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, CalendarClock, Info, Radio } from 'lucide-react';
import { useLiveResults } from '../context/LiveResultsContext';
import { useLiveBasePath } from '../hooks/useLiveBasePath';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 920;
const MAP_PADDING = 36;

function secsAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function flattenCoordinates(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

function projectFeatures(features, getMeta) {
  const points = [];
  features.forEach(f => {
    flattenCoordinates(f.geometry).forEach(ring => {
      ring.forEach(([lon, lat]) => points.push([lon, lat]));
    });
  });
  if (!points.length) return [];

  const minLon = Math.min(...points.map(([lon]) => lon));
  const maxLon = Math.max(...points.map(([lon]) => lon));
  const minLat = Math.min(...points.map(([, lat]) => lat));
  const maxLat = Math.max(...points.map(([, lat]) => lat));
  const usableW = VIEWBOX_WIDTH - MAP_PADDING * 2;
  const usableH = VIEWBOX_HEIGHT - MAP_PADDING * 2;
  const scale = Math.min(usableW / (maxLon - minLon), usableH / (maxLat - minLat));
  const projW = (maxLon - minLon) * scale;
  const projH = (maxLat - minLat) * scale;
  const offX = (VIEWBOX_WIDTH - projW) / 2;
  const offY = (VIEWBOX_HEIGHT - projH) / 2;

  function project([lon, lat]) {
    return [
      Number((offX + (lon - minLon) * scale).toFixed(2)),
      Number((offY + (maxLat - lat) * scale).toFixed(2)),
    ];
  }

  return features.map(f => {
    const polygons = flattenCoordinates(f.geometry);
    const segments = [];
    let cx = 0, cy = 0, cp = 0;
    polygons.forEach(ring => {
      if (!ring.length) return;
      const projected = ring.map(project);
      projected.forEach(([x, y]) => { cx += x; cy += y; cp++; });
      const [sx, sy] = projected[0];
      const cmds = [`M ${sx} ${sy}`];
      for (let i = 1; i < projected.length; i++) cmds.push(`L ${projected[i][0]} ${projected[i][1]}`);
      cmds.push('Z');
      segments.push(cmds.join(' '));
    });
    return { path: segments.join(' '), centroid: cp ? [cx / cp, cy / cp] : [0, 0], ...getMeta(f) };
  });
}

const ALLIANCES_ORDER = ['DMK Alliance', 'AIADMK', 'NTK', 'TVK', 'NDA', 'AMMK', 'Others'];

function MapLegend({ allianceCounts, allianceColors }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      {ALLIANCES_ORDER.filter(a => allianceCounts[a]).map(a => {
        const color = allianceColors[a] ?? '#607d8b';
        return (
          <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontWeight: 600 }}>{a}</span>
            <span style={{ fontSize: 12, color, fontWeight: 800 }}>{allianceCounts[a]}</span>
          </div>
        );
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: '#1e293b', border: '1px solid #334155' }} />
        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Unknown</span>
      </div>
    </div>
  );
}

export default function LiveMapView() {
  const { loading: liveLoading, allResults, lastUpdated, liveMeta, mapTickMs, allianceColors } = useLiveResults();
  const { data, loading: dataLoading } = useData();
  const basePath = useLiveBasePath();
  const [geoJson, setGeoJson] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [, tick] = useState(0);

  const hasLiveData = liveMeta && (
    liveMeta.status !== 'awaiting' ||
    Object.keys(liveMeta.alliance_tally ?? {}).length > 0 ||
    Object.keys(liveMeta.party_tally ?? {}).length > 0
  );

  useEffect(() => {
    fetch('/tamil-nadu-assembly-constituencies.geojson')
      .then(r => r.json())
      .then(d => setGeoJson(d))
      .catch(() => setGeoJson({ features: [] }))
      .finally(() => setMapLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), mapTickMs);
    return () => clearInterval(id);
  }, [mapTickMs]);

  // Case-insensitive name lookup from allResults keys
  const nameLookup = useMemo(() => {
    if (!allResults) return {};
    const m = {};
    Object.keys(allResults).forEach(k => { m[k.toLowerCase()] = k; });
    return m;
  }, [allResults]);

  // Also build AC_NO → canonical name from data.byYear[2021] for reliable linking
  const acNoToName = useMemo(() => {
    if (!data) return {};
    const m = {};
    (data.byYear?.[2021] ?? []).forEach(r => {
      if (r.constituency_no != null && r.name) m[r.constituency_no] = r.name;
    });
    return m;
  }, [data]);

  // Project constituency shapes with alliance metadata
  const shapes = useMemo(() => {
    if (!geoJson || !allResults) return [];
    return projectFeatures(geoJson.features, f => {
      const acNo = f.properties.AC_NO;
      const acName = f.properties.AC_NAME ?? '';
      // Try AC_NO → name from 2021 data first (most reliable)
      let canonicalName = acNoToName[acNo];
      // Fall back to case-insensitive match against allResults keys
      if (!canonicalName) canonicalName = nameLookup[acName.toLowerCase()] ?? acName;
      const resultData = allResults[canonicalName];
      const live = resultData?._live;
      const leader = resultData?.candidates?.[0];
      // Use live data alliance if available, else nomination alliance
      const alliance = live?.leading_alliance ?? leader?.alliance ?? null;
      const party = live?.leading_party ?? leader?.party ?? null;
      const status = live?.status ?? 'awaiting';
      const margin = live?.margin ?? 0;
      return {
        acNo,
        name: canonicalName,
        alliance,
        party,
        status,
        margin,
        candidateCount: resultData?.candidates?.length ?? 0,
      };
    });
  }, [geoJson, allResults, acNoToName, nameLookup]);

  // Alliance counts for legend
  const allianceCounts = useMemo(() => {
    const c = {};
    shapes.forEach(s => { if (s.alliance) c[s.alliance] = (c[s.alliance] || 0) + 1; });
    return c;
  }, [shapes]);

  const activeShape = useMemo(
    () => shapes.find(s => s.name === (selected ?? hovered)) ?? null,
    [shapes, selected, hovered]
  );
  const activeResult = activeShape ? allResults?.[activeShape.name] : null;
  const activeLive = activeResult?._live;

  if (liveLoading || dataLoading || mapLoading) return <LoadingSpinner />;
  if (!allResults) return <div style={{ color: '#f87171', padding: 32 }}>Failed to load live data.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <LiveTabBar />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="h2">Live Map — 2026</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-subtle)' }}>
            <RefreshCw size={11} />
            {secsAgo(lastUpdated?.getTime())}
          </div>
        </div>

        {/* Data notice */}
        {!hasLiveData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <CalendarClock size={15} style={{ color: '#818cf8', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#818cf8', fontWeight: 600 }}>
              Results will appear here on election day · Map shows 2026 nomination alliances
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="card" style={{ padding: '12px 16px' }}>
          <MapLegend allianceCounts={allianceCounts} allianceColors={allianceColors} />
        </div>

        {/* Main: map + detail */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }} id="lmap-main">
          <style>{`@media(max-width:900px){#lmap-main{flex-direction:column}}`}</style>

          {/* SVG Map */}
          <div className="card" style={{ flex: 1, minWidth: 0, padding: 16 }}>
            <svg
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              style={{ width: '100%', height: 'auto', maxHeight: '72vh', display: 'block' }}>
              <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx="16" fill="#020617" />
              <g>
                {shapes.map(s => {
                  const fill = s.alliance ? (`${allianceColors[s.alliance] ?? '#607d8b'}cc`) : '#1a2540';
                  const isActive = s.name === (selected ?? hovered);
                  const stroke = isActive ? '#f8fafc' : '#0a0f1e';
                  return (
                    <path
                      key={s.acNo ?? s.name}
                      d={s.path}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isActive ? 2.5 : 0.6}
                      style={{ cursor: 'pointer', transition: 'fill 0.12s, stroke 0.12s' }}
                      onMouseEnter={() => setHovered(s.name)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setSelected(prev => prev === s.name ? null : s.name)}
                    />
                  );
                })}
              </g>
            </svg>
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Info size={10} /> {hasLiveData ? 'Coloured by leading alliance · Click any constituency for details' : 'Coloured by nominated alliance · Click any constituency for details'}
            </p>
          </div>

          {/* Detail panel */}
          <div style={{ width: 280, flexShrink: 0, position: 'sticky', top: 80 }}>
            {activeShape ? (
              <motion.div
                key={activeShape.name}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                className="card"
                style={{
                  padding: '18px 20px',
                  borderLeft: `3px solid ${activeShape.alliance ? (allianceColors[activeShape.alliance] ?? '#607d8b') : '#334155'}`,
                }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>{activeShape.name}</h3>

                {activeShape.alliance && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: allianceColors[activeShape.alliance] ?? '#607d8b' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: allianceColors[activeShape.alliance] ?? '#607d8b' }}>
                      {activeShape.alliance}
                    </span>
                    {activeShape.party && (
                      <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>· {activeShape.party}</span>
                    )}
                  </div>
                )}

                {hasLiveData && activeLive && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Radio size={12} style={{ color: activeLive.status === 'declared' ? '#34d399' : '#fbbf24' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: activeLive.status === 'declared' ? '#34d399' : '#fbbf24', textTransform: 'capitalize' }}>
                        {activeLive.status}
                      </span>
                      {activeLive.margin > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>· Margin: +{activeLive.margin.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    {activeLive.leading_candidate && (
                      <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
                        Leading: {activeLive.leading_candidate} ({activeLive.leading_party})
                      </p>
                    )}
                    {activeLive.round && (
                      <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>Round {activeLive.round}</p>
                    )}
                  </div>
                )}

                <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 14 }}>
                  {activeShape.candidateCount} candidates nominated
                </p>

                {!hasLiveData && (
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 14, textAlign: 'center' }}>
                    <CalendarClock size={16} style={{ color: '#818cf8', margin: '0 auto 6px' }} />
                    <p style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>Results on election day</p>
                  </div>
                )}

                <Link to={`${basePath}/${slugify(activeShape.name)}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div
                    style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#818cf8', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                  >
                    {hasLiveData ? 'View Live Results →' : 'View Nominations →'}
                  </div>
                </Link>
              </motion.div>
            ) : (
              <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
                <Info size={24} style={{ color: 'var(--text-subtle)', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Click any constituency on the map to see details</p>
              </div>
            )}

            {/* Alliance nomination counts */}
            <div className="card" style={{ padding: '16px 20px', marginTop: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>{hasLiveData ? 'Live Results' : 'Nominations'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ALLIANCES_ORDER.filter(a => allianceCounts[a]).map(a => {
                  const color = allianceColors[a] ?? '#607d8b';
                  const count = allianceCounts[a] ?? 0;
                  const pct = shapes.length ? (count / shapes.length) * 100 : 0;
                  return (
                    <div key={a}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-subtle)', flex: 1 }}>{a}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color }}>{count}</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 99, background: '#1e293b', overflow: 'hidden', marginLeft: 16 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `${color}88`, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 10, borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                {shapes.length} total constituencies
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
