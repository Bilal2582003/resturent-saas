const restaurantRepo = require('../repositories/restaurant.repo');

/**
 * For public menu routes: /r/:slug
 * Resolves the restaurant and attaches req.tenant = { restaurantId, restaurant }.
 */
async function resolveTenantBySlug(req, res, next) {
  try {
    const slug = req.params.slug;
    if (!slug) return next();
    const restaurant = await restaurantRepo.findBySlug(slug);
    if (!restaurant || restaurant.status !== 'active') {
      return res.status(404).render('error', {
        title: 'Restaurant not found',
        message: 'This menu is unavailable or has been suspended.',
      });
    }
    req.tenant = { restaurantId: restaurant.id, restaurant };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * For admin dashboard: uses req.user.restaurant_id.
 * Keeps tenant resolution consistent.
 */
async function resolveTenantFromUser(req, res, next) {
  try {
    if (!req.user?.restaurant_id) return next();
    const restaurant = await restaurantRepo.findBySlug
      ? await restaurantRepo.findById(req.user.restaurant_id)
      : null;
    if (!restaurant) {
      return res.status(403).render('error', {
        title: 'No restaurant',
        message: 'Your account is not linked to a restaurant.',
      });
    }
    req.tenant = { restaurantId: restaurant.id, restaurant };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveTenantBySlug, resolveTenantFromUser };