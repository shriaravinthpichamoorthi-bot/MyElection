import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPinned, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MapFragmentIcon from '../components/MapFragmentIcon';
import PartyBadge from '../components/PartyBadge';
import { slugify, allianceColor } from '../utils/helpers';
import { loadDistrictAsset } from '../utils/mapAssets';

const YEARS = [2001,2006,2011,2016,2021,2026];

export default function Districts() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);
  const [search, setSearch] = useState('');
  const [geos, setGeos] = useState(new Map());

  useEffect(() => {
    let dead = false;
    loadDistrictAsset().then(g => { if (!dead) setGeos(g); });
    return () => { dead = true; };
  }, []);

  if (loading) return <LoadingSpinner />;

  const { districts, byDistrictYear, partyColors, allianceColors, district2026 } = data;
  const filtered = districts.filter(d => d.toLowerCase().includes(search.toLowerCase()));

  function getStats(district, year) {
    const recs = byDistrictYear[`${district}||${year}`] || [];
    if (!recs.length) return null;
    const turnout = (recs.reduce((s,r) => s+(r.turnout_pct||0),0)/recs.length).toFixed(1);
    const pw = {}, pa = {};
    recs.forEach(r => {
      if (r.winner_party) pw[r.winner_party] = (pw[r.winner_party]||0)+1;
      if (r.winner_alliance) pa[r.winner_alliance] = (pa[r.winner_alliance]||0)+1;
    });
    return {
      seats: recs.length, turnout,
      topParty: Object.entries(pw).sort((a,b)=>b[1]-a[1])[0],
      topAlliance: Object.entries(pa).sort((a,b)=>b[1]-a[1])[0],
    };
  }

  const d26 = {};
  district2026.forEach(d => { d26[d.district] = d; });

  return (
    <div style={{ maxWidth:1200, display:'flex', flexDirection:'column', gap:28 }}>
      {/* Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', justifyContent:'space-between', gap:16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <MapPinned size={18} color="#60a5fa" />
            </div>
            <h1 style={{ fontSize:24, fontWeight:800, color:'#f8fafc' }}>Districts</h1>
          </div>
          <p style={{ fontSize:13, color:'#475569', paddingLeft:48 }}>38 districts · constituency-wise results</p>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {YEARS.map(y => (
            <motion.button key={y} whileTap={{ scale:0.94 }} onClick={() => setSelYear(y)}
              className={selYear===y ? 'pill-active' : 'pill-idle'}
              style={{ padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {y}{y===2026?' ★':''}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:260 }}>
        <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#475569' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter districts…"
          className="field" style={{ paddingLeft:32, width:'100%' }} />
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gap:14 }} id="dist-grid">
        <style>{`#dist-grid{grid-template-columns:1fr}@media(min-width:640px){#dist-grid{grid-template-columns:repeat(2,1fr)}}@media(min-width:1024px){#dist-grid{grid-template-columns:repeat(3,1fr)}}`}</style>
        {filtered.map((district,i) => {
          const stats = getStats(district, selYear);
          const d = d26[district];
          const accent = stats?.topAlliance ? allianceColor(stats.topAlliance[0], allianceColors) : '#6366f1';

          return (
            <motion.div key={district}
              initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true, margin:'-20px' }} transition={{ delay:Math.min(i*0.03,0.35) }}>
              <Link to={`/district/${slugify(district)}?year=${selYear}`} className="card-hover"
                style={{ display:'block', padding:18, textDecoration:'none', borderColor:`${accent}25` }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:`${accent}18`, border:`1px solid ${accent}28`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <MapFragmentIcon geometry={geos.get(district)} className="h-5 w-5" fill={accent} background="transparent" />
                    </div>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:'#f8fafc', lineHeight:1.3 }}>{district}</p>
                      <p style={{ fontSize:11, color:'#475569' }}>{stats?.seats||0} constituencies</p>
                    </div>
                  </div>

                  {selYear===2026 && d ? (
                    <span style={{
                      fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:8,
                      color: d.turnout_pct>=75?'#34d399':d.turnout_pct>=60?'#fbbf24':'#f87171',
                      background: d.turnout_pct>=75?'rgba(52,211,153,0.12)':d.turnout_pct>=60?'rgba(251,191,36,0.12)':'rgba(248,113,113,0.12)',
                    }}>{d.turnout_pct?.toFixed(1)}%</span>
                  ) : stats ? (
                    <span style={{ fontSize:11, color:'#475569' }}>{stats.turnout}% turnout</span>
                  ) : null}
                </div>

                {selYear===2026 && d ? (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, fontSize:12 }}>
                    <span style={{ color:'#475569' }}>Electors: <span style={{ color:'#cbd5e1', fontWeight:500 }}>{(d.total_electors/100000).toFixed(1)}L</span></span>
                    <span style={{ color:'#475569' }}>Voted: <span style={{ color:'#cbd5e1', fontWeight:500 }}>{(d.votes_polled/100000).toFixed(1)}L</span></span>
                    <span style={{ color:'#475569', gridColumn:'span 2' }}>Category: <span style={{ color:'#cbd5e1', fontWeight:500 }}>{d.category}</span></span>
                  </div>
                ) : stats ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {stats.topAlliance && (
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:allianceColor(stats.topAlliance[0],allianceColors), flexShrink:0 }} />
                        <span style={{ fontSize:12, color:'#64748b', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{stats.topAlliance[0]}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'#f8fafc' }}>{stats.topAlliance[1]} seats</span>
                      </div>
                    )}
                    {stats.topParty && (
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <PartyBadge party={stats.topParty[0]} partyColors={partyColors} size="xs" />
                        <span style={{ fontSize:11, color:'#475569', marginLeft:'auto' }}>{stats.topParty[1]} wins</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize:12, color:'#334155', fontStyle:'italic' }}>No data</p>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
