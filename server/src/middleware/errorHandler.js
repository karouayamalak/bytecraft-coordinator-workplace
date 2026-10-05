export function errorHandler(err, req, res, next) {
  console.error('[SERVER_ERROR]', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'An unexpected internal server error occurred. Please try again.'
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || undefined
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
}
