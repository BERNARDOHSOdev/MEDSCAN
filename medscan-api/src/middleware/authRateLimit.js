const crypto = require("crypto");
const mongoose = require("mongoose");

function createMongoStore(getCollection = () => mongoose.connection.db.collection("auth_rate_limits")) {
  let indexReady;
  return {
    async increment(key, expiresAt) {
      const collection = getCollection();
      if (!indexReady) {
        indexReady = collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(error => {
          indexReady = null;
          throw error;
        });
      }
      await indexReady;
      const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt } };
      const options = { upsert: true, returnDocument: "after" };
      try {
        return await collection.findOneAndUpdate({ _id: key }, update, options);
      } catch (error) {
        // Concurrent first attempts can race during upsert; the unique _id
        // chooses the winner and the loser increments the same document.
        if (error.code !== 11000) throw error;
        return collection.findOneAndUpdate({ _id: key }, update, { returnDocument: "after" });
      }
    }
  };
}

function createAuthRateLimit({ limit = 20, windowMs = 15 * 60 * 1000, now = Date.now, store = createMongoStore() } = {}) {
  return async (req, res, next) => {
    try {
      const time = now();
      const bucket = Math.floor(time / windowMs);
      const reset = (bucket + 1) * windowMs;
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      // Avoid storing IP addresses in plaintext; the same secret must be used
      // by every API instance for them to share the counter.
      const digest = crypto.createHmac("sha256", process.env.JWT_SECRET).update(ip).digest("hex");
      const entry = await store.increment(`${bucket}:${digest}`, new Date(reset));
      if (!entry || typeof entry.count !== "number") throw new Error("Contador de autenticação indisponível");
      if (entry.count > limit) {
        res.set("Retry-After", String(Math.max(1, Math.ceil((reset - time) / 1000))));
        return res.status(429).json({ message: "Muitas tentativas. Tente novamente mais tarde." });
      }
      return next();
    } catch (_error) {
      // Fail closed: an unavailable shared store must not disable protection.
      return res.status(503).json({ message: "A proteção de acesso está temporariamente indisponível. Tente novamente mais tarde." });
    }
  };
}
module.exports = createAuthRateLimit;
module.exports.createMongoStore = createMongoStore;
