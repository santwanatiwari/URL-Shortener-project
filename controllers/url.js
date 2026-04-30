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

        // URL validation
        try {
            new global.URL(redirectURL);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: "Invalid URL"
            });
        }

        const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        let shortId = customId || shortid.generate();

        const exists = await UrlModel.findOne({ shortId });
        if (exists) {
            return res.status(409).json({
                success: false,
                message: "Short ID already taken"
            });
        }

        if (!customId) {
            const existingURL = await UrlModel.findOne({ redirectURL });
            if (existingURL) {
                return res.json({
                    success: true,
                    shortId: existingURL.shortId,
                    message: "URL already exists"
                });
            }
        }

        await UrlModel.create({
            shortId,
            redirectURL,
            visitHistory: [],
            createdBy: req.user?._id || null,
            expiresAt: expiryDate,
        });

        return res.json({
            success: true,
            shortId,
            message: "Short URL created"
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
            totalClicks: result.visitHistory.length,
            analytics: result.visitHistory,
        });

    } catch (err) {
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

        try {
            await redisClient.del(shortId);
            await redisClient.del(`click:${shortId}`);
            await redisClient.del(`unique:${shortId}`);
        } catch {}

        return res.json({
            success: true,
            message: "URL deleted"
        });

    } catch (err) {
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