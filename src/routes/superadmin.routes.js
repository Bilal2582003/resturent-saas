const router = require('express').Router();
const ctrl = require('../controllers/superadmin.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('super_admin'));

router.get('/', ctrl.dashboard);

router.get('/restaurants', ctrl.listRestaurants);
router.get('/restaurants/new', ctrl.showCreateForm);
router.post('/restaurants', ctrl.createRestaurant);
router.get('/restaurants/:id/edit', ctrl.showEditForm);
router.post('/restaurants/:id', ctrl.updateRestaurant);
router.post('/restaurants/:id/toggle', ctrl.toggleStatus);
router.post('/restaurants/:id/delete', ctrl.deleteRestaurant);
router.post('/restaurants/:id/qr', ctrl.generateQr);

module.exports = router;