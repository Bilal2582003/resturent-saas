const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { attachUser } = require('../middleware/auth');

router.get('/login', attachUser, ctrl.showLogin);
router.post('/login', ctrl.doLogin);
router.post('/logout', ctrl.logout);

module.exports = router;