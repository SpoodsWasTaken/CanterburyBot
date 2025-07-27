const fs = require("fs");
const path = require("path");

const { Collection, REST, Routes } = require("discord.js");
const { clientId, token } = require("./config.json");

function boot(client) {
    client.commands = new Collection();

    const commandsPath = path.join(__dirname, "commands");
    const commandsFiles = getJsFiles(commandsPath);

    for(const filePath of commandsFiles) {
        const command = require(filePath);
        if("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
            console.log(`[BOOT] Successfully added command at ${filePath}`)
        } else {
            console.warn(`[WARN] The command at ${filePath} is missing a required "data" or "execute" property`);
        }
    }

    const rest = new REST().setToken(token);
    (async () => {
        try {
            const commandsArray = client.commands.map(cmd => cmd.data.toJSON());
            console.log(`Started refreshing ${commandsArray.length} application (/) commands.`);

            const data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commandsArray },
            );

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error(error);
        }
    })();
}


// Helper function to recursively get all .js files in dir
function getJsFiles(dir) {
    let jsFiles = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            jsFiles = jsFiles.concat(getJsFiles(fullPath));
        } else if (file.isFile() && file.name.endsWith(".js")) {
            jsFiles.push(fullPath);
        }
    }

    return jsFiles;
}

module.exports = { boot }