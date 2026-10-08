/**
 * Portfolio Data Persistence & Secure Authentication Server
 *
 * Provides:
 * 1. Constant-time password verification from ADMIN_PASSWORD (.env)
 * 2. Signed session tokens (HMAC-SHA256)
 * 3. Rate limiting on login attempts to prevent brute-force attacks
 * 4. Token authorization middleware on all modifying endpoints
 * 5. Password changing endpoint that updates .env safely
 * 6. Public read-only portfolio endpoints
 * 7. Optional static file serving for production single-port deployment
 */
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3999;
const DATA_FILE = path.join(__dirname, 'portfolio-data.json');
const ENV_FILE = path.join(__dirname, '.env');

// Session secret - generated once per server lifecycle or loaded from env
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Current admin password in memory
let currentAdminPassword = process.env.ADMIN_PASSWORD || 'admin_secret_pass_2026';
if (!process.env.ADMIN_PASSWORD) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: ADMIN_PASSWORD is not set in .env! Using fallback. Please configure ADMIN_PASSWORD.');
}

// In-memory active session tokens set
const activeTokens = new Set<string>();

// Rate limiter for login: max 5 failed attempts per 15 minutes per IP
interface RateLimitRecord {
  failures: number;
  blockedUntil: number;
}
const loginRateLimits = new Map<string, RateLimitRecord>();

function isRateLimited(ip: string): boolean {
  const record = loginRateLimits.get(ip);
  if (!record) return false;
  const now = Date.now();
  if (record.blockedUntil > now) return true;
  if (record.blockedUntil <= now && record.blockedUntil > 0) {
    loginRateLimits.delete(ip);
    return false;
  }
  return false;
}

function recordLoginFailure(ip: string) {
  const now = Date.now();
  const record = loginRateLimits.get(ip) || { failures: 0, blockedUntil: 0 };
  record.failures += 1;
  if (record.failures >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000; // block for 15 mins
  }
  loginRateLimits.set(ip, record);
}

function resetLoginFailures(ip: string) {
  loginRateLimits.delete(ip);
}

