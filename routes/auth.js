const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { comparePassword, hashPassword } = require('../utils/validators');
const { generateToken, verifyToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Login with generated credentials
 */
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    if (!login || !password) {
      return res.status(400).json({
        success: false,
        error: 'Логин и пароль обязательны'
      });
    }
    
    // Find user by login
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE login = ?',
      [login]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль'
      });
    }
    
    const user = users[0];
    
    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль'
      });
    }
    
    // Generate token
    const token = generateToken(user.id, user.login);
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'strict'
    });
    
    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      token,
      user: {
        id: user.id,
        login: user.login
      },
      profileUrl: `/profile/${user.id}`
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при входе'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Выход выполнен успешно'
  });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token || req.headers['x-auth-token'];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация'
      });
    }
    
    const cleanToken = token.replace('Bearer ', '');
    const decoded = verifyToken(cleanToken);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Неверный токен'
      });
    }
    
    const [users] = await pool.execute(
      'SELECT id, login, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    res.json({
      success: true,
      user: users[0]
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении данных пользователя'
    });
  }
});

module.exports = router;
