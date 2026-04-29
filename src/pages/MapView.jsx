import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Building2, MapPinned, Map as MapIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { allianceColor, partyColor, slugify } from '../utils/helpers';

const YEARS = [2001, 2006, 2011, 2016, 2021, 2026];
const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 920;
const MAP_PADDING = 36;
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

const DISTRICT_NAME_MAP = {
  Kanyakumari: 'Kanniyakumari', Nilgiris: 'The Nilgiris',
  Thoothukkudi: 'Thoothukudi', Sivagangai: 'Sivaganga',
  Kanchipuram: 'Kancheepuram', Tirupattur: 'Tirupathur',
};

function normalizeGeoDistrict(name) { return DISTRICT_NAME_MAP[name] || name; }

function flattenCoordinates(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

function projectFeatures(features, getMeta) {
  const points = [];
  features.forEach((feature) => {
    flattenCoordinates(feature.geometry).forEach((ring) => {
      ring.forEach(([lon, lat]) => points.push([lon, lat]));
    });
  });
  if (!points.length) return [];

  const minLon = Math.min(...points.map(([lon]) => lon));
  const maxLon = Math.max(...points.map(([lon]) => lon));
  const minLat = Math.min(...points.map(([, lat]) => lat));
  const maxLat = Math.max(...points.map(([, lat]) => lat));
  const usableWidth = VIEWBOX_WIDTH - MAP_PADDING * 2;
  const usableHeight = VIEWBOX_HEIGHT - MAP_PADDING * 2;
  const scale = Math.min(usableWidth / (maxLon - minLon), usableHeight / (maxLat - minLat));
  const projectedWidth = (maxLon - minLon) * scale;
  const projectedHeight = (maxLat - minLat) * scale;
  const offsetX = (VIEWBOX_WIDTH - projectedWidth) / 2;
  const offsetY = (VIEWBOX_HEIGHT - projectedHeight) / 2;

  function project([lon, lat]) {
    return [
      Number((offsetX + (lon - minLon) * scale).toFixed(2)),
      Number((offsetY + (maxLat - lat) * scale).toFixed(2)),
    ];
  }

  return features.map((feature) => {
    const polygons = flattenCoordinates(feature.geometry);
    const segments = [];
    let cx = 0, cy = 0, cp = 0;
    polygons.forEach((ring) => {
      if (!ring.length) return;
      const projected = ring.map(project);
      projected.forEach(([x, y]) => { cx += x; cy += y; cp += 1; });
      const [sx, sy] = projected[0];
      const cmds = [`M ${sx} ${sy}`];
      for (let i = 1; i < projected.length; i++) {
        const [x, y] = projected[i];
        cmds.push(`L ${x} ${y}`);
      }
      cmds.push('Z');
      segments.push(cmds.join(' '));
    });
    return { path: segments.join(' '), centroid: cp ? [cx / cp, cy / cp] : [0, 0], ...getMeta(feature) };
  });
}

function getTurnoutColor(value) {
  if (value >= 80) return '#34d399';
  if (value >= 70) return '#fbbf24';
  if (value >= 60) return '#fb923c';
  return '#f87171';
}

function getRegionColor(record, mode, partyColors, allianceColors) {
  if (!record) return '#1e293b';
  if (mode === 'party') return partyColor(record.winner_party, partyColors);
  if (mode === 'alliance') return allianceColor(record.winner_alliance, allianceColors);
  return getTurnoutColor(record.turnout_pct || 0);
}

const selectStyle = {
  background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10,
  color: '#e2e8f0', fontSize: 12, padding: '6px 10px', outline: 'none',
  cursor: 'pointer', fontFamily: 'inherit',
};

export default function MapView() {
  const { data, loading, error } = useData();
  const [districtGeoJson, setDistrictGeoJson] = useState(null);
  const [constituencyGeoJson, setConstituencyGeoJson] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [selYear, setSelYear] = useState(2021);
  const [mode, setMode] = useState('party');
  const [query, setQuery] = useState('');
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [hoveredConstituency, setHoveredConstituency] = useState(null);
  const [selectedConstituency, setSelectedConstituency] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/tamil-nadu-districts.geojson').then(r => r.json()),
      fetch('/tamil-nadu-assembly-constituencies.geojson').then(r => r.json()),
    ])
      .then(([distMap, constMap]) => {
        if (cancelled) return;
        setDistrictGeoJson(distMap);
        setConstituencyGeoJson(constMap);
      })
      .catch(() => {
        if (cancelled) return;
        setDistrictGeoJson({ features: [] });
        setConstituencyGeoJson({ features: [] });
      })
      .finally(() => { if (!cancelled) setMapLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const byDistrictYear = data?.byDistrictYear || EMPTY_OBJECT;
  const byYear = data?.byYear || EMPTY_OBJECT;
  const districts = data?.districts || EMPTY_ARRAY;
  const partyColors = data?.partyColors || EMPTY_OBJECT;
  const allianceColors = data?.allianceColors || EMPTY_OBJECT;

  const districtStats = useMemo(() => {
    const stats = {};
    districts.forEach((district) => {
      const recs = byDistrictYear[`${district}||${selYear}`] || EMPTY_ARRAY;
      if (!recs.length) { stats[district] = null; return; }
      const pw = {}, aw = {};
      recs.forEach(r => {
        if (r.winner_party) pw[r.winner_party] = (pw[r.winner_party] || 0) + 1;
        if (r.winner_alliance) aw[r.winner_alliance] = (aw[r.winner_alliance] || 0) + 1;
      });
      const topParty = Object.entries(pw).sort((a, b) => b[1] - a[1])[0];
      const topAlliance = Object.entries(aw).sort((a, b) => b[1] - a[1])[0];
      const avgTurnout = recs.reduce((s, r) => s + (r.turnout_pct || 0), 0) / recs.length;
      stats[district] = {
        district, turnout_pct: +avgTurnout.toFixed(1),
        winner_party: topParty?.[0] || null, winner_alliance: topAlliance?.[0] || null,
        winner_count: topParty?.[1] || 0, alliance_count: topAlliance?.[1] || 0,
        totalSeats: recs.length,
      };
    });
    return stats;
  }, [byDistrictYear, districts, selYear]);

  const yearRecords = byYear[selYear] || EMPTY_ARRAY;
  const constituencyByNumber = useMemo(
    () => new Map(yearRecords.map(r => [r.constituency_no, r])),
    [yearRecords]
  );

  const districtMapShapes = useMemo(
    () => projectFeatures(districtGeoJson?.features || EMPTY_ARRAY, (f) => ({
      district: normalizeGeoDistrict(f.properties.district),
    })),
    [districtGeoJson]
  );

  const constituencyShapes = useMemo(
    () => projectFeatures(constituencyGeoJson?.features || EMPTY_ARRAY, (f) => {
      const number = f.properties.AC_NO;
      const record = constituencyByNumber.get(number) || null;
      return {
        number, name: record?.name || f.properties.AC_NAME,
        district: record?.district || normalizeGeoDistrict(f.properties.DIST_NAME),
        record, geometry: f.geometry,
      };
    }),
    [constituencyGeoJson, constituencyByNumber]
  );

  const canDrill = selYear >= 2011;
  const activeLevel = selectedDistrict && canDrill ? 'constituency' : 'district';

  const filteredDistricts = useMemo(
    () => districts.filter(d => d.toLowerCase().includes(query.toLowerCase())),
    [districts, query]
  );

  const visibleConstituencySource = useMemo(() => {
    if (activeLevel !== 'constituency') return EMPTY_ARRAY;
    return constituencyShapes.filter(s => {
      if (s.district !== selectedDistrict) return false;
      if (!query.trim()) return true;
      return s.name.toLowerCase().includes(query.toLowerCase());
    });
  }, [activeLevel, constituencyShapes, query, selectedDistrict]);

  const visibleConstituencies = useMemo(
    () => projectFeatures(visibleConstituencySource, s => ({
      number: s.number, name: s.name, district: s.district, record: s.record,
    })),
    [visibleConstituencySource]
  );

  const activeDistrict = selectedDistrict || hoveredDistrict || filteredDistricts[0] || null;
  const activeDistrictStats = activeDistrict ? districtStats[activeDistrict] : null;
  const activeConstituency = activeLevel === 'constituency'
    ? hoveredConstituency
      || (selectedConstituency && visibleConstituencies.some(s => s.number === selectedConstituency) ? selectedConstituency : null)
      || visibleConstituencies[0]?.number || null
    : null;
  const activeConstShape = activeConstituency != null ? visibleConstituencies.find(s => s.number === activeConstituency) || null : null;
  const activeConstRecord = activeConstShape?.record || null;

  const legendCounts = useMemo(() => {
    const counts = {};
    if (activeLevel === 'district') {
      Object.values(districtStats).filter(Boolean).forEach(s => {
        const k = mode === 'party' ? s.winner_party : s.winner_alliance;
        if (k) counts[k] = (counts[k] || 0) + 1;
      });
    } else {
      visibleConstituencies.forEach(s => {
        if (!s.record) return;
        const k = mode === 'party' ? s.record.winner_party : s.record.winner_alliance;
        if (k) counts[k] = (counts[k] || 0) + 1;
      });
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [districtStats, visibleConstituencies, mode, activeLevel]);

  const missingDistricts = useMemo(() => {
    const avail = new Set(districtMapShapes.map(s => s.district));
    return districts.filter(d => !avail.has(d));
  }, [districtMapShapes, districts]);

  if (loading || mapLoading) return <LoadingSpinner />;
  if (error || !data) return <div className="card" style={{ padding: 24, color: '#f87171' }}>Unable to load map data.</div>;

  return (
    <div style={{ maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapIcon size={18} color="#818cf8" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc' }}>
              {activeLevel === 'district' ? 'Tamil Nadu Map' : `${selectedDistrict} — Constituencies`}
            </h1>
          </div>
          <p style={{ fontSize: 13, color: '#475569', paddingLeft: 48 }}>
            {activeLevel === 'district'
              ? 'Click a district to drill into constituency-level results'
              : `Showing constituency results for ${selectedDistrict}`}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {/* Year pills */}
          {YEARS.map(y => (
            <motion.button key={y} whileTap={{ scale: 0.94 }} onClick={() => { setSelYear(y); setHoveredConstituency(null); setSelectedConstituency(null); }}
              className={selYear === y ? 'pill-active' : 'pill-idle'}
              style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {y}{y === 2026 ? ' ★' : ''}
            </motion.button>
          ))}
          {/* Mode pills */}
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid #1e293b', marginLeft: 4 }}>
            {[['party', 'Party'], ['alliance', 'Alliance'], ['turnout', 'Turnout']].map(([val, lbl]) => (
              <button key={val} onClick={() => setMode(val)}
                style={{ padding: '7px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  background: mode === val ? 'rgba(99,102,241,0.2)' : '#0f172a',
                  color: mode === val ? '#818cf8' : '#475569', transition: 'all 0.12s' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gap: 16, alignItems: 'start' }} id="map-grid">
        <style>{`#map-grid{grid-template-columns:1fr}@media(min-width:1200px){#map-grid{grid-template-columns:1fr 340px}}`}</style>

        {/* SVG map panel */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{activeLevel === 'district' ? 'District View' : 'Constituency View'}</p>
              <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                {activeLevel === 'district' ? 'Hover or click a district to inspect it' : 'Hover or click a constituency to inspect it'}
              </p>
            </div>
            {activeLevel === 'constituency' ? (
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setSelectedDistrict(null); setHoveredDistrict(null); setSelectedConstituency(null); setHoveredConstituency(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#141e33', border: '1px solid #1e293b', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: 'inherit' }}>
                <ArrowLeft size={13} />
                Back to Districts
              </motion.button>
            ) : (
              <p style={{ fontSize: 12, color: '#334155' }}>
                {mode === 'party' ? 'Coloured by leading party' : mode === 'alliance' ? 'Coloured by leading alliance' : 'Coloured by avg turnout'}
              </p>
            )}
          </div>

          {!canDrill && selectedDistrict && (
            <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 12, color: '#fbbf24' }}>
              Constituency drilldown is available from 2011 onward. 2001 and 2006 results use pre-delimitation boundaries.
            </div>
          )}

          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} style={{ width: '100%', height: 'auto', maxHeight: '68vh', display: 'block' }}>
              <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx="16" fill="#020617" />
              <g>
                {activeLevel === 'district'
                  ? districtMapShapes.map(s => {
                      const isActive = s.district === activeDistrict;
                      return (
                        <path key={s.district} d={s.path}
                          fill={getRegionColor(districtStats[s.district], mode, partyColors, allianceColors)}
                          stroke={isActive ? '#f8fafc' : '#0f172a'}
                          strokeWidth={isActive ? 3 : 1.2}
                          style={{ cursor: 'pointer', transition: 'all 0.12s' }}
                          onMouseEnter={() => setHoveredDistrict(s.district)}
                          onMouseLeave={() => setHoveredDistrict(null)}
                          onClick={() => { setSelectedDistrict(s.district); setSelectedConstituency(null); setHoveredConstituency(null); }}
                        />
                      );
                    })
                  : visibleConstituencies.map(s => {
                      const isActive = s.number === activeConstituency;
                      return (
                        <path key={s.number} d={s.path}
                          fill={getRegionColor(s.record, mode, partyColors, allianceColors)}
                          stroke={isActive ? '#f8fafc' : '#0f172a'}
                          strokeWidth={isActive ? 2.5 : 0.9}
                          style={{ cursor: 'pointer', transition: 'all 0.12s' }}
                          onMouseEnter={() => setHoveredConstituency(s.number)}
                          onMouseLeave={() => setHoveredConstituency(null)}
                          onClick={() => setSelectedConstituency(s.number)}
                        />
                      );
                    })}
              </g>
            </svg>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 12 }}>
            {activeLevel === 'district'
              ? 'District click drills into constituency polygons (2011+)'
              : 'Constituencies joined by constituency number'}
          </p>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search */}
          <div className="card" style={{ padding: 14 }}>
            <input value={query}
              onChange={e => { setQuery(e.target.value); if (activeLevel === 'district') setSelectedDistrict(null); else setSelectedConstituency(null); }}
              placeholder={activeLevel === 'district' ? 'Filter district…' : 'Filter constituency…'}
              className="field" style={{ width: '100%' }} />
          </div>

          {/* Info panel */}
          <div className="card" style={{ padding: 18 }}>
            <AnimatePresence mode="wait">
              {activeLevel === 'district' ? (
                <motion.div key={activeDistrict || 'none'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {activeDistrictStats ? (
                    <>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', marginBottom: 2 }}>{activeDistrict}</p>
                      <p style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>{selYear} · district summary</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Total Seats', value: activeDistrictStats.totalSeats, color: '#818cf8' },
                          { label: 'Leading Party', value: `${activeDistrictStats.winner_party || '—'} (${activeDistrictStats.winner_count})`, color: partyColor(activeDistrictStats.winner_party, partyColors) },
                          { label: 'Leading Alliance', value: `${activeDistrictStats.winner_alliance || '—'} (${activeDistrictStats.alliance_count})`, color: allianceColor(activeDistrictStats.winner_alliance, allianceColors) },
                          { label: 'Avg Turnout', value: `${activeDistrictStats.turnout_pct}%`, color: '#60a5fa' },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color }}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                        <motion.button whileTap={{ scale: 0.96 }}
                          onClick={() => { if (!activeDistrict || !canDrill) return; setSelectedDistrict(activeDistrict); setSelectedConstituency(null); }}
                          disabled={!canDrill}
                          style={{ padding: '10px 0', borderRadius: 10, border: 'none', cursor: canDrill ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                            background: canDrill ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#1e293b',
                            color: canDrill ? '#fff' : '#334155', transition: 'all 0.15s' }}>
                          Drill Into Constituencies
                        </motion.button>
                        {activeDistrict && (
                          <Link to={`/district/${slugify(activeDistrict)}?year=${selYear}`}
                            style={{ display: 'block', padding: '9px 0', borderRadius: 10, border: '1px solid #1e293b', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#64748b', textDecoration: 'none', transition: 'all 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#64748b'; }}>
                            View Full District →
                          </Link>
                        )}
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: '#334155', fontStyle: 'italic' }}>
                      {activeDistrict ? `No data for ${activeDistrict} in ${selYear}` : 'Hover or click a district'}
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div key={activeConstituency || 'none'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {activeConstRecord ? (
                    <>
                      <p style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', marginBottom: 2 }}>{activeConstRecord.name}</p>
                      <p style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>{selectedDistrict} · {selYear}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Winner', value: activeConstRecord.winner_name || 'Pending', color: '#f8fafc' },
                          { label: 'Party', value: activeConstRecord.winner_party || '—', color: partyColor(activeConstRecord.winner_party, partyColors) },
                          { label: 'Alliance', value: activeConstRecord.winner_alliance || '—', color: allianceColor(activeConstRecord.winner_alliance, allianceColors) },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color }}>{value}</p>
                          </div>
                        ))}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            { label: 'Turnout', value: `${activeConstRecord.turnout_pct?.toFixed(1) || '—'}%`, color: '#60a5fa' },
                            { label: 'Margin', value: activeConstRecord.margin_pct != null ? `${activeConstRecord.margin_pct.toFixed(1)}%` : '—', color: '#fbbf24' },
                          ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: '#141e33', borderRadius: 10, padding: '10px 12px' }}>
                              <p style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>{label}</p>
                              <p style={{ fontSize: 18, fontWeight: 800, color }}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Link to={`/constituency/${slugify(activeConstRecord.name)}`}
                        style={{ display: 'block', marginTop: 16, padding: '10px 0', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
                        View Constituency Detail →
                      </Link>
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: '#334155', fontStyle: 'italic' }}>Hover or click a constituency</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Legend */}
          <div className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Legend</p>
            {mode === 'turnout' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['≥80%', '#34d399'], ['70–79%', '#fbbf24'], ['60–69%', '#fb923c'], ['<60%', '#f87171']].map(([label, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {legendCounts.map(([name, count]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: mode === 'party' ? partyColor(name, partyColors) : allianceColor(name, allianceColors), flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ fontSize: 12, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* District/Constituency list */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              {activeLevel === 'district'
                ? <MapPinned size={14} color="#475569" />
                : <Building2 size={14} color="#475569" />}
              <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeLevel === 'district' ? 'Districts' : `${selectedDistrict} Constituencies`}
              </p>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {activeLevel === 'district'
                ? filteredDistricts.map(district => {
                    const stats = districtStats[district];
                    const isActive = district === activeDistrict;
                    return (
                      <button key={district} onClick={() => { setSelectedDistrict(district); setSelectedConstituency(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent', transition: 'background 0.12s' }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: getRegionColor(stats, mode, partyColors, allianceColors), flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: isActive ? '#e2e8f0' : '#94a3b8' }}>{district}</span>
                        {stats
                          ? <span style={{ fontSize: 11, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{stats.turnout_pct}%</span>
                          : <span style={{ fontSize: 11, color: '#334155' }}>—</span>}
                      </button>
                    );
                  })
                : visibleConstituencies.map(s => {
                    const isActive = s.number === activeConstituency;
                    return (
                      <button key={s.number} onClick={() => setSelectedConstituency(s.number)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent', transition: 'background 0.12s' }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: getRegionColor(s.record, mode, partyColors, allianceColors), flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: isActive ? '#e2e8f0' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        {s.record
                          ? <span style={{ fontSize: 11, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{s.record.turnout_pct?.toFixed(1)}%</span>
                          : <span style={{ fontSize: 11, color: '#334155' }}>—</span>}
                      </button>
                    );
                  })}
            </div>
          </div>

          {activeLevel === 'district' && missingDistricts.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Not in boundary file</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {missingDistricts.map(d => <p key={d} style={{ fontSize: 12, color: '#334155' }}>{d}</p>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
