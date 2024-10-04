require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env")
});
const fs = require("fs").promises;
const mongoose = require("mongoose");
const consola = require("consola");
const Species = require("../models/species");
const Spawns = require('../models/spawns');

const { MONGO_URI } = process.env

const collections = [
    {
        name: "species",
        transformer: (data, file) => {
            const summon = data.name.toLowerCase()
            return [
                {
                    name: data.name,
                    summon,
                    data
                },
                ...(data.forms?.map((form) => ({
                    name: `${data.name}-${form.name}`,
                    summon: `${summon} ${form.aspects.join(" ")}`,
                    base: data.name,
                    data: form
                })) || [])
            ]
        },
        path: "common/src/main/resources/data/cobblemon/species",
        collection: Species
    },
    {
        name: "spawns",
        transformer: (data) => data.spawns.map((spawn) => ({
            summon: spawn.pokemon,
            data: spawn
        })),
        path: "common/src/main/resources/data/cobblemon/spawn_pool_world",
        collection: Spawns
    }
]

async function fetchGitlabDirectoryContents({ name, path }) {
    const apiUrl = "https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository/tree";
    const params = new URLSearchParams({
        path,
        recursive: true,
        per_page: 100
    });

    try {
        await fs.mkdir(`./raw/${name}`);
    } catch (error) { }
    const cachedFiles = await fs.readdir(`./raw/${name}`);
    let allFiles = [];
    let page = 1;

    try {
        while (true) {
            params.set('page', page);
            const response = await fetch(`${apiUrl}?${params}`);
            const body = await response.json();
            const files = body.filter(file => file.type === "blob" && file.path.endsWith(".json") && !cachedFiles.includes(file.name));

            if (body.length === 0) break;

            allFiles = allFiles.concat(files);
            page++;
        }

        const fileContents = [];
        for (const file of allFiles) {
            try {
                const fileResponse = await fetch(`https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository/files/${encodeURIComponent(file.path)}/raw?ref=main`);
                const fileContent = await fileResponse.json();
                await fs.writeFile(`./raw/${name}/${file.name}`, JSON.stringify(fileContent, null, 2));
                fileContents.push(fileContent);
            } catch (error) {
                consola.error(error);
            }
        }

        return fileContents;
    } catch (error) {
        consola.error("Error fetching GitLab directory contents:", error);
        throw error;
    }
}

async function saveFilesToDatabase({ name, transformer, collection }) {
    const files = await fs.readdir(`./raw/${name}`);

    await collection.deleteMany({});

    for (const fileName of files) {
        const data = await require(`./raw/${name}/${fileName}`);
        try {
            const dataToSave = transformer(data).map(e => ({ ...e, file: fileName }));
            await collection.insertMany(dataToSave);
        } catch (error) {
            console.error(error);
            consola.error("Error saving species to database:", fileName);
        }
    }
}

async function run() {
    await mongoose.connect(MONGO_URI);

    for (const collection of collections) {
        await fetchGitlabDirectoryContents(collection);
        const files = await fs.readdir(`./raw/${collection.name}`);
        consola.info(`Loaded ${files.length} files for ${collection.name}`);
        await saveFilesToDatabase(collection);
        const docCount = await collection.collection.countDocuments();
        consola.info(`Saved ${docCount} documents for ${collection.name}`);
    }

    mongoose.disconnect();
    consola.info("Complete");
    process.exit(0);
}

run();