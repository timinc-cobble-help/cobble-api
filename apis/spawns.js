const express = require("express");
const Spawns = require("../models/spawns");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const spawns = await Spawns.find()
            .select("summon")
            .exec();

        res.json(spawns);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;