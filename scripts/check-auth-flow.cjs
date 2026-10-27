const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const helperPath = path.resolve(__dirname, '../utils/clerkAuth.ts');
const source = fs.readFileSync(helperPath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2021,
  },
}).outputText;
const helper = new Module(helperPath, module);
helper.filename = helperPath;
helper.paths = Module._nodeModulePaths(path.dirname(helperPath));
helper._compile(compiled, helperPath);

const oauthPath = path.resolve(__dirname, '../utils/clerkOAuth.ts');
const oauthHelper = new Module(oauthPath, module);
oauthHelper.filename = oauthPath;
oauthHelper.paths = Module._nodeModulePaths(path.dirname(oauthPath));
oauthHelper.require = (specifier) =>
  specifier === './clerkAuth' ? helper.exports : require(specifier);
oauthHelper._compile(ts.transpileModule(fs.readFileSync(oauthPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText, oauthPath);
const { runClerkOAuthFlow } = oauthHelper.exports;
const startupPath = path.resolve(__dirname, '../utils/authStartup.ts');
const startupHelper = new Module(startupPath, module);
startupHelper._compile(ts.transpileModule(fs.readFileSync(startupPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText, startupPath);
const { authStartupState, watchAuthStartup, publicAuthConfiguration, retryAuthStartup } = startupHelper.exports;

const {
  activateSessionIfPresent,
  clerkErrorMessage,
  getSignInFactorPlan,
  getSignUpNextStep,
  requireAuthResponseState,
  signUpRecoveryMessage,
} = helper.exports;

async function run() {
  assert.equal(authStartupState(false, 'loading', false), 'connecting');
  assert.equal(authStartupState(false, 'loading', true), 'timedOut');
  assert.equal(authStartupState(false, 'error', false), 'failed');
  assert.equal(authStartupState(true, 'error', true), 'ready', 'delayed readiness must recover');
  let listener, timeout, cancelled = false, unsubscribed = false;
  const states = [];
  const cleanup = watchAuthStartup({
    ready: false,
    status: 'loading',
    subscribe: (callback) => { listener = callback; return () => { unsubscribed = true; }; },
    onChange: (state) => states.push(state),
    schedule: (callback, ms) => { assert.equal(ms, 12000); timeout = callback; return 42; },
    cancel: (id) => { assert.equal(id, 42); cancelled = true; },
  });
  assert.deepEqual(states, ['connecting']);
  listener('error');
  assert.equal(states.at(-1), 'failed', 'SDK startup errors should surface before the timeout');
  listener('loading');
  timeout();
  assert.equal(states.at(-1), 'timedOut');
  cleanup();
  assert.ok(cancelled && unsubscribed, 'screen cleanup must cancel timers and SDK subscriptions');
  const readyStates = [];
  watchAuthStartup({
    ready: true, status: 'ready', onChange: state => readyStates.push(state),
    subscribe: () => { throw new Error('Ready screens must not subscribe'); },
    schedule: () => { throw new Error('Ready screens must not time out'); },
  })();
  assert.deepEqual(readyStates, ['ready']);
  let reloads = 0;
  await retryAuthStartup(async () => { reloads++; });
  assert.equal(reloads, 1);
  await assert.rejects(retryAuthStartup(async () => { throw new Error('reload failed'); }), /reload failed/);
  const publicKey = `pk_live_${Buffer.from('auth.example.com$').toString('base64')}`;
  assert.deepEqual(publicAuthConfiguration(publicKey), { environment: 'live', hostname: 'auth.example.com' });
  for (const key of [undefined, '', 'invalid', 'pk_live_%%%%', `pk_test_${Buffer.from('private@example.com$').toString('base64')}`]) {
    const safe = publicAuthConfiguration(key);
    assert.deepEqual(safe, { environment: 'invalid', hostname: 'unavailable' });
    assert.doesNotMatch(JSON.stringify(safe), /private@|pk_test|pk_live/);
  }
  const { spawnSync } = require('node:child_process');
  for (const [key, expected] of [[publicKey, 0], ['', 1], ['not-a-key', 1]]) {
    const check = spawnSync(process.execPath, [path.resolve(__dirname, 'check-native-auth-config.cjs')], {
      env: { ...process.env, EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: key }, encoding: 'utf8',
    });
    assert.equal(check.status, expected);
    assert.doesNotMatch(check.stdout + check.stderr, /pk_live_|not-a-key/);
  }
  let activatedSession = null;
  const activated = await activateSessionIfPresent('session_123', async (sessionId) => {
    activatedSession = sessionId;
  });
  assert.equal(activated, true, 'a completed session should activate');
  assert.equal(activatedSession, 'session_123');

  activatedSession = null;
  const missingSession = await activateSessionIfPresent(null, async (sessionId) => {
    activatedSession = sessionId;
  });
  assert.equal(missingSession, false, 'an incomplete response must not activate');
  assert.equal(activatedSession, null);

  assert.deepEqual(
    getSignInFactorPlan({
      status: 'needs_first_factor',
      supportedFirstFactors: [
        { strategy: 'password' },
        { strategy: 'email_code', emailAddressId: 'email_123' },
      ],
    }),
    {
      stage: 'first',
      strategy: 'email_code',
      emailAddressId: 'email_123',
    },
    'an incomplete first-factor response should offer its email-code continuation'
  );

  assert.deepEqual(
    getSignInFactorPlan({
      status: 'needs_second_factor',
      supportedSecondFactors: [{ strategy: 'totp' }, { strategy: 'backup_code' }],
    }),
    { stage: 'second', strategy: 'totp' },
    'a second-factor response should select a supported verification method'
  );
  assert.equal(
    getSignInFactorPlan({ status: 'needs_second_factor', supportedSecondFactors: [] }),
    null,
    'unsupported or missing factors should be handled as incomplete'
  );
  assert.deepEqual(
    getSignUpNextStep({
      missingFields: [],
      verifications: {
        emailAddress: {
          status: 'unverified',
          supportedStrategies: ['email_code'],
        },
      },
    }),
    { kind: 'email_code' },
    'an incomplete sign-up should offer email verification when Clerk supports it'
  );
  assert.deepEqual(
    getSignUpNextStep({ missingFields: ['first_name', 'password'] }),
    { kind: 'fields', fields: ['first_name', 'password'] },
    'an incomplete sign-up should expose required account details'
  );

  assert.equal(
    clerkErrorMessage(
      { errors: [{ code: 'form_code_incorrect', longMessage: 'private@example.invalid token=do-not-display' }] },
      'Fallback'
    ),
    'That verification code is incorrect. Check it and try again.',
    'Clerk errors should remain actionable without exposing arbitrary API text'
  );
  assert.equal(clerkErrorMessage(new Error('private@example.invalid'), 'Fallback'), 'Fallback');

  assert.deepEqual(
    getSignUpNextStep({
      status: 'missing_requirements',
      missingFields: [],
      unverifiedFields: ['email_address'],
      verifications: { emailAddress: { status: null, supportedStrategies: [] } },
    }),
    { kind: 'email_code' },
    'unverifiedFields must trigger email verification before supported strategies are populated'
  );
  assert.equal(
    getSignUpNextStep({
      unverifiedFields: ['email_address'],
      verifications: { emailAddress: { status: 'unverified', supportedStrategies: ['email_link'] } },
    }),
    null,
    'a link-only instance must not silently attempt an unsupported code strategy'
  );
  assert.match(
    signUpRecoveryMessage({ verifications: { emailAddress: { supportedStrategies: ['email_link'] } } }),
    /email verification codes/
  );
  assert.equal(
    getSignUpNextStep({
      status: 'complete',
      unverifiedFields: [],
      verifications: { emailAddress: { status: 'verified', supportedStrategies: ['email_code'] } },
    }),
    null,
    'verified accounts must not be sent another code'
  );
  const safeSummary = signUpRecoveryMessage({
    status: 'missing_requirements',
    missingFields: ['username', 'private@example.invalid'],
    unverifiedFields: ['email_address', 'token_do_not_log'],
  });
  assert.match(safeSummary, /username/);
  assert.match(safeSummary, /email_address/);
  assert.doesNotMatch(safeSummary, /private@|token_do_not_log/);
  for (const status of [null, undefined, '']) {
    assert.throws(
      () => requireAuthResponseState({ status }),
      (error) => {
        assert.equal(error.code, 'auth_service_unavailable');
        assert.match(clerkErrorMessage(error, 'Fallback'), /couldn’t reach the sign-in service/);
        return true;
      },
      'an empty native resource must be treated as a service failure, not a verification step'
    );
  }
  assert.doesNotThrow(() => requireAuthResponseState({ status: 'missing_requirements' }));
  assert.match(clerkErrorMessage({ code: 'network_error' }, 'Fallback'), /DNS/);
  assert.match(clerkErrorMessage(new TypeError('Network request failed'), 'Fallback'), /DNS/);
  assert.match(clerkErrorMessage({ errors: [{ code: 'native_api_disabled' }] }, 'Fallback'), /Native API/);
  const layoutSource = fs.readFileSync(path.resolve(__dirname, '../app/_layout.tsx'), 'utf8');
  assert.match(layoutSource, /rethrowOfflineNetworkErrors:\s*true/,
    'native networking failures must not be swallowed by Clerk');
  assert.doesNotMatch(layoutSource, /return\s*<Slot\s*\/>/,
    'the root navigator must not switch from Slot to Stack after Clerk initialization');
  assert.match(layoutSource, /return\s*\(\s*<Stack>/,
    'the root Stack should remain mounted while Clerk initializes');

  const scheme = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app.json'), 'utf8')).expo.scheme;
  const loginSource = fs.readFileSync(path.resolve(__dirname, '../app/login.tsx'), 'utf8');
  assert.match(loginSource, /Connecting to the sign-in service/,
    'the auth screen should show progress while Clerk initializes');
  assert.match(loginSource, /Sign-in is taking longer than expected/,
    'the auth screen should give a recovery message if Clerk initialization stalls');
  assert.match(loginSource, /Please wait…/,
    'authentication submissions should show a readable progress state');
  assert.match(loginSource, /const authDisabled = loading \|\| retrying \|\| !authReady/);
  assert.equal((loginSource.match(/disabled=\{authDisabled\}/g) || []).length, 7,
    'sign-in, registration, verification, both providers, and both reset actions share the readiness gate');
  assert.match(loginSource, /accessibilityLabel="Retry sign-in"/);
  assert.match(loginSource, /accessibilityLabel="Continue as a guest"/);
  assert.match(loginSource, /reloadAppAsync\('Retry sign-in initialization'\)/,
    'native retry must restart the actual SDK singleton, not just remount its provider');
  assert.doesNotMatch(loginSource, /SecureStore.*delete|AsyncStorage.*setItem/,
    'retry must not clear saved sessions or persist credentials');
  assert.ok(loginSource.includes(`scheme: '${scheme}'`), 'OAuth return scheme must match the installed app');
  assert.ok(loginSource.includes("strategy: 'password'"), 'email sign-in must explicitly attempt the password factor');

  const redirectUrl = `${scheme}://oauth-native-callback`;
  async function oauthScenario(initial, browserResult, reloaded) {
    let opens = 0;
    let reloads = 0;
    let transfers = 0;
    const signUp = { status: 'missing_requirements', missingFields: ['first_name'] };
    const resource = {
      firstFactorVerification: {},
      ...initial,
      reload: async ({ rotatingTokenNonce }) => {
        reloads++;
        assert.equal(rotatingTokenNonce, 'verified_nonce');
        return reloaded;
      },
    };
    const result = await runClerkOAuthFlow({
      strategy: 'oauth_google',
      redirectUrl,
      signIn: { create: async (params) => {
        assert.deepEqual(params, { strategy: 'oauth_google', redirectUrl });
        return resource;
      } },
      signUp: { create: async (params) => {
        assert.deepEqual(params, { transfer: true });
        transfers++;
        return signUp;
      } },
      openAuthSession: async (url, callback) => {
        opens++;
        assert.equal(url, 'https://provider.example/authorize');
        assert.equal(callback, redirectUrl);
        return browserResult;
      },
    });
    return { result, opens, reloads, transfers };
  }
  const redirectState = {
    status: 'needs_first_factor',
    firstFactorVerification: { externalVerificationRedirectURL: 'https://provider.example/authorize' },
  };
  const success = { type: 'success', url: `${redirectUrl}?rotating_token_nonce=verified_nonce` };
  let scenario = await oauthScenario(redirectState, success, { status: 'complete', createdSessionId: 'session_new' });
  assert.equal(scenario.result.resource.createdSessionId, 'session_new');
  assert.equal(scenario.reloads, 1);

  for (const type of ['cancel', 'dismiss']) {
    scenario = await oauthScenario(redirectState, { type });
    assert.equal(scenario.result.kind, 'cancelled');
    assert.equal(scenario.reloads, 0, 'cancellation must not attempt verification');
  }
  for (const status of ['complete', 'needs_second_factor', 'needs_new_password']) {
    scenario = await oauthScenario({ status, createdSessionId: status === 'complete' ? 'session_existing' : null });
    assert.equal(scenario.result.resource.status, status);
    assert.equal(scenario.opens, 0, 'a continuation without a redirect must not open the browser');
  }
  scenario = await oauthScenario({
    status: 'needs_first_factor',
    supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'email_test' }],
    firstFactorVerification: { externalVerificationRedirectURL: null },
  });
  assert.equal(scenario.result.kind, 'signIn', 'verification must continue when no provider redirect is required');
  assert.equal(scenario.opens, 0);

  for (const beforeRedirect of [true, false]) {
    const transfer = { status: 'needs_first_factor', firstFactorVerification: { status: 'transferable' } };
    scenario = await oauthScenario(beforeRedirect ? transfer : redirectState, success, transfer);
    assert.equal(scenario.result.kind, 'signUp', 'new provider users must continue sign-up, not stale sign-in');
    assert.equal(scenario.transfers, 1);
    assert.deepEqual(getSignUpNextStep(scenario.result.resource), { kind: 'fields', fields: ['first_name'] });
  }
  await assert.rejects(
    oauthScenario({ status: 'needs_first_factor', firstFactorVerification: { externalVerificationRedirectURL: null } }),
    /Google sign-in could not start/,
    'missing redirect must produce a useful error, not null.toString'
  );
  await assert.rejects(
    oauthScenario({ status: null }),
    (error) => error.code === 'auth_service_unavailable',
    'an empty OAuth resource must not blame saved provider credentials'
  );
  await assert.rejects(
    oauthScenario(redirectState, { type: 'success', url: redirectUrl }),
    /return link is incomplete/,
    'callbacks without a verification nonce must not reload with an empty token'
  );

  console.log('Authentication continuation checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
