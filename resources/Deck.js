class Deck { 
    constructor(_guild, _channel, _name, _priority, _title, _description, _colour) {
        this.guild = _guild;
        this.channel = _channel;
        this.name = _name;
        this.priority = _priority;
        this.title = _title;
        this.description = _description;
        this.colour = _colour;
    }

    async mount(db) {
        if(!this.guild || !this.channel || !this.name) {
            throw new Error("Missing required fields for deck.");
        }
        try {
            const result = await db.query(`
                INSERT INTO decks (
                    guild_id,
                    channel_id,
                    name,
                    priority,
                    title,
                    description,
                    colour
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, name`,
                [this.guild, this.channel, this.name, this.priority, this.title, this.description, this.colour]
            );
            if(!result.rows[0].id) {
                throw new Error("Failed to verify database insertion");
            }
            return result.rows[0].name;
        } catch(err) {
            throw err;
        }
    }
}
async function createDeck(db, guild, channel, name, priority, title, description, colour) {
    if(!priority) priority = 0;
    if(!title) title = "Question of the Day"
    if(!colour) colour = "#2596BE"
    
    const newDeck = new Deck(guild, channel, name, priority, title, description, colour);
    const mountedName = await newDeck.mount(db);
    return mountedName;
}
async function getDecksWithApprovedCount(db, channel) {
    const res = await db.query(`
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

module.exports = { Deck, createDeck, getDecksWithApprovedCount };