import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LiveResultsBanner() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        style={{ overflow: 'hidden', borderBottom: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)', flexShrink: 0 }}>
        <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live indicator */}
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>LIVE 2026</span>

          <CalendarClock size={13} style={{ color: '#818cf8', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>
            Results will appear here on election day
          </span>

          <Link to="/live" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 600, marginLeft: 4, flexShrink: 0 }}
            onMouseEnter={e => e.target.style.color = '#818cf8'}
            onMouseLeave={e => e.target.style.color = '#6366f1'}>
            View nominations →
          </Link>

          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setOpen(false)}
              style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#334155', borderRadius: 4 }}>
              <X size={12} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
