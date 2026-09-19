const authService = require('../services/auth.service');

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return redirectToLogin(req, res);
  const payload = authService.verifyToken(token);
  if (!payload) return redirectToLogin(req, res);
  req.user = payload;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return redirectToLogin(req, res);
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have access to this page.',
      });
    }
    next();
  };
}

function redirectToLogin(req, res) {
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.redirect('/login');
}

/** Attach user if logged in, but don't block. */
function attachUser(req, _res, next) {
  const token = req.cookies?.token;
  if (token) {
    const payload = authService.verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}

module.exports = { requireAuth, requireRole, attachUser };