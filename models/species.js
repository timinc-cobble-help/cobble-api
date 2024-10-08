const mongoose = require("mongoose");

const speciesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    summon: {
        type: String,
        required: true,
        unique: true,
    },
    base: {
        type: String,
    },
    file: {
        type: String,
    },
    data: {
        type: Object,
        required: true,
    }
});

module.exports = mongoose.model("Species", speciesSchema);