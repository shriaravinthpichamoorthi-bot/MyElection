import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, CalendarClock } from 'lucide-react';
import { useLiveResults } from '../context/LiveResultsContext';
import { useLiveBasePath } from '../hooks/useLiveBasePath';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

const SELECT_STYLE = {
  background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
  color: '#e2e8f0', fontSize: 14, padding: '6px 10px', outline: 'none',
  cursor: 'pointer', fontFamily: 'inherit',
};

function StatusBadge({ status, margin }) {
  if (status === 'declared') {
    return <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Declared</span>;
  }
  if (status === 'counting') {
    return <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Counting</span>;
  }
  if (status === 'awaiting' || status == null) {
    return <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#1e293b', border: '1px solid #334155', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Awaiting</span>;
  }
  if (margin > 0) {
    return <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Leading</span>;
  }
  return <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#1e293b', border: '1px solid #334155', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Awaiting</span>;
}

function useConstituencyRows(allResults, nameToDistrict) {
  return useMemo(() => {
    if (!allResults) return [];
    return Object.keys(allResults).sort().map(name => {
      const candidates = allResults[name]?.candidates ?? [];
      const live = allResults[name]?._live;
      const leader = candidates[0] ?? null;
      const allAlliances = [...new Set(candidates.map(c => c.alliance).filter(Boolean))];
      const allParties = [...new Set(candidates.map(c => c.party).filter(Boolean))];
      return {
        name,
        district: nameToDistrict[name] ?? '—',
        leaderName: live?.leading_candidate ?? leader?.name ?? null,
        leaderParty: live?.leading_party ?? leader?.party ?? null,
        leaderAlliance: live?.leading_alliance ?? leader?.alliance ?? null,
        leaderVotes: live?.leading_votes ?? null,
        trailingName: live?.trailing_candidate ?? null,
        trailingParty: live?.trailing_party ?? null,
        trailingVotes: live?.trailing_votes ?? null,
        liveAlliance: live?.leading_alliance ?? null,
        allAlliances,
        allParties,
        candidateCount: candidates.length,
        status: live?.status ?? 'awaiting',
        margin: live?.margin ?? 0,
        round: live?.round ?? null,
        totalRounds: live?.total_rounds ?? null,
      };
    });
  }, [allResults, nameToDistrict]);
}

