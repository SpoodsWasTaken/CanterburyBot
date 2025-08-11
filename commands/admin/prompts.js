const { SlashCommandBuilder, ChannelType, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ThreadAutoArchiveDuration
 } = require("discord.js");
const { pool, runQuery } = require("../../db/db.js");
const { maxPrompts, getPromptsInDeck } = require("../../handlers/decks.js");
const { checkApprover } = require("../../handlers/suggestions.js");
const Paginated = require("../../resources/Paginated.js");
const QuestionPrompt = require("../../resources/QuestionPrompt.js");

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
                console.log(`[QOTD] Listed prompts for ${deck.rows[0].name} in #${interaction.channel.name}`)
            } catch(err) {
                console.log("[WARN]", err);
            }
        }
        if(interaction.options.getSubcommand() === "add") {
            try {
                const channel = interaction.options.getChannel("channel");
                const deckId = interaction.options.getString("deck");
                const text = interaction.options.getString("text");

                const existingCount = getApprovedCount(deckId);
                if(existingCount >= maxPrompts) {
                    return interaction.reply({
                        content: "Unable to add to deck. Maximum prompts reached."
                    })
                }
                const prompt = new QuestionPrompt(text, interaction.guild.id, channel.id, interaction.user.id);
                const addCard = new EmbedBuilder()
                    .setColor(0x2596BE)
                    .setTitle(`Add this prompt?`)
                    .setDescription(prompt.query)
                    .setFooter({text: `Provisional ID: ${prompt.id} | Approve within 2 minutes`})
                const confirmBtn = new ButtonBuilder()
                    .setCustomId("confirm")
                    .setLabel("Confirm")
                    .setStyle(ButtonStyle.Success)
                const denyBtn = new ButtonBuilder()
                    .setCustomId("discard")
                    .setLabel("Discard")
                    .setStyle(ButtonStyle.Danger)
                const row = new ActionRowBuilder()
                    .addComponents(confirmBtn, denyBtn)

                const response = await interaction.reply({
                    embeds: [addCard],
                    components: [row],
                    flags: MessageFlags.Ephemeral,
                    withResponse: true
                });
                const message = response.resource.message;
                const collector = message.createMessageComponentCollector({
                    time: 120000
                });
                collector.on("collect", async(i) => {
                    let message = "";
                    if(i.customId === "confirm") {
                        prompt.approve(deckId, interaction.user.id);
                        const mountedId = await prompt.mount(pool);
                        message += `New prompt created: ${mountedId}`;
                        console.log(`[QOTD] ${interaction.user.username} force-approved "${prompt.query}" in ${channel.name} - ${interaction.guild.name}: ID assigned ${mountedId}`)
                    } else if (i.customId === "discard") {
                        message += `Prompt discarded.`
                    }
                    await i.update({
                        content: message,
                        embeds: [],
                        components: []
                    })
                });
                collector.on("end", () => {
                    message.edit({ content: "Approval confirmation timed out." }).catch(() => {});
                })
            } catch(err) {
                console.log("[WARN]", err);
            }
        }
        if(interaction.options.getSubcommand() === "add_many") {
            try {
                const channel = interaction.options.getChannel("channel");
                const deckId = interaction.options.getString("deck");

                const existingCount = await getApprovedCount(deckId);
                if(existingCount >= maxPrompts) {
                    return interaction.reply({
                        content: "Unable to add to deck. Maximum prompts reached."
                    })
                }
                const limit = Math.min(maxPrompts - existingCount, 10);

                const thread = await interaction.channel.threads.create({
                    name: `QOTD Admin Prompt Submission`,
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
                    type: ChannelType.PrivateThread,
                    reason: "Add multiple QOTD prompts."
                })
                await thread.members.add(interaction.user.id);
                const newThreadCard = new EmbedBuilder()
                    .setColor(0x2596BE)
                    .setTitle("Private thread created!")
                    .setDescription(`Check it out here: ${thread}`)
                await thread.send({
                    content: `Type your prompts in one message, separated by \` // \`. Up to ${limit} prompts will be accepted.`
                })
                await interaction.reply({
                    embeds: [newThreadCard],
                    flags: MessageFlags.Ephemeral
                })
                const filter = m => m.author.id === interaction.user.id;
                const collected = await new Promise((resolve, reject) => {
                    const collector = thread.createMessageCollector({ filter, max: 1, time: 600000 });
                    
                    collector.on("collect", msg => {
                        collector.stop(); 
                        resolve([msg]);
                    });
                    collector.on("end", (collected) => {
                        if (collected.size === 0) resolve([]);
                    });
                    collector.on("error", err => reject(err));
                });
                if(collected) {
                    const msg = collected[0].content;

                    const promptTexts = msg.split("//").map(p => p.trim()).filter(p => p.length > 0).slice(0, limit);

                    const prompts = [];
                    const cardText = [];
                    promptTexts.map(promptText => {
                        const prompt = new QuestionPrompt(promptText, interaction.guild.id, channel.id, interaction.user.id);
                        prompts.push(prompt);
                        cardText.push(`\`${prompt.id}\`: ${prompt.query}`);
                    });
                    const cardTextStr = cardText.join("\n");
                    const addCard = new EmbedBuilder()
                        .setColor(0x2596BE)
                        .setTitle(`Add these prompts?`)
                        .setDescription(cardTextStr)
                        .setFooter({text: `Approve within 2 minutes`})
                    const confirmBtn = new ButtonBuilder()
                        .setCustomId("confirm")
                        .setLabel("Confirm")
                        .setStyle(ButtonStyle.Success)
                    const denyBtn = new ButtonBuilder()
                        .setCustomId("discard")
                        .setLabel("Discard")
                        .setStyle(ButtonStyle.Danger)
                    const row = new ActionRowBuilder()
                        .addComponents(confirmBtn, denyBtn)
                    const response = await collected[0].reply({
                        embeds: [addCard],
                        components: [row],
                        flags: MessageFlags.Ephemeral,
                        withResponse: true
                    });
                    const collector = response.createMessageComponentCollector({
                        time: 120000
                    });
                    collector.on("collect", async(i) => {
                        let message = "";
                        if(i.customId === "confirm") {
                            prompts.map(prompt => {
                                prompt.approve(deckId, interaction.user.id);
                                const mountedId = prompt.mount(pool);
                                console.log(`[QOTD] ${interaction.user.username} force-approved "${prompt.query}" in ${channel.name} - ${interaction.guild.name}: ID assigned ${mountedId}`)
                            });
                            message += `${prompts.length} new prompts created.`
                        } else if (i.customId === "discard") {
                            message += `Prompts discarded.`
                        }
                        await i.update({
                            content: message,
                            embeds: [],
                            components: []
                        })
                        setTimeout(async () => { 
                            try{
                                if(thread.isThread()) {
                                    thread.delete();
                                }
                            } catch(err) {}
                        }, 3000);
                    });
                    collector.on("end", () => {
                        response.edit({ content: "Approval confirmation timed out." }).catch(() => {});
                        setTimeout(async () => { 
                            try{
                                if(thread.isThread()) {
                                    thread.delete();
                                }
                            } catch(err) {}
                        }, 3000);
                    })
                }
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
async function getApprovedCount(deckId) {
    const res = await runQuery(`
        SELECT COUNT(*) as count
        FROM prompts
        WHERE deck_id = $1
    `, [deckId])

    return res.rows[0].count;
}