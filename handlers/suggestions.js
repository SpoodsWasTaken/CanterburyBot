const { MessageFlags, EmbedBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { pool, runQuery } = require("../db/db.js");
const { createDeck } = require("../resources/Deck.js");

async function handleApprovalDropdown(interaction) {
    try {
        const iterLimit = 5;
        const selectedChannelId = interaction.values[0];
        const guild = interaction.guild;

        const [decksResult, promptsResult] = await Promise.all([
            runQuery(
            "SELECT id, name FROM decks WHERE channel_id = $1",
            [selectedChannelId]),
            runQuery(`
            SELECT id, text, author_id
            FROM prompts
            WHERE channel_id = $1
            AND deck_id IS NULL
            LIMIT ${iterLimit * 5}
            `, [selectedChannelId])
        ]);
        if(decksResult.rows.length === 0) {
            createDeck(pool, guild.id, selectedChannelId, "Default", 0);
        }
        const authorIds = [...new Set(promptsResult.rows.map(prompt => prompt.author_id))];
        const authors = new Map(
            await Promise.all(
                authorIds.map(async authorId => {
                    try {
                        const user = await interaction.client.users.fetch(authorId);
                        return [authorId, user.username];
                    } catch (error) {
                        console.error(`Couldn't fetch user ${authorId}:`, error);
                        return [authorId, '[Unknown User]'];
                    }
                })
            )
        );
        new PromptMenu(interaction, decksResult.rows, promptsResult.rows, iterLimit, authors);
    } catch(err) {
        console.log("[WARN]", err);
        await interaction.reply({
            content: `Unable to generate list. Try again later.`,
            flags: MessageFlags.Ephemeral
        })
    }
}
class PromptMenu {
    constructor(_interaction, _decks, _prompts, _limit, _authors) {
        this.interaction = _interaction;
        this.decks = _decks;
        this.prompts = _prompts;
        this.index = 0;
        this.limit = _limit;
        this.authors = _authors;
        this.approveMenu = new ActionRowBuilder();

        this.followUpQueue = [];
        this.isProcessing = false;
        this.messages = [];

        if(this.decks.length > 1) {
            const options = this.decks.map(({ id, name }) => {
                return {
                    label: `${name}`,
                    value: id.toString()
                }
            }) 
            const menuRow = new StringSelectMenuBuilder()
                .setCustomId("select_deck")
                .setPlaceholder("Pick a deck to add to")
                .addOptions(options)
            this.approveMenu.addComponents(menuRow);
        }

        this.init();
    }
    async init() {
        try {
            for(let i = this.index; i < this.index+5; i++) {
                if(!this.prompts[i]) { break; }
                const authorName = this.authors.get(this.prompts[i].author_id);

                const promptCard = new EmbedBuilder()
                    .setColor(0x2596BE)
                    .setTitle(`Prompt #${i + 1} of ${this.prompts.length}: ${this.prompts[i].id}`)
                    .setDescription(this.prompts[i].text)
                    .setFooter({text: `Author: ${authorName}`})
                const approveBtn = new ButtonBuilder()
                    .setCustomId("+" + this.prompts[i].id)
                    .setLabel("Approve")
                    .setStyle(ButtonStyle.Success)
                const denyBtn = new ButtonBuilder()
                    .setCustomId("-" + this.prompts[i].id)
                    .setLabel("Deny")
                    .setStyle(ButtonStyle.Danger)
                const components = []
                const row = new ActionRowBuilder()
                if(this.decks.length > 1) {
                    components.push(this.approveMenu);
                    row.addComponents(denyBtn);
                } else {
                    row.addComponents([approveBtn, denyBtn]);
                }
                components.push(row)
                const msg = {
                    embeds: [promptCard],
                    flags: MessageFlags.Ephemeral,
                    components: components
                }
                if(this.interaction.replied || this.interaction.deferred) {
                    this.followUpQueue.push(msg);
                    if(!this.isProcessing) {
                        this.isProcessing = true;
                        while(this.followUpQueue.length > 0) {
                            await this.interaction.followUp(this.followUpQueue.shift());
                            await new Promise(r => setTimeout(r, 100));
                        }
                        this.isProcessing = false;
                    }
                } else {
                    await this.interaction.reply(msg)
                }
            }
        } catch(err) {
            console.log("[WARN]", err);
        }
    }
}

module.exports = { handleApprovalDropdown }