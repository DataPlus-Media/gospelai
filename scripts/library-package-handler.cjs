const { createHash } = require('node:crypto');
const { promisify } = require('node:util');
const { gzip } = require('node:zlib');
const manifest = require('../constants/libraryManifest.json');
const accessPolicy = require('../constants/libraryAccessPolicy.json');

const compress = promisify(gzip);
let storageClient;

async function loadFromAppStorage(id, entry) {
  if (!storageClient) {
    const { Client } = require('@replit/object-storage');
    storageClient = new Client({
      bucketId: process.env.LIBRARY_STORAGE_BUCKET_ID || undefined,
    });
  }

  const result = await storageClient.downloadAsBytes(`library/${entry.revision}/${id}.json`);
  if (!result.ok) throw new Error('Verified package is not available in App Storage.');
  return result.value[0];
}

function acceptsGzip(header) {
  const preferences = new Map(String(header || '').toLowerCase().split(',').map(part => {
    const [name, ...parameters] = part.trim().split(';');
    const quality = parameters.map(p => p.trim()).find(p => p.startsWith('q='));
    const value = quality === undefined ? 1 : Number(quality.slice(2));
    return [name, Number.isFinite(value) ? value : 0];
  }));
  return (preferences.get('gzip') ?? preferences.get('*') ?? 0) > 0;
}

function sendJson(res, status, body) {
  const bytes = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': bytes.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(bytes);
}

function createLibraryPackageHandler({
  packageManifest = manifest,
  lockedWorkIds = accessPolicy.lockedWorkIds,
  loadPackage = loadFromAppStorage,
} = {}) {
  return async function handleLibraryPackage(req, res) {
    let pathname;
    try {
      pathname = new URL(req.url || '/', 'http://localhost').pathname;
    } catch {
      return false;
    }

    if (!pathname.startsWith('/library-packages/')) return false;
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      sendJson(res, 405, { error: 'Method not allowed.' });
      return true;
    }

    const match = /^\/library-packages\/([a-z0-9-]+)\/([a-z0-9-]+)\.json$/.exec(pathname);
    if (!match) {
      sendJson(res, 404, { error: 'Edition not available.' });
      return true;
    }

    const [, revision, id] = match;
    if (Object.hasOwn(lockedWorkIds, id)) {
      sendJson(res, 403, { error: 'This work is currently unavailable.' });
      return true;
    }

    const entry = packageManifest[id];
    if (!entry || entry.revision !== revision) {
      sendJson(res, 404, { error: 'Edition not available.' });
      return true;
    }

    let phase = 'storage';
    try {
      const loaded = await loadPackage(id, entry);
      const bytes = Buffer.isBuffer(loaded) ? loaded : Buffer.from(loaded);
      phase = 'integrity';
      if (bytes.length !== entry.bytes
        || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
        throw new Error('Stored package failed manifest verification.');
      }

      // Native URLSession and browser XHR decode gzip before the existing
      // client checksum/JSON checks. Keep large books small on the wire.
      phase = 'compression';
      const compressed = acceptsGzip(req.headers['accept-encoding']);
      const body = compressed ? await compress(bytes) : bytes;
      phase = 'response';
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
        Vary: 'Accept-Encoding',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(body);
    } catch (error) {
      // Do not log book text, credentials, query strings or SDK error payloads.
      console.error('[library] Package delivery failed', {
        workId: id, revision, phase, errorType: error?.name || 'UnknownError',
      });
      if (!res.headersSent) {
        sendJson(res, 503, { error: 'This edition is temporarily unavailable. Please retry later.' });
      } else {
        res.destroy();
      }
    }
    return true;
  };
}

module.exports = { createLibraryPackageHandler };
