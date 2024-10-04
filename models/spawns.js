const mongoose = require("mongoose");

const spawnSchema = new mongoose.Schema({
    summon: {
        type: String,
        required: true,
    },
    file: {
        type: String,
    },
    data: {
        type: Object,
        required: true,
    }
});

module.exports = mongoose.model("Spawns", spawnSchema);