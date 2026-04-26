const shortid = require("shortid");
const UrlModel = require("../models/url");

async function handleGenerateNewShortURL(req, res) {
    const { redirectURL, customId } = req.body;

    if (!redirectURL) {
        return res.status(400).json({
            success: false,
            message: "URL is required"
        });
    }

    // URL validation
    try {
        new URL(redirectURL);
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: "Invalid URL"
        });
    }

    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let shortId = customId || shortid.generate();

    // check duplicate shortId
    const exists = await UrlModel.findOne({ shortId });
    if (exists) {
        return res.status(409).json({
            success: false,
            message: "Short ID already taken"
        });
    }

    // duplicate URL reuse (only if no customId)
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
}

async function handleGetAnalytics(req, res) {
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
}
async function handleDeleteURL(req, res) {
    const shortId = req.params.shortId;

    try {
        const deleted = await UrlModel.findOneAndDelete({ shortId });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "URL not found"
            });
        }

        // Redis cleanup
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