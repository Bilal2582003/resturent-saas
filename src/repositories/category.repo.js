const db = require('../config/db');

async function create(restaurantId, { name, parent_id, sort_order = 0 }) {
  const { rows } = await db.query(
    `INSERT INTO categories (restaurant_id, name, parent_id, sort_order)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [restaurantId, name, parent_id || null, sort_order]
  );
  return rows[0];
}

async function listByRestaurant(restaurantId, { onlyActive = false } = {}) {
  const where = onlyActive ? 'AND is_active = TRUE' : '';
  const { rows } = await db.query(
    `SELECT * FROM categories WHERE restaurant_id = $1 ${where}
     ORDER BY sort_order ASC, name ASC`,
    [restaurantId]
  );
  return rows;
}

async function findById(restaurantId, id) {
  const { rows } = await db.query(
    `SELECT * FROM categories WHERE id = $1 AND restaurant_id = $2`,
    [id, restaurantId]
  );
  return rows[0];
}

async function update(restaurantId, id, fields) {
  const allowed = ['name','parent_id','sort_order','is_active'];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return findById(restaurantId, id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(id, restaurantId);
  const { rows } = await db.query(
    `UPDATE categories SET ${setClause}
     WHERE id = $${values.length - 1} AND restaurant_id = $${values.length}
     RETURNING *`,
    values
  );
  return rows[0];
}

async function remove(restaurantId, id) {
  const { rowCount } = await db.query(
    `DELETE FROM categories WHERE id = $1 AND restaurant_id = $2`,
    [id, restaurantId]
  );
  return rowCount > 0;
}

async function reorder(restaurantId, orderedIds) {
  await db.tx(async (client) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        `UPDATE categories SET sort_order = $1 WHERE id = $2 AND restaurant_id = $3`,
        [i, orderedIds[i], restaurantId]
      );
    }
  });
}

module.exports = { create, listByRestaurant, findById, update, remove, reorder };