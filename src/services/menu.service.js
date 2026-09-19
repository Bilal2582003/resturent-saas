const itemRepo = require('../repositories/item.repo');
const categoryRepo = require('../repositories/category.repo');
const optionRepo = require('../repositories/option.repo');
const restaurantRepo = require('../repositories/restaurant.repo');

async function getPublicMenu(slug) {
  const restaurant = await restaurantRepo.findBySlug(slug);
  if (!restaurant || restaurant.status !== 'active') return null;
  const categories = await itemRepo.getMenuForRestaurant(restaurant.id);
  return { restaurant, categories };
}

async function getItemWithOptions(restaurantId, itemId) {
  const item = await itemRepo.findById(restaurantId, itemId);
  if (!item) return null;
  const options = await optionRepo.listForItem(itemId);
  return { item, options };
}

module.exports = { getPublicMenu, getItemWithOptions };