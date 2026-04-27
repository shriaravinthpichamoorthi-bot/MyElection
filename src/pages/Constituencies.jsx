import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import YearBadge from '../components/YearBadge';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { useSortable } from '../hooks/useSortable';
import { formatPct, marginClass, slugify } from '../utils/helpers';

export default function Constituencies() {
  const { data, loading } = useData();
  const [selYear, setSelYear] = useState(2021);
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterParty, setFilterParty] = useState('');


  if (loading) return <LoadingSpinner />;

  const { byYear, districts, partyColors } = data;

  const recs = byYear[selYear] || [];

  const districtList = ['', ...districts];
  const partyList = useMemo(() => {
    const parties = [...new Set(recs.map(r => r.winner_party).filter(Boolean))].sort();
    return ['', ...parties];
  }, [recs]);

  const filtered = useMemo(() => {
    let rows = recs;
    if (search) rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (filterDistrict) rows = rows.filter(r => r.district === filterDistrict);
    if (filterParty) rows = rows.filter(r => r.winner_party === filterParty);
    return rows;
  }, [recs, search, filterDistrict, filterParty]);

  const { sorted, col: sortCol, dir: sortDir, toggle: sortToggle } = useSortable(filtered, 'constituency_no');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">All Constituencies</h1>
          <p className="text-slate-400 text-sm">234 assembly segments across 38 districts</p>
        </div>
        <div className="sm:ml-auto flex flex-wrap gap-2">
          {[2001,2006,2011,2016,2021,2026].map(y => (
            <YearBadge key={y} year={y} active={selYear === y} onClick={() => setSelYear(y)} />
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name…"
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-40" />
        <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500">
          <option value="">All Districts</option>
          {districtList.slice(1).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterParty} onChange={e => setFilterParty(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500">
          <option value="">All Parties</option>
          {partyList.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-slate-500 text-sm self-center">{filtered.length} results</span>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <SortTh label="#" col="constituency_no" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Constituency" col="name" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">District</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Cat.</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Winner</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Party</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Alliance</th>
                <SortTh label="Margin%" col="margin_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Turnout%" col="turnout_pct" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const mc = marginClass(r.margin_pct);
                return (
                  <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{r.constituency_no}</td>
                    <td className="px-3 py-2.5">
                      <Link to={`/constituency/${slugify(r.name)}`}
                        className="text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.district ? (
                        <Link to={`/district/${slugify(r.district)}?year=${selYear}`}
                          className="text-slate-400 hover:text-slate-200 text-xs whitespace-nowrap">
                          {r.district}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{r.category}</td>
                    <td className="px-3 py-2.5 text-slate-200 whitespace-nowrap text-xs">
                      {r.winner_name || <span className="text-slate-600 italic">Pending</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.winner_party ? <PartyBadge party={r.winner_party} partyColors={partyColors} size="xs" /> : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                      {r.winner_alliance || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.margin_pct != null
                        ? <span className={`font-medium text-xs ${mc.color}`}>{r.margin_pct.toFixed(1)}%</span>
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 text-xs">{formatPct(r.turnout_pct)}</td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No results match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
