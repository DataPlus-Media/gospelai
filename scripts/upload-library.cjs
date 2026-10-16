// Only verified, checksum-matching packages are uploaded. No credentials in code.
const { Client } = require('@replit/object-storage');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const manifest = require('../constants/libraryManifest.json');

(async () => {
  const client = new Client({ bucketId: process.env.LIBRARY_STORAGE_BUCKET_ID || undefined });
  await client.getBucket(); // Fail before starting if App Storage is not set up.
  for (const [id, entry] of Object.entries(manifest)) {
    const path = `generated-artifacts/library/${id}.json`;
    const data = readFileSync(path);
    if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) {
      throw new Error(`Package does not match verified manifest: ${id}`);
    }
    const key = `library/${entry.revision}/${id}.json`;
    const result = await client.uploadFromFilename(key, path);
    if (!result.ok) throw new Error(`Upload failed for ${id}: ${result.error.message}`);
    console.log(`Uploaded ${id} (${data.length} bytes) to App Storage.`);
  }
})().catch(error => {
  console.error('Library packages were not uploaded. Configure App Storage; if no default bucket is available, set LIBRARY_STORAGE_BUCKET_ID to the Bucket ID from App Storage Settings, then retry.', error.message);
  process.exitCode = 1;
});
