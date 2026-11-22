require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const historyRoutes = require("./src/routes/historyRoutes");
const monitoringRoutes = require("./src/routes/monitoringRoutes");
const profileRoutes = require("./src/routes/profileRoutes");
const errorHandler = require("./src/middleware/errorHandler");
const requireDb = require("./src/middleware/requireDb");
const authMiddleware = require("./src/middleware/authMiddleware");
const Analysis = require("./src/models/Analysis");
const { allowedOrigins, isAllowedOrigin } = require("./src/utils/browserSession");

const app = express();
// Enable only when the API is reachable exclusively through one trusted proxy.
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors(allowedOrigins().length ? { origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)), credentials: true } : undefined));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
async function sendPrivateUpload(req, res, next) {
  try {
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9-]+\.(?:png|jpg|jpeg|webp|pdf)$/i.test(filename)) return res.sendStatus(404);
    const analysis = await Analysis.findOne({ userId: req.user._id, privateUploadOwner: req.user._id, imageUrl: `/uploads/${filename}` }).select("_id");
    if (!analysis) return res.sendStatus(404);
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", "private, no-store");
    if (/\.pdf$/i.test(filename)) res.set("Content-Disposition", "attachment");
    return res.sendFile(path.join(uploadsDir, filename));
  } catch (error) { return next(error); }
}
app.get("/uploads/:filename", requireDb, authMiddleware, sendPrivateUpload);

// Endpoint leve para monitoramento externo e health check do Render.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.json({
    name: "MEDSCAN API",
    status: "online",
    database: require("mongoose").connection.readyState === 1 ? "connected" : "disconnected",
    disclaimer:
      "As analises sao orientativas e nao substituem uma consulta medica."
  });
});

app.use("/api/auth", requireDb, authRoutes);
app.use("/api/ai", requireDb, aiRoutes);
app.use("/api/history", requireDb, historyRoutes);
app.use("/api", requireDb, monitoringRoutes);
app.use("/api/profile", requireDb, profileRoutes);
app.use("/api/care", requireDb, require("./src/routes/careRoutes"));

app.use(errorHandler);

async function startServer() {
  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) throw new Error("JWT_SECRET deve ser configurado antes de iniciar a API.");
  await connectDB();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MEDSCAN API rodando na porta ${PORT}`);
  });
}

if (require.main === module) startServer().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { app, startServer, sendPrivateUpload };
