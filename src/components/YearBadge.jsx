import { motion } from 'framer-motion';

export default function YearBadge({ year, onClick, active }) {
  return (
    <motion.button whileTap={{ scale:0.94 }} onClick={onClick}
      className={active ? 'pill-active' : 'pill-idle'}
      style={{ padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
      {year}
    </motion.button>
  );
}
