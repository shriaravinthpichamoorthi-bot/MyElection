import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PartyBadge from '../components/PartyBadge';
import SortTh from '../components/SortTh';
import { slugify, partyColor } from '../utils/helpers';

const selectStyle = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, color: '#e2e8f0', fontSize: 13, padding: '8px 12px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' };

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
    <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#c084fc" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc' }}>Candidates</h1>
          </div>
          <p style={{ fontSize: 13, color: '#475569', paddingLeft: 48 }}>{allCandidates.length.toLocaleString()} unique candidates across 2001–2021</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
            className="field" style={{ paddingLeft: 30, width: 180 }} />
        </div>
        <select value={filterParty} onChange={e => setFilterParty(e.target.value)} style={selectStyle}>
          <option value="">All Parties</option>
          {parties.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)} style={selectStyle}>
          <option value="">All Genders</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterWinner} onChange={e => setFilterWinner(e.target.checked)}
            style={{ accentColor: '#6366f1' }} />
          Winners only
        </label>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: '#475569' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{filtered.length}</span> results
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="tbl-head">
                <SortTh label="Candidate" col="name" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Gender</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b' }}>Party</th>
                <SortTh label="Elections" col="elections" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Wins" col="wins" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <SortTh label="Win Rate" col="winRate" activeCol={sortCol} dir={sortDir} onSort={sortToggle} />
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' }}>Constituencies</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((c, i) => {
                const constits = [...new Set(c.contests.map(x => x.constituency))];
                const color = partyColor(c.party, partyColors);
                return (
                  <tr key={i} className="tbl-row">
                    <td>
                      <Link to={`/candidate/${slugify(c.name)}`}
                        style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500 }}>
                        {c.name}
                      </Link>
                    </td>
                    <td style={{ color: '#475569', fontSize: 13 }}>{c.sex === 'F' ? '♀ F' : c.sex === 'M' ? '♂ M' : '—'}</td>
                    <td><PartyBadge party={c.party} partyColors={partyColors} size="xs" /></td>
                    <td style={{ color: '#64748b', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{c.elections}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.wins > 0 ? '#34d399' : '#334155', fontSize: 13 }}>{c.wins}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 48, height: 5, borderRadius: 3, background: '#1e293b', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: '#34d399', width: `${c.winRate.toFixed(0)}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{c.winRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ color: '#475569', fontSize: 12 }}>{constits.slice(0, 2).join(', ')}{constits.length > 2 ? ` +${constits.length - 2}` : ''}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: '#334155', fontSize: 13 }}>No candidates match your filters</td></tr>
              )}
              {filtered.length > 200 && (
                <tr><td colSpan={7} style={{ padding: '12px 16px', textAlign: 'center', color: '#334155', fontSize: 12 }}>Showing first 200 of {filtered.length} results. Refine your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
