const express = require("express");
const URL = require("../models/url");
const router = express.Router();
const { redisClient } = require("../redisClient"); 

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const total = await URL.countDocuments();
    const urls = await URL.find().skip(skip).limit(limit);

    
    const urlsWithClicks = await Promise.all(
      urls.map(async (url) => {
        const redisClicks = await redisClient.get(`click:${url.shortId}`);
        return {
          ...url.toObject(),
          totalClicks: redisClicks ? Number(redisClicks) : url.totalClicks
        };
      })
    );

    return res.render("home", {
      urls: urlsWithClicks,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      id: null
    });

  } catch (err) {
    console.error("/app ERROR:", err);
    return res.status(500).send("Internal Server Error");
  }
});
module.exports = router;