import type { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { getSignInFactorPlan } from './clerkAuth';

type SignIn = NonNullable<ReturnType<typeof useSignIn>['signIn']>;
type SignUp = NonNullable<ReturnType<typeof useSignUp>['signUp']>;
type OAuthResult =
  | { kind: 'cancelled' }
  | { kind: 'signIn'; resource: SignIn }
  | { kind: 'signUp'; resource: SignUp };

/**
 * Keep the resource returned by each Clerk operation. A provider can complete
 * immediately, request verification, or transfer to sign-up without a redirect.
 */
export async function runClerkOAuthFlow({
  strategy,
  redirectUrl,
  signIn,
  signUp,
  openAuthSession,
}: {
  strategy: 'oauth_apple' | 'oauth_google';
  redirectUrl: string;
  signIn: SignIn;
  signUp: SignUp;
  openAuthSession: (
    url: string,
    redirectUrl: string
  ) => Promise<{ type: string; url?: string }>;
}): Promise<OAuthResult> {
  let resource = await signIn.create({ strategy, redirectUrl });

  const continueWithResource = async (): Promise<OAuthResult> => {
    if (resource.firstFactorVerification?.status === 'transferable') {
      return { kind: 'signUp', resource: await signUp.create({ transfer: true }) };
    }
    return { kind: 'signIn', resource };
  };

  if (
    resource.status === 'complete' ||
    resource.status === 'needs_second_factor' ||
    resource.status === 'needs_new_password' ||
    resource.firstFactorVerification?.status === 'transferable'
  ) {
    return continueWithResource();
  }

  const externalUrl = resource.firstFactorVerification?.externalVerificationRedirectURL;
  if (!externalUrl) {
    if (getSignInFactorPlan(resource)) return continueWithResource();
    const provider = strategy === 'oauth_apple' ? 'Apple' : 'Google';
    throw new Error(
      `${provider} did not return a sign-in link. Check that ${provider} is enabled in the Clerk instance used by this build and that its native return URL uses the gospelsai scheme.`
    );
  }

  const response = await openAuthSession(String(externalUrl), redirectUrl);
  if (response.type === 'cancel' || response.type === 'dismiss') {
    return { kind: 'cancelled' };
  }
  if (response.type !== 'success' || !response.url) {
    throw new Error('The sign-in browser did not finish. Close it and try again.');
  }
  const nonce = new URL(response.url).searchParams.get('rotating_token_nonce');
  if (!nonce) {
    throw new Error('The sign-in return link is incomplete. Please start sign-in again.');
  }
  resource = await resource.reload({ rotatingTokenNonce: nonce });
  return continueWithResource();
}
