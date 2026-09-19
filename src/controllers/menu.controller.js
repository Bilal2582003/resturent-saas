const menuService = require('../services/menu.service');
const orderService = require('../services/order.service');
const restaurantRepo = require('../repositories/restaurant.repo');
const tableRepo = require('../repositories/table.repo');

/** Public menu page: /r/:slug */
async function publicMenu(req, res) {
  const data = await menuService.getPublicMenu(req.params.slug);
  if (!data) {
    return res.status(404).render('error', {
      title: 'Menu unavailable',
      message: 'This restaurant menu is unavailable.',
    });
  }
  const { restaurant, categories } = data;
  const tableNumber = req.query.table || null;

  res.render('menu/index', {
    layout: false, // menu is standalone — no dashboard chrome
    title: restaurant.name,
    restaurant,
    categories,
    tableNumber,
    settings: {
      theme: restaurant.theme || 'modern',
      primary_color: restaurant.primary_color || '#e63946',
      accent_color: restaurant.accent_color || '#1d3557',
      bg_color: restaurant.bg_color || '#ffffff',
      text_color: restaurant.text_color || '#111111',
      border_radius: restaurant.border_radius || 12,
      font_family: restaurant.font_family || 'Inter',
      button_style: restaurant.button_style || 'rounded',
      currency_symbol: restaurant.currency_symbol || 'Rs',
      show_cover: restaurant.show_cover !== false,
      show_search: restaurant.show_search !== false,
    },
  });
}

/** Item detail JSON — for modal */
async function itemDetail(req, res) {
  const rid = req.tenant.restaurantId;
  const id = parseInt(req.params.id, 10);
  const data = await menuService.getItemWithOptions(rid, id);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
}

/** Place order — JSON */
async function placeOrder(req, res) {
  const rid = req.tenant.restaurantId;
  try {
    const order = await orderService.createOrder(rid, req.body);
    res.json({ ok: true, order: { id: order.id, order_number: order.order_number, total: order.total } });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
}

/** Order status check (for confirmation page) */
async function orderStatus(req, res) {
  const rid = req.tenant.restaurantId;
  const id = parseInt(req.params.id, 10);
  const { rows } = await require('../config/db').query(
    `SELECT id, order_number, status, total, created_at FROM orders WHERE id = $1 AND restaurant_id = $2`,
    [id, rid]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
}

module.exports = { publicMenu, itemDetail, placeOrder, orderStatus };