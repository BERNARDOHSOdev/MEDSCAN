const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const { COOKIE_NAME, sendSession, isAllowedOrigin } = require('./browserSession');
const saved = { origins: process.env.SESSION_ALLOWED_ORIGINS, secret: process.env.JWT_SECRET, find: User.findById };
process.env.SESSION_ALLOWED_ORIGINS = 'https://app.example.test';
process.env.JWT_SECRET = 'test-cookie-secret';
after(() => { User.findById = saved.find; for (const [key, value] of [['SESSION_ALLOWED_ORIGINS', saved.origins], ['JWT_SECRET', saved.secret]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
function response() { return { headers: {}, set(k,v) { this.headers[k]=v; return this; }, cookie(name,value,options) { this.cookieSet={name,value,options}; return this; }, status(code) { this.code=code; return this; }, json(body) { this.body=body; return this; } }; }
test('web session uses a secure host-only HttpOnly cookie and does not return the token', () => {
  const res = response(), req = { headers: { origin: 'https://app.example.test', 'x-medscan-session': 'cookie' } };
  sendSession(req, res, { id: 'one' }, 'secret-token');
  assert.deepEqual(res.body, { user: { id: 'one' } });
  assert.equal(res.cookieSet.name, COOKIE_NAME); assert.equal(res.cookieSet.options.httpOnly, true);
  assert.equal(res.cookieSet.options.secure, true); assert.equal(res.cookieSet.options.sameSite, 'none');
  assert.equal(res.cookieSet.options.domain, undefined); assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(isAllowedOrigin('https://app.example.test.evil.test'), false);
  const rejected = response(); sendSession({ headers: { origin:'https://evil.test', 'x-medscan-session':'cookie' } }, rejected, {}, 'token');
  assert.equal(rejected.code, 403); assert.equal(rejected.cookieSet, undefined);
});
test('cookie-authenticated writes require both the trusted origin and custom header', async () => {
  User.findById = id => ({ select: async () => ({ _id: id }) });
  const token = jwt.sign({ id:'one' }, process.env.JWT_SECRET);
  const cookie = `${COOKIE_NAME}=${token}`;
  const run = async headers => { const res=response(); let passed=false; await auth({ method:'POST', headers }, res, () => { passed=true; }); return { res, passed }; };
  assert.equal((await run({ cookie, origin:'https://evil.test', 'x-medscan-session':'cookie' })).res.code, 403);
  assert.equal((await run({ cookie, origin:'https://app.example.test' })).res.code, 401);
  assert.equal((await run({ cookie, 'x-medscan-session':'cookie' })).res.code, 403);
  assert.equal((await run({ cookie, origin:'https://app.example.test', 'x-medscan-session':'cookie' })).passed, true);
  assert.equal((await run({ authorization:`Bearer ${token}` })).passed, true);
});
