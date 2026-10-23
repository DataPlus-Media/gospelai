const assert = require('node:assert/strict');
const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');

async function filesBelow(directory) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(filePath));
    else if (entry.isFile()) files.push(filePath);
  }
  return files;
}

async function run() {
  const files = await filesBelow('dist');
  assert.ok(files.length, 'Expo web export must produce files.');
  assert.equal(files.some(file => file.split(path.sep).includes('library-packages')), false,
    'public web export must not include library package files.');

  for (const file of files) {
    const content = await readFile(file);
    assert.equal(content.includes(Buffer.from('LIBRARY_STORAGE_BUCKET_ID')), false,
      'storage bucket configuration must not reach the web export.');
    assert.equal(content.includes(Buffer.from('@replit/object-storage')), false,
      'server storage SDK must not reach the web export.');
    assert.equal(content.includes(Buffer.from('replit-objstore-')), false,
      'storage bucket identifiers must not reach the web export.');
  }
  console.log(`Public web export check passed (${files.length} files; no library packages or storage configuration).`);
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
