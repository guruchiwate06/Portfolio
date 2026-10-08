/**
 * Portfolio API Client
 *
 * Supports both:
 * 1. Full-Stack Mode: Talks to Express persistence server with token-based authentication.
 * 2. Standalone Mode: Smooth fallback to client-side localStorage persistence when server is offline or statically hosted.
 */

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// Dynamically determine backend URL (can be customized via VITE_BACKEND_URL)
export const SERVER_URL = (
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

// ─── WebAuthn / Biometric Passkeys (Windows Hello / Touch ID) ───────────────

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && 
         window.isSecureContext !== false && 
         typeof window.PublicKeyCredential !== 'undefined';
}

export interface WebAuthnStatus {
  hasPasskeys: boolean;
  enforced: boolean;
  credentials: Array<{
    id: string;
    name: string;
    createdAt: string;
    deviceType: string;
  }>;
}

export async function apiGetWebAuthnStatus(): Promise<WebAuthnStatus> {
  if (await checkServer()) {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/webauthn/status`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }
  
  // Standalone offline fallback
  try {
    const raw = localStorage.getItem('portfolio_webauthn_credentials');
    const creds = raw ? JSON.parse(raw) : [];
    const enforced = localStorage.getItem('portfolio_webauthn_enforced') === 'true' && creds.length > 0;
    return {
      hasPasskeys: creds.length > 0,
      enforced,
      credentials: creds.map((c: any) => ({
        id: c.id,
        name: c.name || 'Personal Passkey',
        createdAt: c.createdAt || new Date().toISOString(),
        deviceType: 'platform'
      }))
    };
  } catch {
    return { hasPasskeys: false, enforced: false, credentials: [] };
  }
}

export async function apiRegisterPasskey(deviceName: string = 'Windows Hello / Biometric Key'): Promise<{ success: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn / Passkeys are not supported in this browser environment or over insecure HTTP.' };
  }

  const isUp = await checkServer();
  if (isUp) {
    const token = getAuthToken();
    try {
      const optRes = await fetch(`${SERVER_URL}/api/auth/webauthn/register-options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
      });
      const options = await optRes.json();
      if (!optRes.ok) throw new Error(options.error || 'Failed to fetch registration options');

      const registrationResponse = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch(`${SERVER_URL}/api/auth/webauthn/register-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ response: registrationResponse, deviceName })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Passkey verification failed');

      return { success: true };
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return { success: false, error: 'Passkey registration cancelled or timed out.' };
      }
      return { success: false, error: err.message || 'Passkey registration failed.' };
    }
  }

  // Standalone offline fallback
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Rajguru Chiwate Portfolio', id: window.location.hostname },
        user: { id: userId, name: 'rajguru', displayName: 'Rajguru Chiwate' },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      }
    })) as PublicKeyCredential;

    if (credential) {
      const existingRaw = localStorage.getItem('portfolio_webauthn_credentials');
      const creds = existingRaw ? JSON.parse(existingRaw) : [];
      creds.push({
        id: credential.id,
        name: deviceName,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('portfolio_webauthn_credentials', JSON.stringify(creds));
      return { success: true };
    }
    return { success: false, error: 'No credential created.' };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric prompt cancelled.' };
    }
    return { success: false, error: err.message || 'Offline registration failed.' };
  }
}

export async function apiLoginWithPasskey(): Promise<{ success: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'Biometric passkeys are not supported in this browser or over insecure HTTP.' };
  }

  const isUp = await checkServer();
  if (isUp) {
    try {
      const optRes = await fetch(`${SERVER_URL}/api/auth/webauthn/login-options`, {
        method: 'POST',
      });
      const options = await optRes.json();
      if (!optRes.ok) throw new Error(options.error || 'Failed to fetch passkey login options');

      const authResponse = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch(`${SERVER_URL}/api/auth/webauthn/login-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResponse })
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok || !data.token) {
        throw new Error(data.error || 'Passkey verification failed');
      }

      setAuthToken(data.token);
      return { success: true };
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric prompt cancelled or timed out.' };
      }
      return { success: false, error: err.message || 'Passkey login failed.' };
    }
  }

  // Standalone offline fallback
  try {
    const raw = localStorage.getItem('portfolio_webauthn_credentials');
    const creds = raw ? JSON.parse(raw) : [];
    if (creds.length === 0) {
      return { success: false, error: 'No biometric device has been registered yet on this browser.' };
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: creds.map((c: any) => ({
          id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0)),
          type: 'public-key'
        })),
        userVerification: 'preferred',
        timeout: 60000
      }
    });

    if (assertion) {
      setAuthToken('standalone_local_session');
      return { success: true };
    }
    return { success: false, error: 'Biometric assertion failed.' };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric authentication cancelled.' };
    }
    return { success: false, error: err.message || 'Biometric authentication failed.' };
  }
}

