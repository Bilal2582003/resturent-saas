const restaurantRepo = require('../repositories/restaurant.repo');
const userRepo = require('../repositories/user.repo');
const authService = require('../services/auth.service');

async function dashboard(req, res) {
  const stats = await restaurantRepo.stats();
  const { items: recentRestaurants } = await restaurantRepo.list({ limit: 5 });
  res.render('superadmin/dashboard', {
    title: 'Super Admin',
    stats,
    recentRestaurants,
  });
}

async function listRestaurants(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const search = req.query.search || '';
  const { items, total } = await restaurantRepo.list({ page, search, limit: 20 });
  res.render('superadmin/restaurants', {
    title: 'Restaurants',
    restaurants: items,
    total,
    page,
    search,
    limit: 20,
  });
}

function showCreateForm(req, res) {
  res.render('superadmin/restaurant-form', {
    title: 'New Restaurant',
    restaurant: null,
  });
}

async function createRestaurant(req, res) {
  const { name, slug, phone, address, admin_email, admin_password } = req.body;
  if (!name || !slug || !admin_email || !admin_password) {
    res.setFlash?.('error', 'Name, slug, admin email and password are required');
    return res.redirect('/admin/restaurants/new');
  }
  // Uniqueness checks
  const existing = await restaurantRepo.findBySlug(slug);
  if (existing) {
    res.setFlash?.('error', 'That slug is already taken');
    return res.redirect('/admin/restaurants/new');
  }
  const userExisting = await userRepo.findByEmail(admin_email);
  if (userExisting) {
    res.setFlash?.('error', 'That email is already in use');
    return res.redirect('/admin/restaurants/new');
  }

  const restaurant = await restaurantRepo.create({ name, slug, phone, address });

  const password_hash = await authService.hashPassword(admin_password);
  await userRepo.create({
    email: admin_email,
    password_hash,
    role: 'restaurant_admin',
    restaurant_id: restaurant.id,
  });

  res.setFlash?.('success', `Restaurant "${name}" created.`);
  res.redirect('/admin/restaurants');
}

function showEditForm(req, res, next) {
  Promise.all([
    restaurantRepo.findById(req.params.id),
    restaurantRepo.getSettings(req.params.id),
    userRepo.listByRestaurant(req.params.id),
  ])
    .then(([restaurant, settings, admins]) => {
      if (!restaurant) return next();
      res.render('superadmin/restaurant-form', {
        title: 'Edit Restaurant',
        restaurant,
        settings,
        admins,
      });
    })
    .catch(next);
}

async function updateRestaurant(req, res) {
  const id = parseInt(req.params.id, 10);
  const { name, slug, phone, address, status } = req.body;
  await restaurantRepo.update(id, { name, slug, phone, address, status });
  res.setFlash?.('success', 'Restaurant updated');
  res.redirect(`/admin/restaurants/${id}/edit`);
}

async function toggleStatus(req, res) {
  const id = parseInt(req.params.id, 10);
  const restaurant = await restaurantRepo.findById(id);
  if (!restaurant) return res.status(404).json({ error: 'Not found' });
  const newStatus = restaurant.status === 'active' ? 'suspended' : 'active';
  await restaurantRepo.update(id, { status: newStatus });
  res.setFlash?.('success', `Restaurant ${newStatus}`);
  res.redirect('/admin/restaurants');
}

async function deleteRestaurant(req, res) {
  const id = parseInt(req.params.id, 10);
  await restaurantRepo.remove(id);
  res.setFlash?.('success', 'Restaurant deleted');
  res.redirect('/admin/restaurants');
}

async function generateQr(req, res) {
  const qrService = require('../services/qr.service');
  const id = parseInt(req.params.id, 10);
  const restaurant = await restaurantRepo.findById(id);
  if (!restaurant) return res.status(404).json({ error: 'Not found' });
  const table = req.body.table_number || null;
  const result = await qrService.generateForRestaurant(restaurant, table);
  res.setFlash?.('success', 'QR generated');
  res.redirect(`/admin/restaurants/${id}/edit`);
}

module.exports = {
  dashboard, listRestaurants, showCreateForm, createRestaurant,
  showEditForm, updateRestaurant, toggleStatus, deleteRestaurant, generateQr,
};