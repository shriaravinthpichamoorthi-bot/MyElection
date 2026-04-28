import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPinned } from 'lucide-react';
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
  Kanyakumari: 'Kanniyakumari',
  Nilgiris: 'The Nilgiris',
  Thoothukkudi: 'Thoothukudi',
  Sivagangai: 'Sivaganga',
  Kanchipuram: 'Kancheepuram',
  Tirupattur: 'Tirupathur',
};

function normalizeGeoDistrict(name) {
  return DISTRICT_NAME_MAP[name] || name;
}

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
    const x = offsetX + (lon - minLon) * scale;
    const y = offsetY + (maxLat - lat) * scale;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  }

  return features.map((feature) => {
    const polygons = flattenCoordinates(feature.geometry);
    const segments = [];
    let centroidSumX = 0;
    let centroidSumY = 0;
    let centroidPoints = 0;

    polygons.forEach((ring) => {
      if (!ring.length) return;
      const projected = ring.map(project);
      projected.forEach(([x, y]) => {
        centroidSumX += x;
        centroidSumY += y;
        centroidPoints += 1;
      });

      const [startX, startY] = projected[0];
      const commands = [`M ${startX} ${startY}`];
      for (let index = 1; index < projected.length; index += 1) {
        const [x, y] = projected[index];
        commands.push(`L ${x} ${y}`);
      }
      commands.push('Z');
      segments.push(commands.join(' '));
    });

    return {
      path: segments.join(' '),
      centroid: centroidPoints ? [centroidSumX / centroidPoints, centroidSumY / centroidPoints] : [0, 0],
      ...getMeta(feature),
    };
  });
}

function getTurnoutColor(value) {
  if (value >= 80) return '#10b981';
  if (value >= 70) return '#f59e0b';
  if (value >= 60) return '#f97316';
  return '#ef4444';
}

