const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("suggest")
        .setDescription("test")
        .addSubcommand(subcommand =>
            subcommand
                .setName("new")
                .setDescription("Suggest a new card.")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                )
                .addStringOption(option =>
                    option
                        .setName("x")
                )
        )/*,
    async execute(interaction) {
        await interaction.reply("Pong!")
    }*/
}