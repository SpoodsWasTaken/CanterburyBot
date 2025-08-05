class Deck { 
    constructor(_guild, _channel, _name, _priority, _title, _description) {
        this.guild = _guild;
        this.channel = _channel;
        this.name = _name;
        this.priority = _priority;
        this.title = _title;
        this.description = _description;
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
                    description
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, name`,
                [this.guild, this.channel, this.name, this.priority, this.title, this.description]
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
async function createDeck(db, guild, channel, name, priority, title, description) {
    if(!priority) priority = 0;
    if(!title) title = "Question of the Day"
    
    const newDeck = new Deck(guild, channel, name, priority, title, description);
    const mountedName = await newDeck.mount(db);
    return mountedName;
}
async function getDecksWithInfo(guild, channel) {

}

module.exports = { Deck, createDeck };