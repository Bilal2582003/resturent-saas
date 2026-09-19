const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { resolveTenantFromUser } = require('../middleware/tenant');
const { upload } = require('../middleware/upload');

router.use(requireAuth, requireRole('restaurant_admin'), resolveTenantFromUser);

router.get('/', ctrl.home);

// Menu
router.get('/menu', ctrl.menuPage);

// Categories
router.post('/categories', ctrl.createCategory);
router.post('/categories/reorder', ctrl.reorderCategories);
router.post('/categories/:id', ctrl.updateCategory);
router.post('/categories/:id/delete', ctrl.deleteCategory);

// Items
router.post('/items', upload.single('image'), ctrl.createItem);
router.post('/items/:id', upload.single('image'), ctrl.updateItem);
router.post('/items/:id/delete', ctrl.deleteItem);

// Options
router.get('/items/:id/options', ctrl.getItemOptions);
router.post('/items/:id/options', ctrl.createOption);
router.post('/items/:id/options/:optionId/values', ctrl.createOptionValue);
router.post('/items/:id/options/:optionId/delete', ctrl.deleteOption);
router.post('/items/:id/options/:optionId/values/:valueId/delete', ctrl.deleteOptionValue);

// Orders
router.get('/orders', ctrl.ordersPage);
router.get('/orders/:id', ctrl.orderDetail);
router.post('/orders/:id/status', ctrl.updateOrderStatus);

// Appearance
router.get('/appearance', ctrl.appearancePage);
router.post('/appearance', ctrl.updateAppearance);
router.post('/appearance/upload/:kind', upload.single('image'), ctrl.uploadBrandImage);

// Tables
router.get('/tables', ctrl.tablesPage);
router.post('/tables', ctrl.createTable);
router.post('/tables/:id/delete', ctrl.deleteTable);

module.exports = router;