import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { slugify } from '../utils/helpers';

export default function Candidates() {
  const { data, loading } = useData();
  const [search, setSearch] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterWinner, setFilterWinner] = useState(false);
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  function sortToggle(col) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  if (loading) return <LoadingSpinner />;

  const { candidateMap, partyColors } = data;

  const allCandidates = useMemo(() => Object.values(candidateMap), [candidateMap]);
  const parties = useMemo(() => [...new Set(allCandidates.map(c => c.party).filter(Boolean))].sort(), [allCandidates]);

  const filtered = useMemo(() => {
    let list = allCandidates.map(c => ({
      ...c,
      elections: c.contests.length,
      wins: c.contests.filter(x => x.won).length,
      winRate: c.contests.length ? (c.contests.filter(x => x.won).length / c.contests.length) * 100 : 0,
    }));
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    if (filterParty) list = list.filter(c => c.party === filterParty);
    if (filterGender) list = list.filter(c => c.sex === filterGender);
    if (filterWinner) list = list.filter(c => c.wins > 0);
    return [...list].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allCandidates, search, filterParty, filterGender, filterWinner, sortCol, sortDir]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Candidates</h1>
        <p className="text-slate-400 text-sm">{allCandidates.length.toLocaleString()} unique candidates across 2001–2021</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48" />
        <select value={filterParty} onChange={e => setFilterParty(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500">
          <option value="">All Parties</option>
          {parties.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500">
          <option value="">All Genders</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>
        <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={filterWinner} onChange={e => setFilterWinner(e.target.checked)} className="accent-blue-500" />
          Winners only
        </label>
        <span className="text-slate-500 text-sm self-center">{filtered.length} results</span>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <SortTh label="Candidate" col="name" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Gender</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Party</th>
                <SortTh label="Elections" col="elections" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Wins" col="wins" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Win Rate" col="winRate" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Constituencies</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((c, i) => {
                const constits = [...new Set(c.contests.map(x=>x.constituency))];
                return (
                  <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/candidate/${slugify(c.name)}`} className="text-blue-400 hover:text-blue-300 font-medium">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.sex === 'F' ? '♀ F' : c.sex === 'M' ? '♂ M' : '—'}</td>
                    <td className="px-4 py-3">
                      <PartyBadge party={c.party} partyColors={partyColors} size="xs" />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.elections}</td>
                    <td className="px-4 py-3">
                      <span className={c.wins > 0 ? 'text-green-400 font-semibold' : 'text-slate-500'}>{c.wins}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-800 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${c.winRate.toFixed(0)}%` }} />
                        </div>
                        <span className="text-slate-400 text-xs">{c.winRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{constits.slice(0,2).join(', ')}{constits.length > 2 ? ` +${constits.length-2}` : ''}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No candidates match your filters</td></tr>
              )}
              {filtered.length > 200 && (
                <tr><td colSpan={7} className="px-4 py-3 text-center text-slate-500 text-xs">Showing first 200 of {filtered.length} results. Refine your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
