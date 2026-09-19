const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

/**
 * Run a query. Always use parameterized queries.
 * @param {string} text
 * @param {any[]} params
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (!env.isProd) {
    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`🐢 Slow query (${duration}ms):`, text.slice(0, 80));
    }
  }
  return res;
}

/**
 * Transaction helper. Usage:
 *   await tx(async (client) => { ... });
 */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, tx, pool };