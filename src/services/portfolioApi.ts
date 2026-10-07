/**
 * Portfolio API Client
 *
 * Talks to the Express persistence server with secure token-based authentication.
 * Falls back gracefully to localStorage if the server is unreachable or offline.
 */

// Dynamically determine backend URL (can be customized via VITE_BACKEND_URL)
const SERVER_URL = (
  import.meta.env.VITE_BACKEND_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3999' 
    : '')
).replace(/\/$/, '');

let serverAvailable: boolean | null = null; // null = not yet checked
const TOKEN_KEY = 'portfolio_admin_token';

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearAuthToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function checkServer(): Promise<boolean> {
  if (!SERVER_URL && typeof window !== 'undefined' && !window.location.origin.includes('localhost')) {
    // If no backend URL configured in production, server mode is disabled
    serverAvailable = false;
    return false;
  }
  if (serverAvailable !== null) return serverAvailable;
  try {
    const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(1000) });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
  return serverAvailable;
}

/** Reset the server availability check */
export function resetServerCheck() {
  serverAvailable = null;
}

/**
 * Authenticate with the server using the master password.
 */
export async function apiLogin(password: string): Promise<{ success: boolean; error?: string }> {
  const isUp = await checkServer();
  if (!isUp) {
    return {
      success: false,
      error: 'Backend persistence server is offline or unreachable.',
    };
  }

  try {
    const res = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.token) {
      setAuthToken(data.token);
      return { success: true };
    }

    return { 
      success: false, 
      error: data.error || `Authentication failed (${res.status})` 
    };
  } catch (err: any) {
    return { 
      success: false, 
      error: err.message || 'Network error connecting to auth server.' 
    };
  }
}

/**
 * Verify whether the active session token is still valid.
 */
export async function apiVerifyAuth(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  const isUp = await checkServer();
  if (!isUp) {
    // In offline mode, token existence is sufficient for local preview
    return false;
  }

  try {
    const res = await fetch(`${SERVER_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) {
      clearAuthToken();
      return false;
    }
    const data = await res.json();
    if (!data.ok) {
      clearAuthToken();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Log out and invalidate server session.
 */
export async function apiLogout(): Promise<void> {
  const token = getAuthToken();
  if (token && (await checkServer())) {
    try {
      await fetch(`${SERVER_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(1000),
      });
    } catch {}
  }
  clearAuthToken();
}

/**
 * Change the master password securely on the server.
 */
export async function apiChangePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) {
    return { success: false, error: 'Not authenticated.' };
  }

  try {
    const res = await fetch(`${SERVER_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) {
      setAuthToken(data.token);
      return { success: true };
    }
    return { success: false, error: data.error || 'Password update failed.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating password.' };
  }
}

/**
 * Load a value from the server, falling back to localStorage.
 */
export async function apiGet(key: string): Promise<any> {
  if (await checkServer()) {
    try {
      const res = await fetch(`${SERVER_URL}/api/portfolio`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return data[key] ?? null;
      }
    } catch {
      serverAvailable = false;
    }
  }
  // Fallback: localStorage
  const raw = localStorage.getItem(`portfolio_${key}`);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

/**
 * Save a value to the server (with authorization) and localStorage.
 */
export async function apiSet(key: string, value: any): Promise<void> {
  // Dual write: always keep localStorage backup
  try {
    localStorage.setItem(`portfolio_${key}`, JSON.stringify(value));
  } catch {}

  if (await checkServer()) {
    const token = getAuthToken();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${SERVER_URL}/api/portfolio/${key}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ value }),
        signal: AbortSignal.timeout(2000),
      });

      if (res.status === 401) {
        console.warn('[portfolioApi] Write rejected: Unauthorized (Session expired).');
        clearAuthToken();
      }
    } catch {
      serverAvailable = false;
    }
  }
}

/**
 * Load all portfolio data in a single call.
 */
export async function apiGetAll(): Promise<Record<string, any>> {
  if (await checkServer()) {
    try {
      const res = await fetch(`${SERVER_URL}/api/portfolio`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return await res.json();
    } catch {
      serverAvailable = false;
    }
  }
  // Fallback: reconstruct from localStorage
  const keys = ['projectsConfig', 'achievements', 'settings', 'about', 'skills'];
  const result: Record<string, any> = {};
  for (const key of keys) {
    const raw = localStorage.getItem(`portfolio_${key}`);
    if (raw != null) {
      try { result[key] = JSON.parse(raw); } catch { result[key] = raw; }
    }
  }
  return result;
}

export function isServerMode(): boolean {
  return serverAvailable === true;
}
