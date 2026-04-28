import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const colorMap = {
  blue:   { icon: 'text-blue-400',   glow: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.2)',  bg: 'rgba(59,130,246,0.06)'  },
  green:  { icon: 'text-emerald-400', glow: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.2)',  bg: 'rgba(52,211,153,0.06)'  },
  red:    { icon: 'text-red-400',     glow: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.2)', bg: 'rgba(248,113,113,0.06)' },
  yellow: { icon: 'text-amber-400',   glow: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.2)',  bg: 'rgba(251,191,36,0.06)'  },
  purple: { icon: 'text-violet-400',  glow: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.2)', bg: 'rgba(167,139,250,0.06)' },
  pink:   { icon: 'text-pink-400',    glow: 'rgba(244,114,182,0.15)', border: 'rgba(244,114,182,0.2)', bg: 'rgba(244,114,182,0.06)' },
  indigo: { icon: 'text-indigo-400',  glow: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.2)',  bg: 'rgba(99,102,241,0.06)'  },
};

export default function StatCard({ label, value, sub, color = 'blue', icon: Icon, trend }) {
  const c = colorMap[color] || colorMap.blue;
  const [visible, setVisible] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="relative rounded-2xl p-5 overflow-hidden cursor-default"
      style={{
        background: `linear-gradient(135deg, ${c.bg}, rgba(13,22,48,0.5))`,
        border: `1px solid ${c.border}`,
        boxShadow: `0 4px 24px ${c.glow}`,
      }}>
      {/* Subtle top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${c.border}, transparent)` }} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">{label}</p>
          <motion.p
            key={value}
            initial={{ opacity: 0, y: 6 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="text-2xl font-bold text-white leading-none font-['Space_Grotesk',sans-serif]">
            {value}
          </motion.p>
          {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
          {trend != null && (
            <p className={`text-xs mt-1.5 font-medium ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-slate-500'}`}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'} {Math.abs(trend).toFixed(1)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl shrink-0" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
