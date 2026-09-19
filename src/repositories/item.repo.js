const db = require('../config/db');

async function create(restaurantId, data) {
  const {
    category_id, name, description, price, discount_price,
    image_thumb, image_medium, image_large,
    is_available = true, is_featured = false, badge, sort_order = 0,
  } = data;

  const { rows } = await db.query(
    `INSERT INTO menu_items
      (restaurant_id, category_id, name, description, price, discount_price,
       image_thumb, image_medium, image_large,
       is_available, is_featured, badge, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      restaurantId, category_id, name, description, price, discount_price || null,
      image_thumb || null, image_medium || null, image_large || null,
      is_available, is_featured, badge || null, sort_order,
    ]
  );
  return rows[0];
}

async function findById(restaurantId, id) {
  const { rows } = await db.query(
    `SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2`,
    [id, restaurantId]
  );
  return rows[0];
}

async function listByRestaurant(restaurantId, { categoryId, onlyAvailable } = {}) {
  const conds = ['restaurant_id = $1'];
  const params = [restaurantId];
  if (categoryId) {
    params.push(categoryId);
    conds.push(`category_id = $${params.length}`);
  }
  if (onlyAvailable) conds.push('is_available = TRUE');

  const { rows } = await db.query(
    `SELECT * FROM menu_items WHERE ${conds.join(' AND ')}
     ORDER BY sort_order ASC, name ASC`,
    params
  );
  return rows;
}

async function update(restaurantId, id, fields) {
  const allowed = [
    'category_id','name','description','price','discount_price',
    'image_thumb','image_medium','image_large',
    'is_available','is_featured','badge','sort_order',
  ];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return findById(restaurantId, id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(id, restaurantId);
  const { rows } = await db.query(
    `UPDATE menu_items SET ${setClause}
     WHERE id = $${values.length - 1} AND restaurant_id = $${values.length}
     RETURNING *`,
    values
  );
  return rows[0];
}

async function remove(restaurantId, id) {
  const { rowCount } = await db.query(
    `DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2`,
    [id, restaurantId]
  );
  return rowCount > 0;
}

/** Public menu — grouped by category, only active. */
async function getMenuForRestaurant(restaurantId) {
  const { rows: cats } = await db.query(
    `SELECT id, name, parent_id, sort_order
     FROM categories WHERE restaurant_id = $1 AND is_active = TRUE
     ORDER BY sort_order ASC, name ASC`,
    [restaurantId]
  );
  const { rows: items } = await db.query(
    `SELECT id, category_id, name, description, price, discount_price,
            image_thumb, image_medium, badge, is_featured, sort_order
     FROM menu_items
     WHERE restaurant_id = $1 AND is_available = TRUE
     ORDER BY sort_order ASC, name ASC`,
    [restaurantId]
  );
  const byCat = new Map();
  for (const it of items) {
    if (!byCat.has(it.category_id)) byCat.set(it.category_id, []);
    byCat.get(it.category_id).push(it);
  }
  return cats.map((c) => ({ ...c, items: byCat.get(c.id) || [] }));
}

module.exports = { create, findById, listByRestaurant, update, remove, getMenuForRestaurant };