function getRegionColor(record, mode, partyColors, allianceColors) {
  if (!record) return '#1e293b';
  if (mode === 'party') return partyColor(record.winner_party, partyColors);
  if (mode === 'alliance') return allianceColor(record.winner_alliance, allianceColors);
  return getTurnoutColor(record.turnout_pct || 0);
}

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
      fetch('/tamil-nadu-districts.geojson').then((response) => response.json()),
      fetch('/tamil-nadu-assembly-constituencies.geojson').then((response) => response.json()),
    ])
      .then(([districtsMap, constituenciesMap]) => {
        if (cancelled) return;
        setDistrictGeoJson(districtsMap);
        setConstituencyGeoJson(constituenciesMap);
      })
      .catch(() => {
        if (cancelled) return;
        setDistrictGeoJson({ features: [] });
        setConstituencyGeoJson({ features: [] });
      })
      .finally(() => {
        if (!cancelled) setMapLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
      if (!recs.length) {
        stats[district] = null;
        return;
      }

      const partyWins = {};
      const allianceWins = {};
      recs.forEach((record) => {
        if (record.winner_party) partyWins[record.winner_party] = (partyWins[record.winner_party] || 0) + 1;
        if (record.winner_alliance) allianceWins[record.winner_alliance] = (allianceWins[record.winner_alliance] || 0) + 1;
      });

      const topParty = Object.entries(partyWins).sort((a, b) => b[1] - a[1])[0];
      const topAlliance = Object.entries(allianceWins).sort((a, b) => b[1] - a[1])[0];
      const avgTurnout = recs.reduce((sum, record) => sum + (record.turnout_pct || 0), 0) / recs.length;

      stats[district] = {
        district,
        turnout_pct: Number(avgTurnout.toFixed(1)),
        winner_party: topParty?.[0] || null,
        winner_alliance: topAlliance?.[0] || null,
        winner_count: topParty?.[1] || 0,
        alliance_count: topAlliance?.[1] || 0,
        totalSeats: recs.length,
      };
    });
    return stats;
  }, [byDistrictYear, districts, selYear]);

  const yearRecords = byYear[selYear] || EMPTY_ARRAY;
  const constituencyByNumber = useMemo(
    () => new Map(yearRecords.map((record) => [record.constituency_no, record])),
    [yearRecords]
  );

  const districtMapShapes = useMemo(
    () =>
      projectFeatures(districtGeoJson?.features || EMPTY_ARRAY, (feature) => ({
        district: normalizeGeoDistrict(feature.properties.district),
      })),
    [districtGeoJson]
  );

  const constituencyShapes = useMemo(
    () =>
      projectFeatures(constituencyGeoJson?.features || EMPTY_ARRAY, (feature) => {
        const number = feature.properties.AC_NO;
        const record = constituencyByNumber.get(number) || null;
        return {
          number,
          name: record?.name || feature.properties.AC_NAME,
          district: record?.district || normalizeGeoDistrict(feature.properties.DIST_NAME),
          record,
          geometry: feature.geometry,
        };
      }),
    [constituencyGeoJson, constituencyByNumber]
  );

  const canDrillToConstituencies = selYear >= 2011;
  const activeMapLevel = selectedDistrict && canDrillToConstituencies ? 'constituency' : 'district';

  const filteredDistricts = useMemo(
    () => districts.filter((district) => district.toLowerCase().includes(query.toLowerCase())),
    [districts, query]
  );

  const visibleConstituencySource = useMemo(() => {
    if (activeMapLevel !== 'constituency') return EMPTY_ARRAY;
    return constituencyShapes.filter((shape) => {
      if (shape.district !== selectedDistrict) return false;
      if (!query.trim()) return true;
      return shape.name.toLowerCase().includes(query.toLowerCase());
    });
  }, [activeMapLevel, constituencyShapes, query, selectedDistrict]);

  const visibleConstituencies = useMemo(
    () =>
      projectFeatures(visibleConstituencySource, (shape) => ({
        number: shape.number,
        name: shape.name,
        district: shape.district,
        record: shape.record,
      })),
    [visibleConstituencySource]
  );

  const activeDistrict = selectedDistrict || hoveredDistrict || filteredDistricts[0] || null;
  const activeDistrictStats = activeDistrict ? districtStats[activeDistrict] : null;

  const activeConstituency =
    activeMapLevel === 'constituency'
      ? hoveredConstituency ||
        (selectedConstituency && visibleConstituencies.some((shape) => shape.number === selectedConstituency) ? selectedConstituency : null) ||
        visibleConstituencies[0]?.number ||
        null
      : null;

  const activeConstituencyShape =
    activeConstituency != null ? visibleConstituencies.find((shape) => shape.number === activeConstituency) || null : null;
  const activeConstituencyRecord = activeConstituencyShape?.record || null;

  const districtLegendCounts = useMemo(() => {
    const counts = {};
    Object.values(districtStats)
      .filter(Boolean)
      .forEach((stats) => {
        const key = mode === 'party' ? stats.winner_party : stats.winner_alliance;
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [districtStats, mode]);

  const constituencyLegendCounts = useMemo(() => {
    const counts = {};
    visibleConstituencies.forEach((shape) => {
      const record = shape.record;
      if (!record) return;
      const key = mode === 'party' ? record.winner_party : record.winner_alliance;
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [mode, visibleConstituencies]);

  const missingMapDistricts = useMemo(() => {
    const availableDistricts = new Set(districtMapShapes.map((shape) => shape.district));
    return districts.filter((district) => !availableDistricts.has(district));
  }, [districtMapShapes, districts]);

  if (loading || mapLoading) return <LoadingSpinner />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-slate-900 p-6 text-sm text-slate-300">
        Unable to load map data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {activeMapLevel === 'district' ? 'Tamil Nadu District Map' : `${selectedDistrict} Constituency Map`}
        </h1>
        <p className="text-sm text-slate-400">
          {activeMapLevel === 'district'
            ? 'Click a district to drill into real constituency polygons for post-2008 election years.'
            : `Constituency drilldown for ${selectedDistrict}.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {YEARS.map((year) => (
            <button
              key={year}
              onClick={() => {
                setSelYear(year);
                setHoveredConstituency(null);
                setSelectedConstituency(null);
              }}
              className={`rounded px-3 py-1.5 text-sm ${selYear === year ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              {year}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['party', 'Party'],
            ['alliance', 'Alliance'],
            ['turnout', 'Turnout'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`rounded px-3 py-1.5 text-sm ${mode === value ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">{activeMapLevel === 'district' ? 'District View' : 'Constituency View'}</h2>
              <p className="text-xs text-slate-500">
                {activeMapLevel === 'district'
                  ? 'Hover or click a district to inspect it.'
                  : 'Hover or click a constituency to inspect it.'}
              </p>
            </div>
            {activeMapLevel === 'constituency' ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrict(null);
                  setHoveredDistrict(null);
                  setSelectedConstituency(null);
                  setHoveredConstituency(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back To Districts
              </button>
            ) : (
              <p className="text-right text-xs text-slate-500">
                {mode === 'party' ? 'Leading party' : mode === 'alliance' ? 'Leading alliance' : 'Average turnout'}
              </p>
            )}
          </div>

          {!canDrillToConstituencies && selectedDistrict ? (
            <div className="rounded-lg border border-amber-800/70 bg-amber-950/30 p-4 text-sm text-amber-200">
              Constituency drilldown is available from 2011 onward. The 2001 and 2006 results use pre-delimitation constituency boundaries.
            </div>
          ) : null}

          <div className="mx-auto w-full max-w-[640px]">
            <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-auto max-h-[68vh] w-full">
              <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx="20" fill="#020617" />
              <g>
                {activeMapLevel === 'district'
                  ? districtMapShapes.map((shape) => {
                      const isActive = shape.district === activeDistrict;
                      return (
                        <path
                          key={shape.district}
                          d={shape.path}
                          fill={getRegionColor(districtStats[shape.district], mode, partyColors, allianceColors)}
                          stroke={isActive ? '#f8fafc' : '#0f172a'}
                          strokeWidth={isActive ? 3 : 1.2}
                          className="cursor-pointer transition-all duration-150"
                          onMouseEnter={() => setHoveredDistrict(shape.district)}
                          onMouseLeave={() => setHoveredDistrict(null)}
                          onClick={() => {
                            setSelectedDistrict(shape.district);
                            setSelectedConstituency(null);
                            setHoveredConstituency(null);
                          }}
                        />
                      );
                    })
                  : visibleConstituencies.map((shape) => {
                      const isActive = shape.number === activeConstituency;
                      return (
                        <path
                          key={shape.number}
                          d={shape.path}
                          fill={getRegionColor(shape.record, mode, partyColors, allianceColors)}
                          stroke={isActive ? '#f8fafc' : '#0f172a'}
                          strokeWidth={isActive ? 2.5 : 0.9}
                          className="cursor-pointer transition-all duration-150"
                          onMouseEnter={() => setHoveredConstituency(shape.number)}
                          onMouseLeave={() => setHoveredConstituency(null)}
                          onClick={() => setSelectedConstituency(shape.number)}
                        />
                      );
                    })}
              </g>
            </svg>
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            {activeMapLevel === 'district'
              ? 'District click drills into constituency polygons for the current district.'
              : 'Constituency polygons are joined by constituency number, not by display name.'}
          </p>
        </section>

        <section className="space-y-4 xl:sticky xl:top-20">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (activeMapLevel === 'district') {
                  setSelectedDistrict(null);
                } else {
                  setSelectedConstituency(null);
                }
              }}
              placeholder={activeMapLevel === 'district' ? 'Filter district' : 'Filter constituency'}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">Legend</h3>
            {mode === 'turnout' ? (
              <div className="space-y-2">
                {[
                  ['>=80%', '#10b981'],
                  ['70-79%', '#f59e0b'],
                  ['60-69%', '#f97316'],
                  ['<60%', '#ef4444'],
                ].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                    <span className="text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(activeMapLevel === 'district' ? districtLegendCounts : constituencyLegendCounts).map(([name, count]) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: mode === 'party' ? partyColor(name, partyColors) : allianceColor(name, allianceColors) }}
                    />
                    <span className="flex-1 truncate text-slate-300">{name}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            {activeMapLevel === 'district' ? (
              activeDistrictStats ? (
                <>
                  <h3 className="mb-1 text-lg font-bold text-white">{activeDistrict}</h3>
                  <p className="mb-4 text-xs text-slate-400">{selYear} district summary</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-400">Total Seats</p>
                      <p className="text-xl font-bold text-white">{activeDistrictStats.totalSeats}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Leading Party</p>
                      <p className="text-sm font-semibold" style={{ color: partyColor(activeDistrictStats.winner_party, partyColors) }}>
                        {activeDistrictStats.winner_party} ({activeDistrictStats.winner_count} seats)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Leading Alliance</p>
                      <p className="text-sm font-semibold" style={{ color: allianceColor(activeDistrictStats.winner_alliance, allianceColors) }}>
                        {activeDistrictStats.winner_alliance} ({activeDistrictStats.alliance_count} seats)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Avg Turnout</p>
                      <p className="text-lg font-bold text-blue-400">{activeDistrictStats.turnout_pct}%</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeDistrict || !canDrillToConstituencies) return;
                        setSelectedDistrict(activeDistrict);
                        setSelectedConstituency(null);
                      }}
                      disabled={!activeDistrict || !canDrillToConstituencies}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      Drill Into Constituencies
                    </button>
                    <Link
                      to={`/district/${slugify(activeDistrict)}?year=${selYear}`}
                      className="block rounded-lg border border-slate-700 px-3 py-2 text-center text-xs text-slate-200 hover:bg-slate-800"
                    >
                      View Full District
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">No district data available for this selection.</p>
              )
            ) : activeConstituencyRecord ? (
              <>
                <h3 className="mb-1 text-lg font-bold text-white">{activeConstituencyRecord.name}</h3>
                <p className="mb-4 text-xs text-slate-400">{selectedDistrict} - {selYear} constituency result</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400">Winner</p>
                    <p className="text-sm font-semibold text-white">{activeConstituencyRecord.winner_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Winning Party</p>
                    <p className="text-sm font-semibold" style={{ color: partyColor(activeConstituencyRecord.winner_party, partyColors) }}>
                      {activeConstituencyRecord.winner_party}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Alliance</p>
                    <p className="text-sm font-semibold" style={{ color: allianceColor(activeConstituencyRecord.winner_alliance, allianceColors) }}>
                      {activeConstituencyRecord.winner_alliance}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Turnout</p>
                      <p className="text-lg font-bold text-blue-400">{activeConstituencyRecord.turnout_pct?.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Margin</p>
                      <p className="text-lg font-bold text-white">
                        {activeConstituencyRecord.margin_pct != null ? `${activeConstituencyRecord.margin_pct.toFixed(1)}%` : 'NA'}
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  to={`/constituency/${slugify(activeConstituencyRecord.name)}?year=${selYear}`}
                  className="mt-4 block rounded-lg bg-blue-600 px-3 py-2 text-center text-xs text-white hover:bg-blue-700"
                >
                  View Constituency Detail
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-400">No constituency data available for this district in the selected year.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">
              <span className="inline-flex items-center gap-2">
                {activeMapLevel === 'district' ? <MapPinned className="h-4 w-4 text-slate-400" /> : <Building2 className="h-4 w-4 text-slate-400" />}
                <span>{activeMapLevel === 'district' ? 'Districts' : `${selectedDistrict} Constituencies`}</span>
              </span>
            </h3>
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {activeMapLevel === 'district'
                ? filteredDistricts.map((district) => {
                    const stats = districtStats[district];
                    const isActive = district === activeDistrict;
                    return (
                      <button
                        key={district}
                        type="button"
                        onClick={() => {
                          setSelectedDistrict(district);
                          setSelectedConstituency(null);
                        }}
                        className={`flex w-full items-center gap-2 rounded p-2 text-left text-xs transition-colors ${
                          isActive ? 'bg-slate-800 ring-1 ring-blue-700' : 'hover:bg-slate-800'
                        }`}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: getRegionColor(stats, mode, partyColors, allianceColors) }} />
                        <span className="flex-1 text-slate-200">{district}</span>
                        {stats ? <span className="text-slate-500">{stats.turnout_pct}%</span> : <span className="text-slate-600">No data</span>}
                      </button>
                    );
                  })
                : visibleConstituencies.map((shape) => {
                    const isActive = shape.number === activeConstituency;
                    return (
                      <button
                        key={shape.number}
                        type="button"
                        onClick={() => setSelectedConstituency(shape.number)}
                        className={`flex w-full items-center gap-2 rounded p-2 text-left text-xs transition-colors ${
                          isActive ? 'bg-slate-800 ring-1 ring-blue-700' : 'hover:bg-slate-800'
                        }`}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: getRegionColor(shape.record, mode, partyColors, allianceColors) }} />
                        <span className="flex-1 text-slate-200">{shape.name}</span>
                        {shape.record ? <span className="text-slate-500">{shape.record.turnout_pct?.toFixed(1)}%</span> : <span className="text-slate-600">No data</span>}
                      </button>
                    );
                  })}
            </div>
          </div>

          {activeMapLevel === 'district' ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-300">Districts Not In Boundary File</h3>
              {missingMapDistricts.length ? (
                <div className="space-y-1 text-xs text-slate-400">
                  {missingMapDistricts.map((district) => (
                    <p key={district}>{district}</p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">All districts are represented.</p>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