// Constant-time string comparison using SHA-256
function safeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Generate signed session token: <timestamp>.<random>.<signature>
function createSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  const payload = `${timestamp}.${random}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const token = `${payload}.${signature}`;
  activeTokens.add(token);
  return token;
}

// Verify session token
function verifySessionToken(token: string | undefined): boolean {
  if (!token || !activeTokens.has(token)) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [timestampStr, random, signature] = parts;
  const payload = `${timestampStr}.${random}`;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  if (!safeCompare(signature, expectedSig)) return false;

  const timestamp = parseInt(timestampStr, 36);
  if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_EXPIRY_MS) {
    activeTokens.delete(token);
    return false;
  }
  return true;
}

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Authentication middleware for mutating routes
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
    return;
  }
  next();
}

// In-memory challenge store for WebAuthn: key -> { challenge: string, expiresAt: number }
const webAuthnChallenges = new Map<string, { challenge: string; expiresAt: number }>();
function setWebAuthnChallenge(key: string, challenge: string) {
  webAuthnChallenges.set(key, { challenge, expiresAt: Date.now() + 5 * 60 * 1000 });
}
function consumeWebAuthnChallenge(key: string): string | null {
  const item = webAuthnChallenges.get(key);
  if (!item) return null;
  webAuthnChallenges.delete(key);
  if (Date.now() > item.expiresAt) return null;
  return item.challenge;
}

function getRpContext(req: Request) {
  const originHeader = (req.headers.origin as string) || (req.headers.referer as string) || '';
  const origin = originHeader.replace(/\/$/, '');
  const hostHeader = (req.headers.host as string) || 'localhost';
  const rpID = hostHeader.split(':')[0];

  const expectedOrigins = [
    'http://localhost:3000',
    'http://localhost:3999',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3999',
  ];
  if (origin && !expectedOrigins.includes(origin)) {
    expectedOrigins.push(origin);
  }

  return { rpID, expectedOrigins };
}

// ─── Data Persistence ───────────────────────────────────────────────────────
const DEFAULT_DATA = {
  projectsConfig: [],
  achievements: [],
  settings: null,
  about: null,
  skills: null,
  webauthnCredentials: [] as any[],
  enforcePasskey: false,
  enforceGithubAuth: false,
};

function readData(): Record<string, any> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[server] Failed to read data file:', err);
  }
  return { ...DEFAULT_DATA };
}

function writeData(data: Record<string, any>): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[server] Failed to write data file:', err);
  }
}

// ─── Authentication Routes ─────────────────────────────────────────────────

// POST /api/auth/login - authenticate with password and obtain token
app.post('/api/auth/login', (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  
  if (isRateLimited(ip)) {
    const record = loginRateLimits.get(ip);
    const remainingSec = Math.ceil(((record?.blockedUntil || 0) - Date.now()) / 1000);
    res.status(429).json({ 
      error: `Too many failed attempts. Account locked temporarily for ${Math.max(1, remainingSec)} seconds.` 
    });
    return;
  }

  const { password } = req.body || {};
  
  // Check if GitHub-only or Biometric Passkey enforcement is active
  const data = readData();
  if (data.enforceGithubAuth === true) {
    res.status(403).json({
      error: `Security Enforcement Active: Direct password login is disabled. Please authenticate using your verified GitHub account (@${ALLOWED_GITHUB_ADMIN}).`
    });
    return;
  }

  const credentials = data.webauthnCredentials || [];
  if (data.enforcePasskey === true && credentials.length > 0) {
    res.status(403).json({
      error: 'Security Enforcement Active: Direct password login is disabled. Biometric Passkey (Windows Hello / Touch ID) is required to access the admin backend.'
    });
    return;
  }

  if (typeof password !== 'string' || !safeCompare(password, currentAdminPassword)) {
    recordLoginFailure(ip);
    res.status(401).json({ error: 'Invalid password. Access denied.' });
    return;
  }

  resetLoginFailures(ip);
  const token = createSessionToken();
  res.json({
    ok: true,
    token,
    expiresIn: TOKEN_EXPIRY_MS,
  });
});

// GET /api/auth/verify - check if active session token is valid
app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const isValid = verifySessionToken(token);
  res.json({ ok: isValid });
});

// POST /api/auth/logout - invalidate active session token
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  if (token) {
    activeTokens.delete(token);
  }
  res.json({ ok: true });
});

// POST /api/auth/change-password - secure password change (requires existing valid session)
app.post('/api/auth/change-password', requireAuth, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== 'string' || !safeCompare(currentPassword, currentAdminPassword)) {
    res.status(400).json({ error: 'Current password incorrect.' });
    return;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    return;
  }

  // Update in-memory password
  currentAdminPassword = newPassword;

  // Persist updated password to .env if possible
  try {
    let envContent = '';
    if (fs.existsSync(ENV_FILE)) {
      envContent = fs.readFileSync(ENV_FILE, 'utf-8');
      if (/^ADMIN_PASSWORD=/m.test(envContent)) {
        envContent = envContent.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD="${newPassword}"`);
      } else {
        envContent += `\nADMIN_PASSWORD="${newPassword}"\n`;
      }
    } else {
      envContent = `ADMIN_PASSWORD="${newPassword}"\n`;
    }
    fs.writeFileSync(ENV_FILE, envContent, 'utf-8');
  } catch (err) {
    console.warn('[server] Notice: Could not write new password to .env file directly:', err);
  }

  // Invalidate all tokens except issue a fresh one
  activeTokens.clear();
  const newToken = createSessionToken();

  res.json({
    ok: true,
    token: newToken,
    message: 'Password successfully updated!',
  });
});

// ─── WebAuthn / Biometric Passkey Routes ───────────────────────────────────

// GET /api/auth/webauthn/status - Get passkey configuration status
app.get('/api/auth/webauthn/status', (_req: Request, res: Response) => {
  const data = readData();
  const credentials = (data.webauthnCredentials || []) as any[];
  res.json({
    ok: true,
    hasPasskeys: credentials.length > 0,
    enforced: data.enforcePasskey === true && credentials.length > 0,
    credentials: credentials.map(c => ({
      id: c.id,
      name: c.name || 'Hardware Key',
      createdAt: c.createdAt,
      deviceType: c.deviceType || 'singleDevice'
    }))
  });
});

// POST /api/auth/webauthn/register-options (Protected)
app.post('/api/auth/webauthn/register-options', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = readData();
    const existing = (data.webauthnCredentials || []) as any[];
    const { rpID } = getRpContext(req);
    const options = await generateRegistrationOptions({
      rpName: 'Rajguru Chiwate Portfolio Admin',
      rpID,
      userName: 'rajguru',
      attestationType: 'none',
      excludeCredentials: existing.map(c => ({
        id: c.id,
        transports: c.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
    setWebAuthnChallenge('register_admin', options.challenge);
    res.json(options);
  } catch (err: any) {
    console.error('[server] Error generating registration options:', err);
    res.status(500).json({ error: err.message || 'Failed to generate passkey options' });
  }
});

// POST /api/auth/webauthn/register-verify (Protected)
app.post('/api/auth/webauthn/register-verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const expectedChallenge = consumeWebAuthnChallenge('register_admin');
    if (!expectedChallenge) {
      res.status(400).json({ error: 'Registration challenge expired. Please retry.' });
      return;
    }
    const { expectedOrigins, rpID } = getRpContext(req);
    const { response, deviceName } = req.body as { response: RegistrationResponseJSON; deviceName?: string };
    
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ error: 'Passkey verification failed.' });
      return;
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const data = readData();
    const credentials = (data.webauthnCredentials || []) as any[];
    
    // Prevent duplicate registration
    const existingIdx = credentials.findIndex(c => c.id === credential.id);
    const credRecord = {
      id: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: deviceName || 'Personal Hardware Key',
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      credentials[existingIdx] = credRecord;
    } else {
      credentials.push(credRecord);
    }

    data.webauthnCredentials = credentials;
    writeData(data);

    res.json({ ok: true, message: 'Passkey registered successfully!' });
  } catch (err: any) {
    console.error('[server] Error verifying passkey registration:', err);
    res.status(400).json({ error: err.message || 'Failed to verify passkey.' });
  }
});

