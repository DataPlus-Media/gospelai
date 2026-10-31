export type SignInFactorStrategy =
  | 'email_code'
  | 'phone_code'
  | 'totp'
  | 'backup_code';

// Only app-authored messages may be displayed verbatim. Provider/API errors
// can include user identifiers or request details, so map their codes below.
export class AuthFlowError extends Error {
  constructor(public readonly userMessage: string, public readonly diagnostics?: string) {
    super(userMessage);
    this.name = 'AuthFlowError';
  }
}

const SAFE_ERROR_CODES = new Set([
  'auth_service_unavailable', 'network_error', 'native_api_disabled',
  'oauth_access_denied', 'oauth_email_domain_reserved', 'strategy_for_user_invalid',
  'external_account_not_found', 'sso_session_not_found', 'not_allowed_access',
  'request_not_found', 'form_param_missing', 'form_param_format_invalid',
  'form_password_incorrect', 'form_identifier_not_found', 'form_identifier_exists',
  'form_password_pwned', 'form_password_length_too_short', 'form_code_incorrect',
  'verification_expired', 'verification_failed', 'too_many_requests', 'session_exists',
  'origin_invalid', 'invalid_host', 'captcha_invalid', 'captcha_missing',
  'captcha_not_supported', 'session_token_invalid', 'authentication_invalid',
]);

// Never reflect raw API messages, metadata, request URLs, or arbitrary code values.
// Unknown errors still report a fixed JS error type and numeric HTTP status.
export function safeAuthErrorDiagnostics(error: unknown): string {
  try {
    const value = error as {
      code?: unknown;
      name?: unknown;
      message?: unknown;
      status?: unknown;
      statusCode?: unknown;
      errors?: Array<{ code?: unknown }> | null;
    } | null;
    const code = value?.errors?.[0]?.code ?? value?.code;
    let category = typeof code === 'string' && SAFE_ERROR_CODES.has(code) ? code : 'unmapped';
    if (category === 'unmapped' && typeof value?.message === 'string') {
      if (/network request failed|failed to fetch|network_error/i.test(value.message)) category = 'network_error';
      else if (/timed? ?out/i.test(value.message)) category = 'timeout';
      else if (/toString.*null|null.*toString/i.test(value.message)) category = 'null_to_string';
    }
    const names = ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'AbortError', 'ClerkAPIResponseError', 'AuthFlowError'];
    const name = typeof value?.name === 'string' && names.includes(value.name) ? value.name : 'other';
    const status = value?.status ?? value?.statusCode;
    const http = typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? status : 'none';
    const count = Array.isArray(value?.errors) ? Math.min(value.errors.length, 20) : 0;
    return `category=${category}; error_type=${name}; http=${http}; clerk_errors=${count}`;
  } catch {
    return 'category=unreadable; error_type=other; http=none; clerk_errors=0';
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
    return 'Your account needs another email verification step. Try another sign-in option or contact support for help finishing setup.';
  }
  return 'Your account needs one more step before it’s ready. Contact support for help finishing setup.';
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
    return 'We couldn’t connect to sign-in. Check your internet connection and try again. If it continues, contact support.';
  }
  if (code === 'native_api_disabled') {
    return 'Mobile sign-in isn’t available right now. Try another sign-in option or contact support.';
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
  return messages[code] || (error instanceof AuthFlowError ? error.userMessage : fallback);
}
