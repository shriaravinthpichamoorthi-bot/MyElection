import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, RefreshCw, CalendarClock, Radio } from 'lucide-react';
import { useLiveResults } from '../context/LiveResultsContext';
import { useLiveBasePath } from '../hooks/useLiveBasePath';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

function secsAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function StatusText({ status, margin }) {
  if (status === 'declared') {
    return <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Declared</span>;
  }
  if (status === 'counting') {
    return <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Counting</span>;
  }
  if (status === 'awaiting' || status == null) {
    return <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', background: '#1e293b', border: '1px solid #334155', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Awaiting</span>;
  }
  if (margin > 0) {
    return <span style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Leading</span>;
  }
  return <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', background: '#1e293b', border: '1px solid #334155', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Awaiting</span>;
}

function ConstituencyTableRow({ name, allResults, detailData, allianceColors, basePath, hasLiveData }) {
  const candidates = allResults?.[name]?.candidates ?? [];
  const live = allResults?.[name]?._live;
  const detail = detailData?.[name];

  // Prefer detail data for vote counts, fall back to summary live data
  const leadingVotes = detail?.leading_votes ?? live?.leading_votes ?? null;
  const trailingVotes = detail?.trailing_votes ?? live?.trailing_votes ?? null;
  const leadingCandidate = detail?.leading_candidate ?? live?.leading_candidate ?? null;
  const leadingParty = detail?.leading_party ?? live?.leading_party ?? null;
  const trailingCandidate = detail?.trailing_candidate ?? live?.trailing_candidate ?? null;
  const trailingParty = detail?.trailing_party ?? live?.trailing_party ?? null;
  const margin = detail?.margin ?? live?.margin ?? 0;
  const status = live?.status ?? 'awaiting';

  const leader = candidates[0];
  const hasLive = !!live;

  const allianceColor = live?.leading_alliance
    ? (allianceColors[live.leading_alliance] ?? '#607d8b')
    : (leader ? (allianceColors[leader.alliance] ?? '#607d8b') : null);

  return (
    <tr style={{ borderBottom: '1px solid #0f172a' }}>
      {/* Constituency — sticky */}
      <td style={{ padding: '11px 12px', verticalAlign: 'middle', position: 'sticky', left: 0, background: '#0a0f1e', zIndex: 1 }}>
        <Link to={`${basePath}/${slugify(name)}`}
          style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color 0.15s' }}
          className="constituency-link">
          {name}
        </Link>
      </td>

      {/* Status */}
      <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
        {hasLiveData ? (
          <StatusText status={status} margin={margin} />
        ) : (
          <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>Awaiting results</span>
        )}
      </td>

      {/* Leader (name + party + votes stacked) */}
      <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
        {leadingCandidate ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span title={leadingCandidate} style={{ color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140, display: 'block', fontSize: 12 }}>{leadingCandidate}</span>
              {leadingVotes != null && (
                <span style={{ fontSize: 11, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{leadingVotes.toLocaleString('en-IN')}</span>
              )}
            </div>
            {leadingParty && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: allianceColor, background: '#0f172a', border: `1px solid ${allianceColor}55`, whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{leadingParty}</span>
            )}
          </div>
        ) : (
          <span style={{ color: '#334155', fontSize: 12 }}>—</span>
        )}
      </td>

      {/* Runner-up (name + party + votes stacked) */}
      <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
        {trailingCandidate ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span title={trailingCandidate} style={{ color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140, display: 'block', fontSize: 12 }}>{trailingCandidate}</span>
              {trailingVotes != null && (
                <span style={{ fontSize: 11, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{trailingVotes.toLocaleString('en-IN')}</span>
              )}
            </div>
            {trailingParty && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: '#64748b', background: '#0f172a', border: '1px solid rgba(100,116,139,0.5)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{trailingParty}</span>
            )}
          </div>
        ) : (
          <span style={{ color: '#334155', fontSize: 12 }}>—</span>
        )}
      </td>

      {/* Margin */}
      <td style={{ padding: '11px 12px', verticalAlign: 'middle', textAlign: 'right', color: status === 'declared' ? '#34d399' : '#a5b4fc', fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 700 }}>
        {margin > 0 ? `+${margin.toLocaleString('en-IN')}` : <span style={{ color: '#334155', fontWeight: 400 }}>—</span>}
      </td>

      {/* Alliance */}
      <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
        {allianceColor ? (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            background: '#0f172a', color: allianceColor,
            border: `1px solid ${allianceColor}55`, whiteSpace: 'nowrap',
          }}>
            {live?.leading_alliance ?? leader?.alliance ?? '—'}
          </span>
        ) : <span style={{ color: '#334155', fontSize: 12 }}>—</span>}
      </td>
    </tr>
  );
}

