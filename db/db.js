const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runQuery(queryText, queryParams = []) {
    return await pool.query(queryText, queryParams);
}

async function testConnection() {
    try {
        const result = await runQuery("SELECT NOW() as current_time");
        console.log("[DB] Successfully connected to database. Current server time:", result.rows[0].current_time);
        await checkTableCount();
        return true;
    } catch(err) {
        console.error("[DB] Database connection error:", err);
        return false;
    }
}

async function checkTableCount() {
    const tablesCountQuery = await runQuery(`
        SELECT COUNT(*) AS table_count
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_type = 'BASE TABLE'
    `);
    console.log("[DB] Number of tables found in database:", tablesCountQuery.rows[0].table_count);
}

async function customQuery() {
    const q = await runQuery(`
        CREATE TABLE approvers (
            guild_id VARCHAR(20),
            user_id VARCHAR(20),
            added_by VARCHAR(20),
            PRIMARY KEY (guild_id, user_id)
        );
    `)
}

module.exports = {
    pool, runQuery, testConnection
}