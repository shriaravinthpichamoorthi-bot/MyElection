import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { partyColor, allianceColor, slugify, formatPct } from '../utils/helpers';

// Tamil Nadu districts approximate positions for a schematic map
const DISTRICT_POSITIONS = {
  'Chennai': { x: 340, y: 70 },
  'Thiruvallur': { x: 300, y: 50 },
  'Kancheepuram': { x: 320, y: 110 },
  'Chengalpattu': { x: 340, y: 140 },
  'Vellore': { x: 270, y: 80 },
  'Ranipet': { x: 250, y: 90 },
  'Tirupathur': { x: 265, y: 65 },
  'Krishnagiri': { x: 235, y: 60 },
  'Dharmapuri': { x: 205, y: 80 },
  'Salem': { x: 200, y: 115 },
  'Namakkal': { x: 195, y: 145 },
  'Erode': { x: 165, y: 145 },
  'Tiruppur': { x: 155, y: 175 },
  'Coimbatore': { x: 125, y: 185 },
  'Nilgiris': { x: 130, y: 160 },
  'Karur': { x: 195, y: 180 },
  'Tiruchirappalli': { x: 215, y: 205 },
  'Perambalur': { x: 230, y: 175 },
  'Ariyalur': { x: 250, y: 175 },
  'Cuddalore': { x: 285, y: 180 },
  'Villupuram': { x: 295, y: 155 },
  'Kallakurichi': { x: 270, y: 155 },
  'Pudukottai': { x: 240, y: 240 },
  'Thanjavur': { x: 255, y: 235 },
  'Nagapattinam': { x: 275, y: 255 },
  'Tiruvarur': { x: 265, y: 245 },
  'Mayiladuthurai': { x: 285, y: 235 },
  'Sivaganga': { x: 225, y: 270 },
  'Madurai': { x: 195, y: 265 },
  'Theni': { x: 170, y: 265 },
  'Dindigul': { x: 180, y: 245 },
  'Virudhunagar': { x: 185, y: 295 },
  'Ramanathapuram': { x: 225, y: 310 },
  'Tirunelveli': { x: 170, y: 330 },
  'Tenkasi': { x: 155, y: 330 },
  'Thoothukudi': { x: 205, y: 335 },
  'Kanniyakumari': { x: 165, y: 360 },
};

