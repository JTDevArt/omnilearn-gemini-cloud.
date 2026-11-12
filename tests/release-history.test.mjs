import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateReleaseManifest, filterReleaseChanges } from '../public/release-history.js';

const file = new URL('../public/data/releases.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));

test('release manifest is valid with unique semantic versions and real commit hashes', () => {
  const checked = validateReleaseManifest(data);
  assert.equal(checked.releases[0].version, '1.0.0');
  assert.equal(checked.releases[0].status, 'in-development');
  assert.ok(checked.releases[0].changes.length > 0);
});

test('rejects duplicate versions, fake shipped changes, malformed paths and hashes', () => {
  const dup = structuredClone(data);
  dup.releases.push(structuredClone(dup.releases[0]));
  assert.throws(() => validateReleaseManifest(dup), /berulang/);
  const shipped = structuredClone(data);
  shipped.releases[0].changes[0].status = 'shipped';
  assert.throws(() => validateReleaseManifest(shipped), /shipped/);
  const traversal = structuredClone(data);
  traversal.releases[0].changes[0].files = ['../secrets.env'];
  assert.throws(() => validateReleaseManifest(traversal), /tidak valid/);
  const hash = structuredClone(data);
  hash.releases[0].changes[0].commit = 'not-real';
  assert.throws(() => validateReleaseManifest(hash), /tidak valid/);
});

test('search and category filters match actual changes', () => {
  const changes = data.releases[0].changes;
  assert.ok(filterReleaseChanges(changes, {query:'Gemini'}).length > 0);
  assert.ok(filterReleaseChanges(changes, {category:'UI/UX'}).length > 0);
  assert.equal(filterReleaseChanges(changes,{query:'never-a-real-milestone'}).length, 0);
});
