const db = require('../config/db');

async function create({ name, slug, phone, address, logo_url, cover_url }) {
  const { rows } = await db.query(
    `INSERT INTO restaurants (name, slug, phone, address, logo_url, cover_url)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, slug, phone, address, logo_url, cover_url]
  );
  const restaurant = rows[0];
  // Create default settings row
  await db.query(
    `INSERT INTO restaurant_settings (restaurant_id) VALUES ($1)`,
    [restaurant.id]
  );
  return restaurant;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT * FROM restaurants WHERE id = $1`, [id]);
  return rows[0];
}

async function findBySlug(slug) {
  const { rows } = await db.query(
    `SELECT r.*, s.theme, s.primary_color, s.accent_color, s.bg_color, s.text_color,
            s.border_radius, s.font_family, s.button_style, s.currency, s.currency_symbol,
            s.show_cover, s.show_search
     FROM restaurants r
     LEFT JOIN restaurant_settings s ON s.restaurant_id = r.id
     WHERE r.slug = $1`,
    [slug]
  );
  return rows[0];
}

async function list({ page = 1, limit = 20, search = '' } = {}) {
  const offset = (page - 1) * limit;
  const { rows } = await db.query(
    `SELECT r.*, s.theme
     FROM restaurants r
     LEFT JOIN restaurant_settings s ON s.restaurant_id = r.id
     WHERE r.name ILIKE $1 OR r.slug ILIKE $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${search}%`, limit, offset]
  );
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FROM restaurants WHERE name ILIKE $1 OR slug ILIKE $1`,
    [`%${search}%`]
  );
  return { items: rows, total: parseInt(countRows[0].count, 10) };
}

async function update(id, fields) {
  const allowed = ['name','slug','phone','address','logo_url','cover_url','status'];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return findById(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(id);
  const { rows } = await db.query(
    `UPDATE restaurants SET ${setClause} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0];
}

async function updateSettings(restaurantId, fields) {
  const allowed = [
    'theme','primary_color','accent_color','bg_color','text_color',
    'border_radius','font_family','button_style','currency','currency_symbol',
    'show_cover','show_search',
  ];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return getSettings(restaurantId);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(restaurantId);
  const { rows } = await db.query(
    `UPDATE restaurant_settings SET ${setClause}, updated_at = NOW()
     WHERE restaurant_id = $${values.length} RETURNING *`,
    values
  );
  return rows[0];
}

async function getSettings(restaurantId) {
  const { rows } = await db.query(
    `SELECT * FROM restaurant_settings WHERE restaurant_id = $1`,
    [restaurantId]
  );
  return rows[0];
}

async function remove(id) {
  await db.query(`DELETE FROM restaurants WHERE id = $1`, [id]);
}

async function stats() {
  const { rows } = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM restaurants) AS restaurants,
      (SELECT COUNT(*) FROM menu_items) AS items,
      (SELECT COUNT(*) FROM orders) AS orders,
      (SELECT COALESCE(SUM(total),0) FROM orders WHERE status != 'cancelled') AS revenue
  `);
  return rows[0];
}

module.exports = {
  create, findById, findBySlug, list, update, updateSettings,
  getSettings, remove, stats,
};