export async function apiTogglePasskeyEnforce(enforce: boolean): Promise<{ success: boolean; enforced?: boolean; error?: string }> {
  const isUp = await checkServer();
  if (isUp) {
    const token = getAuthToken();
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/webauthn/toggle-enforce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enforce })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle enforcement');
      return { success: true, enforced: data.enforced };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Standalone mode
  localStorage.setItem('portfolio_webauthn_enforced', enforce ? 'true' : 'false');
  return { success: true, enforced: enforce };
}

export async function apiDeletePasskey(id: string): Promise<{ success: boolean; error?: string }> {
  const isUp = await checkServer();
  if (isUp) {
    const token = getAuthToken();
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/webauthn/credential/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove credential');
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Standalone mode
  try {
    const raw = localStorage.getItem('portfolio_webauthn_credentials');
    let creds = raw ? JSON.parse(raw) : [];
    creds = creds.filter((c: any) => c.id !== id);
    localStorage.setItem('portfolio_webauthn_credentials', JSON.stringify(creds));
    if (creds.length === 0) {
      localStorage.setItem('portfolio_webauthn_enforced', 'false');
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete passkey from localStorage.' };
  }
}

// ─── GitHub Identity Whitelist Authentication ──────────────────────────────

export interface GitHubAuthConfig {
  hasOAuthConfig: boolean;
  clientId: string;
  allowedAdmin: string;
  enforced: boolean;
}

export async function apiGetGitHubAuthConfig(): Promise<GitHubAuthConfig> {
  const isUp = await checkServer();
  if (isUp) {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/github/config`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return await res.json();
    } catch {}
  }
  
  // Standalone offline fallback
  const enforced = localStorage.getItem('portfolio_github_enforced') === 'true';
  return {
    hasOAuthConfig: false,
    clientId: '',
    allowedAdmin: 'guruchiwate06',
    enforced,
  };
}

export async function apiLoginWithGitHubOAuth(code: string, redirectUri: string): Promise<{ success: boolean; user?: string; error?: string }> {
  const isUp = await checkServer();
  if (!isUp) {
    return { success: false, error: 'Backend server is required to exchange GitHub OAuth code.' };
  }

  try {
    const res = await fetch(`${SERVER_URL}/api/auth/github/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    });

    const data = await res.json();
    if (res.ok && data.token) {
      setAuthToken(data.token);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'GitHub OAuth login failed.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error verifying GitHub OAuth.' };
  }
}

export async function apiLoginWithGitHubPAT(pat: string): Promise<{ success: boolean; user?: string; error?: string }> {
  if (!pat.trim()) {
    return { success: false, error: 'GitHub token cannot be blank.' };
  }

  const isUp = await checkServer();
  if (isUp) {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/github/pat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pat: pat.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        setAuthToken(data.token);
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'GitHub token authentication failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error verifying GitHub token.' };
    }
  }

  // Standalone client verification fallback
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${pat.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      return { success: false, error: 'Invalid or expired GitHub Personal Access Token.' };
    }

    const userData = await userRes.json();
    const login = (userData.login || '').toLowerCase();
    const allowedAdmin = 'guruchiwate06';

    if (login !== allowedAdmin.toLowerCase()) {
      return {
        success: false,
        error: `Access Denied: Token belongs to GitHub user @${userData.login}. Only administrator @${allowedAdmin} is authorized.`
      };
    }

    setAuthToken('standalone_local_session');
    return { success: true, user: userData.login };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error verifying GitHub token with GitHub API.' };
  }
}

export async function apiToggleGitHubAuthEnforce(enforce: boolean): Promise<{ success: boolean; enforced?: boolean; error?: string }> {
  const isUp = await checkServer();
  if (isUp) {
    const token = getAuthToken();
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/github/toggle-enforce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enforce })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle GitHub enforcement');
      return { success: true, enforced: data.enforced };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Standalone mode
  localStorage.setItem('portfolio_github_enforced', enforce ? 'true' : 'false');
  return { success: true, enforced: enforce };
}
