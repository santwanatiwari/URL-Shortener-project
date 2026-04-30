const express = require("express");
const URL = require("../models/url");
const router = express.Router();

// Signup page
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const total = await URL.countDocuments();
    const urls = await URL.find().skip(skip).limit(limit);

    return res.render("home", {
      urls: urls || [],
      currentPage: page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      id: null
    });

  } catch (err) {
    console.error("/app ERROR:", err);
    return res.status(500).send("Internal Server Error");
  }
});
module.exports = router;