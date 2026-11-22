const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('./audit-legacy-uploads.cjs');
test('reports conflicting owners, missing files and unsafe references without assuming ownership', () => {
  const result = summarize([
    { _id: 'a', userId: 'one', imageUrl: '/uploads/one.jpg' },
    { _id: 'b', userId: 'two', imageUrl: '/uploads/one.jpg', privateUploadOwner: 'two' },
    { _id: 'c', userId: 'one', imageUrl: '/uploads/missing.png' },
    { _id: 'd', userId: 'one', imageUrl: '/uploads/../bad.html' },
    { _id: 'e', userId: 'one', imageUrl: '/uploads/new.jpg', privateUploadOwner: 'one' }
  ], new Set(['one.jpg']));
  assert.equal(result.length, 3);
  assert.equal(result[0].conflictingOwners, true); assert.equal(result[0].fileExists, true);
  assert.equal(result[1].fileExists, false); assert.equal(result[2].unsafeReference, true);
  assert.ok(result.every(item => item.decision === 'manual-review-required'));
});
