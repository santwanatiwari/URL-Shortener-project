require("dotenv").config({ path: ".env" });

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const { connectToMongoDB } = require("./connect");
const { connectRedis, redisClient } = require("./redisClient");

const URL = require("./models/url");
const urlRoute = require("./routes/url");
const staticRoute = require("./routes/staticRouter");
const Analytics = require("./models/analytics");
const rateLimiter = require("./middlewares/rateLimiter");

const app = express();
const PORT = process.env.PORT || 8001;

// ======================
// Middlewares
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(rateLimiter);

// ======================
// View Engine
// ======================
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// ======================
// Routes
// ======================
app.use("/url", urlRoute);
app.use("/app", staticRoute);

// Optional: agar UI direct "/" pe chahiye to isko enable karo
// app.use("/", staticRoute);

app.get("/", (req, res) => {
  res.send("API is working");
});

// ======================
// Analytics API
// ======================
app.get("/analytics/:shortId", async (req, res) => {
  const shortId = req.params.shortId;

  try {
    const totalClicks = await redisClient.get(`click:${shortId}`);
    const uniqueClicks = await redisClient.get(`unique:${shortId}`);
    const logs = await Analytics.find({ shortId });

    return res.json({
      shortId,
      totalClicks: Number(totalClicks || 0),
      uniqueClicks: Number(uniqueClicks || 0),
      logs,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return res.status(500).json({
      success: false,
      message: "Analytics error",
    });
  }
});

// ======================
// Redirect (IMPORTANT)
// ======================
app.get("/:shortId", async (req, res) => {
  const shortId = req.params.shortId;
  let redirectURL;

  try {
    // 🔹 Redis se check
    redirectURL = await redisClient.get(shortId);

    // 🔹 Agar Redis me nahi mila to DB se lao
    if (!redirectURL) {
      const entry = await URL.findOne({ shortId });

      if (!entry) {
        return res.status(404).json({
          success: false,
          message: "Short URL not found",
        });
      }

      if (entry.expiresAt && entry.expiresAt < new Date()) {
        return res.status(410).json({
          success: false,
          message: "Link expired",
        });
      }

      redirectURL = entry.redirectURL;

      // Redis me cache karo
      await redisClient.set(shortId, redirectURL, { EX: 3600 });
    }

    // ======================
    // Analytics (FIXED)
    // ======================
    try {
      // Redis count
      await redisClient.incr(`click:${shortId}`);

      // MongoDB permanent count
      await URL.updateOne(
        { shortId },
        { $inc: { totalClicks: 1 } }
      );

    } catch (err) {
      console.log("Analytics error:", err);
    }

    // Optional: detailed logs
    Analytics.create({
      shortId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    }).catch(() => {});

    // FINAL REDIRECT (always)
    return res.redirect(redirectURL);

  } catch (err) {
    console.error("Redirect error:", err);
    return res.status(503).json({
      success: false,
      message: "Service unavailable",
    });
  }
});

// ======================
// START SERVER
// ======================
const startServer = async () => {
  try {
    await connectToMongoDB(process.env.MONGO_URI);
    console.log("MongoDB connected");

    await connectRedis();
    console.log("Redis connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log("Server running on", PORT);
    });

  } catch (err) {
    console.error("Startup error:", err);
  }
};

startServer();