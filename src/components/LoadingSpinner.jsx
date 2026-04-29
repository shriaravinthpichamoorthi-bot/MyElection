import { motion } from 'framer-motion';

function Sk({ w, h = 20 }) {
  return <div className="skeleton" style={{ width:w, height:h, borderRadius:8 }} />;
}

export default function LoadingSpinner({ message = 'Loading election data…' }) {
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
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, paddingTop:8 }}>
        <div style={{ display:'flex', gap:5 }}>
          {[0,1,2].map(i => (
            <motion.span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', display:'block' }}
              animate={{ y:[0,-8,0] }} transition={{ duration:0.6, delay:i*0.15, repeat:Infinity }} />
          ))}
        </div>
        <span style={{ fontSize:13, color:'#475569' }}>{message}</span>
      </motion.div>
    </div>
  );
}
