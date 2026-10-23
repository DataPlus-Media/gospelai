const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const http = require('node:http');
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
    console.log('Library delivery checks passed: locked denial, unknown work, revision mismatch and verified guest download.');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
