const mongoose = require("mongoose");

async function connectToMongoDB(url) {
    return mongoose.connect(url, {
        serverSelectionTimeoutMS: 10000,
        family: 4,
    });
}

module.exports = { connectToMongoDB };