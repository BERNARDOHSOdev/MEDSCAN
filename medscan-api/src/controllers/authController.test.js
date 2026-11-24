const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { register, login } = require('./authController');
process.env.JWT_SECRET = 'test-only-secret-not-for-deployment';
const original = { find: User.findOne, create: User.create, profile: Profile.create };
afterEach(() => { User.findOne = original.find; User.create = original.create; Profile.create = original.profile; });
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, set() { return this; }, json(body) { this.body = body; return this; } }; }
function next(error) { throw error; }
const valid = { name: ' Pessoa Teste ', email: ' TESTE@example.com ', age: '30', password: 'Senha-teste-123' };
test('stores normalized WhatsApp and rejects weak passwords and invalid phones', async () => {
  User.findOne = async () => null;
  let saved;
  User.create = async data => { saved = { ...data, _id: 'test-user' }; return saved; };
  Profile.create = async () => ({});
  const result = response();
  await register({ body: { ...valid, whatsapp: '(31) 99999-1234' } }, result, next);
  assert.equal(result.statusCode, 201);
  assert.equal(saved.whatsapp, '+5531999991234');
  for (const patch of [{ whatsapp: '123' }, { whatsapp: {} }, { password: 'abcdefgh1' }, { password: 'ABCDEFGH1' }, { password: 'Abcdefghi' }]) {
    const denied = response();
    await register({ body: { ...valid, ...patch } }, denied, next);
    assert.equal(denied.statusCode, 400);
  }
});
test('register hashes password, normalizes account and returns a valid token; login verifies it', async () => {
  let saved;
  User.findOne = async () => null;
  User.create = async data => { saved = { ...data, _id: 'test-user' }; return saved; };
  Profile.create = async data => { assert.equal(data.userId, 'test-user'); };
  const result = response();
  await register({ body: valid }, result, next);
  assert.equal(result.statusCode, 201);
  assert.equal(saved.email, 'teste@example.com');
  assert.equal(saved.name, 'Pessoa Teste');
  assert.notEqual(saved.password, valid.password);
  assert.equal(await bcrypt.compare(valid.password, saved.password), true);
  assert.equal(result.body.user.password, undefined);
  assert.equal(jwt.verify(result.body.token, process.env.JWT_SECRET).id, 'test-user');
  User.findOne = async query => { assert.equal(query.email, 'teste@example.com'); return saved; };
  const access = response(); await login({ body: { email: valid.email, password: valid.password } }, access, next);
  assert.ok(access.body.token);
  const denied = response(); await login({ body: { email: valid.email, password: 'incorrect' } }, denied, next);
  assert.equal(denied.statusCode, 401);
});
test('malformed registration fails before any database write', async () => {
  User.create = () => { throw Error('Unexpected write'); };
  for (const patch of [{ name: ' ' }, { email: {} }, { email: 'invalid' }, { age: null }, { age: true }, { age: -1 }, { age: 1.5 }, { password: 'short' }, { password: {} }, { password: 'a'.repeat(73) }]) {
    const result = response(); await register({ body: { ...valid, ...patch } }, result, next); assert.equal(result.statusCode, 400, JSON.stringify(patch));
  }
});
test('untrusted cookie registration is rejected before creating an account', async () => {
  const oldOrigins = process.env.SESSION_ALLOWED_ORIGINS;
  process.env.SESSION_ALLOWED_ORIGINS = 'https://app.example.test';
  User.create = () => { throw Error('Unexpected write'); };
  try {
    const result = response();
    await register({ body: valid, headers: { origin:'https://evil.test', 'x-medscan-session':'cookie' } }, result, next);
    assert.equal(result.statusCode, 403);
  } finally { if (oldOrigins === undefined) delete process.env.SESSION_ALLOWED_ORIGINS; else process.env.SESSION_ALLOWED_ORIGINS = oldOrigins; }
});
test('duplicate account including concurrent insert returns 409', async () => {
  User.findOne = async () => ({ _id: 'existing' });
  let result = response(); await register({ body: valid }, result, next); assert.equal(result.statusCode, 409);
  User.findOne = async () => null; User.create = async () => { const e = Error('duplicate'); e.code = 11000; throw e; };
  result = response(); await register({ body: valid }, result, next); assert.equal(result.statusCode, 409);
});
test('login rejects malformed values and unknown account', async () => {
  User.findOne = async () => null;
  for (const body of [{ email: {}, password: 'abc' }, { email: 'test@example.com', password: {} }]) { const result = response(); await login({ body }, result, next); assert.equal(result.statusCode, 400); }
  const result = response(); await login({ body: { email: 'test@example.com', password: 'abc' } }, result, next); assert.equal(result.statusCode, 401);
});
