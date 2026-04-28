import { motion } from 'framer-motion';

function SkeletonBlock({ className }) {
  return <div className={`skeleton ${className}`} />;
}

export default function LoadingSpinner({ message = 'Loading election data…' }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          {[...Array(6)].map((_, i) => <SkeletonBlock key={i} className="h-8 w-14 rounded-full" />)}
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <SkeletonBlock key={i} className="h-24 rounded-2xl" />)}
      </div>

      {/* Chart skeletons */}
      <div className="grid lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => <SkeletonBlock key={i} className="h-56 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => <SkeletonBlock key={i} className="h-64 rounded-2xl" />)}
      </div>

      {/* Loading label */}
      <motion.div
        className="flex items-center justify-center gap-3 py-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
          ))}
        </div>
        <span className="text-sm text-slate-500">{message}</span>
      </motion.div>
    </div>
  );
}
