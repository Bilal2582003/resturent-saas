function notFound(req, res) {
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).render('error', {
    title: 'Not found',
    message: 'The page you are looking for does not exist.',
  });
}

function errorHandler(err, req, res, _next) {
  console.error('🔥 Error:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  const status = err.status || 500;
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(status).json({ error: err.message || 'Server error' });
  }
  res.status(status).render('error', {
    title: 'Something went wrong',
    message: err.message || 'An unexpected error occurred.',
  });
}

module.exports = { notFound, errorHandler };