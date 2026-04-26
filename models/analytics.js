const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
    shortId: String,
    ip: String,
    userAgent: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Analytics", analyticsSchema);