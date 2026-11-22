const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { readCookie, wantsCookie, isAllowedOrigin, isTrustedBrowserRequest } = require("../utils/browserSession");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const token = bearer || (wantsCookie(req) ? readCookie(req.headers.cookie) : null);

    if (!token) {
      return res.status(401).json({ message: "Token não informado." });
    }

    if (!bearer) {
      const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(req.method);
      if ((!safeMethod && !isTrustedBrowserRequest(req)) || (req.headers.origin && !isAllowedOrigin(req.headers.origin))) {
        return res.status(403).json({ message: "Origem não autorizada para sessão no navegador." });
      }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

module.exports = authMiddleware;
