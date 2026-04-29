import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, CalendarClock } from 'lucide-react';
import { useLiveResults, ALLIANCE_COLORS } from '../context/LiveResultsContext';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

const SELECT_STYLE = {
  background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
  color: '#e2e8f0', fontSize: 12, padding: '6px 10px', outline: 'none',
  cursor: 'pointer', fontFamily: 'inherit',
};

function useConstituencyRows(allResults, nameToDistrict) {
  return useMemo(() => {
    if (!allResults) return [];
    return Object.keys(allResults).sort().map(name => {
      const candidates = allResults[name]?.candidates ?? [];
      const leader = candidates[0] ?? null;
      return {
        name,
        district: nameToDistrict[name] ?? '—',
        leaderName: leader?.name ?? null,
        leaderParty: leader?.party ?? null,
        leaderAlliance: leader?.alliance ?? null,
        candidateCount: candidates.length,
      };
    });
  }, [allResults, nameToDistrict]);
}

export default function LiveConstituencies() {
  const { loading: liveLoading, allResults } = useLiveResults();
  const { data, loading: dataLoading } = useData();
  const [sp, setSp] = useSearchParams();
  const [search, setSearch] = useState('');

  const allianceFilter = sp.get('alliance') ?? 'all';
  const districtFilter = sp.get('district') ?? 'all';

  const nameToDistrict = useMemo(() => {
    if (!data) return {};
    const map = {};
    data.districts.forEach(d => {
      (data.byDistrictYear[`${d}||2026`] ?? []).forEach(r => { map[r.name] = d; });
    });
    return map;
  }, [data]);

  const allRows = useConstituencyRows(allResults, nameToDistrict);

  const alliances = useMemo(() => {
    const set = new Set(allRows.map(r => r.leaderAlliance).filter(Boolean));
    return [...set].sort();
  }, [allRows]);

  const districts = useMemo(() => data?.districts.slice().sort() ?? [], [data]);

  const filtered = useMemo(() => {
    return allRows.filter(r => {
      if (allianceFilter !== 'all' && r.leaderAlliance !== allianceFilter) return false;
      if (districtFilter !== 'all' && r.district !== districtFilter) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allRows, allianceFilter, districtFilter, search]);

  const { sorted, col: sortCol, dir: sortDir, toggle: sortToggle } = useSortable(filtered, 'name', 'asc');

  const setFilter = (key, val) => {
    const next = new URLSearchParams(sp);
    if (val === 'all') next.delete(key);
    else next.set(key, val);
    setSp(next, { replace: true });
  };

  const clearAll = () => { setSp({}, { replace: true }); setSearch(''); };
  const hasFilters = allianceFilter !== 'all' || districtFilter !== 'all' || search;
  const allianceLabel = allianceFilter !== 'all' ? allianceFilter : null;

  if (liveLoading || dataLoading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <LiveTabBar />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>All Constituencies</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>
            {sorted.length} of {allRows.length} constituencies
            {allianceLabel && <span style={{ color: ALLIANCE_COLORS[allianceFilter] ?? '#818cf8' }}> · {allianceLabel}</span>}
          </p>
        </div>
        {hasFilters && (
          <button onClick={clearAll}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Data coming soon notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', marginBottom: 14 }}>
        <CalendarClock size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>Results will appear here on election day · Showing 2026 nomination data</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search constituency…"
            className="field" style={{ paddingLeft: 30, height: 34, fontSize: 12, width: 200 }} />
        </div>
        <select value={allianceFilter} onChange={e => setFilter('alliance', e.target.value)} style={SELECT_STYLE}>
          <option value="all">All Alliances</option>
          {alliances.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={districtFilter} onChange={e => setFilter('district', e.target.value)} style={SELECT_STYLE}>
          <option value="all">All Districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', background: '#080d1a' }}>
                <th style={{ padding: '10px 12px', width: 24 }} />
                <SortTh label="Constituency"  col="name"           activeCol={sortCol} dir={sortDir} onSort={sortToggle} style={{ whiteSpace: 'nowrap' }} />
                <SortTh label="District"      col="district"       activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nominated Leader</th>
                <SortTh label="Candidates" col="candidateCount" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Results</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#334155' }}>No constituencies match the current filters</td>
                </tr>
              )}
              {sorted.map((row, i) => {
                const accentColor = ALLIANCE_COLORS[row.leaderAlliance] ?? '#607d8b';
                return (
                  <tr key={row.name}
                    style={{ borderBottom: '1px solid #0a0f1e', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)'}>

                    {/* Status dot (all awaiting) */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span title="Awaiting" style={{ color: '#1e293b', fontSize: 14, lineHeight: 1 }}>●</span>
                    </td>

                    {/* Constituency name */}
                    <td style={{ padding: '10px 12px' }}>
                      <Link to={`/live/${slugify(row.name)}`}
                        style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                        onMouseEnter={e => e.target.style.color = '#c7d2fe'}
                        onMouseLeave={e => e.target.style.color = '#a5b4fc'}>
                        {row.name}
                      </Link>
                    </td>

                    {/* District */}
                    <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setFilter('district', row.district)}
                        style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                        onMouseEnter={e => e.target.style.color = '#94a3b8'}
                        onMouseLeave={e => e.target.style.color = '#475569'}>
                        {row.district}
                      </button>
                    </td>

                    {/* Nominated leader + party */}
                    <td style={{ padding: '10px 12px' }}>
                      {row.leaderName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{row.leaderName}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, color: accentColor, background: `${accentColor}18`, border: `1px solid ${accentColor}33`, flexShrink: 0 }}>{row.leaderParty}</span>
                        </div>
                      ) : <span style={{ color: '#334155' }}>—</span>}
                    </td>

                    {/* Candidate count */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                      {row.candidateCount}
                    </td>

                    {/* Results status */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>Awaiting results</span>
                    </td>
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
