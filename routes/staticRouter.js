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

    res.render("home", {
      urls,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
module.exports = router;