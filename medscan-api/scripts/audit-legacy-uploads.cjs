// Read-only inventory. References in old records are not proof of ownership.
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');

function summarize(records, presentFiles) {
  const references = new Map();
  for (const record of records) {
    const url = record.imageUrl;
    if (typeof url !== 'string' || !url.startsWith('/uploads/')) continue;
    if (!references.has(url)) references.set(url, []);
    references.get(url).push(record);
  }
  const report = [];
  for (const [url, items] of references) {
    const legacy = items.filter(item => !item.privateUploadOwner);
    if (!legacy.length) continue;
    const filename = url.slice('/uploads/'.length);
    const safeName = /^[a-zA-Z0-9-]+\.(?:png|jpg|jpeg|webp|pdf)$/i.test(filename);
    const ownerIds = [...new Set(items.map(item => String(item.userId)))];
    report.push({
      filename: safeName ? filename : null,
      unsafeReference: !safeName,
      fileExists: safeName && presentFiles.has(filename),
      conflictingOwners: ownerIds.length > 1,
      referencedBy: legacy.map(item => ({ analysisId: String(item._id), userId: String(item.userId) })),
      decision: 'manual-review-required'
    });
  }
  return report;
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI precisa estar configurada.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    const records = await mongoose.connection.db.collection('analyses').find(
      { imageUrl: /^\/uploads\// },
      { projection: { _id: 1, userId: 1, imageUrl: 1, privateUploadOwner: 1 } }
    ).toArray();
    const presentFiles = new Set(await fs.readdir(path.join(__dirname, '../uploads')));
    for (const item of summarize(records, presentFiles)) console.log(JSON.stringify(item));
    console.error('Auditoria somente leitura. Referências antigas não comprovam propriedade; nenhuma alteração foi feita.');
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  // DNS lookup for MongoDB SRV records can outlast the driver's connection timeout.
  const deadline = setTimeout(() => {
    console.error('Auditoria interrompida após 30 segundos; confira a conexão e execute novamente.');
    process.exit(1);
  }, 30000);
  main().catch(error => { console.error(`Falha na auditoria: ${error.message}`); process.exitCode = 1; })
    .finally(() => clearTimeout(deadline));
}
module.exports = { summarize };
