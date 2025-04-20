

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const http = require('http');
const socketIo = require('socket.io');
const { Kafka } = require('kafkajs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuration
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-should-be-stored-securely';
const DB_PATH = path.resolve(__dirname, 'database.db');

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());

// Initialize database
const db = new sqlite3.Database(DB_PATH);

// Create tables if they don't exist
db.serialize(() => {
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
  
  // Create admin user if none exists
  db.get("SELECT * FROM users WHERE role = 'admin' LIMIT 1", async (err, row) => {
    if (err) {
      console.error("Error checking for admin user:", err);
      return;
    }
    
    if (!row) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.run(
        "INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)",
        ["admin", hashedPassword, "admin", "admin@example.com"],
        (err) => {
          if (err) {
            console.error("Error creating default admin user:", err);
          } else {
            console.log("Default admin user created");
          }
        }
      );
    }
  });
});

// Connect to Kafka
const kafka = new Kafka({
  clientId: 'security-dashboard',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'dashboard-group' });

// Start consuming messages from Kafka
const setupKafkaConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'iot_alerts', fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const alert = JSON.parse(message.value.toString());
        console.log(`Received alert: ${JSON.stringify(alert)}`);
        
        // Emit the alert to all connected clients
        io.emit('new_alert', alert);
      },
    });
    
    console.log('Kafka consumer connected');
  } catch (error) {
    console.error('Error setting up Kafka consumer:', error);
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
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

app.post('/api/auth/register', authenticateToken, authorize(['admin']), async (req, res) => {
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

// User Routes
app.get('/api/users/profile', authenticateToken, (req, res) => {
  db.get(
    "SELECT id, username, role, email, created_at, last_login FROM users WHERE id = ?",
    [req.user.id],
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

app.put('/api/users/profile', authenticateToken, async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  
  // If updating password, verify current password
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    }
    
    // Verify current password
    db.get("SELECT password FROM users WHERE id = ?", [userId], async (err, user) => {
      if (err || !user) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId],
        (err) => {
          if (err) {
            console.error("Error updating password:", err);
            return res.status(500).json({ error: 'Failed to update password' });
          }
          
          res.json({ message: 'Password updated successfully' });
        }
      );
    });
  } else if (email) {
    // Update email only
    db.run(
      "UPDATE users SET email = ? WHERE id = ?",
      [email, userId],
      (err) => {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Email already in use' });
          }
          console.error("Error updating email:", err);
          return res.status(500).json({ error: 'Failed to update email' });
        }
        
        res.json({ message: 'Profile updated successfully' });
      }
    );
  } else {
    res.status(400).json({ error: 'No updateable fields provided' });
  }
});

