import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, RefreshCw, CalendarClock } from 'lucide-react';
import { useLiveResults, ALLIANCE_COLORS } from '../context/LiveResultsContext';
import { useData } from '../context/DataContext';
import { slugify } from '../utils/helpers';
import LiveTabBar from '../components/LiveTabBar';
import LoadingSpinner from '../components/LoadingSpinner';

function secsAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

const STATUS_DOT = {
  declared: { color: '#34d399', title: 'Declared' },
  counting:  { color: '#fbbf24', title: 'Counting'  },
  awaiting:  { color: '#334155', title: 'Awaiting'  },
};

function ConstituencyTableRow({ name, allResults }) {
  const candidates = allResults?.[name]?.candidates ?? [];
  const leader = candidates[0];
  const allianceColor = leader ? (ALLIANCE_COLORS[leader.alliance] ?? '#607d8b') : null;

  return (
    <tr style={{ borderBottom: '1px solid #0f172a' }}>
      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
        <span title="Awaiting" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#334155' }} />
      </td>
      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
        <Link to={`/live/${slugify(name)}`}
          style={{ fontSize: 12, fontWeight: 600, color: '#c7d2fe', textDecoration: 'none' }}
          onMouseEnter={e => e.target.style.color = '#818cf8'}
          onMouseLeave={e => e.target.style.color = '#c7d2fe'}>
          {name}
        </Link>
      </td>
      <td style={{ padding: '9px 12px', verticalAlign: 'middle', fontSize: 12, color: '#64748b' }}>
        {candidates.length}
      </td>
      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
        {leader ? (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            background: `${allianceColor}18`, color: allianceColor,
            border: `1px solid ${allianceColor}33`, whiteSpace: 'nowrap',
          }}>
            {leader.alliance}
          </span>
        ) : <span style={{ color: '#334155', fontSize: 12 }}>—</span>}
      </td>
      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
        <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>Awaiting results</span>
      </td>
    </tr>
  );
}

function NominationsSummary({ constituencyNames, allResults }) {
  const tally = useMemo(() => {
    const agg = {};
    constituencyNames.forEach(name => {
      const leader = allResults?.[name]?.candidates?.[0];
      if (!leader) return;
      const alliance = leader.alliance ?? 'Others';
      if (!agg[alliance]) agg[alliance] = { count: 0, color: ALLIANCE_COLORS[alliance] ?? '#607d8b' };
      agg[alliance].count++;
    });
    return Object.entries(agg).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.count - a.count);
  }, [constituencyNames, allResults]);

  if (!tally.length) return null;

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        Nominations by Alliance
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
  const { loading: liveLoading, allResults, lastUpdated } = useLiveResults();
  const { data, loading: dataLoading } = useData();
  const [search, setSearch] = useState('');

  if (liveLoading || dataLoading) return <LoadingSpinner />;
  if (!data || !allResults) return <div style={{ color: '#f87171', padding: 32 }}>Failed to load.</div>;

  const district = data.districts.find(d => slugify(d) === slug);
  if (!district) return (
    <div style={{ padding: 32, color: '#f87171' }}>
      <Link to="/live/districts" style={{ color: '#818cf8', textDecoration: 'none', marginBottom: 16, display: 'block' }}>
        ← Back to Districts
      </Link>
      District not found.
    </div>
  );

  const allConstituencies = (data.byDistrictYear[`${district}||2026`] ?? []).map(r => r.name).sort();
  const filtered = search
    ? allConstituencies.filter(n => n.toLowerCase().includes(search.toLowerCase()))
    : allConstituencies;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <LiveTabBar />

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', marginBottom: 20 }}>
        <Link to="/live/districts" style={{ color: '#818cf8', textDecoration: 'none' }}
          onMouseEnter={e => e.target.style.color = '#a5b4fc'}
          onMouseLeave={e => e.target.style.color = '#818cf8'}>
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
              {allConstituencies.length} constituencies · 2026 nominations
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569' }}>
            <RefreshCw size={11} />
            {secsAgo(lastUpdated?.getTime())}
          </div>
        </div>

        {/* Data coming soon banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
          <CalendarClock size={16} style={{ color: '#818cf8', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#818cf8', fontWeight: 600 }}>
            Results will appear here on election day · Showing 2026 nomination data
          </p>
        </div>

        {/* Nominations summary */}
        <NominationsSummary constituencyNames={allConstituencies} allResults={allResults} />

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
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0d1526', borderBottom: '1px solid #1e293b' }}>
                  {['', 'Constituency', 'Candidates', 'Leading Alliance', 'Results'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(name => (
                  <ConstituencyTableRow key={name} name={name} allResults={allResults} />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', color: '#334155', fontSize: 13 }}>
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
  );
}
