const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { pool, runQuery } = require("../db/db.js");
const activeQotdJobs = new Map();

async function sendQotd(client, channel) {
    try {
        const info = await runQuery(`
            WITH target_deck AS (
                SELECT id FROM decks
                WHERE channel_id = $1
                ORDER BY priority DESC, RANDOM()
                LIMIT 1
            )
            SELECT 
                p.id, p.text, p.author_id as author, 
                p.deck_id, d.name as deck_name,
                d.title, d.description as desc
            FROM prompts p
            JOIN decks d ON p.deck_id = d.id
            WHERE p.deck_id = (SELECT id FROM target_deck)
            ORDER BY RANDOM()
            LIMIT 1;
        `, [channel.id]);
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
        const approved = approveData.rows[0].approved_count;
        const unapproved = approveData.rows[0].unapproved_count;

        let promptText = info.rows[0].text;
        if(info.rows[0].desc) {
            promptText = promptText + `\n\n*${info.rows[0].desc}*`
        }
        const promptCard = new EmbedBuilder()
            .setTitle(title)
            .setDescription(promptText)
            .setFooter({
                text: `Author: ${authorName} | Card: ${promptId} | Deck: ${deckName} | ${approved} Cards in Deck | ${unapproved} Suggestions`
            })
        const suggestButton = new ButtonBuilder()
            .setCustomId("suggestPrompt")
            .setLabel("✏️ Suggest")
            .setStyle(ButtonStyle.Primary)
        const row = new ActionRowBuilder().addComponents(suggestButton);
        channel.send({
            embeds: [promptCard],
            components: [row]
        })
    } catch(err) {
        console.log("[WARN]", err);
    }
}

module.exports = { activeQotdJobs, sendQotd }