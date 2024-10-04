require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env")
});
const fs = require("fs").promises;
const mongoose = require("mongoose");
const consola = require("consola");

const Species = require("../models/species");

const { MONGO_URI } = process.env

async function fetchGitlabDirectoryContents() {
    const apiUrl = "https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository/tree";
    const params = new URLSearchParams({
        path: "common/src/main/resources/data/cobblemon/species",
        recursive: true,
        per_page: 100
    });

    const cachedFiles = await fs.readdir("./raw");
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
                await fs.writeFile(`./raw/${file.name}`, JSON.stringify(fileContent, null, 2));
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

async function saveSpeciesToDatabase() {
    const species = await fs.readdir("./raw");

    await mongoose.connect(MONGO_URI);

    await Species.deleteMany({});

    for (const fileName of species) {
        const data = await require(`./raw/${fileName}`);
        try {
            const summon = data.name.toLowerCase()
            const species = new Species({
                name: data.name,
                summon,
                data
            });
            await species.save();
            if (!data.forms) continue;
            for (const form of data.forms) {
                const formSpecies = new Species({
                    name: `${data.name}-${form.name}`,
                    summon: `${summon} ${form.aspects.join(" ")}`,
                    data: form
                });
                await formSpecies.save();
            }
        } catch (error) {
            console.error(error);
            consola.error("Error saving species to database:", fileName);
        }
    }
}

fetchGitlabDirectoryContents()
    .then(saveSpeciesToDatabase)
    .then(() => {
        consola.log("Done!");
        process.exit(0);
    });