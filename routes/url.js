const express = require("express");
const {
  handleGenerateNewShortURL,
  handleGetAnalytics,
  handleDeleteURL, handleUpdateURL
} = require("../controllers/url");

const router = express.Router();

// Create short URL
router.post("/", handleGenerateNewShortURL);

// Analytics
router.get("/analytics/:shortId", handleGetAnalytics);

// Delete URL (Mongo + Redis cleanup)
router.delete("/:shortId", handleDeleteURL);

// Update URL
router.patch("/:shortId", handleUpdateURL);

module.exports = router;