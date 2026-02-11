/**
 * Global Error Handler
 * Provides generic error responses in production to prevent information leakage.
 */
const errorHandler = (err, req, res, next) => {
    // Log full error for debugging
    console.error('Error:', err.stack || err.message);

    // Determine status code
    const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

    res.status(statusCode).json({
        message: process.env.NODE_ENV === 'production'
            ? 'An error occurred'
            : err.message,
        // Only include stack trace in development
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = errorHandler;
