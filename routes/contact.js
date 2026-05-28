const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { generateCredentials, hashPassword, validateFormData } = require('../utils/validators');
const { generateToken, optionalAuthMiddleware, authMiddleware } = require('../middleware/auth');

/**
 * POST /api/contact/submit
 * Submit contact form - creates new user for anonymous users or updates existing data for authenticated users
 * Accepts JSON or XML format
 */
router.post('/submit', optionalAuthMiddleware, async (req, res) => {
  try {
    let data = req.body;
    
    // Handle XML content type
    if (req.is('application/xml') || req.headers['content-type']?.includes('application/xml')) {
      // Simple XML parsing (for basic form data)
      const xmlString = typeof data === 'string' ? data : JSON.stringify(data);
      data = parseSimpleXML(xmlString);
    }
    
    // Validate form data
    const validation = validateFormData(data);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      let userId = req.user?.userId || null;
      let login = null;
      let password = null;
      let isNewUser = false;
      
      // If no user is authenticated, create a new user
      if (!userId) {
        const credentials = generateCredentials();
        const passwordHash = await hashPassword(credentials.password);
        
        const [userResult] = await connection.execute(
          'INSERT INTO users (login, password_hash) VALUES (?, ?)',
          [credentials.login, passwordHash]
        );
        
        userId = userResult.insertId;
        login = credentials.login;
        password = credentials.password;
        isNewUser = true;
      }
      
      // Insert form submission
      const [formResult] = await connection.execute(
        `INSERT INTO contact_forms (user_id, name, phone, email, message, form_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, data.name.trim(), data.phone.trim(), data.email?.trim() || null, data.message?.trim() || null, data.form_type || 'footer_contact']
      );
      
      await connection.commit();
      
      const response = {
        success: true,
        message: 'Форма успешно отправлена',
        submissionId: formResult.insertId,
        profileUrl: `/profile/${userId}`
      };
      
      // For new users, return credentials
      if (isNewUser) {
        response.login = login;
        response.password = password;
        response.message = 'Форма успешно отправлена. Сохраните ваши данные для входа:';
        
        // Set authentication cookie
        const token = generateToken(userId, login);
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          sameSite: 'strict'
        });
      }
      
      res.json(response);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обработке формы',
      details: error.message
    });
  }
});

/**
 * GET /api/contact/submissions
 * Get all submissions for authenticated user
 */
router.get('/submissions', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, phone, email, message, form_type, created_at, updated_at FROM contact_forms WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    
    res.json({
      success: true,
      submissions: rows
    });
    
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении данных'
    });
  }
});

/**
 * PUT /api/contact/submissions/:id
 * Update existing submission (authenticated users only)
 */
router.put('/submissions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, message } = req.body;
    
    // Validate updated data
    const validation = validateFormData({ name, phone, email, message });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }
    
    // Check if submission belongs to user
    const [existing] = await pool.execute(
      'SELECT * FROM contact_forms WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Запись не найдена или недоступна'
      });
    }
    
    // Update the submission (cannot change login/password as per requirements)
    await pool.execute(
      `UPDATE contact_forms 
       SET name = ?, phone = ?, email = ?, message = ? 
       WHERE id = ? AND user_id = ?`,
      [name.trim(), phone.trim(), email?.trim() || null, message?.trim() || null, id, req.user.userId]
    );
    
    res.json({
      success: true,
      message: 'Данные успешно обновлены'
    });
    
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении данных'
    });
  }
});

/**
 * DELETE /api/contact/submissions/:id
 * Delete a submission (authenticated users only)
 */
router.delete('/submissions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      'DELETE FROM contact_forms WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Запись не найдена или недоступна'
      });
    }
    
    res.json({
      success: true,
      message: 'Запись успешно удалена'
    });
    
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении записи'
    });
  }
});

/**
 * Simple XML parser for basic form data
 */
function parseSimpleXML(xmlString) {
  const result = {};
  const tagRegex = /<(\w+)>([^<]*)<\/\1>/g;
  let match;
  
  while ((match = tagRegex.exec(xmlString)) !== null) {
    result[match[1]] = match[2];
  }
  
  return result;
}

module.exports = router;
