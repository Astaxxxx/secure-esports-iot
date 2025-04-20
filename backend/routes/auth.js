/**
 * Authentication Routes
 * --------------------
 * Handles user authentication and registration
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const db = new sqlite3.Database(path.resolve(__dirname, '../database.db'));

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-should-be-stored-securely';

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    try {
      const match = await bcrypt.compare(password, user.password);
      
      if (!match) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Update last login time
      db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Register route (admin only)
router.post('/register', async (req, res) => {
  const { username, password, role, email } = req.body;
  
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      "INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, role, email],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username or email already exists' });
          }
          console.error("Error registering user:", err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        // Create user settings
        db.run(
          "INSERT INTO user_settings (user_id) VALUES (?)",
          [this.lastID]
        );
        
        res.status(201).json({ message: 'User registered successfully' });
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile route
router.get('/profile', (req, res) => {
  const userId = req.user.id;
  
  db.get(
    "SELECT id, username, role, email, created_at, last_login FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        console.error("Error fetching user profile:", err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    }
  );
});

module.exports = router;