const db = require('../config/db');

async function listForItem(menuItemId) {
  const { rows: options } = await db.query(
    `SELECT * FROM item_options WHERE menu_item_id = $1 ORDER BY sort_order ASC`,
    [menuItemId]
  );
  if (!options.length) return [];
  const ids = options.map((o) => o.id);
  const { rows: values } = await db.query(
    `SELECT * FROM item_option_values WHERE option_id = ANY($1::int[])
     ORDER BY sort_order ASC`,
    [ids]
  );
  const byOpt = new Map();
  for (const v of values) {
    if (!byOpt.has(v.option_id)) byOpt.set(v.option_id, []);
    byOpt.get(v.option_id).push(v);
  }
  return options.map((o) => ({ ...o, values: byOpt.get(o.id) || [] }));
}

async function createOption(menuItemId, { name, is_required = false, is_multi = true, sort_order = 0 }) {
  const { rows } = await db.query(
    `INSERT INTO item_options (menu_item_id, name, is_required, is_multi, sort_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [menuItemId, name, is_required, is_multi, sort_order]
  );
  return rows[0];
}

async function createValue(optionId, { name, price_delta = 0, is_default = false, sort_order = 0 }) {
  const { rows } = await db.query(
    `INSERT INTO item_option_values (option_id, name, price_delta, is_default, sort_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [optionId, name, price_delta, is_default, sort_order]
  );
  return rows[0];
}

async function deleteOption(menuItemId, optionId) {
  const { rowCount } = await db.query(
    `DELETE FROM item_options WHERE id = $1 AND menu_item_id = $2`,
    [optionId, menuItemId]
  );
  return rowCount > 0;
}

async function deleteValue(optionId, valueId) {
  const { rowCount } = await db.query(
    `DELETE FROM item_option_values WHERE id = $1 AND option_id = $2`,
    [valueId, optionId]
  );
  return rowCount > 0;
}

module.exports = {
  listForItem, createOption, createValue, deleteOption, deleteValue,
};