export default function LiveConstituencies() {
  const { loading: liveLoading, allResults, liveMeta, allianceColors, districtMap, apiError } = useLiveResults();
  const basePath = useLiveBasePath();
  const { data, loading: dataLoading } = useData();
  const [sp, setSp] = useSearchParams();
  const [search, setSearch] = useState('');

  const allianceFilter = sp.get('alliance') ?? 'all';
  const districtFilter = sp.get('district') ?? 'all';
  const statusFilter = sp.get('status') ?? 'all';
  const partyFilter = sp.get('party') ?? 'all';

  const hasLiveData = liveMeta && (
    liveMeta.status !== 'awaiting' ||
    Object.keys(liveMeta.alliance_tally ?? {}).length > 0 ||
    Object.keys(liveMeta.party_tally ?? {}).length > 0
  );

  const nameToDistrict = useMemo(() => {
    // Prefer districtMap from live context (Bihar) over static data (TN)
    if (districtMap && Object.keys(districtMap).length > 0) return districtMap;
    if (!data) return {};
    const map = {};
    data.districts.forEach(d => {
      (data.byDistrictYear[`${d}||2026`] ?? data.byDistrictYear[`${d}||2025`] ?? []).forEach(r => { map[r.name] = d; });
    });
    return map;
  }, [data, districtMap]);

  const allRows = useConstituencyRows(allResults, nameToDistrict);

  const alliances = useMemo(() => {
    const set = new Set();
    allRows.forEach(r => {
      if (r.liveAlliance) set.add(r.liveAlliance);
      r.allAlliances.forEach(a => set.add(a));
    });
    return [...set].sort();
  }, [allRows]);

  const parties = useMemo(() => {
    const set = new Set();
    allRows.forEach(r => {
      if (r.leaderParty) set.add(r.leaderParty);
      r.allParties.forEach(p => set.add(p));
    });
    return [...set].sort();
  }, [allRows]);

  const districts = useMemo(() => data?.districts.slice().sort() ?? [], [data]);

  const filtered = useMemo(() => {
    return allRows.filter(r => {
      if (allianceFilter !== 'all') {
        if (r.liveAlliance) {
          if (r.liveAlliance !== allianceFilter) return false;
        } else {
          if (!r.allAlliances.includes(allianceFilter)) return false;
        }
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (partyFilter !== 'all') {
        if (r.leaderParty) {
          if (r.leaderParty !== partyFilter) return false;
        } else {
          if (!r.allParties.includes(partyFilter)) return false;
        }
      }
      if (districtFilter !== 'all' && r.district !== districtFilter) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allRows, allianceFilter, districtFilter, statusFilter, partyFilter, search]);

  const { sorted, col: sortCol, dir: sortDir, toggle: sortToggle } = useSortable(filtered, 'name', 'asc');

  const setFilter = (key, val) => {
    const next = new URLSearchParams(sp);
    if (val === 'all') next.delete(key);
    else next.set(key, val);
    setSp(next, { replace: true });
  };

  const clearAll = () => { setSp({}, { replace: true }); setSearch(''); };
  const hasFilters = allianceFilter !== 'all' || districtFilter !== 'all' || statusFilter !== 'all' || partyFilter !== 'all' || search;
  const allianceLabel = allianceFilter !== 'all' ? allianceFilter : null;
  const statusLabel = statusFilter !== 'all' ? statusFilter : null;
  const partyLabel = partyFilter !== 'all' ? partyFilter : null;

  if (liveLoading || dataLoading) return <LoadingSpinner variant="table" />;

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
          <h1 className="h1">All Constituencies</h1>
          <p style={{ fontSize: 13, color: 'var(--text-subtle)', marginTop: 3 }}>
            {sorted.length} of {allRows.length} constituencies
            {allianceLabel && <span style={{ color: allianceColors[allianceFilter] ?? '#818cf8' }}> · {allianceLabel}</span>}
            {statusLabel && <span style={{ color: '#a5b4fc' }}> · {statusLabel}</span>}
            {partyLabel && <span style={{ color: '#818cf8' }}> · {partyLabel}</span>}
          </p>
        </div>
        {hasFilters && (
          <button onClick={clearAll}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-subtle)', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Data notice */}
      {!hasLiveData && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', marginBottom: 14 }}>
          <CalendarClock size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#818cf8', fontWeight: 600 }}>Live results pending · Showing 2026 nomination data</p>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search constituency…"
            className="field" style={{ paddingLeft: 30, height: 34, width: '100%', minWidth: 180, maxWidth: 280 }} />
        </div>
        <select value={allianceFilter} onChange={e => setFilter('alliance', e.target.value)} style={SELECT_STYLE}>
          <option value="all">All Alliances</option>
          {alliances.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={partyFilter} onChange={e => setFilter('party', e.target.value)} style={SELECT_STYLE}>
          <option value="all">All Parties</option>
          {parties.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setFilter('status', e.target.value)} style={SELECT_STYLE}>
          <option value="all">All Status</option>
          <option value="declared">Declared</option>
          <option value="counting">Counting</option>
          <option value="awaiting">Awaiting</option>
        </select>
        <select value={districtFilter} onChange={e => setFilter('district', e.target.value)} style={SELECT_STYLE}>
          <option value="all">All Districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <style>{`
        .constituency-row td { transition: background 0.15s ease; }
        .constituency-row:hover td { background: rgba(99,102,241,0.08) !important; }
        .constituency-row:hover td a { color: #c7d2fe !important; }
      `}</style>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="tbl-head" style={{ background: '#080d1a' }}>
                <SortTh label="Constituency" col="name" activeCol={sortCol} dir={sortDir} onSort={sortToggle} style={{ whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#080d1a', zIndex: 2 }} />
                <SortTh label="District" col="district" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ whiteSpace: 'nowrap' }}>{hasLiveData ? 'Leader' : 'Nominated'}</th>
                <th style={{ whiteSpace: 'nowrap' }}>Runner-up</th>
                <SortTh label="Margin" col="margin" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                {hasLiveData && <th style={{ whiteSpace: 'nowrap' }}>Round</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={hasLiveData ? 7 : 6} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>No constituencies match the current filters</td>
                </tr>
              )}
              {sorted.map((row, i) => {
                const accentColor = allianceColors[row.leaderAlliance] ?? '#607d8b';
                const isDeclared = row.status === 'declared';
                return (
                  <tr key={row.name} className="constituency-row"
                    style={{ borderBottom: '1px solid #0a0f1e', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)' }}>

                    {/* Constituency name — sticky */}
                    <td style={{ padding: '12px 12px', position: 'sticky', left: 0, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)', zIndex: 1 }}>
                      <Link to={`${basePath}/${slugify(row.name)}`}
                        style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
                        {row.name}
                      </Link>
                    </td>

                    {/* District */}
                    <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                      <Link to={`${basePath}/district/${slugify(row.district)}`}
                        style={{ color: 'var(--text-subtle)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}>
                        {row.district}
                      </Link>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 12px' }}>
                      {hasLiveData ? (
                        <StatusBadge status={row.status} margin={row.margin} />
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontStyle: 'italic' }}>Awaiting</span>
                      )}
                    </td>

                    {/* Leader (name + party stacked) */}
                    <td style={{ padding: '12px 12px' }}>
                      {row.leaderName ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span title={row.leaderName} style={{ color: 'var(--text-body)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160, display: 'block' }}>{row.leaderName}</span>
                          {row.leaderParty && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: accentColor, background: '#0f172a', border: `1px solid ${accentColor}55`, whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{row.leaderParty}</span>
                          )}
                        </div>
                      ) : <span style={{ color: 'var(--text-subtle)' }}>—</span>}
                    </td>

                    {/* Runner-up (name + party stacked) */}
                    <td style={{ padding: '12px 12px' }}>
                      {row.trailingName ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span title={row.trailingName} style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160, display: 'block' }}>{row.trailingName}</span>
                          {row.trailingParty && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: 'var(--text-subtle)', background: '#0f172a', border: '1px solid rgba(100,116,139,0.5)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{row.trailingParty}</span>
                          )}
                        </div>
                      ) : <span style={{ color: 'var(--text-subtle)' }}>—</span>}
                    </td>

                    {/* Margin */}
                    <td style={{ padding: '12px 12px', textAlign: 'right', color: isDeclared ? '#34d399' : '#a5b4fc', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontWeight: 700 }}>
                      {row.margin > 0 ? `+${row.margin.toLocaleString('en-IN')}` : <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>—</span>}
                    </td>

                    {/* Round */}
                    {hasLiveData && (
                      <td style={{ padding: '12px 12px', textAlign: 'left', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {row.round ? (
                          <span>R{row.round}{row.totalRounds ? `/${row.totalRounds}` : ''}</span>
                        ) : <span style={{ color: 'var(--text-subtle)' }}>—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
