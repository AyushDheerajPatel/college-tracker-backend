const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization ||
      req.headers.Authorization ||
      req.headers['x-auth-token'];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied',
      });
    }

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token is not valid or expired',
      error: error.message,
    });
  }
};

module.exports = authMiddleware;
