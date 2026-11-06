import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { FirebaseAccounts } from '../lib/cloud-account.js';
import { installAccountRoutes } from '../lib/account-routes.js';
const snapshot = {
  schemaVersion: 1,
  sources: [
    {
      id: 'lesson',
      name: 'Lesson',
      version: 1,
      text: 'A radius joins the centre and boundary.',
      notes: 'Private notes',
      chat: [],
      generated: {},
    },
  ],
  profile: {},
  activity: { events: [] },
  stickyNotes: [],
};
function fixture() {
  const docs = new Map();
  let clock = 0;
  const response = (value, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  return {
    docs,
    fetcher: async (url, options = {}) => {
      const u = new URL(url),
        body = options.body ? JSON.parse(options.body) : {},
        token = new Headers(options.headers)
          .get('Authorization')
          ?.replace(/^Bearer /, ''),
        uid = token?.replace(/^token-/, ''),
        path = u.pathname.replace(/^\/v1\//, '');
      if (u.hostname === 'identitytoolkit.googleapis.com') {
        if (u.pathname.endsWith(':lookup')) {
          if (!/^token-(alice|bob)$/.test(body.idToken || ''))
            return response({ error: 'invalid' }, 400);
          return response({
            users: [
              {
                localId: body.idToken.slice(6),
                email: `${body.idToken.slice(6)}@example.test`,
                emailVerified: true,
              },
            ],
          });
        }
        if (
          u.pathname.endsWith(':signInWithPassword') ||
          u.pathname.endsWith(':signUp')
        )
          return response({
            idToken: 'token-alice',
            refreshToken: 'fixture-refresh',
          });
        return response({});
      }
      if (u.hostname !== 'firestore.googleapis.com')
        throw Error('Unexpected fixture host');
      if (!['alice', 'bob'].includes(uid)) return response({}, 403);
      const prefix = `projects/test-project/databases/(default)/documents/users/${uid}/`;
      if (path.endsWith('documents:commit')) {
        for (const write of body.writes) {
          const name = write.update?.name || write.delete;
          if (!name.startsWith(prefix)) return response({}, 403);
          if (write.update && write.update.fields.ownerUid.stringValue !== uid)
            return response({}, 403);
          const existing = docs.get(name);
          if (
            (write.currentDocument?.exists === false && existing) ||
            (write.currentDocument?.updateTime &&
              write.currentDocument.updateTime !== existing?.updateTime)
          )
            return response({ error: 'FAILED_PRECONDITION' }, 409);
        }
        const time = new Date(
          Date.UTC(2026, 0, 1, 0, 0, ++clock)
        ).toISOString();
        const writeResults = [];
        for (const write of body.writes) {
          if (write.delete) docs.delete(write.delete);
          else
            docs.set(write.update.name, {
              ...structuredClone(write.update),
              updateTime: time,
            });
          writeResults.push({ updateTime: time });
        }
        return response({ writeResults });
      }
      if (!path.startsWith(prefix)) return response({}, 403);
      if (path.endsWith('/resources'))
        return response({
          documents: [...docs.values()].filter((doc) =>
            doc.name.startsWith(prefix + 'resources/')
          ),
        });
      return docs.has(path) ? response(docs.get(path)) : response({}, 404);
    },
  };
}
test('cloud adapter enforces owner paths, roundtrips source data and rejects stale revisions atomically', async () => {
  const mock = fixture(),
    accounts = new FirebaseAccounts({
      apiKey: 'fixture-key',
      projectId: 'test-project',
      fetcher: mock.fetcher,
    }),
    alice = await accounts.verify('token-alice'),
    bob = await accounts.verify('token-bob');
  assert.equal(
    (await accounts.readLibrary(alice, 'token-alice')).snapshot,
    null
  );
  const first = await accounts.writeLibrary(
    alice,
    'token-alice',
    snapshot,
    null
  );
  const data = await accounts.readLibrary(alice, 'token-alice');
  assert.equal(data.snapshot.sources[0].notes, 'Private notes');
  assert.equal(data.revision, first.revision);
  assert.equal((await accounts.readLibrary(bob, 'token-bob')).snapshot, null);
  await assert.rejects(
    accounts.writeLibrary(alice, 'token-alice', snapshot, null),
    (error) => error.status === 409
  );
  await assert.rejects(
    accounts.writeLibrary(
      { ...bob, emailVerified: false },
      'token-bob',
      snapshot,
      null
    ),
    (error) => error.code === 'EMAIL_NOT_VERIFIED'
  );
  await assert.rejects(
    accounts.readLibrary(alice, 'token-bob'),
    (error) => error.status === 403
  );
  assert.ok(
    [...mock.docs.keys()].every((key) => key.includes('/users/alice/'))
  );
});
test('account HTTP routes use HttpOnly cookies and protect cloud data with verified provider identity', async () => {
  const mock = fixture(),
    accounts = new FirebaseAccounts({
      apiKey: 'fixture-key',
      projectId: 'test-project',
      fetcher: mock.fetcher,
    }),
    app = express();
  app.use(express.json());
  installAccountRoutes(app, { accounts });
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ code: error.code })
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + '/api/cloud/library')).status, 401);
    const login = await fetch(base + '/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@example.test',
        password: 'password8',
      }),
    });
    assert.equal(login.status, 200);
    const cookies = login.headers.getSetCookie();
    assert.ok(
      cookies.every(
        (cookie) => /HttpOnly/.test(cookie) && /SameSite=Strict/.test(cookie)
      )
    );
    assert.equal((await login.json()).idToken, undefined);
    const cookie = cookies.map((value) => value.split(';')[0]).join('; ');
    const result = await fetch(base + '/api/cloud/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ snapshot, expectedRevision: null, uid: 'bob' }),
    });
    assert.equal(result.status, 200);
    const wrongOwner = await fetch(base + '/api/cloud/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ snapshot, expectedOwnerUid: 'bob' }),
    });
    assert.equal(wrongOwner.status, 403);
    assert.ok(
      [...mock.docs.keys()].every((key) => key.includes('/users/alice/'))
    );
  } finally {
    server.close();
  }
});
test('missing Firebase configuration is explicit and cannot become fake authentication', async () => {
  const accounts = new FirebaseAccounts({
    apiKey: '',
    projectId: '',
    fetcher: () => {
      throw Error('must not call');
    },
  });
  assert.equal(accounts.status().configured, false);
  await assert.rejects(
    accounts.verify('token-alice'),
    (error) => error.code === 'CLOUD_NOT_CONFIGURED'
  );
});
