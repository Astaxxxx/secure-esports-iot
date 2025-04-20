/**
 * Input Validation Middleware
 * --------------------------
 * Validates request data
 */

// Validate login input
const validateLogin = (req, res, next) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    next();
  };
  
  // Validate user registration input
  const validateRegistration = (req, res, next) => {
    const { username, password, role, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (!role || !['admin', 'user', 'analyst'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }
    
    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    next();
  };
  
  // Email validation helper
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  module.exports = {
    validateLogin,
    validateRegistration
  };