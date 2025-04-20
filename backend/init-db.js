/**
 * Database Initialization for the Secure IoT Monitoring System
 * --------------------------------------------------------
 * This script initializes the SQLite databases and creates default user accounts
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.resolve(__dirname, 'database.db');

// Create database directory if it doesn't exist
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(DB_PATH);

// Create tables
db.serialize(async () => {
  console.log('Initializing database...');

  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )
  `);
  
  // User settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      notifications TEXT,
      theme TEXT DEFAULT 'light',
      dashboard_layout TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // Devices table
  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      device_type TEXT NOT NULL,
      public_key TEXT,
      status TEXT DEFAULT 'active',
      last_seen TEXT,
      location TEXT,
      ip_address TEXT,
      is_alerting INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Alerts table
  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      device_type TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT,
      timestamp TEXT NOT NULL,
      data TEXT,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_by INTEGER,
      acknowledged_at TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (acknowledged_by) REFERENCES users(id)
    )
  `);
  
  // Create default admin user if none exists
  db.get("SELECT * FROM users WHERE role = 'admin' LIMIT 1", async (err, row) => {
    if (err) {
      console.error("Error checking for admin user:", err);
      return;
    }
    
    if (!row) {
      try {
        // Create default admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        db.run(
          "INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)",
          ["admin", hashedPassword, "admin", "admin@example.com"],
          (err) => {
            if (err) {
              console.error("Error creating default admin user:", err);
            } else {
              console.log("Default admin user created (username: admin, password: admin123)");
            }
          }
        );
      } catch (error) {
        console.error("Error hashing password:", error);
      }
    } else {
      console.log("Admin user already exists");
    }
  });
  
  console.log("Database initialization complete");
});