// POST /api/auth/webauthn/login-options (Public)
app.post('/api/auth/webauthn/login-options', async (req: Request, res: Response) => {
  try {
    const data = readData();
    const credentials = (data.webauthnCredentials || []) as any[];
    if (credentials.length === 0) {
      res.status(400).json({ error: 'No passkeys registered yet on this server. Please register a device first.' });
      return;
    }
    const { rpID } = getRpContext(req);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map(c => ({
        id: c.id,
        transports: c.transports,
      })),
      userVerification: 'preferred',
    });
    setWebAuthnChallenge('login_admin', options.challenge);
    res.json(options);
  } catch (err: any) {
    console.error('[server] Error generating login options:', err);
    res.status(500).json({ error: err.message || 'Failed to generate passkey login options' });
  }
});

// POST /api/auth/webauthn/login-verify (Public)
app.post('/api/auth/webauthn/login-verify', async (req: Request, res: Response) => {
  try {
    const expectedChallenge = consumeWebAuthnChallenge('login_admin');
    if (!expectedChallenge) {
      res.status(400).json({ error: 'Authentication challenge expired. Please retry.' });
      return;
    }
    const { response } = req.body as { response: AuthenticationResponseJSON };
    const data = readData();
    const credentials = (data.webauthnCredentials || []) as any[];
    const match = credentials.find(c => c.id === response.id);
    if (!match) {
      res.status(400).json({ error: 'Unrecognized passkey. Access denied.' });
      return;
    }
    const { expectedOrigins, rpID } = getRpContext(req);
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      credential: {
        id: match.id,
        publicKey: isoBase64URL.toBuffer(match.publicKey),
        counter: match.counter,
        transports: match.transports,
      },
    });

    if (!verification.verified) {
      res.status(401).json({ error: 'Biometric passkey signature failed verification.' });
      return;
    }

    // Update counter
    match.counter = verification.authenticationInfo.newCounter;
    data.webauthnCredentials = credentials;
    writeData(data);

    // Issue authorized session token
    const token = createSessionToken();
    res.json({
      ok: true,
      token,
      expiresIn: TOKEN_EXPIRY_MS,
    });
  } catch (err: any) {
    console.error('[server] Error verifying passkey authentication:', err);
    res.status(401).json({ error: err.message || 'Passkey authentication failed.' });
  }
});

// POST /api/auth/webauthn/toggle-enforce (Protected)
app.post('/api/auth/webauthn/toggle-enforce', requireAuth, (req: Request, res: Response) => {
  const { enforce } = req.body || {};
  const data = readData();
  const credentials = (data.webauthnCredentials || []) as any[];
  if (enforce && credentials.length === 0) {
    res.status(400).json({ error: 'Cannot enforce passkeys before registering at least one biometric device.' });
    return;
  }
  data.enforcePasskey = !!enforce;
  writeData(data);
  res.json({ ok: true, enforced: data.enforcePasskey });
});

// DELETE /api/auth/webauthn/credential/:id (Protected)
app.delete('/api/auth/webauthn/credential/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const data = readData();
  let credentials = (data.webauthnCredentials || []) as any[];
  credentials = credentials.filter(c => c.id !== id);
  data.webauthnCredentials = credentials;
  if (credentials.length === 0) {
    data.enforcePasskey = false;
  }
  writeData(data);
  res.json({ ok: true });
});

// ─── GitHub Identity Whitelist Authentication ──────────────────────────────
const ALLOWED_GITHUB_ADMIN = (process.env.ALLOWED_GITHUB_ADMIN || 'guruchiwate06').toLowerCase();
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

// GET /api/auth/github/config - Return GitHub OAuth config & allowed admin handle
app.get('/api/auth/github/config', (_req: Request, res: Response) => {
  const data = readData();
  res.json({
    ok: true,
    hasOAuthConfig: Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
    clientId: GITHUB_CLIENT_ID,
    allowedAdmin: ALLOWED_GITHUB_ADMIN,
    enforced: data.enforceGithubAuth === true,
  });
});

