const { createClient } = require("redis");

const redisClient = createClient();

redisClient.on("error", (err) => console.log("Redis Error", err));

async function connectRedis() {
    await redisClient.connect();
    console.log("Redis connected");
}

module.exports = { redisClient, connectRedis };