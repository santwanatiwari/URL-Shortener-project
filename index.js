require("dotenv").config({ path: ".env" });

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const { connectToMongoDB } = require("./connect");
const { redisClient, connectRedis } = require("./redisClient");

const URL = require("./models/url");
const urlRoute = require("./routes/url");
const staticRoute = require("./routes/staticRouter");
const Analytics = require("./models/analytics");
const rateLimiter = require("./middlewares/rateLimiter");

const app = express();
const PORT = process.env.PORT || 8001;

// ======================
// DB & Redis
// ======================

console.log("ENV:", process.env);
console.log("MONGO_URI:", process.env.MONGO_URI);

connectToMongoDB(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("Mongo Error:", err));

connectRedis();

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
// Analytics
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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Analytics error",
    });
  }
});

// ======================
// Redirect (LAST)
// ======================
app.get("/:shortId", async (req, res) => {
  const shortId = req.params.shortId;
  let redirectURL;

  // Redis
  try {
    redirectURL = await redisClient.get(shortId);
  } catch {}

  // DB fallback
  if (!redirectURL) {
    try {
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

      try {
        await redisClient.set(shortId, redirectURL, { EX: 3600 });
      } catch {}
    } catch {
      return res.status(503).json({
        success: false,
        message: "Service unavailable",
      });
    }
  }

  // Analytics
  try {
    await redisClient.incr(`click:${shortId}`);
  } catch {}

  Analytics.create({
    shortId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  }).catch(() => {});

  return res.redirect(redirectURL);
});

// ======================
app.listen(PORT, () => console.log(`Server running on ${PORT}`));