// POST /api/auth/github/callback - Exchange OAuth code and verify username
app.post('/api/auth/github/callback', async (req: Request, res: Response) => {
  const { code, redirectUri } = req.body || {};
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing OAuth authorization code.' });
    return;
  }
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    res.status(500).json({ error: 'GitHub OAuth Client ID & Secret are not configured in server environment.' });
    return;
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      res.status(401).json({ error: tokenData.error_description || 'GitHub OAuth token exchange failed.' });
      return;
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Portfolio-Admin-Auth',
      },
    });

    if (!userRes.ok) {
      res.status(401).json({ error: 'Failed to retrieve GitHub user profile.' });
      return;
    }

    const userData = await userRes.json();
    const login = (userData.login || '').toLowerCase();

    if (login !== ALLOWED_GITHUB_ADMIN) {
      res.status(403).json({
        error: `Access Denied: Logged in as GitHub user @${userData.login}. Only authorized administrator @${ALLOWED_GITHUB_ADMIN} is permitted to access the admin backend.`
      });
      return;
    }

    const token = createSessionToken();
    res.json({
      ok: true,
      token,
      expiresIn: TOKEN_EXPIRY_MS,
      user: userData.login,
      avatarUrl: userData.avatar_url,
    });
  } catch (err: any) {
    console.error('[server] GitHub OAuth error:', err);
    res.status(500).json({ error: err.message || 'Error communicating with GitHub OAuth service.' });
  }
});

// POST /api/auth/github/pat - Instant login using GitHub Personal Access Token
app.post('/api/auth/github/pat', async (req: Request, res: Response) => {
  const { pat } = req.body || {};
  if (!pat || typeof pat !== 'string') {
    res.status(400).json({ error: 'GitHub Personal Access Token is required.' });
    return;
  }

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${pat.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Portfolio-Admin-Auth',
      },
    });

    if (!userRes.ok) {
      res.status(401).json({ error: 'Invalid or expired GitHub Personal Access Token.' });
      return;
    }

    const userData = await userRes.json();
    const login = (userData.login || '').toLowerCase();

    if (login !== ALLOWED_GITHUB_ADMIN) {
      res.status(403).json({
        error: `Access Denied: Token belongs to GitHub user @${userData.login}. Only authorized administrator @${ALLOWED_GITHUB_ADMIN} is permitted to access the admin backend.`
      });
      return;
    }

    const token = createSessionToken();
    res.json({
      ok: true,
      token,
      expiresIn: TOKEN_EXPIRY_MS,
      user: userData.login,
      avatarUrl: userData.avatar_url,
    });
  } catch (err: any) {
    console.error('[server] GitHub PAT verification error:', err);
    res.status(500).json({ error: err.message || 'Error verifying GitHub token.' });
  }
});

// POST /api/auth/github/toggle-enforce (Protected)
app.post('/api/auth/github/toggle-enforce', requireAuth, (req: Request, res: Response) => {
  const { enforce } = req.body || {};
  const data = readData();
  data.enforceGithubAuth = !!enforce;
  writeData(data);
  res.json({ ok: true, enforced: data.enforceGithubAuth });
});

// ─── Portfolio Routes ───────────────────────────────────────────────────────

// GET all portfolio data (Public Read-Only)
app.get('/api/portfolio', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data);
});

// POST a specific key (Protected: Requires Auth)
app.post('/api/portfolio/:key', requireAuth, (req: Request, res: Response) => {
  const { key } = req.params;
  const allowedKeys = ['projectsConfig', 'achievements', 'settings', 'about', 'skills', 'webauthnCredentials', 'enforcePasskey', 'enforceGithubAuth'];
  if (!allowedKeys.includes(key)) {
    res.status(400).json({ error: `Invalid key: ${key}` });
    return;
  }
  const data = readData();
  data[key] = req.body.value;
  writeData(data);
  res.json({ ok: true, key });
});

// DELETE a specific key (Protected: Requires Auth)
app.delete('/api/portfolio/:key', requireAuth, (req: Request, res: Response) => {
  const { key } = req.params;
  const allowedKeys = ['projectsConfig', 'achievements', 'settings', 'about', 'skills'];
  if (!allowedKeys.includes(key)) {
    res.status(400).json({ error: `Invalid key: ${key}` });
    return;
  }
  const data = readData();
  data[key] = (DEFAULT_DATA as any)[key];
  writeData(data);
  res.json({ ok: true, key });
});

// Health check (Public)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    dataFile: DATA_FILE,
    authRequired: true,
    serverTime: new Date().toISOString()
  });
});

// Optional production static serving if dist/ directory exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[portfolio-server] Running on http://localhost:${PORT}`);
  console.log(`[portfolio-server] Auth security: ENABLED (All mutation endpoints protected)`);
  console.log(`[portfolio-server] Data file: ${DATA_FILE}`);
});
