const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, 'AuthContext.js'), 'utf8');
const logoutCode = source.slice(source.indexOf('  async function logout()'), source.indexOf('  const value = useMemo'));

for (const offline of [false, true]) {
  test(`logout clears local access and remembers sign-out with API ${offline ? 'offline' : 'online'}`, async () => {
    const state = { user: {}, token: 'cookie', header: 'old', stored: {} };
    let release;
    const api = { defaults: { withCredentials: true }, post: () => new Promise((resolve, reject) => { release = () => offline ? reject(Error('offline')) : resolve(); }) };
    const context = vm.createContext({ api, USE_COOKIE_AUTH: true, LOGOUT_KEY: 'out', SESSION_KEY: 'session',
      setUser: v => state.user = v, setToken: v => state.token = v, setAuthToken: v => state.header = v,
      setStoredItem: async (k,v) => state.stored[k] = v, removeStoredItem: async k => delete state.stored[k] });
    vm.runInContext(logoutCode, context);
    const pending = context.logout();
    assert.equal(state.user, null); assert.equal(state.token, null); assert.equal(state.header, null);
    assert.equal(api.defaults.withCredentials, false);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(state.stored.out, '1');
    release();
    assert.equal((await pending).remoteConfirmed, !offline);
  });
}
