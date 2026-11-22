const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { upload, validateUploadedFile } = require("../middleware/uploadMiddleware");
const { analyze } = require("../controllers/aiController");

const router = express.Router();

router.post("/analyze", authMiddleware, upload.single("image"), validateUploadedFile, analyze);

module.exports = router;
