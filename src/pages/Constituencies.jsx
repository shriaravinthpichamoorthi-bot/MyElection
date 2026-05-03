import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, LayoutGrid, List } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MapFragmentIcon from '../components/MapFragmentIcon';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import { formatPct, marginClass, slugify, partyColor, formatName } from '../utils/helpers';
import { loadConstituencyAsset } from '../utils/mapAssets';

const YEARS = [2001,2006,2011,2016,2021,2026];

export default function Constituencies() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [geos, setGeos] = useState(new Map());

  useEffect(() => {
    let dead = false;
    loadConstituencyAsset().then(g => { if (!dead) setGeos(g); });
    return () => { dead = true; };
  }, []);

  if (loading) return <LoadingSpinner />;

  const { byYear, districts, partyColors } = data;
  const recs = byYear[selYear] || [];

  const partyList = useMemo(() => {
    const ps = [...new Set(recs.map(r => r.winner_party).filter(Boolean))].sort();
    return ['', ...ps];
  }, [recs]);

  const filtered = useMemo(() => {
    let rows = recs;
    if (search) rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (filterDistrict) rows = rows.filter(r => r.district === filterDistrict);
    if (filterParty) rows = rows.filter(r => r.winner_party === filterParty);
    return rows;
  }, [recs, search, filterDistrict, filterParty]);

  const { sorted, col:sortCol, dir:sortDir, toggle:sortToggle } = useSortable(filtered, 'constituency_no');

  const selectStyle = { background:'#0f172a', border:'1px solid #1e293b', borderRadius:10, color:'#e2e8f0', fontSize:14, padding:'8px 12px', outline:'none', cursor:'pointer', fontFamily:'inherit' };

  return (
    <div style={{ maxWidth:1200, display:'flex', flexDirection:'column', gap:24 }}>
      {/* Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', justifyContent:'space-between', gap:16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Building2 size={18} color="#34d399" />
            </div>
            <h1 className="h1">Constituencies</h1>
          </div>
          <p style={{ fontSize:13, color:'var(--text-subtle)', paddingLeft:48 }}>234 assembly segments across 38 districts</p>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {YEARS.map(y => (
            <motion.button key={y} whileTap={{ scale:0.94 }} onClick={() => setSelYear(y)}
              className={selYear===y ? 'pill-active' : 'pill-idle'}
              style={{ padding:'7px 14px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {y}{y===2026?' ★':''}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding:'14px 16px', display:'flex', flexWrap:'wrap', alignItems:'center', gap:10 }}>
        <div style={{ position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-subtle)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…"
            className="field" style={{ paddingLeft:30, width:160 }} />
        </div>
        <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} style={selectStyle}>
          <option value="">All Districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterParty} onChange={e => setFilterParty(e.target.value)} style={selectStyle}>
          <option value="">All Parties</option>
          {partyList.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:'var(--text-subtle)' }}>
            <span style={{ color:'var(--text-body)', fontWeight:600 }}>{filtered.length}</span> results
          </span>
          <div style={{ display:'flex', borderRadius:10, overflow:'hidden', border:'1px solid #1e293b' }}>
            {[['table', List], ['grid', LayoutGrid]].map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ padding:'7px 10px', border:'none', cursor:'pointer', background: viewMode===mode ? 'rgba(99,102,241,0.2)' : '#0f172a', color: viewMode===mode ? '#818cf8' : '#475569', transition:'all 0.12s' }}>
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Views */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div key="table" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}
            className="card" style={{ overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr className="tbl-head">
                    <SortTh label="#" col="constituency_no" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                    <SortTh label="Constituency" col="name" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                    <th style={{ whiteSpace:'nowrap' }}>District</th>
                    <th>Cat.</th>
                    <th>Winner</th>
                    <th>Party</th>
                    <SortTh label="Margin%" col="margin_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                    <SortTh label="Turnout%" col="turnout_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r,i) => {
                    const mc = marginClass(r.margin_pct);
                    return (
                      <tr key={i} className="tbl-row">
                        <td style={{ color:'var(--text-subtle)', fontVariantNumeric:'tabular-nums', fontFamily:'monospace' }}>{r.constituency_no}</td>
                        <td>
                          <Link to={`/constituency/${slugify(r.name)}`}
                            style={{ display:'inline-flex', alignItems:'center', gap:8, color:'#818cf8', textDecoration:'none', fontWeight:500, whiteSpace:'nowrap' }}>
                            <MapFragmentIcon geometry={geos.get(r.constituency_no)} className="h-4 w-4" fill="#818cf8" background="transparent" />
                            {r.name}
                          </Link>
                        </td>
                        <td>
                          {r.district
                            ? <Link to={`/district/${slugify(r.district)}?year=${selYear}`}
                                style={{ color:'var(--text-subtle)', textDecoration:'none', whiteSpace:'nowrap' }}
                                onMouseEnter={e=>e.target.style.color='#cbd5e1'} onMouseLeave={e=>e.target.style.color='var(--text-subtle)'}>
                                {r.district}
                              </Link>
                            : <span style={{ color:'var(--text-subtle)' }}>—</span>}
                        </td>
                        <td style={{ color:'var(--text-subtle)' }}>{r.category||'—'}</td>
                        <td style={{ color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                          {r.winner_name ? formatName(r.winner_name) : <span style={{ color:'var(--text-subtle)', fontStyle:'italic' }}>Pending</span>}
                        </td>
                        <td>{r.winner_party ? <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /> : <span style={{ color:'var(--text-subtle)' }}>—</span>}</td>
                        <td>
                          {r.margin_pct!=null
                            ? <span style={{ fontWeight:600, color: r.margin_pct<3?'#f87171':r.margin_pct<8?'#fbbf24':'#34d399', fontVariantNumeric:'tabular-nums' }}>{r.margin_pct.toFixed(1)}%</span>
                            : <span style={{ color:'var(--text-subtle)' }}>—</span>}
                        </td>
                        <td style={{ color:'var(--text-subtle)', fontVariantNumeric:'tabular-nums' }}>{formatPct(r.turnout_pct)}</td>
                      </tr>
                    );
                  })}
                  {sorted.length===0 && (
                    <tr><td colSpan={8} style={{ padding:'48px 16px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No results match the current filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}
            style={{ display:'grid', gap:12 }} id="const-grid">
            <style>{`#const-grid{grid-template-columns:1fr}@media(min-width:480px){#const-grid{grid-template-columns:repeat(2,1fr)}}@media(min-width:900px){#const-grid{grid-template-columns:repeat(3,1fr)}}@media(min-width:1200px){#const-grid{grid-template-columns:repeat(4,1fr)}}`}</style>
            {sorted.map((r,i) => {
              const mc = marginClass(r.margin_pct);
              const color = r.winner_party ? partyColor(r.winner_party, partyColors) : '#6366f1';
              return (
                <motion.div key={i} initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} transition={{ delay:Math.min(i*0.012,0.2) }}>
                  <Link to={`/constituency/${slugify(r.name)}`} className="card-hover"
                    style={{ display:'block', padding:16, textDecoration:'none', borderColor:`${color}22` }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                      <MapFragmentIcon geometry={geos.get(r.constituency_no)} className="h-5 w-5" fill={color} background="transparent" style={{ flexShrink:0, marginTop:2 }} />
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#f8fafc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</p>
                        <p style={{ fontSize:13, color:'var(--text-subtle)', marginTop:2 }}>{r.district}</p>
                      </div>
                    </div>
                    <p style={{ fontSize:13, color:'var(--text-subtle)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:10 }}>
                      {r.winner_name ? formatName(r.winner_name) : <span style={{ fontStyle:'italic', color:'var(--text-faint)' }}>Pending</span>}
                    </p>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                      {r.winner_party ? <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /> : <span />}
                      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                        {r.margin_pct!=null && <span style={{ fontWeight:700, color: r.margin_pct<3?'#f87171':r.margin_pct<8?'#fbbf24':'#34d399', fontVariantNumeric:'tabular-nums' }}>{r.margin_pct.toFixed(1)}%</span>}
                        <span style={{ color:'var(--text-subtle)' }}>{formatPct(r.turnout_pct)}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            {sorted.length===0 && <div style={{ gridColumn:'span 4', padding:'48px 0', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No results match the current filters</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
