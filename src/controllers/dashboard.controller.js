const restaurantRepo = require('../repositories/restaurant.repo');
const categoryRepo = require('../repositories/category.repo');
const itemRepo = require('../repositories/item.repo');
const optionRepo = require('../repositories/option.repo');
const orderRepo = require('../repositories/order.repo');
const tableRepo = require('../repositories/table.repo');
const imageService = require('../services/image.service');

/* ---------------- Dashboard home ---------------- */

async function home(req, res) {
  const rid = req.tenant.restaurantId;
  const stats = await orderRepo.todayStats(rid);
  const recentOrders = await orderRepo.listByRestaurant(rid, { limit: 10 });
  res.render('dashboard/index', {
    title: 'Dashboard',
    restaurant: req.tenant.restaurant,
    stats,
    recentOrders,
  });
}

/* ---------------- Menu (categories + items) ---------------- */

async function menuPage(req, res) {
  const rid = req.tenant.restaurantId;
  const [categories, items] = await Promise.all([
    categoryRepo.listByRestaurant(rid),
    itemRepo.listByRestaurant(rid),
  ]);
  res.render('dashboard/menu', {
    title: 'Menu',
    restaurant: req.tenant.restaurant,
    categories,
    items,
  });
}

/* Categories */
async function createCategory(req, res) {
  const rid = req.tenant.restaurantId;
  const { name, parent_id, sort_order } = req.body;
  if (!name?.trim()) {
    res.setFlash?.('error', 'Category name required');
    return res.redirect('/dashboard/menu');
  }
  await categoryRepo.create(rid, {
    name: name.trim(),
    parent_id: parent_id ? parseInt(parent_id, 10) : null,
    sort_order: parseInt(sort_order, 10) || 0,
  });
  res.setFlash?.('success', 'Category created');
  res.redirect('/dashboard/menu');
}

async function updateCategory(req, res) {
  const rid = req.tenant.restaurantId;
  const id = parseInt(req.params.id, 10);
  const { name, parent_id, sort_order, is_active } = req.body;
  await categoryRepo.update(rid, id, {
    name: name?.trim(),
    parent_id: parent_id ? parseInt(parent_id, 10) : null,
    sort_order: parseInt(sort_order, 10) || 0,
    is_active: is_active === 'on' || is_active === 'true',
  });
  res.setFlash?.('success', 'Category updated');
  res.redirect('/dashboard/menu');
}

async function deleteCategory(req, res) {
  const rid = req.tenant.restaurantId;
  const id = parseInt(req.params.id, 10);
  await categoryRepo.remove(rid, id);
  res.setFlash?.('success', 'Category deleted');
  res.redirect('/dashboard/menu');
}

async function reorderCategories(req, res) {
  const rid = req.tenant.restaurantId;
  const ids = (req.body.ids || []).map((i) => parseInt(i, 10)).filter(Boolean);
  if (ids.length) await categoryRepo.reorder(rid, ids);
  res.json({ ok: true });
}

/* Items */
async function createItem(req, res) {
  const rid = req.tenant.restaurantId;
  const {
    category_id, name, description, price, discount_price,
    is_available, is_featured, badge, sort_order,
  } = req.body;

  if (!category_id || !name?.trim() || !price) {
    res.setFlash?.('error', 'Category, name and price are required');
    return res.redirect('/dashboard/menu');
  }

  let images = {};
  if (req.file) {
    images = await imageService.processMenuImage(req.file.buffer, rid, name);
  }

  await itemRepo.create(rid, {
    category_id: parseInt(category_id, 10),
    name: name.trim(),
    description: description?.trim() || null,
    price: parseFloat(price),
    discount_price: discount_price ? parseFloat(discount_price) : null,
    image_thumb: images.thumb || null,
    image_medium: images.medium || null,
    image_large: images.large || null,
    is_available: is_available === 'on' || is_available === 'true' || is_available === undefined,
    is_featured: is_featured === 'on' || is_featured === 'true',
    badge: badge || null,
    sort_order: parseInt(sort_order, 10) || 0,
  });

  res.setFlash?.('success', 'Item created');
  res.redirect('/dashboard/menu');
}

async function updateItem(req, res) {
  const rid = req.tenant.restaurantId;
  const id = parseInt(req.params.id, 10);
  const {
    category_id, name, description, price, discount_price,
    is_available, is_featured, badge, sort_order,
  } = req.body;

  const fields = {
    category_id: category_id ? parseInt(category_id, 10) : undefined,
    name: name?.trim(),
    description: description?.trim() || null,
    price: price ? parseFloat(price) : undefined,
    discount_price: discount_price ? parseFloat(discount_price) : null,
    is_available: is_available === 'on' || is_available === 'true',
    is_featured: is_featured === 'on' || is_featured === 'true',
    badge: badge || null,
    sort_order: parseInt(sort_order, 10) || 0,
  };
  Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

  if (req.file) {
    const images = await imageService.processMenuImage(req.file.buffer, rid, name || 'item');
    fields.image_thumb = images.thumb;
    fields.image_medium = images.medium;
    fields.image_large = images.large;
  }

  await itemRepo.update(rid, id, fields);
  res.setFlash?.('success', 'Item updated');
  res.redirect('/dashboard/menu');
}

