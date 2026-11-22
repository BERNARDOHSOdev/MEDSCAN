const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { register, login, me } = require("../controllers/authController");
const createAuthRateLimit = require("../middleware/authRateLimit");
const { COOKIE_NAME, cookieOptions, requireTrustedBrowserSession } = require("../utils/browserSession");

const router = express.Router();

const authRateLimit = createAuthRateLimit();
router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/logout", requireTrustedBrowserSession, (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.clearCookie(COOKIE_NAME, cookieOptions);
  return res.status(204).end();
});
router.get("/me", authMiddleware, me);

module.exports = router;
