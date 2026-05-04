import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getConstituencies, getSummary, getConfig } from '../utils/api';

// Default Tamil Nadu alliance colors (used when no config override provided)
const TN_ALLIANCE_COLORS = {
  'DMK Alliance': '#CC0000',
  AIADMK: '#006400',
  NTK: '#a78bfa',
  TVK: '#FDD835',
  Others: '#607d8b',
  IND: '#607d8b',
  // NDA and AMMK are folded into AIADMK alliance; keep colors for nomination data compatibility
  NDA: '#006400',
  AMMK: '#006400',
};

const LiveResultsContext = createContext(null);

// Frontend poll interval: Vite env var → backend config → default 60s
function getPollIntervalMs(backendConfig) {
  const env = import.meta.env.VITE_POLL_INTERVAL_SECONDS;
  if (env) return parseInt(env, 10) * 1000;
  if (backendConfig?.refresh_interval_minutes) {
    const seconds = Math.max(10, Math.min(120, backendConfig.refresh_interval_minutes * 30));
    return seconds * 1000;
  }
  return 60000;
}

// Map tick interval: Vite env var → default 10s
function getMapTickMs() {
  const env = import.meta.env.VITE_MAP_TICK_SECONDS;
  return env ? parseInt(env, 10) * 1000 : 10000;
}

