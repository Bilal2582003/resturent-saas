const router = require('express').Router();
const ctrl = require('../controllers/menu.controller');
const { resolveTenantBySlug } = require('../middleware/tenant');

router.get('/r/:slug', resolveTenantBySlug, ctrl.publicMenu);
router.get('/api/r/:slug/items/:id', resolveTenantBySlug, ctrl.itemDetail);
router.post('/api/r/:slug/orders', resolveTenantBySlug, ctrl.placeOrder);
router.get('/api/r/:slug/orders/:id', resolveTenantBySlug, ctrl.orderStatus);

module.exports = router;