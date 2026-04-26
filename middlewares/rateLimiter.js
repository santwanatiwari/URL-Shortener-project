const { redisClient } = require("../redisClient");

const LIMIT = 10;
const WINDOW = 60; // 1 min

async function rateLimiter(req, res, next) {
    const ip =
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        "unknown";

    const key = `rate:${ip}`;

    try {
        const count = await redisClient.get(key);

        if (count && parseInt(count) >= LIMIT) {
            return res.status(429).json({
                success: false,
                message: "Too many requests"
            });
        }

        if (!count) {
            await redisClient.set(key, 1, { EX: WINDOW });
        } else {
            await redisClient.incr(key);
        }

        next();
    } catch (err) {
        next(); // fail-safe
    }
}

module.exports = rateLimiter;