const { createHash } = require('node:crypto');
const manifest = require('../constants/libraryManifest.json');
const accessPolicy = require('../constants/libraryAccessPolicy.json');

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
  return Buffer.from(result.value[0]);
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

    try {
      const bytes = Buffer.from(await loadPackage(id, entry));
      if (bytes.length !== entry.bytes
        || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
        throw new Error('Stored package failed manifest verification.');
      }

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': bytes.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(bytes);
    } catch {
      sendJson(res, 503, { error: 'This edition is temporarily unavailable. Please retry later.' });
    }
    return true;
  };
}

module.exports = { createLibraryPackageHandler };
