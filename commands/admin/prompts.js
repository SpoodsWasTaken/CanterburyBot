const { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { runQuery } = require("../../db/db.js");
const { getPromptsInDeck } = require("../../handlers/decks.js");
const { checkApprover } = require("../../handlers/suggestions.js");
const Paginated = require("../../resources/Paginated.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("prompts")
        .setDescription("Prompt commands.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("List all prompts in a deck. Available to server admins and approvers.")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel. Defaults to current channel.")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("deck")
                        .setDescription("List all prompts in this deck.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Directly add a prompt to a deck. Available to server admins and approvers.")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel. Defaults to current channel.")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("deck")
                        .setDescription("List all prompts in this deck.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("text")
                        .setDescription("Prompt text to add.")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("add_many")
                .setDescription("Directly add a prompt to a deck. Available to server admins and approvers.")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel. Defaults to current channel.")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("deck")
                        .setDescription("List all prompts in this deck.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        const isApprover = await checkApprover(interaction.guild, interaction.user);
        if(!isApprover) {
            return interaction.reply({
                content: "You are not a prompt approver on this server.",
                flags: MessageFlags.Ephemeral
            });
        }
        if(interaction.options.getSubcommand() === "list") {
            try {
                const deckId = interaction.options.getString("deck")
                const deck = await runQuery(`
                    SELECT name
                    FROM decks
                    WHERE id = $1
                `, [deckId]);
                const res = await getPromptsInDeck(deckId);
                const pages = createPromptPages(res, deck.rows[0].name);

                new Paginated(interaction, pages, null);
            } catch(err) {
                console.log("[WARN]", err);
            }
        }
        if(interaction.options.getSubcommand() === "add") {
            try {
                const deck = interaction.options.getString("deck");
            
            } catch(err) {
                console.log("[WARN]", err);
            }
        }
        if(interaction.options.getSubcommand() === "add_many") {
            try {
                const deck = interaction.options.getString("deck");
                
            } catch(err) {
                console.log("[WARN]", err);
            }
        }
    }
}

function createPromptPages(prompts, deckName) {
    const promptsPerPage = 50;
    const pagesRequired = Math.ceil(prompts.length / promptsPerPage);
    const pages = [];

    for(i = 0; i < pagesRequired; i++) {
        const pageText = prompts.map(prompt => `\`${prompt.id}\`: ${prompt.text}`).join(`\n`);

        const page = new EmbedBuilder()
            .setColor(0x2596BE)
            .setTitle(`Showing **${prompts.length}** prompts in **${deckName}**`)
            .setDescription(pageText)

        pages.push(page);
    }
    return pages;
}