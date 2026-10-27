// EAS runs this after installing dependencies. Never print the key or env values.
// EAS must supply the same external Clerk instance intended for the release.
// Match Expo's dotenv behavior; injected EAS variables keep precedence.
require('@expo/env').load(process.cwd(), { silent: true });
const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const match = key?.match(/^pk_(test|live)_([A-Za-z0-9+/_=-]+)$/);
let hostname = '';
if (match) {
  const decoded = Buffer.from(match[2], 'base64').toString('utf8');
  if (decoded.endsWith('$')) hostname = decoded.slice(0, -1);
}
if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname)) {
  console.error('Native sign-in configuration is missing or invalid. Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in the EAS environment for this build, using the existing external Clerk instance. No credentials were printed.');
  process.exitCode = 1;
} else {
  console.log(`Native sign-in configuration: environment=${match[1]}; hostname=${hostname}`);
  console.log('This checks configuration format only, not Native API settings, connectivity, or provider callbacks.');
}
