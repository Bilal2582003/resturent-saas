const authService = require('../services/auth.service');

function showLogin(req, res) {
  if (req.user) return res.redirect(redirectFor(req.user.role));
  res.render('auth/login', { title: 'Sign in', layout: 'layouts/main' });
}

async function doLogin(req, res) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  if (!result) {
    res.setFlash?.('error', 'Invalid email or password');
    return res.redirect('/login');
  }
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });
  res.redirect(redirectFor(result.user.role));
}

function logout(req, res) {
  res.clearCookie('token');
  res.redirect('/login');
}

function redirectFor(role) {
  if (role === 'super_admin') return '/admin';
  if (role === 'restaurant_admin') return '/dashboard';
  return '/';
}

module.exports = { showLogin, doLogin, logout };