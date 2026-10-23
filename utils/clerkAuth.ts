export type SignInFactorStrategy =
  | 'email_code'
  | 'phone_code'
  | 'totp'
  | 'backup_code';

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
  missingFields?: string[] | null;
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
  if (
    emailVerification?.status !== 'verified' &&
    emailVerification?.supportedStrategies?.includes('email_code')
  ) {
    return { kind: 'email_code' };
  }

  return null;
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
  return (
    error?.errors?.[0]?.longMessage ||
    error?.errors?.[0]?.message ||
    error?.message ||
    fallback
  );
}
