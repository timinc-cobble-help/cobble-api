require("dotenv").config();
const consola = require("consola");
const express = require("express");
const mongoose = require("mongoose");
const speciesRouter = require("./apis/species");

const { PORT = 3000, MONGO_URI } = process.env;

const app = express();

app.use("/api/species", speciesRouter);

app.listen(PORT, () => {
    consola.success(`Server is running on port ${PORT}`);
})
mongoose.connect(MONGO_URI)
    .then(() => {
        consola.success("Connected to MongoDB");
    })