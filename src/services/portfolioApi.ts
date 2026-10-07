/**
 * Portfolio API Client
 *
 * Supports both:
 * 1. Full-Stack Mode: Talks to Express persistence server with token-based authentication.
 * 2. Standalone Mode: Smooth fallback to client-side localStorage persistence when server is offline or statically hosted.
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

async function computeHash(str: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

function getExpectedHash(): string {
  try {
    const custom = localStorage.getItem('portfolio_admin_custom_hash');
    if (custom) return custom;
  } catch {}
  return typeof __ADMIN_PASS_HASH__ !== 'undefined' ? __ADMIN_PASS_HASH__ : '';
}

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
    serverAvailable = false;
    return false;
  }
  try {
    const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(800) });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
  return serverAvailable === true;
}

/** Reset the server availability check */
export function resetServerCheck() {
  serverAvailable = null;
}

/**
 * Authenticate with the master password.
 * Works seamlessly whether the Express server is running or offline.
 */
export async function apiLogin(password: string): Promise<{ success: boolean; mode?: 'server' | 'standalone'; error?: string }> {
  const isUp = await checkServer();
  
  if (isUp) {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.token) {
        setAuthToken(data.token);
        return { success: true, mode: 'server' };
      }

      return { 
        success: false, 
        error: data.error || `Authentication failed (${res.status})` 
      };
    } catch {
      // Network glitch, proceed to standalone fallback
    }
  }

  // Standalone mode fallback (e.g. running 'npm run dev' alone or static hosting on Vercel/GitHub Pages)
  const hash = await computeHash(password);
  const expectedHash = getExpectedHash();

  if (expectedHash && hash === expectedHash) {
    setAuthToken('standalone_local_session');
    return { success: true, mode: 'standalone' };
  }

  return {
    success: false,
    error: 'Incorrect password. Access denied.',
  };
}

/**
 * Verify whether the active session token is still valid.
 */
export async function apiVerifyAuth(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  const isUp = await checkServer();
  if (!isUp) {
    // In standalone offline mode, token existence is sufficient
    return true;
  }

  try {
    const res = await fetch(`${SERVER_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) {
      if (token === 'standalone_local_session') return true;
      clearAuthToken();
      return false;
    }
    const data = await res.json();
    return !!data.ok;
  } catch {
    return true;
  }
}

/**
 * Log out and invalidate session.
 */
export async function apiLogout(): Promise<void> {
  const token = getAuthToken();
  if (token && token !== 'standalone_local_session' && (await checkServer())) {
    try {
      await fetch(`${SERVER_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(800),
      });
    } catch {}
  }
  clearAuthToken();
}

/**
 * Change the master password (works in both server and standalone mode).
 */
export async function apiChangePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const isUp = await checkServer();
  if (isUp) {
    const token = getAuthToken();
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

  // Standalone offline password change
  const currentHash = await computeHash(currentPassword);
  if (currentHash !== getExpectedHash()) {
    return { success: false, error: 'Current password incorrect.' };
  }
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }
  const newHash = await computeHash(newPassword);
  try {
    localStorage.setItem('portfolio_admin_custom_hash', newHash);
    return { success: true };
  } catch {
    return { success: false, error: 'Could not write to local storage.' };
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
      if (token && token !== 'standalone_local_session') {
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
