const express = require("express");
const URL = require("../models/url");
const router = express.Router();

router.get("/signup", (req, res) => {
  return res.render("signup");
});

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;

  const skip = (page - 1) * limit;

  const total = await URL.countDocuments();

  const urls = await URL.find()
    .skip(skip)
    .limit(limit);

  res.render("home", {
    id: null,
    urls,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
  });
});

module.exports = router;