const { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createDeck, getDecks } = require("../../resources/Deck.js");
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
                .addStringOption(option => 
                    option
                        .setName("title")
                        .setDescription("Title of prompt card.")
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName("description")
                        .setDescription("Description/instructions that appear at the bottom of the prompt card.")
                )
                .addStringOption(option =>
                    option
                        .setName("colour")
                        .setDescription("Hexcode of the card's accent colour. E.g. #ED1D24")
                        .setMaxLength(7)
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName("list")
                .setDescription("List decks linked to a channel.")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Show decks linked to this channel. Defaults to current channel.")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("edit")
                .setDescription("Edit decks in this channel.")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Edit a deck linked to this channel. Defaults to current channel.")
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
                const title = interaction.options.getString("title");
                const description = interaction.options.getString("description");
                const colourRaw = interaction.options.getString("colour") || "2596BE";
                const colour = validateColour(colourRaw);

                if(!colour) {
                    return interaction.reply({
                        content: `Invalid hexcode specified. Please try again.`,
                        flags: MessageFlags.Ephemeral
                    })
                }

                const mountedName = await createDeck(pool, guild.id, channel.id, name, priority, title, description, colour);
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
        else if(interaction.options.getSubcommand() === "list") {
            try {
                const channel = interaction.options.getChannel("channel") || interaction.channel;

                const results = await getDecks(pool, channel);
                if(results.length == 0) {
                    return interaction.reply({
                        content: `The specified channel has no linked decks.`,
                        flags: MessageFlags.Ephemeral
                    })
                } else {
                    const embeds = [];
                    for(const row of results) {
                        let desc = "Your prompt text goes here."
                        if(row.desc) { desc = desc + `\n\n*${row.desc}*`}
                        const deckInfoCard = new EmbedBuilder()
                            .setColor(row.colour)
                            .setTitle(row.title)
                            .setDescription(desc)
                            .setFooter({text: `Deck: ${row.name} | Priority Level: ${row.priority} | ${row.approved} Cards in Deck | ${row.unapproved} Suggestions in Channel`})
                        embeds.push(deckInfoCard);
                    }
                    return interaction.reply({
                        content: "Here's what the prompts of each deck will look like!",
                        embeds: embeds,
                        flags: MessageFlags.Ephemeral
                    })
                }
            } catch(err) {
                console.log("[WARN]", err);
            }
        }
        else if(interaction.options.getSubcommand() === "edit") {
            try {

            } catch(err) {
                console.log("[WARN]", err);
            }
        }
    }
}
function validateColour(col) {
    const cleanStr = str => str.startsWith('#') ? str : `#${str}`;
    const cleanHex = cleanStr(col);

    const isValid = /^#([0-9A-F]{3}){1,2}$/i.test(cleanHex);

    if(!isValid) return;
    return cleanHex;
}