export default function MapView() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);
  const [mode, setMode] = useState('party'); // 'party' | 'alliance' | 'turnout'
  const [hovered, setHovered] = useState(null);

  if (loading) return <LoadingSpinner />;

  const { byDistrictYear, districts, partyColors, allianceColors } = data;
  const YEARS = [2001, 2006, 2011, 2016, 2021, 2026];

  const districtStats = useMemo(() => {
    const stats = {};
    districts.forEach(d => {
      const recs = byDistrictYear[`${d}||${selYear}`] || [];
      if (!recs.length) { stats[d] = null; return; }

      const winnerParty = {};
      const winnerAlliance = {};
      recs.forEach(r => {
        if (r.winner_party) winnerParty[r.winner_party] = (winnerParty[r.winner_party]||0)+1;
        if (r.winner_alliance) winnerAlliance[r.winner_alliance] = (winnerAlliance[r.winner_alliance]||0)+1;
      });
      const topParty = Object.entries(winnerParty).sort((a,b)=>b[1]-a[1])[0];
      const topAlliance = Object.entries(winnerAlliance).sort((a,b)=>b[1]-a[1])[0];
      const avgTurnout = recs.reduce((s,r) => s+(r.turnout_pct||0),0)/recs.length;

      stats[d] = {
        topParty: topParty?.[0], topPartySeat: topParty?.[1],
        topAlliance: topAlliance?.[0], topAllianceSeat: topAlliance?.[1],
        avgTurnout: +avgTurnout.toFixed(1),
        totalSeats: recs.length,
      };
    });
    return stats;
  }, [byDistrictYear, districts, selYear]);

  function getColor(district) {
    const s = districtStats[district];
    if (!s) return '#1e293b';
    if (mode === 'party') return partyColor(s.topParty, partyColors) + 'cc';
    if (mode === 'alliance') return allianceColor(s.topAlliance, allianceColors) + 'cc';
    if (mode === 'turnout') {
      const t = s.avgTurnout;
      if (t >= 80) return '#10b981cc';
      if (t >= 70) return '#f59e0bcc';
      if (t >= 60) return '#f97316cc';
      return '#ef4444cc';
    }
    return '#334155';
  }

  const hoveredStats = hovered ? districtStats[hovered] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Map View</h1>
        <p className="text-slate-400 text-sm">Interactive Tamil Nadu district map — party, alliance & turnout heatmaps</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {YEARS.map(y => (
            <button key={y} onClick={() => setSelYear(y)}
              className={`px-3 py-1.5 rounded text-sm ${selYear===y?'bg-blue-600 text-white':'bg-slate-800 text-slate-400'}`}>
              {y}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-4">
          {[['party','🏛 Party'],['alliance','🤝 Alliance'],['turnout','📊 Turnout']].map(([m,l]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded text-sm ${mode===m?'bg-purple-600 text-white':'bg-slate-800 text-slate-400'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* SVG Map */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-4">
          <svg viewBox="80 30 300 360" className="w-full" style={{ maxHeight: 520 }}>
            <rect x="80" y="30" width="300" height="360" fill="#0f172a" rx="8" />
            {Object.entries(DISTRICT_POSITIONS).map(([district, pos]) => {
              const color = getColor(district);
              const isHovered = hovered === district;
              return (
                <g key={district}
                  onMouseEnter={() => setHovered(district)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}>
                  <circle
                    cx={pos.x} cy={pos.y} r={isHovered ? 14 : 11}
                    fill={color}
                    stroke={isHovered ? '#fff' : '#1e293b'}
                    strokeWidth={isHovered ? 2 : 1}
                    style={{ transition: 'all 0.15s' }}
                  />
                  <text x={pos.x} y={pos.y + 22} textAnchor="middle"
                    fill="#94a3b8" fontSize="6" fontFamily="system-ui">
                    {district.length > 10 ? district.slice(0,9)+'…' : district}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="text-xs text-slate-500 text-center mt-2">
            Hover over a district bubble for details. Bubble color = {mode === 'party' ? 'leading party' : mode === 'alliance' ? 'leading alliance' : 'avg turnout level'}.
          </p>
        </div>

        {/* Sidebar: hovered district or legend */}
        <div className="space-y-4">
          {hovered && hoveredStats ? (
            <div className="bg-slate-900 rounded-xl border border-blue-700 p-4">
              <h3 className="font-bold text-white text-lg mb-1">{hovered}</h3>
              <p className="text-slate-400 text-xs mb-4">{selYear} Election Data</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400">Total Seats</p>
                  <p className="text-xl font-bold text-white">{hoveredStats.totalSeats}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Leading Party</p>
                  <p className="text-sm font-semibold" style={{color: partyColor(hoveredStats.topParty, partyColors)}}>
                    {hoveredStats.topParty} ({hoveredStats.topPartySeat} seats)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Leading Alliance</p>
                  <p className="text-sm font-semibold" style={{color: allianceColor(hoveredStats.topAlliance, allianceColors)}}>
                    {hoveredStats.topAlliance} ({hoveredStats.topAllianceSeat} seats)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Avg Turnout</p>
                  <p className="text-lg font-bold text-blue-400">{hoveredStats.avgTurnout}%</p>
                </div>
              </div>
              <Link to={`/district/${slugify(hovered)}?year=${selYear}`}
                className="block mt-4 text-center text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg">
                View Full District →
              </Link>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                {mode === 'turnout' ? 'Turnout Legend' : 'Top Parties/Alliances'}
              </h3>
              {mode === 'turnout' ? (
                <div className="space-y-2">
                  {[['≥80%', '#10b981'],['70–79%','#f59e0b'],['60–69%','#f97316'],['<60%','#ef4444']].map(([l,c]) => (
                    <div key={l} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{background:c}} />
                      <span className="text-slate-400">{l}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(
                    Object.entries(districtStats)
                      .filter(([,s]) => s)
                      .reduce((acc, [,s]) => {
                        const key = mode === 'party' ? s.topParty : s.topAlliance;
                        acc[key] = (acc[key]||0) + 1; return acc;
                      }, {})
                  ).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name, count]) => (
                      <div key={name} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0"
                          style={{background: mode==='party' ? partyColor(name, partyColors) : allianceColor(name, allianceColors)}} />
                        <span className="text-slate-300 flex-1 truncate text-xs">{name}</span>
                        <span className="text-slate-400 font-medium">{count}d</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}

          {/* District list */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">All Districts — {selYear}</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {districts.map(d => {
                const s = districtStats[d];
                return (
                  <Link key={d} to={`/district/${slugify(d)}?year=${selYear}`}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800 text-xs"
                    onMouseEnter={() => setHovered(d)} onMouseLeave={() => setHovered(null)}>
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{background: s ? getColor(d) : '#334155'}} />
                    <span className="text-slate-300 flex-1">{d}</span>
                    {s && <span className="text-slate-500">{s.avgTurnout}%</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
