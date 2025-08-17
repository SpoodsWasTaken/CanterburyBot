const { runQuery } = require("../db/db.js");
const deckCache = new Map();
const maxPrompts = 365;
const maxDecks = 5;

async function handleDeckEditAutocomplete(interaction, focus) {
    const channelId = interaction.options._hoistedOptions.find(
        opt => opt.name === 'channel'
    )?.value;
    let decksFound = deckCache.get(channelId);

    if(!decksFound) {
        decksFound = await getDecks(channelId);
    }
    const filtered = decksFound.filter(deck =>
        deck.name.toLowerCase().includes(focus.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 25);

    await interaction.respond(
        filtered.map(deck => ({
            name: deck.name,
            value: deck.id.toString()
        }))
    )
}
async function getDecks(channelId) {
    const res = await runQuery(`
        SELECT id, name
        FROM decks
        WHERE channel_id = $1
        ORDER BY priority DESC, name
        LIMIT 10
    `, [channelId])
    
    deckCache.set(channelId, res.rows);
    setTimeout(async () => { deckCache.delete(channelId) }, 3 * 60 * 1000);
    return res.rows;
}
async function getDecksWithApprovedCount(channel) {
    const res = await runQuery(`
        SELECT 
            d.name as name,
            d.priority as priority,
            d.title as title,
            d.description as desc,
            d.colour as colour,
            COUNT(p.id) AS approved,
            (
                SELECT COUNT(*) 
                FROM prompts 
                WHERE channel_id = $1 AND deck_id IS NULL
            ) AS unapproved
        FROM decks d
        LEFT JOIN prompts p ON p.deck_id = d.id
        WHERE d.channel_id = $1
        GROUP BY d.id, d.name, d.priority, d.title, d.description, d.colour`, 
        [channel.id])
    return res.rows;
}
async function getPromptsInDeck(deckId) {
    const res = await runQuery(`
        SELECT id, text, author_id as authorId, approved_by as approvedBy
        FROM prompts 
        WHERE deck_id = $1
    `, [deckId])

    return res.rows;
}

module.exports = { maxPrompts, handleDeckEditAutocomplete, getDecksWithApprovedCount, getPromptsInDeck }