const API_BASE = import.meta.env.VITE_API_URL || '';
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

function getAccessToken(): string | null {
  return localStorage.getItem('rf-access-token');
}
function getRefreshToken(): string | null {
  return localStorage.getItem('rf-refresh-token');
}
function clearTokens() {
  localStorage.removeItem('rf-access-token');
  localStorage.removeItem('rf-refresh-token');
  localStorage.removeItem('rf-user');
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    localStorage.setItem('rf-access-token', data.accessToken);
    localStorage.setItem('rf-refresh-token', data.refreshToken);
    localStorage.setItem('rf-user', JSON.stringify(data.user));
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Access token expired — try refresh
  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      // Retry with new access token
      const newToken = getAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } else {
      clearTokens();
      window.location.reload();
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
  getAccessToken,
  getRefreshToken,
  clearTokens,
};
