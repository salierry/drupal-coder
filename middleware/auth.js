const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

/**
 * Generate JWT token for user
 */
function generateToken(userId, login) {
  return jwt.sign(
    { userId, login },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.token || req.headers['x-auth-token'];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Требуется авторизация',
      code: 'UNAUTHORIZED'
    });
  }
  
  // Remove Bearer prefix if present
  const cleanToken = token.replace('Bearer ', '');
  const decoded = verifyToken(cleanToken);
  
  if (!decoded) {
    return res.status(401).json({ 
      error: 'Неверный токен авторизации',
      code: 'INVALID_TOKEN'
    });
  }
  
  req.user = decoded;
  next();
}

/**
 * Optional auth middleware - sets user if token is valid, but doesn't require it
 */
function optionalAuthMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers['x-auth-token'];
  
  if (token) {
    const cleanToken = token.replace('Bearer ', '');
    const decoded = verifyToken(cleanToken);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  optionalAuthMiddleware,
  JWT_SECRET
};
