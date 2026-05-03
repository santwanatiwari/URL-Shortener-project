const shortid = require("shortid");
const UrlModel = require("../models/url");
const { redisClient } = require("../redisClient");

async function handleGenerateNewShortURL(req, res) {
  try {
    const { redirectURL, customId } = req.body;

    if (!redirectURL) {
      return res.status(400).json({
        success: false,
        message: "URL is required"
      });
    }

    //  URL validation
    try {
      new global.URL(redirectURL);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid URL"
      });
    }

    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let finalShortId;

    // =========================
    //  CUSTOM ID LOGIC (FIXED)
    // =========================
    if (customId && customId.trim() !== "") {

      // optional validation
      if (!/^[a-zA-Z0-9_-]+$/.test(customId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid custom ID"
        });
      }

      const exists = await UrlModel.findOne({ shortId: customId });

      if (!exists) {
        // ✔ available → use custom
        finalShortId = customId;
      } else {
        //  taken → fallback to auto
        finalShortId = shortid.generate();
      }

    } else {
      // =========================
      //  SAME URL CHECK (ONLY for auto)
      // =========================
      const existingURL = await UrlModel.findOne({ redirectURL });

      if (existingURL) {
        return res.json({
          success: true,
          shortId: existingURL.shortId,
          message: "URL already exists"
        });
      }

      finalShortId = shortid.generate();
    }

    // =========================
    // CREATE ENTRY
    // =========================
    await UrlModel.create({
      shortId: finalShortId,
      redirectURL,
      visitHistory: [],
      totalClicks: 0,
      createdBy: req.user?._id || null,
      expiresAt: expiryDate,
    });

    return res.json({
      success: true,
      shortId: finalShortId,
      message:
        finalShortId === customId
          ? "Custom short URL created"
          : customId
          ? "Custom ID taken → auto-generated used"
          : "Short URL created"
    });

  } catch (err) {
    console.error("Create URL error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}

async function handleGetAnalytics(req, res) {
  try {
    const shortId = req.params.shortId;

    const result = await UrlModel.findOne({ shortId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Short URL not found"
      });
    }

    return res.json({
      totalClicks: result.totalClicks || 0,
      analytics: result.visitHistory,
    });

  } catch {
    return res.status(500).json({
      success: false,
      message: "Analytics error"
    });
  }
}

async function handleDeleteURL(req, res) {
  try {
    const shortId = req.params.shortId;

    const deleted = await UrlModel.findOneAndDelete({ shortId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "URL not found"
      });
    }

    //  Redis cleanup
    try {
      await redisClient.del(shortId);
      await redisClient.del(`click:${shortId}`);
      await redisClient.del(`unique:${shortId}`);
    } catch {}

    return res.json({
      success: true,
      message: "URL deleted"
    });

  } catch {
    return res.status(500).json({
      success: false,
      message: "Delete failed"
    });
  }
}

module.exports = {
  handleGenerateNewShortURL,
  handleGetAnalytics,
  handleDeleteURL
};