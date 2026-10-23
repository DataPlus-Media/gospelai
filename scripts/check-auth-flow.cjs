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

  console.log('Authentication continuation checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
