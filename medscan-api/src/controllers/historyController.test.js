const { test } = require('node:test');
const assert = require('node:assert/strict');
const Analysis = require('../models/Analysis');
const { createHistoryItem } = require('./historyController');
test('creating history cannot claim another user’s uploaded file', async () => {
  const original = Analysis.create;
  let saved;
  Analysis.create = async data => { saved = data; return data; };
  try {
    const req = { user: { _id: 'attacker', name: 'Test' }, body: { imageUrl: '/uploads/private.jpg', privateUploadOwner: 'attacker' } };
    const res = { status(code) { assert.equal(code, 201); return this; }, json() { return this; } };
    await createHistoryItem(req, res, error => { throw error; });
    assert.equal(saved.imageUrl, ''); assert.equal(saved.privateUploadOwner, undefined);
  } finally { Analysis.create = original; }
});
