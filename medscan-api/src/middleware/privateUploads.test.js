const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Analysis = require('../models/Analysis');
const auth = require('./authMiddleware');
const { sendPrivateUpload } = require('../../server');

test('uploaded files require a valid session and ownership', async () => {
  const oldSecret = process.env.JWT_SECRET, oldUser = User.findById, oldAnalysis = Analysis.findOne;
  process.env.JWT_SECRET = 'test-only-secret';
  User.findById = id => ({ select: async () => ({ _id: id }) });
  Analysis.findOne = query => ({ select: async () => query.userId === 'owner' && query.privateUploadOwner === 'owner' ? { _id: 'analysis' } : null });
  const response = () => ({ headers: {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, sendStatus(code) { this.code = code; return this; }, set(key, value) { this.headers[key] = value; }, sendFile(file) { this.file = file; } });
  try {
    let res = response(), passed = false;
    await auth({ headers: {} }, res, () => { passed = true; });
    assert.equal(res.code, 401); assert.equal(passed, false);
    const req = { headers: { authorization: `Bearer ${jwt.sign({ id: 'other' }, process.env.JWT_SECRET)}` }, params: { filename: 'test.png' } };
    res = response(); await auth(req, res, () => { passed = true; }); assert.equal(passed, true);
    await sendPrivateUpload(req, res, error => { throw error; }); assert.equal(res.code, 404);
    req.user = { _id: 'owner' }; res = response();
    await sendPrivateUpload(req, res, error => { throw error; });
    assert.match(res.file, /test\.png$/); assert.equal(res.headers['Cache-Control'], 'private, no-store');
    req.params.filename = '../test.png'; res = response(); await sendPrivateUpload(req, res, error => { throw error; }); assert.equal(res.code, 404);
  } finally {
    User.findById = oldUser; Analysis.findOne = oldAnalysis;
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  }
});
