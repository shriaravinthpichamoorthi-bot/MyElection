import { motion } from 'framer-motion';

const C = {
  blue:   { bg:'#0c1a2e', border:'#1d3a5c', text:'#60a5fa', icon:'rgba(59,130,246,0.2)'  },
  green:  { bg:'#0a1f18', border:'#14402e', text:'#34d399', icon:'rgba(52,211,153,0.2)'  },
  red:    { bg:'#1f0a0a', border:'#4a1515', text:'#f87171', icon:'rgba(248,113,113,0.2)' },
  yellow: { bg:'#1a1300', border:'#3d2e00', text:'#fbbf24', icon:'rgba(251,191,36,0.2)'  },
  purple: { bg:'#130d2e', border:'#2d1f5e', text:'#a78bfa', icon:'rgba(167,139,250,0.2)' },
  pink:   { bg:'#1f0d1a', border:'#4a1a3a', text:'#f472b6', icon:'rgba(244,114,182,0.2)' },
  indigo: { bg:'#0d0f2e', border:'#1e2260', text:'#818cf8', icon:'rgba(129,140,248,0.2)' },
};

export default function StatCard({ label, value, sub, color = 'blue', icon: Icon }) {
  const c = C[color] || C.blue;
  return (
    <motion.div
      initial={{ opacity:0, y:12 }}
      whileInView={{ opacity:1, y:0 }}
      viewport={{ once:true }}
      whileHover={{ y:-3 }}
      transition={{ duration:0.25 }}
      style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
      {/* top glow line */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg, transparent, ${c.border}, transparent)` }} />

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#475569', marginBottom:8 }}>{label}</p>
          <p style={{ fontSize:22, fontWeight:700, color:c.text, lineHeight:1, fontFamily:"'Space Grotesk',sans-serif" }}>{value ?? '—'}</p>
          {sub && <p style={{ fontSize:11, color:'#475569', marginTop:6 }}>{sub}</p>}
        </div>
        {Icon && (
          <div style={{ padding:10, borderRadius:10, background:c.icon, border:`1px solid ${c.border}`, flexShrink:0 }}>
            <Icon size={18} style={{ color:c.text }} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
