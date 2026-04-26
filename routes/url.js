const express = require("express");
const {
  handleGenerateNewShortURL,
  handleGetAnalytics,
  handleDeleteURL
} = require("../controllers/url");

const router = express.Router();

// create short URL
router.post("/", handleGenerateNewShortURL);

// analytics
router.get("/analytics/:shortId", handleGetAnalytics);

// delete
router.delete("/:shortId", handleDeleteURL);

module.exports = router;