async function deleteItem(req, res) {
  const rid = req.tenant.restaurantId;
  const id = parseInt(req.params.id, 10);
  await itemRepo.remove(rid, id);
  res.setFlash?.('success', 'Item deleted');
  res.redirect('/dashboard/menu');
}

/* Options (JSON API used by item editor) */
async function getItemOptions(req, res) {
  const rid = req.tenant.restaurantId;
  const itemId = parseInt(req.params.id, 10);
  const item = await itemRepo.findById(rid, itemId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const options = await optionRepo.listForItem(itemId);
  res.json({ item, options });
}

async function createOption(req, res) {
  const rid = req.tenant.restaurantId;
  const itemId = parseInt(req.params.id, 10);
  const item = await itemRepo.findById(rid, itemId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const option = await optionRepo.createOption(itemId, req.body);
  res.json(option);
}

async function createOptionValue(req, res) {
  const rid = req.tenant.restaurantId;
  const itemId = parseInt(req.params.id, 10);
  const item = await itemRepo.findById(rid, itemId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const optId = parseInt(req.params.optionId, 10);
  const value = await optionRepo.createValue(optId, req.body);
  res.json(value);
}

async function deleteOption(req, res) {
  const rid = req.tenant.restaurantId;
  const itemId = parseInt(req.params.id, 10);
  const optionId = parseInt(req.params.optionId, 10);
  await optionRepo.deleteOption(itemId, optionId);
  res.json({ ok: true });
}

async function deleteOptionValue(req, res) {
  const optionId = parseInt(req.params.optionId, 10);
  const valueId = parseInt(req.params.valueId, 10);
  await optionRepo.deleteValue(optionId, valueId);
  res.json({ ok: true });
}

/* ---------------- Orders ---------------- */

async function ordersPage(req, res) {
  const rid = req.tenant.restaurantId;
  const status = req.query.status || null;
  const orders = await orderRepo.listByRestaurant(rid, { status, limit: 100 });
  const stats = await orderRepo.todayStats(rid);
  res.render('dashboard/orders', {
    title: 'Orders',
    restaurant: req.tenant.restaurant,
    orders,
    stats,
    activeStatus: status,
  });
}

async function orderDetail(req, res) {
  const rid = req.tenant.restaurantId;
  const id = parseInt(req.params.id, 10);
  const order = await orderRepo.findById(rid, id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
}

async function updateOrderStatus(req, res) {
  const rid = req.tenant.restaurantId;
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  const allowed = ['pending','preparing','ready','completed','cancelled'];
  if (!allowed.includes(status)) {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    res.setFlash?.('error', 'Invalid status');
    return res.redirect('/dashboard/orders');
  }
  const updated = await orderRepo.updateStatus(rid, id, status);
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.json(updated);
  }
  res.setFlash?.('success', `Order marked ${status}`);
  res.redirect('/dashboard/orders');
}

/* ---------------- Appearance (settings) ---------------- */

async function appearancePage(req, res) {
  const rid = req.tenant.restaurantId;
  const settings = await restaurantRepo.getSettings(rid);
  res.render('dashboard/appearance', {
    title: 'Appearance',
    restaurant: req.tenant.restaurant,
    settings,
  });
}

async function updateAppearance(req, res) {
  const rid = req.tenant.restaurantId;
  await restaurantRepo.updateSettings(rid, req.body);
  // Also allow updating restaurant name/logo via separate form
  res.setFlash?.('success', 'Appearance saved');
  res.redirect('/dashboard/appearance');
}

async function uploadBrandImage(req, res) {
  const rid = req.tenant.restaurantId;
  const kind = req.params.kind; // 'logo' | 'cover'
  if (!['logo','cover'].includes(kind)) return res.status(400).json({ error: 'Invalid kind' });
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const imageService = require('../services/image.service');
  const url = await imageService.processBrandImage(req.file.buffer, rid, kind);
  const field = kind === 'logo' ? 'logo_url' : 'cover_url';
  await restaurantRepo.update(rid, { [field]: url });
  res.json({ url });
}

/* ---------------- Tables ---------------- */

async function tablesPage(req, res) {
  const rid = req.tenant.restaurantId;
  const tables = await tableRepo.list(rid);
  res.render('dashboard/tables', {
    title: 'Tables',
    restaurant: req.tenant.restaurant,
    tables,
  });
}

async function createTable(req, res) {
  const rid = req.tenant.restaurantId;
  const { table_number, label } = req.body;
  if (!table_number?.trim()) {
    res.setFlash?.('error', 'Table number required');
    return res.redirect('/dashboard/tables');
  }
  await tableRepo.create(rid, { table_number: table_number.trim(), label });
  res.setFlash?.('success', 'Table created');
  res.redirect('/dashboard/tables');
}

async function deleteTable(req, res) {
  const rid = req.tenant.restaurantId;
  const id = parseInt(req.params.id, 10);
  await tableRepo.remove(rid, id);
  res.setFlash?.('success', 'Table deleted');
  res.redirect('/dashboard/tables');
}

module.exports = {
  home,
  menuPage,
  createCategory, updateCategory, deleteCategory, reorderCategories,
  createItem, updateItem, deleteItem,
  getItemOptions, createOption, createOptionValue, deleteOption, deleteOptionValue,
  ordersPage, orderDetail, updateOrderStatus,
  appearancePage, updateAppearance, uploadBrandImage,
  tablesPage, createTable, deleteTable,
};