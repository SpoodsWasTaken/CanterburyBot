class QuestionPrompt {
    constructor(_query, _channel, _author) {
        this.id = this.generateRandomId();
        this.query = _query;
        this.channel = _channel;
        this.author = _author;
        this.approved = false;
        this.approvedBy = null;
        this.useCount = 0;
    }

    generateRandomId() {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";

        for(let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return result;
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
                    channel_id,
                    author_id,
                    approved,
                    approved_by,
                    use_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id`,
                [this.id, this.query, this.channel, this.author, this.approved, this.approvedBy, this.useCount]
                );
            if(!result.rows[0].id) {
                throw new Error("Failed to verify database insertion");
            }
            return result.rows[0].id;
        } catch(err) {
            // UNique constraint violation special case (ID:23505)
            if(err.code === "23505") {
                this.id = this.generateRandomId();
                return this.mount(db);
            }
            throw err;
        }
    }
}

module.exports = QuestionPrompt;