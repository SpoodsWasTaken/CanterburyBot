const { runQuery } = require("../db/db.js");

async function updatePrompt(promptId, newDeckId) {
    try {
        return;
    } catch(err) {
        console.log("[WARN]", err);
    }
}
async function deletePrompt(promptId) {
    try {
        const res = await runQuery(`
            DELETE FROM prompts 
            WHERE id = $1
            RETURNING text
        `, [promptId])

        if(res.rows.length === 0) return null;  
        console.log("[QOTD] Prompt ${promptId} deleted.")
        return res.rows[0].text;
    } catch(err) {
        console.log("[WARN]", err);
    }
}

module.exports = { updatePrompt, deletePrompt }