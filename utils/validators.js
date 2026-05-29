const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique login and password for new user
 */
function generateCredentials() {
  const login = `user_${uuidv4().substring(0, 8)}`;
  const password = uuidv4().substring(0, 12);
  return { login, password };
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate form data
 */
function validateFormData(data) {
  const errors = [];
  
  // Name validation - required, min 2 characters
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Имя должно содержать минимум 2 символа' });
  }
  
  // Phone validation - required, must contain digits
  if (!data.phone || typeof data.phone !== 'string') {
    errors.push({ field: 'phone', message: 'Телефон обязателен для заполнения' });
  } else {
    // Remove all non-digit characters and check length
    const digitsOnly = data.phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      errors.push({ field: 'phone', message: 'Введите корректный номер телефона' });
    }
  }
  
  // Email validation - optional but must be valid if provided
  if (data.email && data.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push({ field: 'email', message: 'Введите корректный E-mail адрес' });
    }
  }
  
  // Message validation - optional but if provided should have min length
  if (data.message && data.message.trim().length > 0 && data.message.trim().length < 5) {
    errors.push({ field: 'message', message: 'Сообщение должно содержать минимум 5 символов' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  generateCredentials,
  hashPassword,
  comparePassword,
  validateFormData
};
