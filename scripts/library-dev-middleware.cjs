// Metro-only development delivery uses the shared access policy and package
// integrity checks. Imported local packages are an explicit opt-in fallback.
const { readFile } = require('node:fs/promises');
const { createLibraryPackageHandler } = require('./library-package-handler.cjs');
const handleStudyNotes = require('./study-notes-handler.cjs');

let storageClient;

async function loadDevelopmentPackage(id, entry) {
  try {
    if (!storageClient) {
      const { Client } = require('@replit/object-storage');
      storageClient = new Client({
        bucketId: process.env.LIBRARY_STORAGE_BUCKET_ID || undefined,
      });
    }
    const result = await storageClient.downloadAsBytes(`library/${entry.revision}/${id}.json`);
    if (!result.ok) throw new Error('Package is missing from App Storage.');
    return Buffer.from(result.value[0]);
  } catch (error) {
    if (process.env.LIBRARY_DEV_LOCAL_IMPORT !== '1') throw error;
    return readFile(`generated-artifacts/library/${id}.json`);
  }
}

const handleLibraryPackage = createLibraryPackageHandler({ loadPackage: loadDevelopmentPackage });

module.exports = async (req, res, next) => {
  if (await handleStudyNotes(req, res)) return;
  if (!await handleLibraryPackage(req, res)) next();
};
