const { test } = require('node:test');
const assert = require('node:assert/strict');
const createLimit = require('./authRateLimit');
const { createMongoStore } = createLimit;
const secret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'test-only-secret';

function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, set(name, value) { this[name] = value; } }; }
test('shared counter limits each client across instances and resets at the next window', async () => {
  let time = 100, passed = 0;
  const entries = new Map();
  const store = { async increment(key) { const count = (entries.get(key) || 0) + 1; entries.set(key, count); return { count }; } };
  const first = createLimit({ limit: 2, windowMs: 1000, now: () => time, store });
  const second = createLimit({ limit: 2, windowMs: 1000, now: () => time, store });
  const res = response(), send = (middleware, ip) => middleware({ ip }, res, () => passed++);
  await send(first, 'a'); await send(second, 'a'); await send(first, 'b'); await send(second, 'a');
  assert.equal(passed, 3); assert.equal(res.code, 429); assert.equal(res['Retry-After'], '1');
  assert.ok([...entries.keys()].every(key => !key.includes(':a')));
  time = 1000; await send(first, 'a'); assert.equal(passed, 4);
});
test('authentication is unavailable if the shared counter fails', async () => {
  let passed = false;
  const limiter = createLimit({ store: { increment: async () => { throw Error('database unavailable'); } } });
  const res = response(); await limiter({ ip: 'a' }, res, () => { passed = true; });
  assert.equal(res.code, 503); assert.equal(passed, false);
});
test('concurrent first-write collision retries against the existing counter', async () => {
  let calls = 0, indexes = 0;
  const collection = { async createIndex() { indexes++; }, async findOneAndUpdate(_filter, _update, options) { calls++; if (options.upsert) throw Object.assign(Error('duplicate'), { code: 11000 }); return { count: 2 }; } };
  const store = createMongoStore(() => collection);
  assert.equal((await store.increment('key', new Date())).count, 2);
  assert.equal(calls, 2); assert.equal(indexes, 1);
});
test.after(() => { if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret; });
