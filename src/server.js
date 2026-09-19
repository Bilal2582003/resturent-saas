const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const expressLayouts = require('express-ejs-layouts');

const env = require('./config/env');
const { attachUser } = require('./middleware/auth');
const { flash } = require('./middleware/flash');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

/* ---------- View engine ---------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

/* ---------- Security & basics ---------- */
app.use(helmet({
  contentSecurityPolicy: false, // adjust later for CDNs
}));
app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser(env.cookieSecret));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: env.isProd ? '7d' : 0 }));

/* ---------- Rate limits ---------- */
app.use('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/r/:slug/orders', rateLimit({ windowMs: 60 * 1000, max: 20 }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 120 }));

/* ---------- Locals, flash, user ---------- */
app.use(flash);
app.use(attachUser);
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.baseUrl = env.baseUrl;
  next();
});

/* ---------- Routes ---------- */
app.get('/', (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role === 'super_admin') return res.redirect('/admin');
  if (req.user.role === 'restaurant_admin') return res.redirect('/dashboard');
  res.redirect('/login');
});

app.use('/', require('./routes/auth.routes'));
app.use('/admin', require('./routes/superadmin.routes'));
app.use('/dashboard', require('./routes/dashboard.routes'));
app.use('/', require('./routes/menu.routes'));

/* ---------- Errors ---------- */
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`✅ QR Menu SaaS running on ${env.baseUrl} (port ${env.port})`);
});