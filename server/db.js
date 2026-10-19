const { Pool } = require('pg');

const demoMode = !process.env.DATABASE_URL;
const pool = demoMode ? null : new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_SIZE || 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
});

async function query(text, params = []) {
  if (demoMode) throw new Error('PostgreSQL is not configured; DATABASE_URL is missing.');
  return pool.query(text, params);
}

module.exports = { demoMode, pool, query };
