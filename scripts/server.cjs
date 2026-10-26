const http = require('node:http');
const { createReadStream } = require('node:fs');
const { stat } = require('node:fs/promises');
const path = require('node:path');
const { createLibraryPackageHandler } = require('./library-package-handler.cjs');
const handleStudyNotes = require('./study-notes-handler.cjs');

const distRoot = path.resolve(__dirname, '../dist');
const libraryHandler = createLibraryPackageHandler();
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
};

function setIsolationHeaders(res) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function safeDistPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const relativePath = decoded.replace(/^\/+/, '') || 'index.html';
  const resolved = path.resolve(distRoot, relativePath);
  return resolved.startsWith(`${distRoot}${path.sep}`) ? resolved : null;
}

async function findStaticFile(urlPath) {
  const candidate = safeDistPath(urlPath);
  if (!candidate) return null;
  try {
    const info = await stat(candidate);
    if (info.isFile()) return candidate;
    if (info.isDirectory()) {
      const indexPath = path.join(candidate, 'index.html');
      if ((await stat(indexPath)).isFile()) return indexPath;
    }
  } catch {
    // Expo's static export can omit extensionless route paths; use the SPA entry.
  }
  return path.join(distRoot, 'index.html');
}

const server = http.createServer(async (req, res) => {
  setIsolationHeaders(res);
  try {
    if (await handleStudyNotes(req, res)) return;
    if (await libraryHandler(req, res)) return;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }

    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    const filePath = await findStaticFile(pathname);
    if (!filePath) {
      res.writeHead(400);
      res.end('Invalid path.');
      return;
    }

    let info;
    try {
      info = await stat(filePath);
    } catch {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Web build is missing. Run npm run build:web first.');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': path.extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('[server] Request failed', {
      method: req.method,
      errorType: error?.name || 'UnknownError',
    });
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

const port = Number(process.env.PORT || 5000);
server.listen(port, '0.0.0.0', () => {
  console.log(`Web app and protected library endpoint listening on port ${port}.`);
});
