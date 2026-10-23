// Guests may enter the study area freely; only unknown outside routes return to welcome.
export function entryRedirect(isLoaded: boolean, isSignedIn: boolean | undefined, first?: string) {
  if (!isLoaded) return null;
  if (isSignedIn) {
    return first === 'index' || first === '(auth)'
      ? null
      : '/(auth)/(drawer)/today';
  }
  return !first || first === 'index' || first === '(auth)' || first === 'login' ? null : '/';
}