// Settings Routes
app.get('/api/settings', authenticateToken, (req, res) => {
  db.get(
    "SELECT * FROM user_settings WHERE user_id = ?",
    [req.user.id],
    (err, settings) => {
      if (err) {
        console.error("Error fetching settings:", err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      // If no settings exist, create default settings
      if (!settings) {
        const defaultSettings = {
          notifications: JSON.stringify({
            email: true,
            sms: false,
            slack: false,
            criticalOnly: false
          }),
          theme: 'light',
          dashboard_layout: JSON.stringify({
            widgets: ['alerts', 'devices', 'stats']
          })
        };
        
        db.run(
          "INSERT INTO user_settings (user_id, notifications, theme, dashboard_layout) VALUES (?, ?, ?, ?)",
          [req.user.id, defaultSettings.notifications, defaultSettings.theme, defaultSettings.dashboard_layout],
          function(err) {
            if (err) {
              console.error("Error creating default settings:", err);
              return res.status(500).json({ error: 'Internal server error' });
            }
            
            res.json({
              ...defaultSettings,
              notifications: JSON.parse(defaultSettings.notifications),
              dashboard_layout: JSON.parse(defaultSettings.dashboard_layout)
            });
          }
        );
      } else {
        // Parse JSON fields
        try {
          settings.notifications = JSON.parse(settings.notifications);
          settings.dashboard_layout = JSON.parse(settings.dashboard_layout);
          res.json(settings);
        } catch (e) {
          console.error("Error parsing settings JSON:", e);
          res.status(500).json({ error: 'Error parsing settings' });
        }
      }
    }
  );
});

app.post('/api/settings', authenticateToken, (req, res) => {
  const { notifications, theme, dashboard_layout } = req.body;
  
  // Validate and stringify JSON fields
  const notificationsStr = notifications ? JSON.stringify(notifications) : null;
  const dashboardLayoutStr = dashboard_layout ? JSON.stringify(dashboard_layout) : null;
  
  db.run(
    `UPDATE user_settings 
     SET notifications = COALESCE(?, notifications),
         theme = COALESCE(?, theme),
         dashboard_layout = COALESCE(?, dashboard_layout)
     WHERE user_id = ?`,
    [notificationsStr, theme, dashboardLayoutStr, req.user.id],
    function(err) {
      if (err) {
        console.error("Error updating settings:", err);
        return res.status(500).json({ error: 'Failed to update settings' });
      }
      
      if (this.changes === 0) {
        // Settings don't exist yet, create them
        db.run(
          "INSERT INTO user_settings (user_id, notifications, theme, dashboard_layout) VALUES (?, ?, ?, ?)",
          [req.user.id, notificationsStr, theme, dashboardLayoutStr],
          (err) => {
            if (err) {
              console.error("Error creating settings:", err);
              return res.status(500).json({ error: 'Failed to create settings' });
            }
            
            res.json({ message: 'Settings saved successfully' });
          }
        );
      } else {
        res.json({ message: 'Settings updated successfully' });
      }
    }
  );
});

// Analytics and Data Routes
app.get('/api/stats', authenticateToken, (req, res) => {
  // In a real implementation, this would query the device and alert databases
  // For this example, we'll return mock data
  res.json({
    devices: {
      total: 48,
      online: 42,
      offline: 6,
      alerting: 3
    },
    alerts: {
      total: 17,
      critical: 1,
      high: 3,
      medium: 8,
      low: 5
    },
    activity: [
      { time: '00:00', alerts: 0 },
      { time: '01:00', alerts: 2 },
      { time: '02:00', alerts: 1 },
      { time: '03:00', alerts: 0 },
      { time: '04:00', alerts: 1 },
      { time: '05:00', alerts: 3 },
      { time: '06:00', alerts: 5 },
      { time: '07:00', alerts: 6 },
      { time: '08:00', alerts: 10 },
      { time: '09:00', alerts: 8 },
      { time: '10:00', alerts: 12 },
      { time: '11:00', alerts: 14 },
      { time: '12:00', alerts: 16 }
    ]
  });
});

app.get('/api/alerts', authenticateToken, (req, res) => {
  const { severity, acknowledged, timeRange, limit } = req.query;
  const queryLimit = limit || 50;
  
  // Build query conditions
  let conditions = [];
  let params = [];
  
  if (severity && severity !== 'all') {
    conditions.push('severity = ?');
    params.push(severity);
  }
  
  if (acknowledged && acknowledged !== 'all') {
    conditions.push('acknowledged = ?');
    params.push(acknowledged === 'true' ? 1 : 0);
  }
  
  if (timeRange) {
    let timeAgo;
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        timeAgo = new Date(now - 60 * 60 * 1000);
        break;
      case '6h':
        timeAgo = new Date(now - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        timeAgo = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeAgo = new Date(now - 24 * 60 * 60 * 1000); // Default to 24h
    }
    
    conditions.push('timestamp > ?');
    params.push(timeAgo.toISOString());
  }
  
  // Construct the SQL query
  let query = "SELECT * FROM alerts";
  
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(' AND ');
  }
  
  query += " ORDER BY timestamp DESC LIMIT ?";
  params.push(queryLimit);
  
  // Execute query
  db.all(query, params, (err, alerts) => {
    if (err) {
      console.error("Error fetching alerts:", err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.json(alerts);
  });
});

app.get('/api/alerts/recent', authenticateToken, (req, res) => {
  const limit = req.query.limit || 5;
  
  db.all(
    "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?",
    [limit],
    (err, alerts) => {
      if (err) {
        console.error("Error fetching recent alerts:", err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      res.json(alerts);
    }
  );
});

app.post('/api/alerts/:id/acknowledge', authenticateToken, (req, res) => {
  const alertId = req.params.id;
  
  db.run(
    "UPDATE alerts SET acknowledged = 1 WHERE id = ?",
    [alertId],
    function(err) {
      if (err) {
        console.error("Error acknowledging alert:", err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      // Emit alert update to all connected clients
      io.emit('alert_updated', { id: alertId, acknowledged: true });
      
      res.json({ message: 'Alert acknowledged successfully' });
    }
  );
});

app.get('/api/devices', authenticateToken, (req, res) => {
  const { type, status } = req.query;
  
  // Build query conditions
  let conditions = [];
  let params = [];
  
  if (type && type !== 'all') {
    conditions.push('device_type = ?');
    params.push(type);
  }
  
  if (status && status !== 'all') {
    if (status === 'alerting') {
      conditions.push('is_alerting = 1');
    } else {
      conditions.push('status = ?');
      params.push(status);
    }
  }
  
  // Construct the SQL query
  let query = "SELECT * FROM devices";
  
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(' AND ');
  }
  
  // Execute query
  db.all(query, params, (err, devices) => {
    if (err) {
      console.error("Error fetching devices:", err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.json(devices);
  });
});

app.get('/api/analytics', authenticateToken, (req, res) => {
  const { timeRange } = req.query;
  
  // In a real implementation, this would query the database for analytics data
  // For this example, we'll return mock data
  res.json({
    alerts: [
      { date: '2025-04-11', alerts: 5 },
      { date: '2025-04-12', alerts: 8 },
      { date: '2025-04-13', alerts: 3 },
      { date: '2025-04-14', alerts: 7 },
      { date: '2025-04-15', alerts: 12 },
      { date: '2025-04-16', alerts: 15 },
      { date: '2025-04-17', alerts: 10 }
    ],
    devices: [
      { date: '2025-04-11', online: 42, offline: 6 },
      { date: '2025-04-12', online: 43, offline: 5 },
      { date: '2025-04-13', online: 40, offline: 8 },
      { date: '2025-04-14', online: 41, offline: 7 },
      { date: '2025-04-15', online: 44, offline: 4 },
      { date: '2025-04-16', online: 43, offline: 5 },
      { date: '2025-04-17', online: 42, offline: 6 }
    ],
    alertTypes: [
      { type: 'Network Anomaly', count: 22 },
      { type: 'Unusual Mouse Movement', count: 15 },
      { type: 'Unusual Typing Pattern', count: 18 },
      { type: 'Temperature Anomaly', count: 8 },
      { type: 'Motion Anomaly', count: 12 }
    ],
    deviceTypes: [
      { type: 'Keyboard', count: 12 },
      { type: 'Mouse', count: 12 },
      { type: 'Router', count: 3 },
      { type: 'Switch', count: 5 },
      { type: 'Temperature Sensor', count: 8 },
      { type: 'Motion Sensor', count: 8 }
    ]
  });
});

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start Kafka consumer
  await setupKafkaConsumer();
});

module.exports = app;