const db = require('../config/db');

async function list(restaurantId) {
  const { rows } = await db.query(
    `SELECT * FROM restaurant_tables WHERE restaurant_id = $1 ORDER BY table_number ASC`,
    [restaurantId]
  );
  return rows;
}

async function create(restaurantId, { table_number, label }) {
  const { rows } = await db.query(
    `INSERT INTO restaurant_tables (restaurant_id, table_number, label)
     VALUES ($1,$2,$3) RETURNING *`,
    [restaurantId, table_number, label || null]
  );
  return rows[0];
}

async function remove(restaurantId, id) {
  const { rowCount } = await db.query(
    `DELETE FROM restaurant_tables WHERE id = $1 AND restaurant_id = $2`,
    [id, restaurantId]
  );
  return rowCount > 0;
}

async function findByNumber(restaurantId, table_number) {
  const { rows } = await db.query(
    `SELECT * FROM restaurant_tables WHERE restaurant_id = $1 AND table_number = $2`,
    [restaurantId, table_number]
  );
  return rows[0];
}

module.exports = { list, create, remove, findByNumber };