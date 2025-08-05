require("dotenv").config();
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const { Collection, REST, Routes } = require("discord.js");
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

const { runQuery, testConnection } = require("./db/db.js");
const { activeQotdJobs, sendQotd } = require("./handlers/qotdPost.js");

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
            console.log(`[BOOT] Started refreshing ${commandsArray.length} application (/) commands.`);

            const data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commandsArray },
            );

            console.log(`[BOOT] Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error(error);
        }
    })();

    testConnection();
}
async function scheduleJobs(client) {
    try {
        const res = await runQuery(`SELECT id, cron_expression as cronex, utc_offset as crontz FROM channels`);

        for(const row of res.rows) {
            const channel = await client.channels.fetch(row.id);
            const job = cron.schedule(row.cronex, async() => {
                sendQotd(client, channel);
            }, {
                timezone: row.crontz,
                scheduled: true
            })
            activeQotdJobs.set(channel.id, job);
            console.log(`[QOTD] Scheduled job for #${channel.name} for ${row.cronex} (UTC ${row.crontz}[+/- flipped])`)
        }
    } catch(err) {
        console.log("[WARN]", err);
    }
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

module.exports = { boot, scheduleJobs }