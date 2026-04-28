import { motion } from 'framer-motion';

export default function YearBadge({ year, onClick, active }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
        active
          ? 'year-pill-active text-white shadow-lg'
          : 'bg-white/5 text-slate-400 hover:text-white border border-white/8'
      }`}>
      {year}
    </motion.button>
  );
}
