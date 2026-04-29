import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapPin, BarChart3, GitCompare, Map, ArrowRight, Flame, Shield, TrendingUp, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import PartyBadge from '../components/PartyBadge';
import { formatNumber, formatPct, partyColor, allianceColor, slugify, YEARS } from '../utils/helpers';

const TT_STYLE = {
  contentStyle: { background:'#0f172a', border:'1px solid #1e293b', borderRadius:10, color:'#e2e8f0', fontSize:12 },
  cursor: { fill:'rgba(99,102,241,0.06)' },
};

function ChartCard({ title, sub, children }) {
  return (
    <motion.div initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, margin:'-30px' }} transition={{ duration:0.3 }}
      className="card" style={{ padding:20 }}>
      <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom:2 }}>{title}</p>
      {sub && <p style={{ fontSize:11, color:'#475569', marginBottom:16 }}>{sub}</p>}
      {children}
    </motion.div>
  );
}

function stagger(i) { return { initial:{ opacity:0, y:12 }, whileInView:{ opacity:1, y:0 }, viewport:{ once:true }, transition:{ delay:i*0.05, duration:0.28 } }; }

export default function Home() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);
  if (loading) return <LoadingSpinner />;

  const { stateSummary, byYear, alliancePerf, womenStats, partyPerf, partyColors, allianceColors, strongholds, districts } = data;
  const summary = stateSummary.find(s => s.year === selYear) || stateSummary[0];

  const allianceData = Object.entries(alliancePerf[selYear] || {})
    .map(([name, seats]) => ({ name, seats })).sort((a,b) => b.seats-a.seats).slice(0,6);

  const turnoutTrend = stateSummary.map(s => ({ year:s.year, turnout:s.turnout_pct }));

  const topParties = Object.entries(partyPerf[selYear] || {})
    .map(([party,d]) => ({ party, seats:d.seats })).filter(p => p.seats > 0)
    .sort((a,b) => b.seats-a.seats).slice(0,8);

  const womenChart = YEARS.filter(y => y !== 2026).map(y => ({ year:y, winners:womenStats[y]?.femaleWinners || 0 }));

  const tgSeats = selYear === 2026 ? [] :
    (byYear[selYear] || []).filter(r => r.margin_pct != null).sort((a,b) => a.margin_pct-b.margin_pct).slice(0,8);

  const strongholdByParty = {};
  Object.values(strongholds).forEach(s => { strongholdByParty[s.party] = (strongholdByParty[s.party]||0)+1; });

  const topAlliance = allianceData[0];

  return (
    <div style={{ maxWidth:1200, display:'flex', flexDirection:'column', gap:40 }}>

      {/* ── Hero ── */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:32, alignItems:'flex-end', justifyContent:'space-between' }}>
          <div style={{ flex:1, minWidth:280 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px', borderRadius:999, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.3)', marginBottom:16 }}>
              <span className="live-dot" style={{ width:7, height:7, borderRadius:'50%', background:'#6366f1' }} />
              <span style={{ fontSize:11, fontWeight:600, color:'#a5b4fc', letterSpacing:'0.04em' }}>Tamil Nadu Assembly Elections 2001–2026</span>
            </div>
            <h1 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, lineHeight:1.15, marginBottom:12 }}>
              <span className="text-gradient">Election Intelligence</span>
              <br /><span style={{ color:'#f8fafc' }}>at your fingertips</span>
            </h1>
            <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7, maxWidth:440 }}>
              Comprehensive analytics for 234 constituencies across 38 districts.
              Swing analysis, margin tracking, candidate history, and live 2026 data.
            </p>
          </div>

          <div style={{ flexShrink:0 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Select Year</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {YEARS.map(y => (
                <motion.button key={y} whileTap={{ scale:0.94 }} onClick={() => setSelYear(y)}
                  className={selYear === y ? 'pill-active' : 'pill-idle'}
                  style={{ padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {y}{y === 2026 ? ' ★' : ''}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Insight strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { icon:<Flame size={16} color="#fbbf24" />, label:'Leading Alliance', value:topAlliance?.name||'—', right:<span style={{ fontSize:22, fontWeight:800, color:'#fbbf24' }}>{topAlliance?.seats}</span> },
          { icon:<TrendingUp size={16} color="#34d399" />, label:'State Turnout', value:formatPct(summary?.turnout_pct) },
          { icon:<Shield size={16} color="#a78bfa" />, label:'Stronghold Seats', value:`${Object.keys(strongholds).length} constituencies` },
        ].map((item,i) => (
          <motion.div key={i} {...stagger(i)} className="card"
            style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px' }}>
            {item.icon}
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#475569', marginBottom:3 }}>{item.label}</p>
              <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.value}</p>
            </div>
            {item.right}
          </motion.div>
        ))}
      </div>

      {/* ── Stat cards ── */}
      <div>
        <div style={{ marginBottom:16 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#f8fafc' }}>{selYear} — State Overview</h2>
          <p style={{ fontSize:12, color:'#475569', marginTop:2 }}>Key metrics for the {selYear} Tamil Nadu Assembly Election</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }} id="stat-grid">
          <style>{`@media(min-width:640px){#stat-grid{grid-template-columns:repeat(3,1fr)}}@media(min-width:1024px){#stat-grid{grid-template-columns:repeat(6,1fr)}}`}</style>
          {[
            { label:'Total Electors', value:formatNumber(summary?.total_electors), color:'blue',   icon:Users },
            { label:'Votes Cast',     value:formatNumber(summary?.total_votes),     color:'green',  icon:TrendingUp },
            { label:'Turnout',        value:formatPct(summary?.turnout_pct),        color:'yellow', icon:BarChart3 },
            { label:'Constituencies', value:summary?.constituencies,                color:'purple', icon:MapPin },
            { label:'Women Winners',  value:womenStats[selYear]?.femaleWinners||'—',color:'pink',   icon:Users },
            { label:'Districts',      value:districts.length,                       color:'indigo', icon:Map },
          ].map((c,i) => (
            <motion.div key={c.label} {...stagger(i)}><StatCard {...c} /></motion.div>
          ))}
        </div>
      </div>

      {/* ── Charts row 1 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} id="chart-row-1">
        <style>{`@media(max-width:768px){#chart-row-1,#chart-row-2,#bottom-row{grid-template-columns:1fr!important}}`}</style>
        <ChartCard title={`Alliance Seats — ${selYear}`} sub="Total seats won per alliance">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={allianceData} layout="vertical" barSize={11}>
              <XAxis type="number" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill:'#94a3b8', fontSize:10 }} width={130} axisLine={false} tickLine={false} />
              <Tooltip {...TT_STYLE} />
              <Bar dataKey="seats" radius={[0,5,5,0]}>
                {allianceData.map((d,i) => <Cell key={i} fill={allianceColor(d.name,allianceColors)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Voter Turnout Trend" sub="State-wide % across all elections">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={turnoutTrend}>
              <XAxis dataKey="year" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[50,95]} tick={{ fill:'#475569', fontSize:11 }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip {...TT_STYLE} formatter={v => [v.toFixed(1)+'%','Turnout']} />
              <defs>
                <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <Line type="monotone" dataKey="turnout" stroke="url(#trendLine)" strokeWidth={2.5}
                dot={{ fill:'#6366f1', r:4, strokeWidth:2, stroke:'#0f172a' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts row 2 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} id="chart-row-2">
        <ChartCard title={`Party Seats — ${selYear}`} sub="Top 8 parties by seats won">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={topParties} barSize={24}>
              <XAxis dataKey="party" tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT_STYLE} />
              <Bar dataKey="seats" radius={[4,4,0,0]}>
                {topParties.map((d,i) => <Cell key={i} fill={partyColor(d.party,partyColors)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Women Winners per Election" sub="Female MLA count across elections">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={womenChart} barSize={24}>
              <XAxis dataKey="year" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT_STYLE} />
              <defs>
                <linearGradient id="womenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <Bar dataKey="winners" fill="url(#womenGrad)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Battlegrounds + Strongholds ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} id="bottom-row">
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>Battleground Seats — {selYear}</p>
              <p style={{ fontSize:11, color:'#475569', marginTop:2 }}>Tightest margins</p>
            </div>
            <Link to="/analytics" style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#818cf8', textDecoration:'none', fontWeight:500 }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {tgSeats.length === 0
            ? <div style={{ textAlign:'center', padding:'32px 0', color:'#334155', fontSize:13, fontStyle:'italic' }}>Results pending for {selYear}</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {tgSeats.map((r,i) => (
                  <Link key={i} to={`/constituency/${slugify(r.name)}`}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 10px', borderRadius:10, textDecoration:'none', background:'rgba(255,255,255,0)', border:'1px solid transparent', transition:'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor='#1e293b'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0)'; e.currentTarget.style.borderColor='transparent'; }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <span style={{ fontSize:11, color:'#334155', fontVariantNumeric:'tabular-nums', width:18, textAlign:'center' }}>{i+1}</span>
                      <span style={{ fontSize:13, color:'#cbd5e1', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" />
                      <span style={{ fontSize:12, fontWeight:700, color:r.margin_pct < 3 ? '#f87171' : '#fbbf24', fontVariantNumeric:'tabular-nums' }}>{formatPct(r.margin_pct)}</span>
                    </div>
                  </Link>
                ))}
              </div>
          }
        </div>

        <div className="card" style={{ padding:20 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom:2 }}>Party Strongholds</p>
          <p style={{ fontSize:11, color:'#475569', marginBottom:14 }}>3+ consecutive wins</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
            {Object.entries(strongholdByParty).sort((a,b) => b[1]-a[1]).slice(0,6).map(([party,count]) => (
              <div key={party} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:10, background:'#0f172a', border:'1px solid #1e293b' }}>
                <PartyBadge party={party} partyColors={partyColors} size="xs" />
                <span style={{ fontSize:14, fontWeight:700, color:'#f8fafc' }}>{count}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:2, maxHeight:160, overflowY:'auto' }}>
            {Object.entries(strongholds).slice(0,12).map(([name,info]) => (
              <Link key={name} to={`/constituency/${slugify(name)}`}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 8px', borderRadius:8, textDecoration:'none', transition:'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <span style={{ fontSize:12, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, marginLeft:8 }}>
                  <PartyBadge party={info.party} partyColors={partyColors} size="xs" />
                  <span style={{ fontSize:11, color:'#334155' }}>{info.streak}×</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick nav ── */}
      <div>
        <div style={{ marginBottom:16 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#f8fafc' }}>Explore</h2>
          <p style={{ fontSize:12, color:'#475569', marginTop:2 }}>Jump into any section</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }} id="nav-grid">
          <style>{`@media(max-width:768px){#nav-grid{grid-template-columns:repeat(2,1fr)}}`}</style>
          {[
            { to:'/districts',      label:'Browse Districts',   sub:'38 districts',             icon:MapPin,   color:'#3b82f6' },
            { to:'/constituencies', label:'All Constituencies', sub:'234 seats',                icon:Map,      color:'#10b981' },
            { to:'/analytics',      label:'Analytics Hub',      sub:'Swing · Margins · Trends', icon:BarChart3,color:'#8b5cf6' },
            { to:'/compare',        label:'Compare Tool',       sub:'Constituency · Party',     icon:GitCompare,color:'#f59e0b' },
          ].map(({ to, label, sub, icon:Icon, color },i) => (
            <motion.div key={to} {...stagger(i)}>
              <Link to={to} className="card-hover" style={{ display:'block', padding:20, textDecoration:'none', borderColor:`${color}22` }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <p style={{ fontSize:13, fontWeight:600, color:'#f8fafc', marginBottom:4 }}>{label}</p>
                <p style={{ fontSize:11, color:'#475569', marginBottom:12 }}>{sub}</p>
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color }}>
                  Explore <ArrowRight size={11} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
