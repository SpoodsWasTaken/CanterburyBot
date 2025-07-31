const { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const { createDeck, getDecksWithInfo } = require("../../resources/Deck.js");
const { pool } = require("../../db/db.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deck")
        .setDescription("Deck commands.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand => 
            subcommand
                .setName("new")
                .setDescription("Create a new deck.")
                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("Deck name.")
                        .setMaxLength(90)
                        .setRequired(true)
                )
                .addChannelOption(option => 
                    option
                        .setName("channel")
                        .setDescription("Channel the deck posts to.")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addNumberOption(option => 
                    option
                        .setName("priority")
                        .setDescription("Posting priority. 0-5, 0 = lowest priority. Decks with same priority are randomly selected per post.")
                        .setMinValue(0)
                        .setMaxValue(5)
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("list")
                .setDescription("List decks in this server.")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Only show decks linked to this channel.")
                )
        ),
    async execute(interaction) {
        if(interaction.options.getSubcommand() === "new") {
            if(!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: "You need administrator permissions to use this command.",
                    flags: MessageFlags.Ephemeral
                })
            }
            try {
                const guild = interaction.guild;
                const channel = interaction.options.getChannel("channel");
                const name = interaction.options.getString("name");
                const priority = interaction.options.getNumber("priority");

                const mountedName = await createDeck(pool, guild.id, channel.id, name, priority);
                console.log(mountedName)
                const response = `New deck created: ${mountedName}`;

                await interaction.reply({
                    content: response,
                    flags: MessageFlags.Ephemeral
                })
            } catch(err) {
                console.error("[WARN] Error in adding deck:", err);
                await interaction.reply({
                    content: `Failed to add deck. Try again later.`,
                    flags: MessageFlags.Ephemeral
                })
            }
        }
        if(interaction.options.getSubcommand() === "list") {
            const guild = interaction.guild;
            const channel = interaction.options.getChannel("channel");

            const results = await getDecksWithInfo(guild, channel);
        }
    }
}