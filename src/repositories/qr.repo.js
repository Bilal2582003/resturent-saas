const db = require('../config/db');

async function upsert(restaurantId, tableId, targetUrl, imagePath) {
  const { rows } = await db.query(
    `INSERT INTO qr_codes (restaurant_id, table_id, target_url, image_path)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [restaurantId, tableId || null, targetUrl, imagePath]
  );
  return rows[0];
}

async function listForRestaurant(restaurantId) {
  const { rows } = await db.query(
    `SELECT * FROM qr_codes WHERE restaurant_id = $1 ORDER BY created_at DESC`,
    [restaurantId]
  );
  return rows;
}

module.exports = { upsert, listForRestaurant };