/** Simple flash messages via cookies. */
function flash(req, res, next) {
  res.locals.flash = null;
  const raw = req.cookies?.flash;
  if (raw) {
    try { res.locals.flash = JSON.parse(decodeURIComponent(raw)); } catch {}
    res.clearCookie('flash');
  }
  res.setFlash = (type, message) => {
    res.cookie('flash', encodeURIComponent(JSON.stringify({ type, message })), {
      httpOnly: false, maxAge: 5000, sameSite: 'lax',
    });
  };
  next();
}

module.exports = { flash };