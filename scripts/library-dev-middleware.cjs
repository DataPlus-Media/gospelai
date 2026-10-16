// Development prefers packages prepared from App Storage, or the reproducible
// local import when that preparation has not been run. Both are checksum-locked.
const { readFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const manifest = require('../constants/libraryManifest.json');
module.exports = async (req, res, next) => {
  const match = /^\/library-packages\/([a-z0-9-]+)\/([a-z-]+)\.json(?:\?.*)?$/.exec(req.url || '');
  if (!match) return next();
  const id = match[2], entry = manifest[id];
  if (!entry || entry.revision !== match[1]) { res.writeHead(404); res.end('Edition not available.'); return; }
  try {
    let data, source = 'verified-app-storage-package';
    try {
      data = await readFile(`public/library-packages/${entry.revision}/${id}.json`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      data = await readFile(`generated-artifacts/library/${id}.json`);
      source = 'verified-local-development-import';
    }
    if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) {
      throw new Error('Local edition does not match manifest.');
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8', 'Content-Length': data.length,
      'Cache-Control': 'no-store', 'X-Library-Source': source,
    });
    res.end(data);
  } catch {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'Library development packages are missing or invalid. Run node scripts/prepare-library-web.cjs with App Storage configured, or npm run library:import.' }));
  }
};
