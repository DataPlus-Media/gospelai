// Verify dependency portability without changing the running app's node_modules.
const assert = require('node:assert/strict');
const { readFileSync, mkdirSync, mkdtempSync, copyFileSync, writeFileSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
let count = 0;
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path) continue;
  assert.ok(entry.version && entry.integrity, `Missing version/integrity: ${path}`);
  if (entry.resolved) {
    const url = new URL(entry.resolved);
    assert.equal(url.protocol, 'https:', `Non-HTTPS dependency: ${path}`);
    assert.equal(url.hostname, 'registry.npmjs.org', `Non-public registry: ${path}`);
  }
  count++;
}
assert.match(readFileSync(join(root, '.npmrc'), 'utf8'), /^omit-lockfile-registry-resolved=true$/m);
console.log(`PASS ${count} locked dependency entries retain versions/integrity without private registry endpoints`);

if (process.argv.includes('--install')) {
  const artifacts = join(root, 'generated-artifacts');
  mkdirSync(artifacts, { recursive: true });
  const directory = mkdtempSync(join(artifacts, 'release-install-'));
  try {
    for (const file of ['package.json', 'package-lock.json', '.npmrc']) {
      copyFileSync(join(root, file), join(directory, file));
    }
    // Use the public registry and a fresh cache, matching an external CI worker.
    // Package versions and integrity are unchanged; no security checks disabled.
    const result = spawnSync('npm', [
      'ci', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org',
      `--cache=${join(directory, 'cache')}`,
    ], { cwd: directory, encoding: 'utf8', timeout: 240000, maxBuffer: 16 * 1024 * 1024 });
    writeFileSync(join(artifacts, 'release-install.log'), `${result.stdout || ''}\n${result.stderr || ''}`);
    if (result.error) throw result.error;
    assert.equal(result.status, 0, 'Clean public-registry install failed; see generated-artifacts/release-install.log');
    console.log('PASS clean public-registry npm ci with an empty dependency directory and cache');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
