export type SignInFactorStrategy =
  | 'email_code'
  | 'phone_code'
  | 'totp'
  | 'backup_code';

// Only app-authored messages may be displayed verbatim. Provider/API errors
// can include user identifiers or request details, so map their codes below.
export class AuthFlowError extends Error {
  constructor(message: string, diagnostics?: string) {
    super(diagnostics ? `${message} Safe diagnostics: ${diagnostics}` : message);
    this.name = 'AuthFlowError';
  }
}

export type SignInFactorPlan = {
  stage: 'first' | 'second';
  strategy: SignInFactorStrategy;
  emailAddressId?: string;
  phoneNumberId?: string;
};

type SignInFactor = {
  strategy?: string;
  emailAddressId?: string;
  phoneNumberId?: string;
};

type SignInContinuation = {
  status?: string | null;
  supportedFirstFactors?: SignInFactor[] | null;
  supportedSecondFactors?: SignInFactor[] | null;
};

type SignUpContinuation = {
  status?: string | null;
  missingFields?: string[] | null;
  unverifiedFields?: string[] | null;
  verifications?: {
    emailAddress?: {
      status?: string | null;
      supportedStrategies?: string[] | null;
    } | null;
  } | null;
};

export type SignUpNextStep =
  | { kind: 'fields'; fields: string[] }
  | { kind: 'email_code' }
  | null;

const FIRST_FACTOR_PREFERENCE = ['email_code', 'phone_code'];
const SECOND_FACTOR_PREFERENCE = ['email_code', 'phone_code', 'totp', 'backup_code'];

export function getSignInFactorPlan(
  signIn: SignInContinuation
): SignInFactorPlan | null {
  const isFirstFactor = signIn.status === 'needs_first_factor';
  const isSecondFactor = signIn.status === 'needs_second_factor';

  if (!isFirstFactor && !isSecondFactor) return null;

  const factors = isFirstFactor
    ? signIn.supportedFirstFactors
    : signIn.supportedSecondFactors;
  const preferences = isFirstFactor
    ? FIRST_FACTOR_PREFERENCE
    : SECOND_FACTOR_PREFERENCE;

  for (const strategy of preferences) {
    const factor = factors?.find((candidate) => candidate.strategy === strategy);
    if (!factor) continue;

    if (strategy === 'email_code' && isFirstFactor && !factor.emailAddressId) continue;
    if (strategy === 'phone_code' && isFirstFactor && !factor.phoneNumberId) continue;

    return {
      stage: isFirstFactor ? 'first' : 'second',
      strategy: strategy as SignInFactorStrategy,
      ...(factor.emailAddressId ? { emailAddressId: factor.emailAddressId } : {}),
      ...(factor.phoneNumberId ? { phoneNumberId: factor.phoneNumberId } : {}),
    };
  }

  return null;
}

export function getSignUpNextStep(signUp: SignUpContinuation): SignUpNextStep {
  const missingFields = signUp.missingFields?.map(String) ?? [];
  if (missingFields.length) return { kind: 'fields', fields: missingFields };

  const emailVerification = signUp.verifications?.emailAddress;
  const strategies = emailVerification?.supportedStrategies;
  const needsEmailVerification =
    signUp.unverifiedFields?.includes('email_address') ||
    emailVerification?.status === 'unverified';
  if (
    emailVerification?.status !== 'verified' &&
    (strategies?.includes('email_code') ||
      (needsEmailVerification && !strategies?.length))
  ) {
    return { kind: 'email_code' };
  }

  return null;
}

// On native, Clerk can return the unchanged resource after a network failure
// unless rethrowOfflineNetworkErrors is enabled. An empty status is not a
// verification request or evidence of missing provider credentials.
export function requireAuthResponseState(resource: { status?: string | null }): void {
  if (!resource.status) {
    throw Object.assign(new Error('The sign-in service returned no authentication state.'), {
      code: 'auth_service_unavailable',
    });
  }
}

export function signUpRecoveryMessage(signUp: SignUpContinuation): string {
  const strategies = signUp.verifications?.emailAddress?.supportedStrategies;
  if (strategies?.includes('email_link') && !strategies.includes('email_code')) {
    return 'This account requires an email verification link, which this mobile screen cannot complete. Contact support to enable email verification codes. Your account has not finished verification.';
  }
  // Only allow known state labels into diagnostics, never arbitrary values,
  // resource snapshots, email addresses, IDs, tokens, or keys.
  const allowedFields = new Set([
    'email_address', 'phone_number', 'first_name', 'last_name',
    'username', 'password', 'legal_accepted', 'web3_wallet',
  ]);
  const labels = (fields?: string[] | null) =>
    fields?.filter((field) => allowedFields.has(field)).join(', ') || 'none';
  const status = ['missing_requirements', 'complete', 'abandoned'].includes(signUp.status ?? '')
    ? signUp.status
    : 'unknown';
  return `Your account needs another step. Contact support with these details: status=${status}; missing=${labels(signUp.missingFields)}; unverified=${labels(signUp.unverifiedFields)}.`;
}

export function hasSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === 'string' && sessionId.trim().length > 0;
}

export async function activateSessionIfPresent(
  sessionId: unknown,
  activate: (sessionId: string) => Promise<unknown>
): Promise<boolean> {
  if (!hasSessionId(sessionId)) return false;
  await activate(sessionId);
  return true;
}

export function clerkErrorMessage(error: any, fallback: string): string {
  const code = error?.code ?? error?.errors?.[0]?.code;
  if (
    code === 'network_error' ||
    code === 'auth_service_unavailable' ||
    /network request failed|failed to fetch/i.test(error?.message ?? '')
  ) {
    return 'We couldn’t reach the sign-in service. Check your connection and try again. If this continues, contact support so the sign-in domain and DNS settings can be checked.';
  }
  if (code === 'native_api_disabled') {
    return 'Mobile sign-in is not enabled for this service. Contact support to enable the Native API for the Clerk instance used by this build.';
  }
  const messages: Record<string, string> = {
    form_password_incorrect: 'The email or password could not be verified. Check your details and try again.',
    form_identifier_not_found: 'The email or password could not be verified. Check your details and try again.',
    form_identifier_exists: 'An account already exists with these details. Try signing in instead.',
    form_password_pwned: 'Choose a different password. This password appears in a known data breach.',
    form_password_length_too_short: 'Choose a longer password and try again.',
    form_code_incorrect: 'That verification code is incorrect. Check it and try again.',
    verification_expired: 'That verification code has expired. Start sign-in again to request another code.',
    too_many_requests: 'Too many attempts. Wait a little, then try again.',
    oauth_access_denied: 'Provider authorization was cancelled or denied. Try again or use another sign-in option.',
    oauth_email_domain_reserved: 'This provider account cannot be used here. Try another sign-in option.',
    not_allowed_access: 'This account is not permitted to sign in. Contact support.',
    session_exists: 'A session already exists. Close sign-in and return to Today.',
    form_param_format_invalid: 'Check the format of your account details and try again.',
    form_param_missing: 'Complete the required account details and try again.',
  };
  return messages[code] || (error instanceof AuthFlowError ? error.message : fallback);
}
