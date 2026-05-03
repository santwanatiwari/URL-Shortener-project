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
    const logs = await Analytics.find({ shortId });

    return res.json({
      shortId,
      totalClicks: Number(totalClicks || 0),
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
// Redirect (MAIN LOGIC)
// ======================
app.get("/:shortId", async (req, res) => {
  const shortId = req.params.shortId;
  let redirectURL;

  try {
    //  Redis se URL lao
    redirectURL = await redisClient.get(shortId);

    //  Agar Redis me nahi hai → MongoDB se lao
    if (!redirectURL) {
      const entry = await URL.findOne({ shortId });

      if (!entry) {
        return res.status(404).send("URL not found");
      }

      if (entry.expiresAt && entry.expiresAt < new Date()) {
        return res.status(410).send("Link expired");
      }

      redirectURL = entry.redirectURL;

      // Redis me cache karo
      await redisClient.set(shortId, redirectURL, { EX: 3600 });
    }

    // ======================
    //  CLICK COUNT LOGIC
    // ======================

    // Redis se current clicks lao
    let currentClicks = await redisClient.get(`click:${shortId}`);

    if (!currentClicks) {
      const doc = await URL.findOne({ shortId });
      currentClicks = doc ? doc.totalClicks : 0;
    } else {
      currentClicks = Number(currentClicks);
    }

    //  LIMIT CHECK
    if (currentClicks >= 5) {
      return res.status(403).send("Click limit reached (max 5)");
    }

    //  COUNT UPDATE
    await redisClient.incr(`click:${shortId}`);

    await URL.updateOne(
      { shortId },
      { $inc: { totalClicks: 1 } }
    );

    // ======================
    // Analytics log
    // ======================
    Analytics.create({
      shortId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    }).catch(() => {});

    //  FINAL REDIRECT
    return res.redirect(redirectURL);

  } catch (err) {
    console.error("Redirect error:", err);
    return res.status(503).send("Service unavailable");
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