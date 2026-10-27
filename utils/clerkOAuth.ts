import type { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { AuthFlowError, getSignInFactorPlan, requireAuthResponseState } from './clerkAuth';

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
  requireAuthResponseState(resource);

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
    throw new AuthFlowError(
      `${provider} sign-in could not start because the sign-in service did not provide a browser link. Check the provider settings in the Clerk instance used by this build. This is separate from the app’s return URL.`
    );
  }

  const response = await openAuthSession(String(externalUrl), redirectUrl);
  if (response.type === 'cancel' || response.type === 'dismiss') {
    return { kind: 'cancelled' };
  }
  if (response.type !== 'success' || !response.url) {
    throw new AuthFlowError('The sign-in browser did not finish. Close it and try again.');
  }
  const nonce = new URL(response.url).searchParams.get('rotating_token_nonce');
  if (!nonce) {
    throw new AuthFlowError('The sign-in return link is incomplete. Please start sign-in again.');
  }
  resource = await resource.reload({ rotatingTokenNonce: nonce });
  requireAuthResponseState(resource);
  return continueWithResource();
}
