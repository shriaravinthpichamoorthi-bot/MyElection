const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path, options = {}) {
  const url = API_BASE ? `${API_BASE}${path}` : path;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export function getHealth() {
  return apiFetch('/health');
}

export function getSummary() {
  return apiFetch('/results/summary');
}

export function getConstituencies() {
  return apiFetch('/results/constituencies');
}

export function getConstituencyDetail(id) {
  return apiFetch(`/results/constituency/${encodeURIComponent(id)}`);
}

export function getConfig() {
  return apiFetch('/config');
}

export function triggerRefresh(secret) {
  return apiFetch('/admin/refresh', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
}

// ── Factory for creating API clients with custom base URLs ──
export function createApiClient(baseUrl) {
  async function clientFetch(path, options = {}) {
    const url = baseUrl ? `${baseUrl}${path}` : path;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
  }

  return {
    getHealth: () => clientFetch('/health'),
    getSummary: () => clientFetch('/results/summary'),
    getConstituencies: () => clientFetch('/results/constituencies'),
    getConstituencyDetail: (id) => clientFetch(`/results/constituency/${encodeURIComponent(id)}`),
    getConfig: () => clientFetch('/config'),
    triggerRefresh: (secret) => clientFetch('/admin/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    }),
  };
}
