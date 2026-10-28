const { createPublicKey, verify: verifySignature } = require('node:crypto');
const { Pool } = require('pg');

const PATH = '/api/study-notes';
const MAX_BODY_BYTES = 16 * 1024;
let pool;
let jwksCache;

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

function clerkIssuer() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;
  if (!publishableKey || !publishableKey.startsWith('pk_')) throw new Error('CLERK_NOT_CONFIGURED');
  const encodedDomain = publishableKey.slice(publishableKey.indexOf('_', 3) + 1).split('$')[0];
  const domain = Buffer.from(encodedDomain, 'base64url').toString('utf8').replace(/\$$/, '');
  if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) throw new Error('CLERK_NOT_CONFIGURED');
  return `https://${domain}`;
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function allowedOrigin(origin) {
  if (!origin) return true;
  const allowed = new Set([
    'https://gospelai-1.replit.app',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
  ]);
  return allowed.has(origin);
}

async function readJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new Error('INVALID_JSON');
  }
}

async function authenticatedUser(req) {
  const authorization = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;
  const issuer = clerkIssuer();
  const parts = match[1].split('.');
  if (parts.length !== 3) return null;
  let header;
  let claims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' ||
    claims.iss !== issuer || typeof claims.sub !== 'string' || !claims.sub.startsWith('user_')) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(claims.exp) || claims.exp <= now ||
    (Number.isFinite(claims.nbf) && claims.nbf > now + 60) ||
    (Number.isFinite(claims.iat) && claims.iat > now + 60)) return null;

  let jwks;
  try {
    jwks = await loadClerkJwks(issuer);
  } catch {
    throw new Error('CLERK_KEYS_UNAVAILABLE');
  }
  let jwk = jwks.keys.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.use || key.use === 'sig'));
  if (!jwk) {
    try {
      jwk = (await loadClerkJwks(issuer, true)).keys.find(
        key => key.kid === header.kid && key.kty === 'RSA' && (!key.use || key.use === 'sig'),
      );
    } catch {
      throw new Error('CLERK_KEYS_UNAVAILABLE');
    }
  }
  if (!jwk) return null;
  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], 'base64url');
  const key = createPublicKey({ key: jwk, format: 'jwk' });
  return verifySignature('RSA-SHA256', signingInput, key, signature) ? claims.sub : null;
}

async function loadClerkJwks(issuer, forceRefresh = false) {
  if (!forceRefresh && jwksCache && jwksCache.issuer === issuer && jwksCache.expiresAt > Date.now()) return jwksCache.value;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${issuer}/.well-known/jwks.json`, { signal: controller.signal });
    if (!response.ok) throw new Error('CLERK_KEYS_UNAVAILABLE');
    const value = await response.json();
    if (!Array.isArray(value.keys) || !value.keys.length) throw new Error('CLERK_KEYS_UNAVAILABLE');
    jwksCache = { issuer, value, expiresAt: Date.now() + 5 * 60_000 };
    return value;
  } finally {
    clearTimeout(timeout);
  }
}

function validNoteInput(value) {
  return typeof value.content === 'string' &&
    value.content.trim().length > 0 && value.content.length <= 10_000 &&
    (value.reference === undefined || (typeof value.reference === 'string' && value.reference.length <= 120)) &&
    (value.source === undefined || (typeof value.source === 'string' && value.source.length <= 80));
}

module.exports = async function handleStudyNotes(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname !== PATH && !url.pathname.startsWith(`${PATH}/`)) return false;

  const origin = req.headers.origin;
  if (!allowedOrigin(origin)) {
    json(res, 403, { error: 'This request origin is not allowed.' });
    return true;
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    json(res, 405, { error: 'Method not allowed.' });
    return true;
  }

  let userId;
  try {
    userId = await authenticatedUser(req);
  } catch (error) {
    if (error?.message === 'CLERK_NOT_CONFIGURED') {
      json(res, 503, { error: 'Signed-in notes are not configured on this server.' });
    } else if (error?.message === 'CLERK_KEYS_UNAVAILABLE') {
      json(res, 503, { error: 'Your sign-in could not be checked right now. Retry in a moment.' });
    } else {
      json(res, 401, { error: 'Sign in again to access your synced notes.' });
    }
    return true;
  }
  if (!userId) {
    json(res, 401, { error: 'Sign in to access synced notes.' });
    return true;
  }

  try {
    const db = getPool();
    const itemId = url.pathname === PATH ? null : url.pathname.slice(PATH.length + 1);
    if (itemId !== null && !/^\d{1,18}$/.test(itemId)) {
      json(res, 400, { error: 'That note could not be found.' });
      return true;
    }

    if (req.method === 'GET' && itemId === null) {
      const result = await db.query(
        'SELECT id, content, source, reference, created_at, updated_at FROM study_notes WHERE user_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 500',
        [userId],
      );
      json(res, 200, { notes: result.rows });
      return true;
    }

    if (req.method === 'POST' && itemId === null) {
      const input = await readJson(req);
      if (!validNoteInput(input)) {
        json(res, 400, { error: 'Enter a note up to 10,000 characters.' });
        return true;
      }
      const result = await db.query(
        `INSERT INTO study_notes (user_id, content, source, reference)
         VALUES ($1, $2, $3, $4)
         RETURNING id, content, source, reference, created_at, updated_at`,
        [userId, input.content.trim(), input.source || 'bible', input.reference || ''],
      );
      json(res, 201, { note: result.rows[0] });
      return true;
    }

    if (req.method === 'PUT' && itemId !== null) {
      const input = await readJson(req);
      if (typeof input.content !== 'string' || !input.content.trim() || input.content.length > 10_000) {
        json(res, 400, { error: 'Enter a note up to 10,000 characters.' });
        return true;
      }
      const result = await db.query(
        `UPDATE study_notes SET content = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING id, content, source, reference, created_at, updated_at`,
        [input.content.trim(), itemId, userId],
      );
      if (!result.rowCount) {
        json(res, 404, { error: 'That note could not be found.' });
        return true;
      }
      json(res, 200, { note: result.rows[0] });
      return true;
    }

    if (req.method === 'DELETE' && itemId !== null) {
      const result = await db.query('DELETE FROM study_notes WHERE id = $1 AND user_id = $2', [itemId, userId]);
      if (!result.rowCount) {
        json(res, 404, { error: 'That note could not be found.' });
        return true;
      }
      json(res, 200, { deleted: true });
      return true;
    }

    json(res, 404, { error: 'That note could not be found.' });
    return true;
  } catch (error) {
    const status = error?.message === 'DATABASE_NOT_CONFIGURED' ? 503
      : error?.message === 'BODY_TOO_LARGE' ? 413
        : error?.message === 'INVALID_JSON' ? 400 : 500;
    if (status >= 500) {
      // Log only diagnostic codes, never database messages or user/request data.
      const rawCode = typeof error?.code === 'string' ? error.code : '';
      const code = /^[0-9A-Z]{5}$/.test(rawCode) ||
        ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'].includes(rawCode)
        ? rawCode : status === 503 ? 'DATABASE_NOT_CONFIGURED' : 'UNKNOWN';
      console.error('[study-notes] Database request failed', { method: req.method, code });
    }
    json(res, status, {
      error: status === 500
        ? 'Your notes could not be saved right now. Please retry.'
        : status === 413 ? 'That note is too long to send.'
          : status === 503 ? 'Signed-in notes are not available on this server yet.'
            : 'The note request was not valid.',
    });
    return true;
  }
};
