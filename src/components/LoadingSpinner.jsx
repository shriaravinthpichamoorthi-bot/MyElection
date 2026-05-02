import { motion, useReducedMotion } from 'framer-motion';

function Sk({ w, h = 20 }) {
  return <div className="skeleton" style={{ width:w, height:h, borderRadius:8 }} />;
}

function TableSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <Sk w={200} h={28} />
          <Sk w={140} h={14} />
        </div>
        <Sk w={120} h={34} />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <Sk w={200} h={34} />
        <Sk w={140} h={34} />
        <Sk w={120} h={34} />
        <Sk w={120} h={34} />
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {[...Array(8)].map((_,i) => (
          <div key={i} style={{ display:'flex', gap:12, padding:'12px 16px', borderBottom:'1px solid #0f172a', alignItems:'center' }}>
            <Sk w={160} h={16} />
            <Sk w={100} h={16} />
            <Sk w={80} h={16} />
            <Sk w={140} h={16} />
            <Sk w={140} h={16} />
            <Sk w={80} h={16} />
            <div style={{ flex:1 }} />
            <Sk w={60} h={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:760, margin:'0 auto', width:'100%' }}>
      <Sk w={120} h={18} />
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <Sk w={240} h={28} />
          <Sk w={180} h={14} />
        </div>
        <Sk w={100} h={28} />
      </div>
      <Sk w="100%" h={80} />
      <div className="card" style={{ padding:'20px 24px' }}>
        {[...Array(5)].map((_,i) => (
          <div key={i} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid #0f172a', alignItems:'center' }}>
            <Sk w={28} h={28} />
            <div style={{ flex:1 }}>
              <Sk w={180} h={16} />
              <div style={{ marginTop:6 }}><Sk w={80} h={12} /></div>
            </div>
            <Sk w={80} h={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <Sk w={260} h={32} />
          <Sk w={180} h={14} />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[...Array(6)].map((_,i) => <Sk key={i} w={56} h={32} />)}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
        {[...Array(6)].map((_,i) => <Sk key={i} h={88} />)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Sk h={220} />
        <Sk h={220} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Sk h={240} />
        <Sk h={240} />
      </div>
    </div>
  );
}

export default function LoadingSpinner({ message = 'Loading election data…', variant = 'dashboard' }) {
  const reduceMotion = useReducedMotion();
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {variant === 'table' && <TableSkeleton />}
      {variant === 'detail' && <DetailSkeleton />}
      {variant === 'dashboard' && <DashboardSkeleton />}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={reduceMotion ? {} : { delay:0.4 }}
        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, paddingTop:8 }}>
        <div style={{ display:'flex', gap:5 }}>
          {[0,1,2].map(i => (
            <motion.span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', display:'block' }}
              animate={reduceMotion ? {} : { y:[0,-8,0] }} transition={{ duration:0.6, delay:i*0.15, repeat:Infinity }} />
          ))}
        </div>
        <span style={{ fontSize:13, color:'#475569' }}>{message}</span>
      </motion.div>
    </div>
  );
}
