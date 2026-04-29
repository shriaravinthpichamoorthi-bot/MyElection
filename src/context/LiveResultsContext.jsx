import { createContext, useContext, useState, useEffect } from 'react';

// Alliance → color (used across live pages)
const ALLIANCE_COLORS = {
  'DMK Alliance': '#e53935',
  AIADMK: '#1b5e20',
  NTK: '#4a148c',
  TVK: '#00695c',
  NDA: '#f57c00',
  AMMK: '#01579b',
  IND: '#607d8b',
  Others: '#607d8b',
};

const LiveResultsContext = createContext(null);

export function LiveResultsProvider({ children }) {
  const [allResults, setAllResults] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/live_candidates_2026.json')
      .then(r => r.json())
      .then(data => {
        // Build allResults: keyed by constituency name, candidates in nomination order
        const results = {};
        Object.entries(data.constituencies).forEach(([name, candidates]) => {
          results[name] = { candidates: candidates ?? [] };
        });
        setAllResults(results);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // getConstituency: returns candidate list for a constituency (no mock vote data)
  function getConstituency(name) {
    if (!allResults) return null;
    const res = allResults[name];
    if (!res) return null;
    return { name, candidates: res.candidates, status: 'awaiting' };
  }

  return (
    <LiveResultsContext.Provider value={{ loading, allResults, lastUpdated, getConstituency }}>
      {children}
    </LiveResultsContext.Provider>
  );
}

export function useLiveResults() {
  const ctx = useContext(LiveResultsContext);
  if (!ctx) throw new Error('useLiveResults must be used inside LiveResultsProvider');
  return ctx;
}

export { ALLIANCE_COLORS };
