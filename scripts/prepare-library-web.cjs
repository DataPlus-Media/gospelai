// Library packages are served only by the protected server endpoint; never
// copy them into Expo's public static export.
const { rm } = require('node:fs/promises');

(async () => {
  await Promise.all([
    rm('public/library-packages', { recursive: true, force: true }),
    rm('dist/library-packages', { recursive: true, force: true }),
  ]);
  console.log('Removed stale library package files from public web output.');
})().catch(error => {
  console.error('Could not remove stale public library packages.', error.message);
  process.exitCode = 1;
});
