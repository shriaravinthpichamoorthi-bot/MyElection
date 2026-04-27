export default function StatCard({ label, value, sub, color = 'blue', icon }) {
  const colors = {
    blue: 'from-blue-900/40 to-blue-800/20 border-blue-800/50',
    green: 'from-green-900/40 to-green-800/20 border-green-800/50',
    red: 'from-red-900/40 to-red-800/20 border-red-800/50',
    yellow: 'from-yellow-900/40 to-yellow-800/20 border-yellow-800/50',
    purple: 'from-purple-900/40 to-purple-800/20 border-purple-800/50',
    pink: 'from-pink-900/40 to-pink-800/20 border-pink-800/50',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-70">{icon}</span>}
      </div>
    </div>
  );
}
