const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("suggest")
        .setDescription("")
        .addSubcommand(subcommand =>
            subcommand
                .setName("new")
                .setDescription("Suggest a new card.")
        ),
    async execute(interaction) {
        await interaction.reply("Pong!")
    }
}