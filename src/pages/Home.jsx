import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  MapPin, BarChart3, GitCompare, Map, ArrowRight,
  Flame, Shield, TrendingUp, Users,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import PartyBadge from '../components/PartyBadge';
import { formatNumber, formatPct, partyColor, allianceColor, slugify, YEARS } from '../utils/helpers';

const CHART_STYLE = {
  contentStyle: {
    background: 'rgba(8,13,25,0.95)',
    border: '1px solid rgba(99,120,190,0.2)',
    borderRadius: '12px',
    color: '#e2e8f0',
    fontSize: '12px',
    backdropFilter: 'blur(16px)',
  },
};

function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function ChartCard({ title, sub, children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      className={`glass rounded-2xl p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
      {children}
    </motion.div>
  );
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};

export default function Home() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);

  if (loading) return <LoadingSpinner />;

  const { stateSummary, byYear, alliancePerf, womenStats, partyPerf, partyColors, allianceColors, battlegrounds, strongholds, districts } = data;

  const summary = stateSummary.find(s => s.year === selYear) || stateSummary[0];

  const allianceData = Object.entries(alliancePerf[selYear] || {})
    .map(([name, seats]) => ({ name, seats }))
    .sort((a, b) => b.seats - a.seats).slice(0, 6);

  const turnoutTrend = stateSummary.map(s => ({ year: s.year, turnout: s.turnout_pct }));

  const topParties = Object.entries(partyPerf[selYear] || {})
    .map(([party, d]) => ({ party, seats: d.seats }))
    .filter(p => p.seats > 0)
    .sort((a, b) => b.seats - a.seats).slice(0, 8);

  const womenChart = YEARS.filter(y => y !== 2026).map(y => ({
    year: y,
    winners: womenStats[y]?.femaleWinners || 0,
  }));

  const tgSeats = selYear === 2026 ? [] :
    (byYear[selYear] || [])
      .filter(r => r.margin_pct != null)
      .sort((a, b) => a.margin_pct - b.margin_pct)
      .slice(0, 8);

  const strongholdByParty = {};
  Object.values(strongholds).forEach(s => {
    strongholdByParty[s.party] = (strongholdByParty[s.party] || 0) + 1;
  });

  // Insight cards derived from data
  const topAlliance = allianceData[0];
  const turnoutChange = turnoutTrend.length > 1
    ? (turnoutTrend[turnoutTrend.length - 1].turnout - turnoutTrend[turnoutTrend.length - 2].turnout).toFixed(1)
    : null;

  return (
    <div className="space-y-10 max-w-7xl mx-auto">

      {/* ── Hero ───────────────────────────────────────── */}
      <div className="relative">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 pulse-dot" />
                Tamil Nadu Assembly Elections 2001–2026
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
                <span className="gradient-text">Election Intelligence</span>
                <br /><span className="text-white">at your fingertips</span>
              </h1>
              <p className="text-slate-400 mt-3 max-w-lg text-sm leading-relaxed">
                Comprehensive analytics for 234 constituencies across 38 districts.
                Swing analysis, margin tracking, candidate history, and live 2026 data.
              </p>
            </div>

            {/* Year selector */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Select Election Year</p>
              <div className="flex flex-wrap gap-2">
                {YEARS.map(y => (
                  <motion.button key={y}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setSelYear(y)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      selYear === y
                        ? 'year-pill-active text-white shadow-lg'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/8'
                    }`}>
                    {y}{y === 2026 ? ' ★' : ''}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Insight strip ──────────────────────────────── */}
      {topAlliance && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid sm:grid-cols-3 gap-3">
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Leading Alliance</p>
              <p className="text-sm font-semibold text-white truncate">{topAlliance.name}</p>
            </div>
            <span className="ml-auto text-xl font-bold text-amber-400">{topAlliance.seats}</span>
          </div>
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Avg Turnout</p>
              <p className="text-sm font-semibold text-white">{formatPct(summary?.turnout_pct)}</p>
            </div>
            {turnoutChange && (
              <span className={`ml-auto text-sm font-bold ${Number(turnoutChange) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {Number(turnoutChange) >= 0 ? '+' : ''}{turnoutChange}%
              </span>
            )}
          </div>
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <Shield className="w-4 h-4 text-violet-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Stronghold Seats</p>
              <p className="text-sm font-semibold text-white">{Object.keys(strongholds).length} constituencies</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Stat cards ─────────────────────────────────── */}
      <div>
        <SectionHeader title={`${selYear} Election — State Overview`} />
        <motion.div
          variants={stagger.container} initial="hidden" whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Electors', value: formatNumber(summary?.total_electors), color: 'blue', icon: Users },
            { label: 'Votes Cast', value: formatNumber(summary?.total_votes), color: 'green', icon: TrendingUp },
            { label: 'Turnout', value: formatPct(summary?.turnout_pct), color: 'yellow', icon: BarChart3 },
            { label: 'Constituencies', value: summary?.constituencies, color: 'purple', icon: MapPin },
            { label: 'Women Winners', value: womenStats[selYear]?.femaleWinners || '—', color: 'pink', icon: Users },
            { label: 'Districts', value: districts.length, color: 'indigo', icon: Map },
          ].map((card, i) => (
            <motion.div key={card.label} variants={stagger.item}>
              <StatCard {...card} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Charts row 1 ───────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title={`Alliance Seats — ${selYear}`} sub="Total seats won per alliance">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={allianceData} layout="vertical" barSize={14}>
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={130} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_STYLE} />
              <Bar dataKey="seats" radius={[0, 6, 6, 0]}>
                {allianceData.map((d, i) => (
                  <Cell key={i} fill={allianceColor(d.name, allianceColors)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Voter Turnout Trend" sub="State-wide turnout % across all elections">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={turnoutTrend}>
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 95]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip {...CHART_STYLE} formatter={v => [v.toFixed(1) + '%', 'Turnout']} />
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <Line type="monotone" dataKey="turnout" stroke="url(#lineGrad)" strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#1e1b4b' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts row 2 ───────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title={`Party Seats — ${selYear}`} sub="Top 8 parties by seats won">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topParties} barSize={28}>
              <XAxis dataKey="party" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_STYLE} />
              <Bar dataKey="seats" radius={[5, 5, 0, 0]}>
                {topParties.map((d, i) => (
                  <Cell key={i} fill={partyColor(d.party, partyColors)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Women Winners per Election" sub="Female MLA count across elections">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={womenChart} barSize={28}>
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_STYLE} />
              <defs>
                <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <Bar dataKey="winners" fill="url(#pinkGrad)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Battlegrounds + Strongholds ─────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5">
          <SectionHeader
            title={`Battleground Seats — ${selYear}`}
            sub="Constituencies won by tightest margins"
            action={
              <Link to="/analytics" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            } />
          {tgSeats.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm italic">
              Results pending for {selYear}
            </div>
          ) : (
            <motion.div variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-2">
              {tgSeats.map((r, i) => (
                <motion.div key={i} variants={stagger.item}>
                  <Link to={`/constituency/${slugify(r.name)}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] w-5 text-center text-slate-600 font-mono">{i + 1}</span>
                      <span className="text-sm text-slate-300 group-hover:text-white truncate transition-colors">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" />
                      <span className={`text-xs font-bold tabular-nums ${r.margin_pct < 3 ? 'text-red-400' : 'text-amber-400'}`}>
                        {formatPct(r.margin_pct)}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <SectionHeader title="Party Strongholds" sub="Constituencies with 3+ consecutive wins" />
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {Object.entries(strongholdByParty)
              .sort((a, b) => b[1] - a[1]).slice(0, 6)
              .map(([party, count]) => (
                <div key={party}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                  <PartyBadge party={party} partyColors={partyColors} size="xs" />
                  <span className="text-white font-bold text-sm">{count}</span>
                </div>
              ))}
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {Object.entries(strongholds).slice(0, 12).map(([name, info]) => (
              <Link key={name} to={`/constituency/${slugify(name)}`}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/4 transition-colors group text-xs">
                <span className="text-slate-400 group-hover:text-slate-200 truncate transition-colors">{name}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <PartyBadge party={info.party} partyColors={partyColors} size="xs" />
                  <span className="text-slate-600">{info.streak}×</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Nav ───────────────────────────────────── */}
      <div>
        <SectionHeader title="Explore" sub="Jump into any section" />
        <motion.div
          variants={stagger.container} initial="hidden" whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: '/districts', label: 'Browse Districts', sub: '38 districts', icon: MapPin, color: '#3b82f6' },
            { to: '/constituencies', label: 'All Constituencies', sub: '234 seats', icon: Map, color: '#10b981' },
            { to: '/analytics', label: 'Analytics Hub', sub: 'Swing · Margins · Trends', icon: BarChart3, color: '#8b5cf6' },
            { to: '/compare', label: 'Compare Tool', sub: 'Constituency · Party', icon: GitCompare, color: '#f59e0b' },
          ].map(({ to, label, sub, icon: Icon, color }) => (
            <motion.div key={to} variants={stagger.item}>
              <Link to={to}
                className="block p-5 rounded-2xl glass hover:scale-[1.02] transition-all duration-200 group"
                style={{ borderColor: color + '20' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: color + '15', border: `1px solid ${color}25` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors">{label}</div>
                <div className="text-xs text-slate-500 mt-1">{sub}</div>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium" style={{ color }}>
                  Explore <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