export function LiveResultsProvider({ children, config = {} }) {
  const {
    candidateJson = '/live_candidates_2026.json',
    districtJson = '/tn_districts.json',
    apiClient = null,
    allianceColors = TN_ALLIANCE_COLORS,
  } = config;

  const [allResults, setAllResults] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [liveMeta, setLiveMeta] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [backendConfig, setBackendConfig] = useState(null);
  const [districtMap, setDistrictMap] = useState(null);
  const [nameToIdMap, setNameToIdMap] = useState({});
  const intervalRef = useRef(null);

  // Build name-to-ID mapping from live data
  // Handles duplicate API names (e.g., two "Kalyanpur" or "Pipra" constituencies)
  // by matching each static name to a unique API ID in a stable order.
  // nameToIdMap is now state (see useState above)
  if (liveData && allResults) {
    const usedApiIds = new Set();
    const normalize = (n) => n?.toLowerCase()?.replace(/\s*\(sc\)|\s*\(st\)|[^a-z]/g, '') ?? '';

    // Pass 1: exact name matches
    Object.entries(liveData).forEach(([id, info]) => {
      if (info.name && allResults[info.name] && !usedApiIds.has(id)) {
        nameToIdMap[info.name] = id;
        usedApiIds.add(id);
      }
    });

    // Pass 2: fuzzy normalized matches — iterate static names first
    // so each static name gets a distinct API ID
    Object.keys(allResults).forEach(name => {
      if (nameToIdMap[name]) return;
      const localNorm = normalize(name);
      if (!localNorm) return;
      for (const [id, info] of Object.entries(liveData)) {
        if (usedApiIds.has(id)) continue;
        if (normalize(info.name) === localNorm) {
          nameToIdMap[name] = id;
          usedApiIds.add(id);
          break;
        }
      }
    });

    // Pass 3: manual overrides for constituencies whose static name
    // doesn't fuzzy-match the API name (e.g. district-disambiguated names)
    const MANUAL_ID_OVERRIDES = {
      'Pipra (East Champaran)': '42',
    };
    Object.entries(MANUAL_ID_OVERRIDES).forEach(([name, id]) => {
      if (allResults[name] && liveData[id] && !usedApiIds.has(id)) {
        nameToIdMap[name] = id;
        usedApiIds.add(id);
      }
    });
  }

  // Fetch candidate metadata (static) + live API data
  const loadData = useCallback(async () => {
    try {
      const [candRes, districtRes] = await Promise.all([
        fetch(candidateJson),
        districtJson ? fetch(districtJson) : Promise.resolve(null),
      ]);
      const candData = await candRes.json();
      const results = {};
      Object.entries(candData.constituencies).forEach(([name, candidates]) => {
        results[name] = { candidates: candidates ?? [] };
      });

      // Load district mapping if provided
      if (districtRes && districtRes.ok) {
        const districtData = await districtRes.json();
        const exactMap = {};
        const normMap = {};
        const normalize = (s) => s?.toLowerCase()?.replace(/\s*\(sc\)|\s*\(st\)|[^a-z0-9]/g, '') ?? '';
        districtData.forEach(item => {
          if (item.constituency && item.district) {
            exactMap[item.constituency] = item.district;
            normMap[normalize(item.constituency)] = item.district;
          }
        });
        // Fuzzy-match any static constituency names that didn't exact-match
        Object.keys(results).forEach(name => {
          if (!exactMap[name]) {
            const norm = normalize(name);
            if (norm && normMap[norm]) {
              exactMap[name] = normMap[norm];
            }
          }
        });
        // Manual overrides for spelling variations not caught by normalization
        const MANUAL_DISTRICT_OVERRIDES = {
          'Daraunda': 'Siwan',
          'Dhoraiya (Sc)': 'Banka',
          'Pipra': 'Supaul',
          'Sonepur': 'Saran',
        };
        Object.entries(MANUAL_DISTRICT_OVERRIDES).forEach(([name, district]) => {
          if (results[name] && !exactMap[name]) {
            exactMap[name] = district;
          }
        });
        setDistrictMap(exactMap);
      } else {
        setDistrictMap(null);
      }

      // Try to fetch live results from API (only when an explicit apiClient is configured)
      let liveConstituencies = null;
      let meta = null;
      if (apiClient) {
        try {
          const summary = await apiClient.getSummary();
          const constituencies = await apiClient.getConstituencies();
          meta = { ...summary.meta, party_tally: summary.party_tally || {}, alliance_tally: summary.alliance_tally || {} };
          liveConstituencies = constituencies.constituencies;
          setApiError(null);
        } catch (e) {
          setApiError(e.message);
        }
      }

      // Merge live data into results
      if (liveConstituencies) {
        const n2i = {};
        const usedIds = new Set();
        const normalize = (n) => n?.toLowerCase()?.replace(/\s*\(sc\)|\s*\(st\)|[^a-z]/g, '') ?? '';

        // Pass 1: exact matches
        Object.entries(liveConstituencies).forEach(([id, info]) => {
          if (info.name && results[info.name] && !usedIds.has(id)) {
            n2i[info.name] = id;
            usedIds.add(id);
          }
        });

        // Pass 2: fuzzy matches — iterate static first for stable pairing
        Object.keys(results).forEach(name => {
          if (n2i[name]) return;
          const localNorm = normalize(name);
          if (!localNorm) return;
          for (const [id, info] of Object.entries(liveConstituencies)) {
            if (usedIds.has(id)) continue;
            if (normalize(info.name) === localNorm) {
              n2i[name] = id;
              usedIds.add(id);
              break;
            }
          }
        });

        // Pass 3: manual overrides
        const MANUAL_ID_OVERRIDES = {
          'Pipra (East Champaran)': '42',
        };
        Object.entries(MANUAL_ID_OVERRIDES).forEach(([name, id]) => {
          if (results[name] && liveConstituencies[id] && !usedIds.has(id)) {
            n2i[name] = id;
            usedIds.add(id);
          }
        });

        Object.keys(results).forEach(name => {
          const liveId = n2i[name];
          if (liveId && liveConstituencies[liveId]) {
            results[name]._live = liveConstituencies[liveId];
          }
        });

        // Populate the exposed name-to-ID map
        setNameToIdMap({...n2i});
      }

      setAllResults(results);
      setLiveData(liveConstituencies);
      setLiveMeta(meta);
      setLastUpdated(meta?.last_updated ? new Date(meta.last_updated) : new Date());
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setApiError(e.message);
    }
  }, [candidateJson, apiClient]);

  // Fetch backend config once on mount (only when an explicit apiClient is configured)
  useEffect(() => {
    if (apiClient) {
      apiClient.getConfig()
        .then(cfg => setBackendConfig(cfg))
        .catch(() => setBackendConfig(null));
    }
  }, [apiClient]);

  // Start polling after config is known (or immediately with default)
  useEffect(() => {
    loadData();
    const intervalMs = getPollIntervalMs(backendConfig);
    intervalRef.current = setInterval(loadData, intervalMs);
    return () => clearInterval(intervalRef.current);
  }, [loadData, backendConfig]);

  function getConstituency(name) {
    if (!allResults) return null;
    const res = allResults[name];
    if (!res) return null;
    const live = res._live;
    return {
      name,
      candidates: res.candidates,
      status: live?.status ?? 'awaiting',
      live,
    };
  }

  function getLiveStatus(name) {
    const res = allResults?.[name];
    return res?._live ?? null;
  }

  return (
    <LiveResultsContext.Provider value={{
      loading,
      allResults,
      liveData,
      liveMeta,
      lastUpdated,
      apiError,
      backendConfig,
      getConstituency,
      getLiveStatus,
      nameToIdMap,
      districtMap,
      allianceColors,
      apiClient,
      mapTickMs: getMapTickMs(),
      pollIntervalMs: getPollIntervalMs(backendConfig),
    }}>
      {children}
    </LiveResultsContext.Provider>
  );
}

export function useLiveResults() {
  const ctx = useContext(LiveResultsContext);
  if (!ctx) throw new Error('useLiveResults must be used inside LiveResultsProvider');
  return ctx;
}

// Re-export for backward compatibility with pages that haven't migrated yet
export { TN_ALLIANCE_COLORS as ALLIANCE_COLORS };
