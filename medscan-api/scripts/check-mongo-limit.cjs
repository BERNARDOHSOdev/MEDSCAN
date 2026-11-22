// Explicit, isolated connectivity check. Only the randomly named collection
// created by this process is dropped, including on a failed assertion.
const mongoose = require('mongoose');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createMongoStore } = require('../src/middleware/authRateLimit');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI não configurada.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const collectionName = `medscan_check_${randomBytes(12).toString('hex')}`;
  if (!/^medscan_check_[a-f0-9]{24}$/.test(collectionName)) throw new Error('Nome de coleção inesperado.');
  const collection = mongoose.connection.db.collection(collectionName);
  let created = false;
  try {
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    created = true;
    const first = createMongoStore(() => collection);
    const second = createMongoStore(() => collection);
    const expiry = new Date(Date.now() + 60000);
    const results = await Promise.all(Array.from({ length: 21 }, (_, i) => (i % 2 ? first : second).increment('synthetic-test', expiry)));
    assert.deepEqual(results.map(item => item.count).sort((a,b) => a-b), Array.from({ length: 21 }, (_, i) => i+1));
    const index = (await collection.indexes()).find(item => item.key?.expiresAt === 1);
    assert.equal(index?.expireAfterSeconds, 0);
    console.log('Conexão, contador concorrente e índice TTL: aprovados.');
  } finally {
    try { if (created) await collection.drop(); }
    finally { await mongoose.disconnect(); }
  }
}
main().catch(() => { console.error('Não foi possível concluir a verificação isolada do MongoDB.'); process.exitCode = 1; });
