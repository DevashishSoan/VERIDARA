const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'veridara',
    password: process.env.DB_PASSWORD || 'password123',
    port: process.env.DB_PORT || 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

let isDbAvailable = true;

pool.on('error', (err, client) => {
    console.warn('[DB] Postgres connection lost or unavailable.');
    isDbAvailable = false;
});

module.exports = {
    query: async (text, params) => {
        if (!isDbAvailable) {
            console.error('[DB] Attempted query while database is OFFLINE.');
            return { rows: [] };
        }
        try {
            return await pool.query(text, params);
        } catch (e) {
            isDbAvailable = false;
            console.warn('[DB] Query failed. Database may be offline.');
            return { rows: [] };
        }
    },
    pool,
    isAvailable: () => isDbAvailable
};
