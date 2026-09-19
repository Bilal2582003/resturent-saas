const db = require('../config/db');

/** Generate a unique order number per restaurant (daily counter style). */
async function nextOrderNumber(client, restaurantId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS c FROM orders
     WHERE restaurant_id = $1 AND created_at::date = CURRENT_DATE`,
    [restaurantId]
  );
  const n = rows[0].c + 1;
  return `#${String(n).padStart(4, '0')}`;
}

/**
 * Create an order + items in a single transaction.
 * items: [{ menu_item_id, quantity, options: [{option_id, value_ids:[]}] }]
 */
async function create(restaurantId, payload) {
  return db.tx(async (client) => {
    const {
      customer_name, customer_phone, customer_address,
      order_type, table_number, notes, items,
    } = payload;

    if (!items || !items.length) throw new Error('Order has no items');

    // Fetch all menu items to snapshot prices/names
    const ids = [...new Set(items.map((i) => i.menu_item_id))];
    const { rows: dbItems } = await client.query(
      `SELECT id, name, price, discount_price FROM menu_items
       WHERE restaurant_id = $1 AND id = ANY($2::int[])`,
      [restaurantId, ids]
    );
    const itemMap = new Map(dbItems.map((r) => [r.id, r]));
    if (itemMap.size !== ids.length) throw new Error('One or more items are invalid');

    // Fetch option values for validation
    const allValueIds = items.flatMap((i) => (i.options || []).flatMap((o) => o.value_ids || []));
    let valueMap = new Map();
    if (allValueIds.length) {
      const { rows: vals } = await client.query(
        `SELECT v.id, v.name, v.price_delta, v.option_id, o.menu_item_id
         FROM item_option_values v
         JOIN item_options o ON o.id = v.option_id
         WHERE v.id = ANY($1::int[])`,
        [allValueIds]
      );
      valueMap = new Map(vals.map((v) => [v.id, v]));
    }

    // Compute subtotal
    let subtotal = 0;
    const preparedItems = items.map((i) => {
      const dbItem = itemMap.get(i.menu_item_id);
      const basePrice = Number(dbItem.discount_price ?? dbItem.price);
      let optionDelta = 0;
      const optionsSnapshot = [];
      for (const opt of i.options || []) {
        const chosen = [];
        for (const vid of opt.value_ids || []) {
          const v = valueMap.get(vid);
          if (!v || v.menu_item_id !== dbItem.id) {
            throw new Error(`Invalid option value ${vid} for item ${dbItem.id}`);
          }
          optionDelta += Number(v.price_delta);
          chosen.push({ id: v.id, name: v.name, price_delta: Number(v.price_delta) });
        }
        if (chosen.length) optionsSnapshot.push({ option_id: opt.option_id, values: chosen });
      }
      const unit = basePrice + optionDelta;
      const lineTotal = unit * i.quantity;
      subtotal += lineTotal;
      return {
        menu_item_id: dbItem.id,
        name_snapshot: dbItem.name,
        price_snapshot: unit,
        quantity: i.quantity,
        subtotal: lineTotal,
        options_json: optionsSnapshot,
      };
    });

    const orderNumber = await nextOrderNumber(client, restaurantId);

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
        (restaurant_id, order_number, customer_name, customer_phone, customer_address,
         order_type, table_number, notes, subtotal, total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
       RETURNING *`,
      [
        restaurantId, orderNumber, customer_name, customer_phone,
        customer_address || null, order_type, table_number || null, notes || null,
        subtotal, subtotal,
      ]
    );
    const order = orderRows[0];

    for (const it of preparedItems) {
      await client.query(
        `INSERT INTO order_items
          (order_id, menu_item_id, name_snapshot, price_snapshot, quantity, subtotal, options_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          order.id, it.menu_item_id, it.name_snapshot, it.price_snapshot,
          it.quantity, it.subtotal, JSON.stringify(it.options_json),
        ]
      );
    }

    return order;
  });
}

async function listByRestaurant(restaurantId, { status, page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  const params = [restaurantId];
  let where = 'restaurant_id = $1';
  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }
  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT * FROM orders WHERE ${where}
     ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function findById(restaurantId, id) {
  const { rows } = await db.query(
    `SELECT * FROM orders WHERE id = $1 AND restaurant_id = $2`,
    [id, restaurantId]
  );
  if (!rows[0]) return null;
  const order = rows[0];
  const { rows: items } = await db.query(
    `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC`,
    [id]
  );
  return { ...order, items };
}

async function updateStatus(restaurantId, id, status) {
  const { rows } = await db.query(
    `UPDATE orders SET status = $1
     WHERE id = $2 AND restaurant_id = $3
     RETURNING *`,
    [status, id, restaurantId]
  );
  return rows[0];
}

async function todayStats(restaurantId) {
  const { rows } = await db.query(
    `SELECT status, COUNT(*)::int AS c
     FROM orders
     WHERE restaurant_id = $1 AND created_at::date = CURRENT_DATE
     GROUP BY status`,
    [restaurantId]
  );
  const stats = { pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 };
  for (const r of rows) stats[r.status] = r.c;
  return stats;
}

module.exports = { create, listByRestaurant, findById, updateStatus, todayStats };