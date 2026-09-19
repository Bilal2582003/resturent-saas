const db = require('../config/db');

async function create({ email, password_hash, role, restaurant_id }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role, restaurant_id)
     VALUES ($1,$2,$3,$4) RETURNING id, email, role, restaurant_id, created_at`,
    [email, password_hash, role, restaurant_id || null]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT id, email, role, restaurant_id, is_active, last_login_at FROM users WHERE id = $1`,
    [id]
  );
  return rows[0];
}

async function touchLogin(id) {
  await db.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [id]);
}

async function updatePassword(id, password_hash) {
  await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [password_hash, id]);
}

async function listByRestaurant(restaurantId) {
  const { rows } = await db.query(
    `SELECT id, email, role, is_active, created_at FROM users WHERE restaurant_id = $1 ORDER BY created_at DESC`,
    [restaurantId]
  );
  return rows;
}

module.exports = { create, findByEmail, findById, touchLogin, updatePassword, listByRestaurant };