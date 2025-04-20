/**
 * Alerts Routes
 * ------------
 * Handles alert retrieval and management
 */

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const db = new sqlite3.Database(path.resolve(__dirname, '../database.db'));

// Get all alerts with filtering options
router.get('/', (req, res) => {
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

// Get recent alerts
router.get('/recent', (req, res) => {
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

// Acknowledge an alert
router.post('/:id/acknowledge', (req, res) => {
  const alertId = req.params.id;
  const userId = req.user.id;
  
  db.run(
    "UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?",
    [userId, alertId],
    function(err) {
      if (err) {
        console.error("Error acknowledging alert:", err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      res.json({ message: 'Alert acknowledged successfully' });
    }
  );
});

// Get alert statistics
router.get('/stats', (req, res) => {
  const timeRange = req.query.timeRange || '24h';
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
      timeAgo = new Date(now - 24 * 60 * 60 * 1000);
  }
  
  db.all(
    `SELECT severity, COUNT(*) as count FROM alerts 
     WHERE timestamp > ? 
     GROUP BY severity`,
    [timeAgo.toISOString()],
    (err, severityCounts) => {
      if (err) {
        console.error("Error fetching alert stats:", err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      db.all(
        `SELECT device_type, COUNT(*) as count FROM alerts 
         WHERE timestamp > ? 
         GROUP BY device_type`,
        [timeAgo.toISOString()],
        (err, deviceTypeCounts) => {
          if (err) {
            console.error("Error fetching alert stats:", err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          
          res.json({
            totalAlerts: severityCounts.reduce((sum, item) => sum + item.count, 0),
            bySeverity: severityCounts,
            byDeviceType: deviceTypeCounts
          });
        }
      );
    }
  );
});

module.exports = router;