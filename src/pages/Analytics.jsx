import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts';
import { BarChart3, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import { formatNumber, formatPct, partyColor, allianceColor, slugify } from '../utils/helpers';

const TABS = ['Overview','Swing','Margins','Incumbency','Strongholds','Women','Turnout'];
const YEARS = [2001,2006,2011,2016,2021];

const TT = {
  contentStyle:{ background:'#0f172a', border:'1px solid #1e293b', borderRadius:10, color:'#e2e8f0', fontSize:12 },
  cursor:{ fill:'rgba(99,102,241,0.05)' },
};

const selectStyle = { background:'#0f172a', border:'1px solid #1e293b', borderRadius:10, color:'#e2e8f0', fontSize:13, padding:'7px 12px', outline:'none', cursor:'pointer', fontFamily:'inherit' };

function CardBox({ title, sub, children, style }) {
  return (
    <motion.div initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.3 }}
      className="card" style={{ padding:20, ...style }}>
      {title && <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom: sub ? 2 : 14 }}>{title}</p>}
      {sub && <p style={{ fontSize:11, color:'#475569', marginBottom:14 }}>{sub}</p>}
      {children}
    </motion.div>
  );
}

export default function Analytics() {
  const { data, loading } = useData();
  const [tab, setTab] = useState('Overview');
  const [swingYear1, setSwingYear1] = useState(2016);
  const [swingYear2, setSwingYear2] = useState(2021);
  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ maxWidth:1200, display:'flex', flexDirection:'column', gap:28 }}>
      {/* Header */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BarChart3 size={18} color="#a78bfa" />
          </div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#f8fafc' }}>Analytics Hub</h1>
        </div>
        <p style={{ fontSize:13, color:'#475569', paddingLeft:48 }}>Swing · Margins · Incumbency · Strongholds · Women Representation</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, borderBottom:'1px solid #1e293b', paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding:'10px 18px', borderRadius:'10px 10px 0 0', fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit', border:'none', transition:'all 0.15s',
              background: tab===t ? '#0f172a' : 'transparent',
              color: tab===t ? '#818cf8' : '#475569',
              borderBottom: tab===t ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.18 }}>
          {tab==='Overview'    && <OverviewTab data={data} />}
          {tab==='Swing'       && <SwingTab data={data} y1={swingYear1} setY1={setSwingYear1} y2={swingYear2} setY2={setSwingYear2} />}
          {tab==='Margins'     && <MarginsTab data={data} />}
          {tab==='Incumbency'  && <IncumbencyTab data={data} />}
          {tab==='Strongholds' && <StrongholdsTab data={data} />}
          {tab==='Women'       && <WomenTab data={data} />}
          {tab==='Turnout'     && <TurnoutTab data={data} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function OverviewTab({ data }) {
  const { partyPerf, alliancePerf, stateSummary, partyColors, allianceColors } = data;
  const ALL_YEARS = [2001,2006,2011,2016,2021,2026];
  const TOP_PARTIES = ['DMK','AIADMK','INC','BJP','PMK','CPM','DMDK'];

  const partyTrend = ALL_YEARS.map(y => {
    const perf = partyPerf[y] || {};
    const obj = { year:y };
    TOP_PARTIES.forEach(p => { obj[p] = perf[p]?.seats || 0; });
    return obj;
  });

  const allianceTrend = ALL_YEARS.map(y => {
    const perf = alliancePerf[y] || {};
    return {
      year:y,
      'DMK Alliance': perf['DMK Alliance']||0,
      'AIADMK/ADMK': (perf['AIADMK Alliance']||0)+(perf['ADMK Alliance']||0),
      'Others': Object.entries(perf).filter(([k])=>!k.includes('DMK')&&!k.includes('ADMK')).reduce((s,[,v])=>s+v,0),
    };
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} id="ov-grid">
        <style>{`@media(max-width:768px){#ov-grid{grid-template-columns:1fr}}`}</style>
        <CardBox title="Party Seats — All Elections">
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={partyTrend}>
              <XAxis dataKey="year" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontSize:11, color:'#64748b' }} />
              {TOP_PARTIES.map(p => (
                <Line key={p} type="monotone" dataKey={p} stroke={partyColor(p,{})} strokeWidth={2} dot={{ r:3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardBox>
        <CardBox title="Alliance Seats — All Elections">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={allianceTrend}>
              <XAxis dataKey="year" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontSize:11, color:'#64748b' }} />
              <Bar dataKey="DMK Alliance" fill="#ef4444" stackId="a" />
              <Bar dataKey="AIADMK/ADMK" fill="#22c55e" stackId="a" />
              <Bar dataKey="Others" fill="#6366f1" stackId="a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBox>
      </div>

      <CardBox title="State Summary — All Elections">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Year','Total Electors','Total Votes','Turnout','Seats','Alliance Results'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#475569', borderBottom:'1px solid #1e293b', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stateSummary.map((s,i) => (
                <tr key={i} className="tbl-row">
                  <td style={{ fontWeight:700, color:'#f8fafc', padding:'11px 16px', borderBottom:'1px solid #0f172a' }}>{s.year}</td>
                  <td style={{ color:'#94a3b8', padding:'11px 16px', borderBottom:'1px solid #0f172a', fontSize:13 }}>{formatNumber(s.total_electors)}</td>
                  <td style={{ color:'#94a3b8', padding:'11px 16px', borderBottom:'1px solid #0f172a', fontSize:13 }}>{formatNumber(s.total_votes)}</td>
                  <td style={{ fontWeight:600, color:'#60a5fa', padding:'11px 16px', borderBottom:'1px solid #0f172a', fontSize:13 }}>{formatPct(s.turnout_pct)}</td>
                  <td style={{ color:'#94a3b8', padding:'11px 16px', borderBottom:'1px solid #0f172a', fontSize:13 }}>{s.constituencies}</td>
                  <td style={{ padding:'11px 16px', borderBottom:'1px solid #0f172a' }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {Object.entries(s.alliance_seats||{}).filter(([k,v])=>k!=='null'&&v>0).map(([k,v]) => (
                        <span key={k} style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:allianceColor(k,{})+'20', color:allianceColor(k,{}), border:`1px solid ${allianceColor(k,{})}40`, fontWeight:600 }}>
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBox>
    </div>
  );
}

function SwingTab({ data, y1, setY1, y2, setY2 }) {
  const { constituencies, byConstituency, partyColors } = data;
  const [swingSearch, setSwingSearch] = useState('');

  const swingRows = useMemo(() => {
    return constituencies.map(name => {
      const hist = byConstituency[name]||[];
      const r1 = hist.find(r=>r.year===y1), r2 = hist.find(r=>r.year===y2);
      if (!r1||!r2) return null;
      return { name, district:r2.district, party1:r1.winner_party, party2:r2.winner_party,
        flipped:r1.winner_party!==r2.winner_party,
        marginSwing:(r2.margin_pct||0)-(r1.margin_pct||0), turnoutSwing:(r2.turnout_pct||0)-(r1.turnout_pct||0),
        winner1:r1.winner_name, winner2:r2.winner_name };
    }).filter(Boolean);
  }, [constituencies, byConstituency, y1, y2]);

  const flipped = swingRows.filter(r => r.flipped && (!swingSearch || r.name.toLowerCase().includes(swingSearch.toLowerCase()) || (r.district||'').toLowerCase().includes(swingSearch.toLowerCase())));
  const held = swingRows.filter(r => !r.flipped);
  const { sorted, col, dir, toggle } = useSortable(flipped, 'name');

  const flipsByParty = {};
  flipped.forEach(r => { flipsByParty[r.party2] = (flipsByParty[r.party2]||0)+1; });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Controls */}
      <div className="card" style={{ padding:'14px 18px', display:'flex', flexWrap:'wrap', alignItems:'center', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, color:'#64748b', fontWeight:500 }}>From</span>
          <select value={y1} onChange={e=>setY1(Number(e.target.value))} style={selectStyle}>
            {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, color:'#64748b', fontWeight:500 }}>To</span>
          <select value={y2} onChange={e=>setY2(Number(e.target.value))} style={selectStyle}>
            {YEARS.filter(y=>y>y1).map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', gap:20, marginLeft:'auto' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#f87171' }}>{flipped.length} seats flipped</span>
          <span style={{ fontSize:14, fontWeight:700, color:'#34d399' }}>{held.length} seats held</span>
        </div>
      </div>

      {/* Gains by party */}
      <CardBox title={`Seats Gained ${y1}→${y2}`} sub="Parties that gained seats in the swing">
        <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
          {Object.entries(flipsByParty).sort((a,b)=>b[1]-a[1]).map(([party,count]) => (
            <div key={party} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#111827', border:'1px solid #1e293b', borderRadius:10 }}>
              <PartyBadge party={party} partyColors={partyColors} size="xs" />
              <span style={{ fontSize:16, fontWeight:800, color:'#34d399' }}>+{count}</span>
            </div>
          ))}
        </div>
      </CardBox>

      {/* Flipped seats table */}
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e293b', display:'flex', alignItems:'center', gap:16 }}>
          <p style={{ fontSize:14, fontWeight:600, color:'#f8fafc' }}>Flipped Seats ({y1} → {y2})</p>
          <div style={{ marginLeft:'auto', position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#475569' }} />
            <input value={swingSearch} onChange={e=>setSwingSearch(e.target.value)} placeholder="Search constituency…"
              className="field" style={{ paddingLeft:30, width:200 }} />
          </div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <SortTh label="Constituency" col="name" activeCol={col} dir={dir} onSort={toggle} />
                <SortTh label="District" col="district" activeCol={col} dir={dir} onSort={toggle} />
                <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#475569', borderBottom:'1px solid #1e293b', whiteSpace:'nowrap' }}>{y1} Winner</th>
                <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#475569', borderBottom:'1px solid #1e293b' }}>{y1} Party</th>
                <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#475569', borderBottom:'1px solid #1e293b', whiteSpace:'nowrap' }}>{y2} Winner</th>
                <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#475569', borderBottom:'1px solid #1e293b' }}>{y2} Party</th>
                <SortTh label="Margin Δ" col="marginSwing" activeCol={col} dir={dir} onSort={toggle} />
                <SortTh label="Turnout Δ" col="turnoutSwing" activeCol={col} dir={dir} onSort={toggle} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r,i) => (
                <tr key={i} className="tbl-row">
                  <td style={{ padding:'10px 16px', borderBottom:'1px solid #0f172a' }}>
                    <Link to={`/constituency/${slugify(r.name)}`} style={{ color:'#818cf8', textDecoration:'none', fontSize:13, fontWeight:500 }}>{r.name}</Link>
                  </td>
                  <td style={{ padding:'10px 16px', borderBottom:'1px solid #0f172a', color:'#475569', fontSize:12 }}>{r.district}</td>
                  <td style={{ padding:'10px 16px', borderBottom:'1px solid #0f172a', color:'#94a3b8', fontSize:12, whiteSpace:'nowrap' }}>{r.winner1}</td>
                  <td style={{ padding:'10px 16px', borderBottom:'1px solid #0f172a' }}><PartyBadge party={r.party1} partyColors={partyColors} size="xs" /></td>
                  <td style={{ padding:'10px 16px', borderBottom:'1px solid #0f172a', color:'#94a3b8', fontSize:12, whiteSpace:'nowrap' }}>{r.winner2}</td>
                  <td style={{ padding:'10px 16px', borderBottom:'1px solid #0f172a' }}><PartyBadge party={r.party2} partyColors={partyColors} size="xs" /></td>
                  <td style={{ padding:'10px 16px', borderBottom:'1px solid #0f172a', fontSize:12, fontWeight:600, color:r.marginSwing>0?'#34d399':'#f87171' }}>
                    {r.marginSwing>0?'+':''}{r.marginSwing.toFixed(1)}%
                  </td>
                  <td style={{ padding:'10px 16px', borderBottom:'1px solid #0f172a', fontSize:12, fontWeight:600, color:r.turnoutSwing>0?'#60a5fa':'#fbbf24' }}>
                    {r.turnoutSwing>0?'+':''}{r.turnoutSwing.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MarginsTab({ data }) {
  const { byYear, partyColors, classifyMargin } = data;
  const [selYear, setSelYear] = useState(2021);
  const recs = (byYear[selYear]||[]).filter(r=>r.margin_pct!=null);
  const tossups = recs.filter(r=>classifyMargin(r.margin_pct)==='toss-up');
  const bg = recs.filter(r=>classifyMargin(r.margin_pct)==='battleground');
  const safe = recs.filter(r=>classifyMargin(r.margin_pct)==='safe');
  const dist = [
    { name:'Toss-Up (<3%)', value:tossups.length, fill:'#ef4444' },
    { name:'Battleground (3-8%)', value:bg.length, fill:'#f59e0b' },
    { name:'Safe (>8%)', value:safe.length, fill:'#10b981' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:16 }}>
        <span style={{ fontSize:13, color:'#64748b', fontWeight:500 }}>Year</span>
        <div style={{ display:'flex', gap:8 }}>
          {[2001,2006,2011,2016,2021].map(y => (
            <motion.button key={y} whileTap={{ scale:0.94 }} onClick={()=>setSelYear(y)}
              className={selYear===y?'pill-active':'pill-idle'}
              style={{ padding:'6px 14px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {y}
            </motion.button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }} id="mg-top">
        <style>{`@media(max-width:600px){#mg-top{grid-template-columns:1fr}}`}</style>
        {dist.map(d => (
          <div key={d.name} className="card" style={{ padding:20, textAlign:'center', borderColor:d.fill+'30' }}>
            <p style={{ fontSize:36, fontWeight:800, color:d.fill, fontFamily:"'Space Grotesk',sans-serif" }}>{d.value}</p>
            <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginTop:4 }}>{d.name}</p>
            <p style={{ fontSize:12, color:'#475569', marginTop:4 }}>
              {recs.length ? ((d.value/recs.length)*100).toFixed(1)+'% of seats' : ''}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} id="mg-charts">
        <style>{`@media(max-width:768px){#mg-charts{grid-template-columns:1fr}}`}</style>
        <CardBox title={`Margin Distribution — ${selYear}`}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={dist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({value})=>value}>
                {dist.map((d,i)=><Cell key={i} fill={d.fill} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize:12, color:'#64748b' }} />
              <Tooltip {...TT} />
            </PieChart>
          </ResponsiveContainer>
        </CardBox>

        <CardBox title={`10 Tightest Seats — ${selYear}`} sub="Constituencies won by smallest margins">
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {recs.sort((a,b)=>a.margin_pct-b.margin_pct).slice(0,10).map((r,i)=>(
              <Link key={i} to={`/constituency/${slugify(r.name)}`}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:10, textDecoration:'none', background:'rgba(255,255,255,0)', border:'1px solid transparent', transition:'all 0.12s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor='#1e293b';}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent';}}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'#334155', width:18, textAlign:'center' }}>{i+1}</span>
                  <span style={{ fontSize:13, color:'#cbd5e1' }}>{r.name}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" />
                  <span style={{ fontSize:12, fontWeight:700, color:'#f87171', fontVariantNumeric:'tabular-nums' }}>{r.margin_pct.toFixed(2)}%</span>
                </div>
              </Link>
            ))}
          </div>
        </CardBox>
      </div>
    </div>
  );
}

function IncumbencyTab({ data }) {
  const { byConstituency, constituencies } = data;
  const incStats = YEARS.slice(1).map(y => {
    let won=0, lost=0;
    constituencies.forEach(name => {
      const hist = byConstituency[name]||[];
      const prev = hist.find(r=>r.year===YEARS[YEARS.indexOf(y)-1]);
      const curr = hist.find(r=>r.year===y);
      if (!prev||!curr) return;
      if (prev.winner_party===curr.winner_party) won++; else lost++;
    });
    return { year:y, won, lost, rate:won+lost ? +((won/(won+lost))*100).toFixed(1) : 0 };
  });

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} id="inc-grid">
      <style>{`@media(max-width:768px){#inc-grid{grid-template-columns:1fr}}`}</style>
      <CardBox title="Incumbency Retention Rate" sub="Parties retaining vs losing seats each election">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={incStats}>
            <XAxis dataKey="year" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
            <Tooltip {...TT} />
            <Legend wrapperStyle={{ fontSize:11, color:'#64748b' }} />
            <Bar dataKey="won" name="Retained" fill="#10b981" stackId="a" />
            <Bar dataKey="lost" name="Flipped" fill="#ef4444" stackId="a" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBox>
      <CardBox title="Retention Rate by Election" sub="% of incumbents who retained their seat">
        <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:8 }}>
          {incStats.map(s => (
            <div key={s.year} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:13, color:'#64748b', fontWeight:600, width:36 }}>{s.year}</span>
              <div style={{ flex:1, background:'#1e293b', borderRadius:999, height:8, overflow:'hidden' }}>
                <motion.div initial={{ width:0 }} whileInView={{ width:`${s.rate}%` }} viewport={{ once:true }}
                  transition={{ duration:0.8, delay:0.1 }}
                  style={{ height:'100%', borderRadius:999, background:'linear-gradient(90deg,#6366f1,#10b981)' }} />
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:'#34d399', width:42 }}>{s.rate}%</span>
              <span style={{ fontSize:11, color:'#334155', width:56, whiteSpace:'nowrap' }}>{s.won}W/{s.lost}L</span>
            </div>
          ))}
        </div>
      </CardBox>
    </div>
  );
}

function StrongholdsTab({ data }) {
  const { strongholds, partyColors } = data;
  const byParty = {};
  Object.entries(strongholds).forEach(([name,info]) => {
    if (!byParty[info.party]) byParty[info.party] = [];
    byParty[info.party].push({ name, streak:info.streak });
  });

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }} id="sh-grid">
      <style>{`@media(max-width:900px){#sh-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){#sh-grid{grid-template-columns:1fr}}`}</style>
      {Object.entries(byParty).sort((a,b)=>b[1].length-a[1].length).map(([party,seats]) => (
        <div key={party} className="card" style={{ padding:18 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <PartyBadge party={party} partyColors={partyColors} />
            <span style={{ fontSize:20, fontWeight:800, color:'#f8fafc' }}>{seats.length}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:200, overflowY:'auto' }}>
            {seats.sort((a,b)=>b.streak-a.streak).map((s,i) => (
              <Link key={i} to={`/constituency/${slugify(s.name)}`}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 8px', borderRadius:8, textDecoration:'none', transition:'background 0.12s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{ fontSize:12, color:'#94a3b8' }}>{s.name}</span>
                <span style={{ fontSize:11, color:'#475569' }}>{s.streak}× wins</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WomenTab({ data }) {
  const { womenStats } = data;
  const chartData = YEARS.map(y => {
    const s = womenStats[y]||{};
    return {
      year:y, candidates:s.femaleCandidates||0, winners:s.femaleWinners||0,
      candPct:s.totalCandidates ? +((s.femaleCandidates/s.totalCandidates)*100).toFixed(1) : 0,
      winPct:s.seats ? +((s.femaleWinners/s.seats)*100).toFixed(1) : 0,
    };
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }} id="w-top">
        <style>{`@media(max-width:900px){#w-top{grid-template-columns:repeat(3,1fr)}}@media(max-width:600px){#w-top{grid-template-columns:repeat(2,1fr)}}`}</style>
        {chartData.map(d => (
          <div key={d.year} className="card" style={{ padding:16, borderColor:'rgba(244,114,182,0.2)' }}>
            <p style={{ fontSize:11, color:'#475569', fontWeight:600, marginBottom:4 }}>{d.year}</p>
            <p style={{ fontSize:22, fontWeight:800, color:'#f472b6', fontFamily:"'Space Grotesk',sans-serif" }}>{d.winners}</p>
            <p style={{ fontSize:11, color:'#475569', marginTop:4 }}>{d.candidates} candidates</p>
            <p style={{ fontSize:11, color:'#475569' }}>{d.winPct}% of seats</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} id="w-charts">
        <style>{`@media(max-width:768px){#w-charts{grid-template-columns:1fr}}`}</style>
        <CardBox title="Women Winners Trend" sub="Female candidates and winners per election">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="year" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontSize:11, color:'#64748b' }} />
              <Line type="monotone" dataKey="candidates" stroke="#a855f7" strokeWidth={2} name="Candidates" dot={{ r:3 }} />
              <Line type="monotone" dataKey="winners" stroke="#f472b6" strokeWidth={2.5} name="Winners" dot={{ r:4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardBox>
        <CardBox title="Female % — Candidates vs Winners">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={22}>
              <XAxis dataKey="year" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#475569', fontSize:11 }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={v=>[v+'%']} />
              <Legend wrapperStyle={{ fontSize:11, color:'#64748b' }} />
              <Bar dataKey="candPct" name="Candidates %" fill="#a855f7" radius={[4,4,0,0]} />
              <Bar dataKey="winPct" name="Winners %" fill="#f472b6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBox>
      </div>
    </div>
  );
}

function TurnoutTab({ data }) {
  const { byYear, districts, byDistrictYear } = data;
  const ALL_YEARS = [2001,2006,2011,2016,2021,2026];
  const [selYear, setSelYear] = useState(2026);
  const recs = (byYear[selYear]||[]).filter(r=>r.turnout_pct!=null).sort((a,b)=>b.turnout_pct-a.turnout_pct);

  const districtTurnout = districts.map(d => {
    const obj = { district:d };
    ALL_YEARS.forEach(y => {
      const r = byDistrictYear[`${d}||${y}`]||[];
      obj[y] = r.length ? +(r.reduce((s,x)=>s+(x.turnout_pct||0),0)/r.length).toFixed(1) : null;
    });
    return obj;
  });

  const colorFor = v => v==null ? '#334155' : v>=80 ? '#34d399' : v>=65 ? '#fbbf24' : '#f87171';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:16 }}>
        <span style={{ fontSize:13, color:'#64748b', fontWeight:500 }}>Year</span>
        <div style={{ display:'flex', gap:8 }}>
          {ALL_YEARS.map(y => (
            <motion.button key={y} whileTap={{ scale:0.94 }} onClick={()=>setSelYear(y)}
              className={selYear===y?'pill-active':'pill-idle'}
              style={{ padding:'6px 14px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {y}{y===2026?' ★':''}
            </motion.button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} id="to-lists">
        <style>{`@media(max-width:768px){#to-lists{grid-template-columns:1fr}}`}</style>
        <CardBox title={`Highest Turnout — ${selYear}`} sub="Top 20 constituencies">
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:320, overflowY:'auto' }}>
            {recs.slice(0,20).map((r,i) => (
              <Link key={i} to={`/constituency/${slugify(r.name)}`}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 8px', borderRadius:8, textDecoration:'none', transition:'background 0.12s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{ fontSize:11, color:'#334155', width:18, textAlign:'center' }}>{i+1}</span>
                <span style={{ fontSize:13, color:'#cbd5e1', flex:1 }}>{r.name}</span>
                <span style={{ fontSize:11, color:'#475569' }}>{r.district}</span>
                <span style={{ fontSize:12, fontWeight:700, color:colorFor(r.turnout_pct) }}>{r.turnout_pct?.toFixed(1)}%</span>
              </Link>
            ))}
          </div>
        </CardBox>
        <CardBox title={`Lowest Turnout — ${selYear}`} sub="Bottom 20 constituencies">
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:320, overflowY:'auto' }}>
            {recs.slice(-20).reverse().map((r,i) => (
              <Link key={i} to={`/constituency/${slugify(r.name)}`}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 8px', borderRadius:8, textDecoration:'none', transition:'background 0.12s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{ fontSize:11, color:'#334155', width:18, textAlign:'center' }}>{i+1}</span>
                <span style={{ fontSize:13, color:'#cbd5e1', flex:1 }}>{r.name}</span>
                <span style={{ fontSize:11, color:'#475569' }}>{r.district}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#f87171' }}>{r.turnout_pct?.toFixed(1)}%</span>
              </Link>
            ))}
          </div>
        </CardBox>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e293b' }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#f8fafc' }}>District Average Turnout — All Years</p>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#475569', borderBottom:'1px solid #1e293b' }}>District</th>
                {ALL_YEARS.map(y=><th key={y} style={{ padding:'10px 12px', textAlign:'center', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#475569', borderBottom:'1px solid #1e293b' }}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {districtTurnout.map((row,i) => (
                <tr key={i} className="tbl-row">
                  <td style={{ padding:'9px 16px', borderBottom:'1px solid #0f172a' }}>
                    <Link to={`/district/${slugify(row.district)}`} style={{ color:'#818cf8', textDecoration:'none', fontSize:13, fontWeight:500 }}>{row.district}</Link>
                  </td>
                  {ALL_YEARS.map(y => {
                    const v = row[y];
                    return <td key={y} style={{ padding:'9px 12px', textAlign:'center', fontSize:12, fontWeight:600, color:colorFor(v), borderBottom:'1px solid #0f172a' }}>{v!=null ? v+'%' : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
