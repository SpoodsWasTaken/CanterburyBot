const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { pool, runQuery } = require("../db/db.js");
const { deletePrompt } = require("../handlers/prompts.js");
const activeQotdJobs = new Map();

async function sendQotd(client, channel) {
    try {
        const info = await runQuery(`
            WITH decks_with_prompts AS (
                SELECT 
                    d.id, d.priority
                FROM decks d
                WHERE d.channel_id = $1
                AND EXISTS (
                    SELECT 1 FROM prompts p WHERE p.deck_id = d.id
                )
            ),
            highest_priority AS (
                SELECT MAX(priority) as max_priority
                FROM decks_with_prompts
            ),
            target_deck AS (
                SELECT id
                FROM decks_with_prompts
                WHERE priority = (SELECT max_priority FROM highest_priority)
                ORDER BY RANDOM()
                LIMIT 1
            )
            SELECT 
                p.id, p.text, p.author_id AS author, 
                p.deck_id, d.name AS deck_name,
                d.title, d.description AS desc, d.colour AS colour
            FROM prompts p
            JOIN decks d ON p.deck_id = d.id
            WHERE p.deck_id = (SELECT id FROM target_deck)
            ORDER BY RANDOM()
            LIMIT 1;
        `, [channel.id]);
        if(info.rows.length === 0) { return; }
        const approveData = await runQuery(`
            SELECT
                (SELECT COUNT(*) 
                FROM prompts 
                WHERE deck_id = $1) AS approved_count,
                (SELECT COUNT(*) 
                FROM prompts p
                JOIN decks d ON d.channel_id = p.channel_id
                WHERE d.id = $1 
                AND p.deck_id IS NULL) AS unapproved_count;
        `, [info.rows[0].deck_id]);
        const promptId = info.rows[0].id;
        const author = await client.users.fetch(info.rows[0].author)
        const authorName = author.username;
        const deckName = info.rows[0].deck_name;
        const title = info.rows[0].title;
        const colour = info.rows[0].colour;
        const approved = approveData.rows[0].approved_count;
        const unapproved = approveData.rows[0].unapproved_count;

        let promptText = info.rows[0].text;
        if(info.rows[0].desc) {
            promptText = promptText + `\n\n*${info.rows[0].desc}*`
        }
        const promptCard = new EmbedBuilder()
            .setColor(colour)
            .setTitle(title)
            .setDescription(promptText)
            .setFooter({
                text: `Author: ${authorName} | Card: ${promptId} | Deck: ${deckName} | ${approved - 1} Cards in Deck | ${unapproved} Suggestions`
            })
        const suggestButton = new ButtonBuilder()
            .setCustomId("suggestPrompt")
            .setLabel("✏️ Suggest")
            .setStyle(ButtonStyle.Secondary)
        const row = new ActionRowBuilder().addComponents(suggestButton);
        await channel.send({
            embeds: [promptCard],
            components: [row]
        })
        console.log(`[QOTD] Prompt ${promptId}: ${info.rows[0].text} sent in channel ${channel.id}`);
        await deletePrompt(promptId);
    } catch(err) {
        console.log("[WARN]", err);
    }
}

module.exports = { activeQotdJobs, sendQotd }