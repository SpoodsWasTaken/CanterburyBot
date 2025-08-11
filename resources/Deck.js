const { pool } = require("../db/db.js");

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

    async mount() {
        if(!this.guild || !this.channel || !this.name) {
            throw new Error("Missing required fields for deck.");
        }
        try {
            const result = await pool.query(`
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
async function createDeck(guild, channel, name, priority, title, description, colour) {
    if(!priority) priority = 0;
    if(!title) title = "Question of the Day"
    if(!colour) colour = "#2596BE"
    
    const newDeck = new Deck(guild, channel, name, priority, title, description, colour);
    const mountedName = await newDeck.mount(pool);
    console.log(`[QOTD] Created new deck ${name} with priority ${priority} in channel ${channel}`);
    return mountedName;
}

module.exports = { Deck, createDeck };