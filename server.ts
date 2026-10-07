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

// ─── Data Persistence ───────────────────────────────────────────────────────
const DEFAULT_DATA = {
  projectsConfig: [],
  achievements: [],
  settings: null,
  about: null,
  skills: null,
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

// ─── Portfolio Routes ───────────────────────────────────────────────────────

// GET all portfolio data (Public Read-Only)
app.get('/api/portfolio', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data);
});

// POST a specific key (Protected: Requires Auth)
app.post('/api/portfolio/:key', requireAuth, (req: Request, res: Response) => {
  const { key } = req.params;
  const allowedKeys = ['projectsConfig', 'achievements', 'settings', 'about', 'skills'];
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
