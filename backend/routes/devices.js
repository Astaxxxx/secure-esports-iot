/**
 * Devices Routes
 * -------------
 * Handles device management and data
 */

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const db = new sqlite3.Database(path.resolve(__dirname, '../database.db'));

// Get all devices with filtering options
router.get('/', (req, res) => {
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

// Get a specific device
router.get('/:id', (req, res) => {
  const deviceId = req.params.id;
  
  db.get(
    "SELECT * FROM devices WHERE id = ?",
    [deviceId],
    (err, device) => {
      if (err) {
        console.error("Error fetching device:", err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      res.json(device);
    }
  );
});

// Update device status
router.put('/:id/status', (req, res) => {
  const deviceId = req.params.id;
  const { status } = req.body;
  
  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (active/inactive) is required' });
  }
  
  db.run(
    "UPDATE devices SET status = ? WHERE id = ?",
    [status, deviceId],
    function(err) {
      if (err) {
        console.error("Error updating device status:", err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      res.json({ message: 'Device status updated successfully' });
    }
  );
});

// Get device statistics
router.get('/stats', (req, res) => {
  db.get(
    "SELECT COUNT(*) as total FROM devices",
    [],
    (err, totalResult) => {
      if (err) {
        console.error("Error fetching device stats:", err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      db.all(
        "SELECT device_type, COUNT(*) as count FROM devices GROUP BY device_type",
        [],
        (err, typeResults) => {
          if (err) {
            console.error("Error fetching device stats:", err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          
          db.all(
            "SELECT status, COUNT(*) as count FROM devices GROUP BY status",
            [],
            (err, statusResults) => {
              if (err) {
                console.error("Error fetching device stats:", err);
                return res.status(500).json({ error: 'Internal server error' });
              }
              
              res.json({
                total: totalResult.total,
                byType: typeResults,
                byStatus: statusResults
              });
            }
          );
        }
      );
    }
  );
});

module.exports = router;