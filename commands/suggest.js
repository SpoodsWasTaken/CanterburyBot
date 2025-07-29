const { SlashCommandBuilder, ChannelType, MessageFlags } = require("discord.js");
const QuestionPrompt = require("../resources/QuestionPrompt.js");
const { pool } = require("../db/db.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("suggest")
        .setDescription("test")
        .addSubcommand(subcommand =>
            subcommand
                .setName("new")
                .setDescription("Suggest a new card.")
                .addStringOption(option =>
                    option
                        .setName("text")
                        .setDescription("Prompt text. Supports markdown, links, and emojis. E.g.: What does your character's home look like?")
                        .setMaxLength(2000)
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel. Defaults to current channel. E.g.: #qotd")
                        .addChannelTypes(ChannelType.GuildText)
                )
        ),
    async execute(interaction) {
        if(interaction.options.getSubcommand() === "new") {
            try {
                const promptText = interaction.options.getString("text");
                const channel = interaction.options.getChannel("channel") || interaction.channel;
                const author = interaction.user;

                const newPrompt = new QuestionPrompt(promptText, channel.id, author.id);
                const mountedId = await newPrompt.mount(pool);

                let response = `New prompt created: ${mountedId}`;

                await interaction.reply({
                    content: response,
                    flags: MessageFlags.Ephemeral
                });
            } catch(err) {
                console.log("[WARN]", err);
            }
        }
    }
}