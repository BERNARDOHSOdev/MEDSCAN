const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { validateUploadedFile } = require('./uploadMiddleware');

test('rejects and removes HTML disguised as a JPEG; accepts a JPEG signature', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'medscan-upload-'));
  try {
    const file = path.join(dir, 'upload.jpg');
    await fs.writeFile(file, '<script>alert(1)</script>');
    let status, body, nextCalled = false;
    const res = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
    await validateUploadedFile({ file: { path: file, mimetype: 'image/jpeg' } }, res, () => { nextCalled = true; });
    assert.equal(status, 400); assert.match(body.message, /conteúdo/); assert.equal(nextCalled, false);
    await assert.rejects(fs.access(file));
    await fs.writeFile(file, Buffer.from([0xff, 0xd8, 0xff, 0x00]));
    await validateUploadedFile({ file: { path: file, mimetype: 'image/jpeg' } }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
