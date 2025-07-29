const { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const { pool, runQuery } = require("../../db/db.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("suggestions")
        .setDescription("Suggestion commands.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName("approve")
                .setDescription("View and approve the queue of user-submitted prompt suggestions.")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel. E.g.: #qotd")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        if(interaction.options.getSubcommand() === "approve") {
            try {
                const guild = interaction.guild;
            } catch(err) {
                console.log("[WARN]", err);
            }
        }
    }
}