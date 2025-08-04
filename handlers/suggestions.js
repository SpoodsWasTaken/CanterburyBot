const { MessageFlags, EmbedBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { pool, runQuery } = require("../db/db.js");
const { createDeck } = require("../resources/Deck.js");

const promptMenus = new Map();

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
        const menu = new PromptMenu(interaction, decksResult.rows, promptsResult.rows, authors);
        promptMenus.set(interaction.guild.id, menu);
    } catch(err) {
        console.log("[WARN]", err);
        await interaction.reply({
            content: `Unable to generate list. Try again later.`,
            flags: MessageFlags.Ephemeral
        })
    }
}
async function handleApprovalButton(interaction) {
    try {
        const msg = interaction.message.id; 
        const type = interaction.customId.split(" ")[1];
        const prompt = interaction.message.embeds[0].footer?.text.match(/ID:\s*(\w+)/)?.[1];
        const menu = promptMenus.get(interaction.guild.id);
        if(!prompt) { throw new Error("Unable to get prompt ID to add to deck.") }

        if(type === "+") {
            const approver = interaction.user.id;
            const deck = menu.decks[0].id;
            await runQuery(`
                UPDATE prompts
                SET deck_id = $1,
                    approved_by = $2
                WHERE id = $3
            `, [deck, approver, prompt])
            console.log(`[QOTD] Prompt ${prompt} was approved in ${channel.name} - ${guild.name} by ${interaction.user.id}`)
        }
        else {
            await runQuery(`
                DELETE FROM prompts
                WHERE id = $1
            `, [prompt])
            console.log(`[QOTD] Prompt ${prompt} was denied in ${channel.name} - ${guild.name} by ${interaction.user.id}`)
        }
        menu.deckSelected(msg);
        await interaction.deferUpdate();

    } catch(err) {
        console.log("[WARN]", err);
    }
}
async function handleApprovalDeck(interaction) {
    try {
        const msg = interaction.message.id;
        const deck = interaction.values[0];
        const approver = interaction.user.id;
        const menu = promptMenus.get(interaction.guild.id);
        const prompt = interaction.message.embeds[0].footer?.text.match(/ID:\s*(\w+)/)?.[1];
        if(!prompt) { throw new Error("Unable to get prompt ID to add to deck.") }

        await runQuery(`
            UPDATE prompts
            SET deck_id = $1,
                approved_by = $2
            WHERE id = $3
        `, [deck, approver, prompt])
        console.log(`[QOTD] Prompt ${prompt} was approved in ${channel.name} - ${guild.name} by ${interaction.user.id}`)

        menu.deckSelected(msg)
        await interaction.deferUpdate();

    } catch(err) {
        console.log("[WARN]", err);
    }
}
class PromptMenu {
    constructor(_interaction, _decks, _prompts, _authors) {
        this.interaction = _interaction;
        this.decks = _decks;
        this.prompts = _prompts;
        this.index = 0;
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
                .setCustomId("select_approval_deck")
                .setPlaceholder("Pick a deck to add to")
                .addOptions(options)
            this.approveMenu.addComponents(menuRow);
        }

        this.init();
    }
    async init() {
        try {
            for(let i = this.index; i < 5; i++) {
                if(!this.prompts[i]) { break; }
                const authorName = this.authors.get(this.prompts[i].author_id);
                const promptMessage = this.generatePromptCard(this.prompts[i], this.index, authorName);
                
                if(this.interaction.replied || this.interaction.deferred) {
                    this.followUpQueue.push(promptMessage);
                    if(!this.isProcessing) {
                        this.isProcessing = true;
                        while(this.followUpQueue.length > 0) {
                            const response = await this.interaction.followUp(this.followUpQueue.shift());
                            this.messages.push(response.id);
                            await new Promise(r => setTimeout(r, 100));
                        }
                        this.isProcessing = false;
                    }
                } else {
                    const response = await this.interaction.reply(promptMessage);
                    this.messages.push(response.id);
                }
                this.index++; // for loop limit does not get re-evaluated, this is safe.
            }
        } catch(err) {
            console.log("[WARN]", err);
        }
    }
    async deckSelected(msgId) {
        try {
            const i = this.messages.indexOf(msgId);
            const x = await this.interaction.channel.messages.fetch(msgId);

            if(this.index >= this.prompts.length) {
                const doneCard = new EmbedBuilder()
                    .setColor(0x2596BE)
                    .setTitle(`That's all for now!`)
                    .setDescription(`There are no more prompts in the queue!`);
                
                const msg = {
                    embeds: [doneCard],
                    components: []
                }
                x.edit(msg);
                setTimeout(async () => { x.delete() }, 2900);
                this.messages.splice(i, 1);

                if(this.messages.length == 0 && x.channel.isThread()) {
                    setTimeout(async () => { x.channel.delete() }, 3000);
                    promptMenus.delete(this.interaction.guild.id)
                    console.log(`[QOTD] ${user.username} has finished approving prompts in ${guild.name}`)
                }
                
            } else {
                const prompt = this.prompts[this.index];
                const authorName = this.authors.get(prompt.author_id);
                const promptMessage = this.generatePromptCard(prompt, this.index, authorName);

                this.index++;
                x.edit(promptMessage);
            }
        } catch(err) {
            console.log("[WARN]:", err);
        }
        
    }
    generatePromptCard(prompt, i, authorName) {
        const promptCard = new EmbedBuilder()
            .setColor(0x2596BE)
            .setTitle(`Prompt #${i + 1} of ${this.prompts.length}`)
            .setDescription(prompt.text)
            .setFooter({text: `Author: ${authorName} | ID: ${prompt.id}`})
        const approveBtn = new ButtonBuilder()
            .setCustomId("approve + " + prompt.id)
            .setLabel("Approve")
            .setStyle(ButtonStyle.Success)
        const denyBtn = new ButtonBuilder()
            .setCustomId("approve - " + prompt.id)
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
            components: components,
            withResponse: true
        }
        return msg;
    }
}

module.exports = { promptMenus, handleApprovalDropdown, handleApprovalButton, handleApprovalDeck }