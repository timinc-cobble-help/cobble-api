const express = require("express");
const Species = require("../models/species");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const species = await Species.find()
            .select("name summon")
            .exec();

        res.json({
            species
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;