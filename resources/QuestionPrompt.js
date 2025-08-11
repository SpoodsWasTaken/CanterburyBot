class QuestionPrompt {
    constructor(_query, _guild, _channel, _author) {
        this.id = this.generateRandomId();
        this.query = _query;
        this.guild = _guild;
        this.channel = _channel;
        this.deck = null;
        this.author = _author;
        this.approvedBy = null;
    }

    generateRandomId() {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";

        for(let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return result;
    }
    approve(_deck, _approvedBy) {
        this.deck = _deck;
        this.approvedBy = _approvedBy;
    }
    async mount(db) {
        if(!this.query || !this.channel || !this.author) {
            throw new Error("Missing required fields for prompt");
        }
        try {
            const result = await db.query(`
                INSERT INTO prompts (
                    id,
                    text,
                    guild_id,
                    channel_id,
                    deck_id,
                    author_id,
                    approved_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id`,
                [this.id, this.query, this.guild, this.channel, this.deck, this.author, this.approvedBy]
            );
            if(!result.rows[0].id) {
                throw new Error("Failed to verify database insertion");
            }
            return result.rows[0].id;
        } catch(err) {
            // Unique constraint violation special case (ID:23505)
            if(err.code === "23505") {
                this.id = this.generateRandomId();
                return this.mount(db);
            }
            throw err;
        }
    }
}

module.exports = QuestionPrompt;