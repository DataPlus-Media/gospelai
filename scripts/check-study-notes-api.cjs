const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const Module = require('node:module');

const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const kid = 'study-notes-test-key';
const domain = 'gospelsai-test.clerk.accounts.dev';
const notes = [];
const queries = [];

class TestPool {
  async query(sql, values) {
    queries.push({ sql, values });
    if (sql.startsWith('SELECT')) return { rows: notes.filter(note => note.user_id === values[0]).map(({ user_id, ...note }) => note), rowCount: notes.length };
    if (sql.startsWith('INSERT')) {
      const note = { id: String(notes.length + 1), user_id: values[0], content: values[1], source: values[2], reference: values[3], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      notes.push(note);
      return { rows: [{ ...note }], rowCount: 1 };
    }
    if (sql.startsWith('UPDATE')) {
      const note = notes.find(item => item.id === values[1] && item.user_id === values[2]);
      if (!note) return { rows: [], rowCount: 0 };
      note.content = values[0];
      return { rows: [{ id: note.id, content: note.content, source: note.source, reference: note.reference, created_at: note.created_at, updated_at: new Date().toISOString() }], rowCount: 1 };
    }
    if (sql.startsWith('DELETE')) {
      const index = notes.findIndex(item => item.id === values[0] && item.user_id === values[1]);
      if (index < 0) return { rows: [], rowCount: 0 };
      notes.splice(index, 1);
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`Unexpected SQL in test: ${sql}`);
  }
}

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'pg') return { Pool: TestPool };
  return originalLoad.call(this, request, parent, isMain);
};
process.env.DATABASE_URL = 'postgres://study-test.invalid/database';
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from(domain).toString('base64url')}$`;
const realFetch = global.fetch;
global.fetch = async (url, options) => {
  if (String(url) === `https://${domain}/.well-known/jwks.json`) {
    return new Response(JSON.stringify({ keys: [{ ...pair.publicKey.export({ format: 'jwk' }), kid }] }), { status: 200 });
  }
  return realFetch(url, options);
};
const handleNotes = require('./study-notes-handler.cjs');

function token(sub, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: `https://${domain}`, sub, iat: now, exp: now + 300, ...overrides })).toString('base64url');
  const input = `${header}.${payload}`;
  return `${input}.${crypto.sign('RSA-SHA256', Buffer.from(input), pair.privateKey).toString('base64url')}`;
}

async function main() {
  const server = http.createServer(async (req, res) => {
    if (!await handleNotes(req, res)) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/study-notes`;
  const alice = token('user_alice');
  try {
    const unauthenticated = await fetch(base);
    assert.equal(unauthenticated.status, 401);
    const badOrigin = await fetch(base, { headers: { Origin: 'https://attacker.example' } });
    assert.equal(badOrigin.status, 403);
    const expired = await fetch(base, { headers: { Authorization: `Bearer ${token('user_alice', { exp: 1 })}` } });
    assert.equal(expired.status, 401);
    const forged = await fetch(base, { headers: { Authorization: `Bearer ${alice.slice(0, -4)}AAAA` } });
    assert.equal(forged.status, 401);

    const created = await fetch(base, {
      method: 'POST',
      headers: { Authorization: `Bearer ${alice}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Reflection', reference: 'Matthew 10:2', source: 'bible', user_id: 'user_attacker' }),
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).note.reference, 'Matthew 10:2');
    assert.equal(queries.at(-1).values[0], 'user_alice');

    const listed = await fetch(base, { headers: { Authorization: `Bearer ${alice}` } });
    assert.equal((await listed.json()).notes.length, 1);
    assert.equal(queries.at(-1).values[0], 'user_alice');

    const updated = await fetch(`${base}/1`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${alice}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Edited reflection' }),
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).note.content, 'Edited reflection');
    assert.equal(queries.at(-1).values[2], 'user_alice');

    const otherOwner = await fetch(`${base}/1`, { method: 'DELETE', headers: { Authorization: `Bearer ${token('user_bob')}` } });
    assert.equal(otherOwner.status, 404);
    assert.equal(queries.at(-1).values[1], 'user_bob');
    const deleted = await fetch(`${base}/1`, { method: 'DELETE', headers: { Authorization: `Bearer ${alice}` } });
    assert.equal(deleted.status, 200);
    console.log('PASS Clerk signature/issuer/expiry verification, ownership-scoped CRUD, untrusted client owner rejection and origin checks');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
