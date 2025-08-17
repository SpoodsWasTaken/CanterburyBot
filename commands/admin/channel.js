const { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { maxSuggestions, registerChannel } = require("../../handlers/channels.js");
const { createDeck } = require("../../resources/Deck.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("channel")
        .setDescription("Channel related settings.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommandGroup(group =>
            group
                .setName("assign")
                .setDescription("Assign things to places.")
                .addSubcommand(subcommand => 
                    subcommand
                        .setName("qotd")
                        .setDescription("Enable qotd in a channel.")
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("Channel. Defaults to current channel.")
                                .addChannelTypes(ChannelType.GuildText)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName("max_suggestions")
                                .setDescription("Maximum number of suggestions per user. Defaults to global maximum (50).")
                                .setMaxValue(maxSuggestions)
                        )
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName("unassign")
                .setDescription("Unassign things from places.")
                .addSubcommand(subcommand => 
                    subcommand
                        .setName("qotd")
                        .setDescription("Disable qotd in a channel.")
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("Channel. Defaults to current channel.")
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName("edit")
                .setDescription("Edit a channel's settings.")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("max_suggestions")
                        .setDescription("Edit a channel's maximum number of suggestions per user.")
                        .addIntegerOption(option =>
                            option
                                .setName("max_suggestions")
                                .setDescription("Maximum number of suggestions per user.")
                                .setMaxValue(maxSuggestions)
                                .setRequired(true)
                        )
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("Channel. Must have qotd already enabled. Defaults to current channel.")
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
        ),
    async execute(interaction) {
        try {
            if(interaction.options.getSubcommandGroup() === "assign") {
                if(interaction.options.getSubcommand() === "qotd") {
                    const channel = interaction.options.getChannel("channel") || interaction.channel;
                    const max = interaction.options.getInteger("max_suggestions") || maxSuggestions;

                    if(!(await registerChannel(channel.id, null, null, max))) {
                        return interaction.reply({
                            content: "Could not enable QOTD in this channel. Has it been enabled already?",
                            flags: MessageFlags.Ephemeral
                        })
                    }
                    createDeck(interaction.guild.id, channel.id, "Default");
                    return interaction.reply({
                        content: "QOTD enabled in this channel! Schedule posts with `/schedule`, and use `/suggest` to start adding questions!"
                    })
                }
            } else if(interaction.options.getSubcommandGroup() === "unassign") {
                return;
            } else if(interaction.options.getSubcommandGroup() === "edit") {
                return;
            }
        } catch(err) {
            console.log("[WARN]", err);
        }
    }
}