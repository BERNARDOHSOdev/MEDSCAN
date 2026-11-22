const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { Duplex } = require('node:stream');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Analysis = require('../models/Analysis');

// Exercise the Express stack without opening a port or touching a real database.
function request(app, method, url, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out: ${method} ${url}`)), 3000);
    const chunks = [];
    const socket = new Duplex({ read() {}, write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
    socket.remoteAddress = '127.0.0.1';
    const req = new http.IncomingMessage(socket);
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    req.method = method; req.url = url;
    req.complete = true;
    req.headers = { host: 'api.example.test', ...headers, ...(payload ? { 'content-type':'application/json', 'content-length': String(payload.length) } : {}) };
    const res = new http.ServerResponse(req);
    res.assignSocket(socket);
    res.on('error', reject);
    res.on('finish', () => {
      clearTimeout(timer);
      const raw = Buffer.concat(chunks).toString();
      const split = raw.indexOf('\r\n\r\n');
      const head = raw.slice(0, split), text = raw.slice(split + 4);
      let parsed = null;
      if (text) { try { parsed = JSON.parse(text); } catch (_) { parsed = text; } }
      resolve({ status: Number(head.match(/^HTTP\/1\.1 (\d+)/)[1]), head, body: parsed });
    });
    if (payload) req.push(payload);
    req.push(null);
    app.handle(req, res);
  });
}

test('browser session flows through CORS, login, authentication, CSRF and logout', async () => {
  const before = { origin: process.env.SESSION_ALLOWED_ORIGINS, secret: process.env.JWT_SECRET, db: mongoose.connection.db, ready: mongoose.connection.readyState, findOne: User.findOne, findId: User.findById, profile: Profile.findOne, analysis: Analysis.findOne, compare: bcrypt.compare };
  process.env.SESSION_ALLOWED_ORIGINS = 'https://app.example.test';
  process.env.JWT_SECRET = 'integration-test-secret';
  const { app } = require('../../server');
  const filename = `test-${randomUUID()}.jpg`;
  const file = path.join(__dirname, '../../uploads', filename);
  await fs.writeFile(file, 'test-image', { flag: 'wx' });
  const user = { _id: 'user-one', name: 'Test', email: 'test@example.test', password: bcrypt.hashSync('correct-password', 4) };
  User.findOne = async () => user;
  bcrypt.compare = async password => password === 'correct-password';
  User.findById = id => ({ select: async () => id === user._id ? user : null });
  Profile.findOne = async () => ({ settings: {} });
  Analysis.findOne = query => ({ select: async () => query.userId === user._id && query.privateUploadOwner === user._id && query.imageUrl === `/uploads/${filename}` ? { _id: 'owned' } : null });
  let count = 0;
  mongoose.connection.db = { collection() { return { async createIndex() {}, async findOneAndUpdate() { return { count: ++count }; } }; } };
  mongoose.connection.readyState = 1;
  const trusted = { origin:'https://app.example.test', 'x-medscan-session':'cookie' };
  try {
    const login = await request(app, 'POST', '/api/auth/login', trusted, { email:user.email, password:'correct-password' });
    assert.equal(login.status, 200); assert.equal(login.body.user.id, user._id); assert.equal(login.body.token, undefined);
    assert.match(login.head, /Access-Control-Allow-Origin: https:\/\/app\.example\.test/i);
    assert.match(login.head, /Access-Control-Allow-Credentials: true/i);
    const cookie = login.head.match(/Set-Cookie: (__Host-medscan_session=[^;]+)/i)[1];
    assert.match(login.head, /HttpOnly/i); assert.match(login.head, /Secure/i); assert.match(login.head, /SameSite=None/i);
    const me = await request(app, 'GET', '/api/auth/me', { ...trusted, cookie });
    assert.equal(me.status, 200); assert.equal(me.body.user.id, user._id);
    const noAuth = await request(app, 'GET', '/api/auth/me', trusted);
    assert.equal(noAuth.status, 401);
    const forged = await request(app, 'PUT', '/api/profile', { ...trusted, origin:'https://evil.test', cookie }, { name:'Altered' });
    assert.equal(forged.status, 403); assert.doesNotMatch(forged.head, /Access-Control-Allow-Origin/i);
    const otherFile = await request(app, 'GET', '/uploads/other.jpg', { ...trusted, cookie });
    assert.equal(otherFile.status, 404);
    const ownFile = await request(app, 'GET', `/uploads/${filename}`, { ...trusted, cookie });
    assert.equal(ownFile.status, 200); assert.equal(ownFile.body, 'test-image');
    assert.match(ownFile.head, /Cache-Control: private, no-store/i);
    const logout = await request(app, 'POST', '/api/auth/logout', { ...trusted, cookie });
    assert.equal(logout.status, 204); assert.match(logout.head, /Set-Cookie: __Host-medscan_session=;/i);
  } finally {
    User.findOne = before.findOne; User.findById = before.findId; Profile.findOne = before.profile; Analysis.findOne = before.analysis; bcrypt.compare = before.compare;
    mongoose.connection.readyState = before.ready; mongoose.connection.db = before.db;
    await fs.unlink(file);
    if (before.origin === undefined) delete process.env.SESSION_ALLOWED_ORIGINS; else process.env.SESSION_ALLOWED_ORIGINS = before.origin;
    if (before.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = before.secret;
  }
});
