const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs/promises");
const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}${extensions[file.mimetype]}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (extensions[file.mimetype]) {
    cb(null, true);
    return;
  }

  const error = new Error("Envie uma imagem JPEG, PNG, WebP ou PDF válido.");
  error.status = 400;
  cb(error);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

async function validateUploadedFile(req, res, next) {
  if (!req.file) return next();
  try {
    const handle = await fs.open(req.file.path, "r");
    const header = Buffer.alloc(12);
    let bytesRead;
    try { ({ bytesRead } = await handle.read(header, 0, header.length, 0)); } finally { await handle.close(); }
    const type = req.file.mimetype;
    const valid = (type === "image/jpeg" && bytesRead >= 3 && header.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
      (type === "image/png" && bytesRead >= 8 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (type === "image/webp" && bytesRead >= 12 && header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP") ||
      (type === "application/pdf" && bytesRead >= 5 && header.toString("ascii", 0, 5) === "%PDF-");
    if (!valid) {
      await fs.unlink(req.file.path);
      req.file = null;
      return res.status(400).json({ message: "O conteúdo do arquivo não corresponde ao formato informado." });
    }
    return next();
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    return next(error);
  }
}

module.exports = { upload, validateUploadedFile };
