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

const {
  activateSessionIfPresent,
  clerkErrorMessage,
  getSignInFactorPlan,
  getSignUpNextStep,
} = helper.exports;

async function run() {
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
      { errors: [{ longMessage: 'Verify the email address to continue.' }] },
      'Fallback'
    ),
    'Verify the email address to continue.',
    'Clerk authentication errors should remain actionable'
  );
  assert.equal(clerkErrorMessage(new Error('Network unavailable'), 'Fallback'), 'Network unavailable');

  const scheme = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app.json'), 'utf8')).expo.scheme;
  const loginSource = fs.readFileSync(path.resolve(__dirname, '../app/login.tsx'), 'utf8');
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
    /Google did not return a sign-in link/,
    'missing redirect must produce a useful error, not null.toString'
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
