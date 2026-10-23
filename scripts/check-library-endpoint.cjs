const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const http = require('node:http');
const { gunzipSync } = require('node:zlib');
const { createLibraryPackageHandler } = require('./library-package-handler.cjs');
const realManifest = require('../constants/libraryManifest.json');
const realPolicy = require('../constants/libraryAccessPolicy.json');

function startServer(handler) {
  const server = http.createServer(async (req, res) => {
    if (!await handler(req, res)) {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function getWire(url, encoding) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers: { 'Accept-Encoding': encoding } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks),
      }));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  let storageCalls = 0;
  const availableBytes = Buffer.from(JSON.stringify({
    schema: 1,
    workId: 'available-work',
    revision: 'verified-test-revision',
    notices: ['test notice'],
    sections: [],
  }));
  const manifest = {
    'available-work': {
      revision: 'verified-test-revision',
      bytes: availableBytes.length,
      sha256: createHash('sha256').update(availableBytes).digest('hex'),
    },
    'spurgeon-morning-evening': realManifest['spurgeon-morning-evening'],
  };
  const { server, baseUrl } = await startServer(createLibraryPackageHandler({
    packageManifest: manifest,
    lockedWorkIds: realPolicy.lockedWorkIds,
    loadPackage: async id => {
      storageCalls += 1;
      assert.equal(id, 'available-work');
      return availableBytes;
    },
  }));

  try {
    const locked = await fetch(`${baseUrl}/library-packages/ccel-morn-eve-1/spurgeon-morning-evening.json`);
    assert.equal(locked.status, 403);
    assert.equal((await locked.text()).includes('morning/evening text'), false);
    assert.equal(storageCalls, 0, 'locked work must be denied before storage is read');

    const unknown = await fetch(`${baseUrl}/library-packages/verified-test-revision/no-such-work.json`);
    assert.equal(unknown.status, 404);
    assert.equal(storageCalls, 0);

    const mismatchedRevision = await fetch(`${baseUrl}/library-packages/old-revision/available-work.json`);
    assert.equal(mismatchedRevision.status, 404);
    assert.equal(storageCalls, 0, 'mismatched revision must not read storage');

    const delivered = await fetch(`${baseUrl}/library-packages/verified-test-revision/available-work.json`);
    assert.equal(delivered.status, 200);
    assert.equal(delivered.headers.get('cache-control'), 'no-store');
    assert.equal(await delivered.text(), availableBytes.toString());
    assert.equal(storageCalls, 1, 'available verified package is read from storage once');

    const url = `${baseUrl}/library-packages/verified-test-revision/available-work.json`;
    const zipped = await getWire(url, 'gzip, deflate');
    assert.equal(zipped.status, 200);
    assert.equal(zipped.headers['content-encoding'], 'gzip');
    assert.equal(zipped.headers.vary, 'Accept-Encoding');
    assert.equal(Number(zipped.headers['content-length']), zipped.bytes.length);
    assert.deepEqual(gunzipSync(zipped.bytes), availableBytes);

    const identity = await getWire(url, 'gzip;q=0, *;q=1');
    assert.equal(identity.headers['content-encoding'], undefined);
    assert.deepEqual(identity.bytes, availableBytes);
    const fallback = await getWire(url, 'identity');
    assert.deepEqual(fallback.bytes, availableBytes);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  // Exercise a response larger than Henry's failing 39.5 MB uncompressed
  // response, without needing a real book or App Storage credentials.
  const largeBytes = Buffer.alloc(40 * 1024 * 1024, 'a');
  largeBytes[0] = 34;
  largeBytes[largeBytes.length - 1] = 34;
  const largeHash = createHash('sha256').update(largeBytes).digest('hex');
  let damaged = false;
  const large = await startServer(createLibraryPackageHandler({
    packageManifest: {
      'large-work': { revision: 'large-test', bytes: largeBytes.length, sha256: largeHash },
    },
    lockedWorkIds: {},
    loadPackage: async () => damaged ? Buffer.from('damaged') : largeBytes,
  }));
  try {
    const response = await getWire(`${large.baseUrl}/library-packages/large-test/large-work.json`, 'gzip');
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-encoding'], 'gzip');
    assert.ok(response.bytes.length < largeBytes.length / 10, 'large text is compressed on the wire');
    assert.equal(createHash('sha256').update(gunzipSync(response.bytes)).digest('hex'), largeHash);

    damaged = true;
    const invalid = await fetch(`${large.baseUrl}/library-packages/large-test/large-work.json`);
    assert.equal(invalid.status, 503, 'invalid packages must never be compressed or delivered');
    assert.equal(invalid.headers.get('content-encoding'), null);
  } finally {
    await new Promise(resolve => large.server.close(resolve));
  }
  console.log('Library delivery checks passed: access locks, revisions, verified downloads, gzip negotiation, large payload and damaged-package rejection.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
