import type { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { AuthFlowError, getSignInFactorPlan, requireAuthResponseState } from './clerkAuth';

type SignIn = NonNullable<ReturnType<typeof useSignIn>['signIn']>;
type SignUp = NonNullable<ReturnType<typeof useSignUp>['signUp']>;
type OAuthResult =
  | { kind: 'cancelled' }
  | { kind: 'signIn'; resource: SignIn }
  | { kind: 'signUp'; resource: SignUp };

const SAFE_OAUTH_QUERY_MARKERS = [
  'rotating_token_nonce',
  '__clerk_status',
  'error',
  'error_code',
  'state',
] as const;
const SAFE_CLERK_ERROR_CODES = new Set([
  'auth_service_unavailable',
  'network_error',
  'native_api_disabled',
  'oauth_access_denied',
  'oauth_email_domain_reserved',
  'strategy_for_user_invalid',
  'external_account_not_found',
  'sso_session_not_found',
  'not_allowed_access',
  'request_not_found',
  'form_param_missing',
  'form_param_format_invalid',
]);

function safeClerkErrorCategory(error: unknown): string {
  try {
    const value = error as {
      code?: unknown;
      errors?: Array<{ code?: unknown }> | null;
    } | null;
    const code = value?.errors?.[0]?.code ?? value?.code;
    return typeof code === 'string' && SAFE_CLERK_ERROR_CODES.has(code)
      ? code
      : 'other';
  } catch {
    return 'other';
  }
}

function safeClerkErrorCount(error: unknown): string {
  try {
    const errors = (error as { errors?: unknown } | null)?.errors;
    return Array.isArray(errors) ? String(Math.min(errors.length, 20)) : 'none';
  } catch {
    return 'none';
  }
}

function safeCallbackDestination(value: string): string {
  try {
    const url = new URL(value);
    const scheme = url.protocol.slice(0, -1);
    const host = url.host;
    const path = url.pathname;
    if (
      !/^[a-z][a-z0-9+.-]{0,31}$/i.test(scheme) ||
      !/^[a-z0-9.-]{0,127}$/i.test(host) ||
      !/^\/[a-z0-9._~/-]{0,127}$/i.test(path) && path !== ''
    ) {
      return 'unrecognized';
    }
    return `${scheme}://${host}${path}`;
  } catch {
    return 'invalid';
  }
}

/**
 * Keep support diagnostics useful without exposing callback values, which can
 * contain rotating tokens, authorization codes, or account-identifying data.
 */
export function oauthCallbackDiagnostics(
  expectedUrl: string,
  returnedUrl: string,
  resultType: string
): string {
  const expected = safeCallbackDestination(expectedUrl);
  const returned = safeCallbackDestination(returnedUrl);
  let queryMarkers = new Set<string>();
  let fragmentMarkers = new Set<string>();

  try {
    const url = new URL(returnedUrl);
    queryMarkers = new Set(SAFE_OAUTH_QUERY_MARKERS.filter((key) => url.searchParams.has(key)));
    const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    fragmentMarkers = new Set(
      SAFE_OAUTH_QUERY_MARKERS.filter((key) => new URLSearchParams(fragment).has(key))
    );
  } catch {
    // Invalid URLs are reported as such, with no raw input echoed.
  }

  const markerSummary = SAFE_OAUTH_QUERY_MARKERS
    .map((key) => `${key}=${queryMarkers.has(key) ? 'yes' : 'no'}`)
    .join(',');
  const fragmentNonce = fragmentMarkers.has('rotating_token_nonce') ? 'yes' : 'no';
  return `result=${/^(success|cancel|dismiss|locked|opened)$/i.test(resultType) ? resultType : 'other'}; expected=${expected}; returned=${returned}; callback_match=${expected === returned ? 'yes' : 'no'}; query_markers[${markerSummary}]; fragment_nonce=${fragmentNonce}`;
}

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
  const provider = strategy === 'oauth_apple' ? 'Apple' : 'Google';
  let phase = 'sign_in_create';
  try {
    let resource = await signIn.create({ strategy, redirectUrl });
    requireAuthResponseState(resource);

    const continueWithResource = async (): Promise<OAuthResult> => {
      if (resource.firstFactorVerification?.status === 'transferable') {
        phase = 'sign_up_transfer';
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
      throw new AuthFlowError(
        `${provider} sign-in could not start because the sign-in service did not provide a browser link. Check the provider settings in the Clerk instance used by this build. This is separate from the app’s return URL.`
      );
    }

    phase = 'provider_browser';
    const response = await openAuthSession(String(externalUrl), redirectUrl);
    if (response.type === 'cancel' || response.type === 'dismiss') {
      return { kind: 'cancelled' };
    }
    if (response.type !== 'success' || !response.url) {
      const resultType = /^(locked|opened)$/i.test(response.type) ? response.type : 'other';
      throw new AuthFlowError(
        'The sign-in browser did not finish. Close it and try again.',
        `provider=${provider}; phase=provider_return; browser_result=${resultType}; expected=${safeCallbackDestination(redirectUrl)}; returned=missing`
      );
    }
    let callback: URL;
    try {
      callback = new URL(response.url);
    } catch {
      throw new AuthFlowError(
        'The sign-in return link could not be read. Please start sign-in again.',
        `provider=${provider}; ${oauthCallbackDiagnostics(redirectUrl, response.url, response.type)}`
      );
    }
    const nonce = callback.searchParams.get('rotating_token_nonce');
    if (!nonce) {
      throw new AuthFlowError(
        'The sign-in return link is incomplete. Please start sign-in again.',
        `provider=${provider}; ${oauthCallbackDiagnostics(redirectUrl, response.url, response.type)}`
      );
    }
    phase = 'sign_in_reload';
    resource = await resource.reload({ rotatingTokenNonce: nonce });
    requireAuthResponseState(resource);
    return continueWithResource();
  } catch (error) {
    if (error instanceof AuthFlowError) throw error;
    throw new AuthFlowError(
      'Clerk could not complete sign-in. Please try again.',
      `provider=${provider}; phase=${phase}; category=${safeClerkErrorCategory(error)}; clerk_errors=${safeClerkErrorCount(error)}`
    );
  }
}
