const { redisClient } = require("../redisClient");

const LIMIT = 10;
const WINDOW = 60; // seconds

async function rateLimiter(req, res, next) {
    const ip =
        (req.headers["x-forwarded-for"] || "")
            .split(",")[0]
            .trim() ||
        req.socket.remoteAddress ||
        "unknown";

    const key = `rate:${ip}`;

    try {
        const count = await redisClient.incr(key);

        if (count === 1) {
            await redisClient.expire(key, WINDOW);
        }

        if (count > LIMIT) {
            return res.status(429).json({
                success: false,
                message: "Too many requests"
            });
        }

        next();
    } catch (err) {
        console.error("Rate limiter error:", err);
        next();
    }
}

module.exports = rateLimiter;