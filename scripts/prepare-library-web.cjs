// App Storage is the durable source. The static host serves public-domain copies
// produced at build time; private storage credentials never reach the app.
const { Client } = require('@replit/object-storage');
const { mkdir, writeFile, rm } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const manifest = require('../constants/libraryManifest.json');
(async () => {
  const client = new Client({ bucketId: process.env.LIBRARY_STORAGE_BUCKET_ID || undefined });
  await client.getBucket();
  const dir = 'public/library-packages';
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const [id, entry] of Object.entries(manifest)) {
    const result = await client.downloadAsBytes(`library/${entry.revision}/${id}.json`);
    if (!result.ok) throw new Error(`App Storage is missing the verified ${id} package.`);
    // This SDK version returns the GCS download tuple, [Buffer].
    const bytes = Buffer.from(result.value[0]);
    if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
      throw new Error(`App Storage integrity check failed for ${id}.`);
    }
    await mkdir(`${dir}/${entry.revision}`, { recursive: true });
    await writeFile(`${dir}/${entry.revision}/${id}.json`, bytes);
  }
  console.log('Prepared verified public-domain downloads from App Storage.');
})().catch(error => {
  console.error('Cannot prepare library downloads. Configure App Storage (or LIBRARY_STORAGE_BUCKET_ID if no default bucket is available) and run npm run library:upload.', error.message);
  process.exitCode = 1;
});
