const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const db = require("../../db/db.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("database")
        .setDescription("Database commands.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("ping")
                .setDescription("Tests the database connection.")
        ),
    async execute(interaction) {
        if(interaction.options.getSubcommand() === "ping") {
            connected = await db.testConnection();

            console.log(connected);
            if(connected) {
                await interaction.reply({
                    content: "Database connection active.",
                    flags: MessageFlags.Ephemeral
                })
            } else {
                await interaction.reply({
                    content: "Failed to connect to database.",
                    flags: MessageFlags.Ephemeral
                })
            }
        }
    }
}