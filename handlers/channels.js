const { pool, runQuery } = require("../db/db.js");
const channelCache = [];
const maxSuggestions = 50;

async function registerChannel(channelId, cronEx, cronTz, suggestionLimit) {
    try {
        if(!channelId) return false;
        if(!suggestionLimit) suggestionLimit = maxSuggestions;

        if(await checkChannelExists(channelId)) return false;
        
        let query = "INSERT INTO channels (id,";
        let args = [channelId];

        if(cronEx) {
            query += ` cron_expression,`;
            args.push(cronEx);
        }
        if(cronTz) {
            query += ` utc_offset,`;
            args.push(cronTz);
        }
        query += ` suggestion_limit, last_updated)`
        args.push(suggestionLimit);
        args.push(new Date());
        channelCache.push(channelId);
        const values = ` VALUES (${args.map((_, i) => `$${i + 1}`).join(", ")})`
        query += values;

        await runQuery(query, args);
        console.log(`[CHN] Registered channel ${channelId} with suggestion limit of ${suggestionLimit}`);
        return true;

    } catch(err) {
        throw err;
    }
}
async function updateChannel(channelId, cronEx, cronTz, suggestionLimit) {
    try {
        if(!channelId) return false;

        const exists = await checkChannelExists(channelId);
        if(!exists) return registerChannel(channelId, cronEx, cronTz, suggestionLimit);

        let clauses = [];
        let args = [];

        if(cronEx) {
            clauses.push(` cron_expression = $${args.length + 1}`);
            args.push(cronEx);
        }
        if(cronTz) {
            clauses.push(` utc_offset = $${args.length + 1}`);
            args.push(cronTz);
        }
        if(suggestionLimit) {
            if(suggestionLimit > maxSuggestions) suggestionLimit = maxSuggestions;
            clauses.push(` suggestion_limit = $${args.length + 1}`);
            args.push(suggestionLimit);
        }
        if(args.length > 0) {
            clauses.push(` last_updated = $${args.length + 1}`);
            const query = `UPDATE channels SET ${clauses.join(", ")} WHERE id = $${args.length + 2}`;
            args.push(new Date());
            args.push(channelId);

            await runQuery(query, args);
            console.log(`[CHN] Updated channel ${channelId}`);
            if(!channelCache.includes(channelId)) { channelCache.push(channelId); }
            return true;
        } else {
            return false;
        }
    } catch(err) {
        throw err;
    }
}
async function deleteChannel(channelId) {
    try {
        return; 
    } catch(err) {
        throw err;
    }
}
async function bumpChannel(channelId) {
    if(channelCache.includes(channelId)) return;
    try {
        const exists = await checkChannelExists(channelId);

        if(!exists) {
            registerChannel(channelId);
            return;
        }; 

        await runQuery(`UPDATE channels SET last_updated = $1 WHERE id = $2`,
            [new Date(), channelId]);
        channelCache.push(channelId);
        console.log(`[CHN] Channel ${channelId} was bumped`)
    } catch(err) {
        throw err;
    }
}
async function blast(msg) {
    try {
        return;
    } catch(err) {
        throw err;
    }
}
async function checkChannelExists(channelId) {
    const checkExists = await runQuery(`
        SELECT EXISTS (
            SELECT 1 FROM channels
            WHERE id = $1
        ) AS exists;
        `, [channelId]);
    console.log(`[CHN] Checked if channel ${channelId} exists -> ${checkExists.rows[0].exists}`)
    return checkExists.rows[0].exists;
}

module.exports = { maxSuggestions, channelCache, registerChannel, updateChannel, deleteChannel, bumpChannel, checkChannelExists }