function NominationsSummary({ constituencyNames, allResults, detailData, hasLiveData, allianceColors }) {
  const tally = useMemo(() => {
    const agg = {};
    constituencyNames.forEach(name => {
      const live = allResults?.[name]?._live;
      const leader = allResults?.[name]?.candidates?.[0];
      const alliance = hasLiveData
        ? (live?.leading_alliance ?? 'Others')
        : (leader?.alliance ?? 'Others');
      if (!agg[alliance]) agg[alliance] = { count: 0, color: allianceColors[alliance] ?? '#607d8b' };
      agg[alliance].count++;
    });
    return Object.entries(agg).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.count - a.count);
  }, [constituencyNames, allResults, hasLiveData, allianceColors]);

  if (!tally.length) return null;

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        {hasLiveData ? 'Live Results by Alliance' : 'Nominations by Alliance'}
      </p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {tally.map(e => (
          <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{e.name}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: e.color }}>{e.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LiveDistrictDetail() {
  const { slug } = useParams();
  const { loading: liveLoading, allResults, lastUpdated, liveMeta, allianceColors, districtMap, nameToIdMap, apiClient, apiError } = useLiveResults();
  const basePath = useLiveBasePath();
  const { data, loading: dataLoading } = useData();
  const [search, setSearch] = useState('');
  const [detailData, setDetailData] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);

  const hasLiveData = liveMeta && liveMeta.status !== 'awaiting';
  const isBiharMode = districtMap && Object.keys(districtMap).length > 0;

  // Resolve district and its constituencies
  const districtInfo = useMemo(() => {
    if (isBiharMode) {
      const districts = [...new Set(Object.values(districtMap))];
      const district = districts.find(d => slugify(d) === slug);
      if (!district) return null;
      const names = Object.entries(districtMap)
        .filter(([_, d]) => d === district)
        .map(([c, _]) => c)
        .sort();
      return { district, names };
    }
    if (!data) return null;
    const district = data.districts.find(d => slugify(d) === slug);
    if (!district) return null;
    const names = (data.byDistrictYear[`${district}||2026`] ?? []).map(r => r.name).sort();
    return { district, names };
  }, [slug, districtMap, data, isBiharMode]);

  // Fetch detail data for all constituencies in this district
  useEffect(() => {
    if (!districtInfo || !apiClient) return;
    if (!hasLiveData) return; // Only fetch details when live data is available

    const names = districtInfo.names;
    const missing = names.filter(name => {
      const live = allResults?.[name]?._live;
      return live && live.leading_votes == null;
    });
    if (missing.length === 0) return;

    let cancelled = false;
    async function fetchDetails() {
      setDetailLoading(true);
      const newDetails = {};
      const results = await Promise.allSettled(
        missing.map(async (name) => {
          const id = nameToIdMap?.[name];
          if (!id) return null;
          try {
            const detail = await apiClient.getConstituencyDetail(id);
            return { name, detail: detail?.constituency };
          } catch (e) {
            return null;
          }
        })
      );
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value?.detail && !cancelled) {
          newDetails[r.value.name] = r.value.detail;
        }
      });
      if (!cancelled) {
        setDetailData(prev => ({ ...prev, ...newDetails }));
        setDetailLoading(false);
      }
    }
    fetchDetails();
    return () => { cancelled = true; };
  }, [districtInfo, apiClient, hasLiveData, allResults, nameToIdMap]);

  if (liveLoading) return <LoadingSpinner variant="table" />;
  if (!isBiharMode && dataLoading) return <LoadingSpinner variant="table" />;
  if (!allResults) return <div style={{ color: '#f87171', padding: 32 }}>Failed to load.</div>;

  if (!districtInfo) return (
    <div style={{ padding: 32, color: '#f87171' }}>
      <Link to={`${basePath}/districts`} style={{ color: '#818cf8', textDecoration: 'none', marginBottom: 16, display: 'block' }}>
        ← Back to Districts
      </Link>
      District not found.
    </div>
  );

  const { district, names: allConstituencies } = districtInfo;
  const filtered = search
    ? allConstituencies.filter(n => n.toLowerCase().includes(search.toLowerCase()))
    : allConstituencies;

  // Compute district-level live stats
  let declaredCount = 0;
  let countingCount = 0;
  allConstituencies.forEach(name => {
    const status = allResults[name]?._live?.status;
    if (status === 'declared') declaredCount++;
    if (status === 'counting') countingCount++;
  });

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

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', marginBottom: 20 }}>
        <Link to={`${basePath}/districts`} style={{ color: '#818cf8', textDecoration: 'none', transition: 'color 0.15s' }}>
          Districts
        </Link>
        <span>/</span>
        <span style={{ color: '#f8fafc' }}>{district}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>{district}</h1>
            <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
              {allConstituencies.length} constituencies · {hasLiveData ? `${declaredCount} declared · ${countingCount} counting` : `${isBiharMode ? '2025' : '2026'} nominations`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569' }}>
            <RefreshCw size={11} />
            {secsAgo(lastUpdated?.getTime())}
          </div>
        </div>

        {/* Data notice */}
        {!hasLiveData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <CalendarClock size={16} style={{ color: '#818cf8', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#818cf8', fontWeight: 600 }}>
              Live results pending · Showing {isBiharMode ? '2025' : '2026'} nomination data
            </p>
          </div>
        )}

        {/* Live stats banner */}
        {hasLiveData && (declaredCount > 0 || countingCount > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <Radio size={16} style={{ color: '#34d399', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>
              {declaredCount} declared · {countingCount} counting · {allConstituencies.length - declaredCount - countingCount} awaiting
            </p>
          </div>
        )}

        {/* Summary */}
        <NominationsSummary constituencyNames={allConstituencies} allResults={allResults} detailData={detailData} hasLiveData={hasLiveData} allianceColors={allianceColors} />

        {/* Table */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Constituencies
            </h2>
            <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search constituency…"
                className="field" style={{ width: '100%', paddingLeft: 30, fontSize: 12, height: 34 }} />
            </div>
            {search && <span style={{ fontSize: 12, color: '#475569' }}>{filtered.length} of {allConstituencies.length}</span>}
            {detailLoading && <span style={{ fontSize: 11, color: '#475569' }}>Loading details…</span>}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0d1526', borderBottom: '1px solid #1e293b' }}>
                    {['Constituency', 'Status', 'Leader', 'Runner-up', 'Margin', 'Alliance'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Margin' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', position: h === 'Constituency' ? 'sticky' : undefined, left: h === 'Constituency' ? 0 : undefined, background: h === 'Constituency' ? '#0d1526' : undefined, zIndex: h === 'Constituency' ? 2 : undefined }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(name => (
                    <ConstituencyTableRow key={name} name={name} allResults={allResults} detailData={detailData} allianceColors={allianceColors} basePath={basePath} hasLiveData={hasLiveData} />
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px 0', textAlign: 'center', color: '#334155', fontSize: 13 }}>
                        No matching constituencies
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
