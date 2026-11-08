// Guests may enter the study area freely; only unknown outside routes return to welcome.
const WEB_PUBLIC_ROUTES = new Set([
  'index',
  'features',
  'ask',
  'authors-insight',
  'support',
  'login',
]);

export function entryRedirect(
  isLoaded: boolean,
  isSignedIn: boolean | undefined,
  first?: string,
  isWeb = false,
) {
  if (!isLoaded) return null;
  if (isWeb && (!first || WEB_PUBLIC_ROUTES.has(first))) return null;
  if (isSignedIn) return first === '(auth)' ? null : '/(auth)/(drawer)/today';
  return !first || first === 'index' || first === '(auth)' || first === 'login' ? null : '/';
}
