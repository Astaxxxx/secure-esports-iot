import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts';
import apiService from '../services/api.service';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
axios.defaults.withCredentials = true;

// Dashboard components
const Sidebar = ({ activeItem, setActiveItem }) => {
  const navigate = useNavigate();
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'alerts', label: 'Alerts', icon: '🚨' },
    { id: 'devices', label: 'Devices', icon: '💻' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };
  
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Esports Security</h2>
      </div>
      <div className="sidebar-menu">
        {menuItems.map(item => (
          <div 
            key={item.id}
            className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => setActiveItem(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

// Dashboard Header with real-time status
const Header = ({ activeItem }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState('Normal');
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="header">
      <div className="header-title">
        <h1>{activeItem.charAt(0).toUpperCase() + activeItem.slice(1)}</h1>
      </div>
      <div className="header-status">
        <div className={`status-indicator ${status.toLowerCase()}`}>
          System Status: {status}
        </div>
        <div className="time-display">
          {currentTime.toLocaleString()}
        </div>
      </div>
    </div>
  );
};

// Overview component
const Overview = () => {
  const [stats, setStats] = useState({
    devices: {
      total: 0,
      online: 0,
      offline: 0,
      alerting: 0
    },
    alerts: {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
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
  
  const [recentAlerts, setRecentAlerts] = useState([]);
  
  useEffect(() => {
    // In a real application, these would be API calls
    const fetchStats = async () => {
      try {
        // const response = await apiService.getStats();
        // setStats(response.data);
        
        // Simulate data for demo
        setStats({
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
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    const fetchRecentAlerts = async () => {
      try {
        // const response = await apiService.getRecentAlerts(5);
        // setRecentAlerts(response.data);
        
        // Simulate data for demo
        setRecentAlerts([
          { id: 1, device_id: 'kb-001', device_type: 'keyboard', alert_type: 'unusual_typing_pattern', severity: 'medium', timestamp: '2025-04-17T14:32:15', acknowledged: false },
          { id: 2, device_id: 'router-005', device_type: 'router', alert_type: 'network_anomaly', severity: 'critical', timestamp: '2025-04-17T14:30:22', acknowledged: false },
          { id: 3, device_id: 'mouse-003', device_type: 'mouse', alert_type: 'unusual_mouse_movement', severity: 'high', timestamp: '2025-04-17T14:28:45', acknowledged: false },
          { id: 4, device_id: 'temp-002', device_type: 'temp_sensor', alert_type: 'temperature_anomaly', severity: 'low', timestamp: '2025-04-17T14:25:10', acknowledged: true },
          { id: 5, device_id: 'motion-007', device_type: 'motion_sensor', alert_type: 'motion_anomaly', severity: 'medium', timestamp: '2025-04-17T14:20:35', acknowledged: true }
        ]);
      } catch (error) {
        console.error('Error fetching recent alerts:', error);
      }
    };
    
    fetchStats();
    fetchRecentAlerts();
    
    // Set up polling for real-time updates
    const statsPoll = setInterval(fetchStats, 30000);
    const alertsPoll = setInterval(fetchRecentAlerts, 10000);
    
    return () => {
      clearInterval(statsPoll);
      clearInterval(alertsPoll);
    };
  }, []);
  
  // Create data for pie chart
  const alertsBySeverity = [
    { name: 'Critical', value: stats.alerts.critical, color: '#ff0000' },
    { name: 'High', value: stats.alerts.high, color: '#ff8c00' },
    { name: 'Medium', value: stats.alerts.medium, color: '#ffcc00' },
    { name: 'Low', value: stats.alerts.low, color: '#2ecc71' }
  ];
  
  const deviceStatusData = [
    { name: 'Online', value: stats.devices.online, color: '#2ecc71' },
    { name: 'Offline', value: stats.devices.offline, color: '#95a5a6' },
    { name: 'Alerting', value: stats.devices.alerting, color: '#e74c3c' }
  ];
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  return (
    <div className="overview-container">
      <div className="stats-row">
        <div className="stat-card">
          <h3>Total Devices</h3>
          <div className="stat-value">{stats.devices.total}</div>
          <div className="stat-breakdown">
            <div className="stat-item online">{stats.devices.online} Online</div>
            <div className="stat-item offline">{stats.devices.offline} Offline</div>
            <div className="stat-item alerting">{stats.devices.alerting} Alerting</div>
          </div>
        </div>
        
        <div className="stat-card">
          <h3>Active Alerts</h3>
          <div className="stat-value">{stats.alerts.total}</div>
          <div className="stat-breakdown">
            <div className="stat-item critical">{stats.alerts.critical} Critical</div>
            <div className="stat-item high">{stats.alerts.high} High</div>
            <div className="stat-item medium">{stats.alerts.medium} Medium</div>
            <div className="stat-item low">{stats.alerts.low} Low</div>
          </div>
        </div>
      </div>
      
      <div className="charts-row">
        <div className="chart-card">
          <h3>Alert Activity (Last 12 Hours)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.activity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="alerts" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card">
          <h3>Alerts by Severity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={alertsBySeverity}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {alertsBySeverity.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="recent-alerts">
        <h3>Recent Alerts</h3>
        <div className="alerts-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Device</th>
                <th>Alert Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map(alert => (
                <tr key={alert.id} className={`alert-row ${alert.severity}`}>
                  <td>{formatTimestamp(alert.timestamp)}</td>
                  <td>{alert.device_id} ({alert.device_type})</td>
                  <td>{alert.alert_type.replace(/_/g, ' ')}</td>
                  <td>{alert.severity}</td>
                  <td>{alert.acknowledged ? 'Acknowledged' : 'New'}</td>
                  <td>
                    <button className="view-btn">View</button>
                    {!alert.acknowledged && (
                      <button className="ack-btn">Acknowledge</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Alerts component
const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState({
    severity: 'all',
    acknowledged: 'all',
    timeRange: '24h'
  });
  
  useEffect(() => {
    // In a real application, this would be an API call with filters
    const fetchAlerts = async () => {
      try {
        // const response = await apiService.getAlerts(filter);
        // setAlerts(response.data);
        
        // Simulate data for demo
        setAlerts([
          { id: 1, device_id: 'kb-001', device_type: 'keyboard', alert_type: 'unusual_typing_pattern', severity: 'medium', timestamp: '2025-04-17T14:32:15', acknowledged: false, description: 'Unusual typing pattern detected - potential automated input' },
          { id: 2, device_id: 'router-005', device_type: 'router', alert_type: 'network_anomaly', severity: 'critical', timestamp: '2025-04-17T14:30:22', acknowledged: false, description: 'Suspicious network traffic spike detected - possible DDoS attempt' },
          { id: 3, device_id: 'mouse-003', device_type: 'mouse', alert_type: 'unusual_mouse_movement', severity: 'high', timestamp: '2025-04-17T14:28:45', acknowledged: false, description: 'Unusual mouse movement pattern detected - potential automation' },
          { id: 4, device_id: 'temp-002', device_type: 'temp_sensor', alert_type: 'temperature_anomaly', severity: 'low', timestamp: '2025-04-17T14:25:10', acknowledged: true, description: 'Unusual temperature fluctuation detected in server area' },
          { id: 5, device_id: 'motion-007', device_type: 'motion_sensor', alert_type: 'motion_anomaly', severity: 'medium', timestamp: '2025-04-17T14:20:35', acknowledged: true, description: 'Motion detected in restricted area outside of authorized hours' },
          { id: 6, device_id: 'switch-002', device_type: 'switch', alert_type: 'network_anomaly', severity: 'high', timestamp: '2025-04-17T13:45:12', acknowledged: false, description: 'Unusual packet loss detected - potential hardware failure or tampering' },
          { id: 7, device_id: 'kb-004', device_type: 'keyboard', alert_type: 'unusual_typing_pattern', severity: 'low', timestamp: '2025-04-17T13:30:45', acknowledged: true, description: 'Unusual key combination sequence detected' },
          { id: 8, device_id: 'router-001', device_type: 'router', alert_type: 'network_anomaly', severity: 'critical', timestamp: '2025-04-17T12:22:33', acknowledged: false, description: 'Multiple failed authentication attempts detected - possible brute force attack' },
          { id: 9, device_id: 'temp-001', device_type: 'temp_sensor', alert_type: 'temperature_anomaly', severity: 'high', timestamp: '2025-04-17T11:48:21', acknowledged: true, description: 'Rapid temperature increase detected - potential cooling system failure' },
          { id: 10, device_id: 'mouse-002', device_type: 'mouse', alert_type: 'unusual_mouse_movement', severity: 'medium', timestamp: '2025-04-17T10:35:10', acknowledged: false, description: 'Unusual precision and speed in mouse movements detected' }
        ]);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };
    
    fetchAlerts();
    
    // Set up polling for real-time updates
    const alertsPoll = setInterval(fetchAlerts, 10000);
    
    return () => clearInterval(alertsPoll);
  }, [filter]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAcknowledge = async (alertId) => {
    try {
      // In a real application, this would be an API call
      // await apiService.acknowledgeAlert(alertId);
      
      // Update local state
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  return (
    <div className="alerts-container">
      <div className="filters-bar">
        <div className="filter-group">
          <label>Severity:</label>
          <select 
            name="severity" 
            value={filter.severity} 
            onChange={handleFilterChange}
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Status:</label>
          <select 
            name="acknowledged" 
            value={filter.acknowledged} 
            onChange={handleFilterChange}
          >
            <option value="all">All</option>
            <option value="false">New</option>
            <option value="true">Acknowledged</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Time Range:</label>
          <select 
            name="timeRange" 
            value={filter.timeRange} 
            onChange={handleFilterChange}
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>
      
      <div className="alerts-table-container">
        <table className="alerts-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Time</th>
              <th>Device</th>
              <th>Alert Type</th>
              <th>Severity</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(alert => (
              <tr key={alert.id} className={`alert-row ${alert.severity}`}>
                <td>{alert.id}</td>
                <td>{formatTimestamp(alert.timestamp)}</td>
                <td>{alert.device_id} ({alert.device_type})</td>
                <td>{alert.alert_type.replace(/_/g, ' ')}</td>
                <td>
                  <span className={`severity-badge ${alert.severity}`}>
                    {alert.severity}
                  </span>
                </td>
                <td>{alert.description}</td>
                <td>{alert.acknowledged ? 'Acknowledged' : 'New'}</td>
                <td>
                  <button className="view-btn">View Details</button>
                  {!alert.acknowledged && (
                    <button 
                      className="ack-btn"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Devices component
const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'all'
  });
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  useEffect(() => {
    // In a real application, this would be an API call
    const fetchDevices = async () => {
      try {
        // const response = await apiService.getDevices(filter);
        // setDevices(response.data);
        
        // Simulate data for demo
        setDevices([
          { id: 'kb-001', device_type: 'keyboard', status: 'active', last_seen: '2025-04-17T14:55:12', location: 'player_station_1', ip_address: '10.0.1.101', is_alerting: false },
          { id: 'mouse-001', device_type: 'mouse', status: 'active', last_seen: '2025-04-17T14:55:10', location: 'player_station_1', ip_address: '10.0.1.102', is_alerting: false },
          { id: 'kb-002', device_type: 'keyboard', status: 'active', last_seen: '2025-04-17T14:54:55', location: 'player_station_2', ip_address: '10.0.1.103', is_alerting: false },
          { id: 'mouse-002', device_type: 'mouse', status: 'active', last_seen: '2025-04-17T14:54:50', location: 'player_station_2', ip_address: '10.0.1.104', is_alerting: true },
          { id: 'kb-003', device_type: 'keyboard', status: 'active', last_seen: '2025-04-17T14:54:40', location: 'player_station_3', ip_address: '10.0.1.105', is_alerting: false },
          { id: 'mouse-003', device_type: 'mouse', status: 'active', last_seen: '2025-04-17T14:54:35', location: 'player_station_3', ip_address: '10.0.1.106', is_alerting: true },
          { id: 'router-001', device_type: 'router', status: 'active', last_seen: '2025-04-17T14:55:00', location: 'network_room', ip_address: '10.0.1.1', is_alerting: false },
          { id: 'switch-001', device_type: 'switch', status: 'active', last_seen: '2025-04-17T14:54:58', location: 'network_room', ip_address: '10.0.1.2', is_alerting: false },
          { id: 'router-002', device_type: 'router', status: 'inactive', last_seen: '2025-04-17T12:30:00', location: 'backup_room', ip_address: '10.0.2.1', is_alerting: false },
          { id: 'temp-001', device_type: 'temp_sensor', status: 'active', last_seen: '2025-04-17T14:55:05', location: 'server_room', ip_address: '10.0.1.120', is_alerting: false },
          { id: 'temp-002', device_type: 'temp_sensor', status: 'active', last_seen: '2025-04-17T14:55:01', location: 'network_room', ip_address: '10.0.1.121', is_alerting: false },
          { id: 'motion-001', device_type: 'motion_sensor', status: 'active', last_seen: '2025-04-17T14:54:55', location: 'entrance', ip_address: '10.0.1.130', is_alerting: false },
          { id: 'motion-002', device_type: 'motion_sensor', status: 'active', last_seen: '2025-04-17T14:54:50', location: 'server_room', ip_address: '10.0.1.131', is_alerting: false },
          { id: 'motion-003', device_type: 'motion_sensor', status: 'inactive', last_seen: '2025-04-17T10:12:33', location: 'back_entrance', ip_address: '10.0.1.132', is_alerting: false }
        ]);
      } catch (error) {
        console.error('Error fetching devices:', error);
      }
    };
    
    fetchDevices();
    
    // Set up polling for real-time updates
    const devicesPoll = setInterval(fetchDevices, 30000);
    
    return () => clearInterval(devicesPoll);
  }, [filter]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
  };
  
  const closeDeviceDetails = () => {
    setSelectedDevice(null);
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const formatLocation = (location) => {
    return location.replace(/_/g, ' ');
  };
  
  return (
    <div className="devices-container">
      <div className="filters-bar">
        <div className="filter-group">
          <label>Device Type:</label>
          <select 
            name="type" 
            value={filter.type} 
            onChange={handleFilterChange}
          >
            <option value="all">All Types</option>
            <option value="keyboard">Keyboards</option>
            <option value="mouse">Mice</option>
            <option value="router">Routers</option>
            <option value="switch">Switches</option>
            <option value="temp_sensor">Temperature Sensors</option>
            <option value="motion_sensor">Motion Sensors</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Status:</label>
          <select 
            name="status" 
            value={filter.status} 
            onChange={handleFilterChange}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="alerting">Alerting</option>
          </select>
        </div>
      </div>
      
      <div className="devices-grid">
        {devices.map(device => (
          <div 
            key={device.id} 
            className={`device-card ${device.status} ${device.is_alerting ? 'alerting' : ''}`}
            onClick={() => handleDeviceClick(device)}
          >
            <div className="device-header">
              <h3>{device.id}</h3>
              <span className={`device-status ${device.status}`}>
                {device.status}
              </span>
            </div>
            <div className="device-info">
              <p><strong>Type:</strong> {device.device_type}</p>
              <p><strong>Location:</strong> {formatLocation(device.location)}</p>
              <p><strong>Last Seen:</strong> {formatTimestamp(device.last_seen)}</p>
            </div>
            {device.is_alerting && (
              <div className="device-alert-badge">
                Alert
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedDevice && (
        <div className="device-details-modal">
          <div className="device-details-content">
            <button className="close-btn" onClick={closeDeviceDetails}>&times;</button>
            <h2>{selectedDevice.id}</h2>
            
            <div className="device-details-grid">
              <div className="detail-item">
                <span className="detail-label">Type</span>
                <span className="detail-value">{selectedDevice.device_type}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`detail-value status-${selectedDevice.status}`}>{selectedDevice.status}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location</span>
                <span className="detail-value">{formatLocation(selectedDevice.location)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">IP Address</span>
                <span className="detail-value">{selectedDevice.ip_address}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Seen</span>
                <span className="detail-value">{formatTimestamp(selectedDevice.last_seen)}</span>
              </div>
            </div>
            
            <div className="device-actions">
              <button className="btn primary">View Activity History</button>
              <button className="btn secondary">Reset Device</button>
              {selectedDevice.status === 'active' ? (
                <button className="btn danger">Disable Device</button>
              ) : (
                <button className="btn success">Enable Device</button>
              )}
            </div>
            
            <div className="device-data-preview">
              <h3>Recent Data</h3>
              <div className="data-preview-chart">
                {/* Chart would be implemented here - using placeholder */}
                <div className="chart-placeholder">
                  <p>Device activity data chart would be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Analytics component
const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [chartData, setChartData] = useState({
    alerts: [],
    devices: [],
    alertTypes: [],
    deviceTypes: []
  });
  
  useEffect(() => {
    // In a real application, this would be an API call
    const fetchAnalyticsData = async () => {
      try {
        // const response = await apiService.getAnalytics(timeRange);
        // setChartData(response.data);
        
        // Simulate data for demo
        setChartData({
          // Alerts over time
          alerts: [
            { date: '2025-04-11', alerts: 5 },
            { date: '2025-04-12', alerts: 8 },
            { date: '2025-04-13', alerts: 3 },
            { date: '2025-04-14', alerts: 7 },
            { date: '2025-04-15', alerts: 12 },
            { date: '2025-04-16', alerts: 15 },
            { date: '2025-04-17', alerts: 10 }
          ],
          // Device status changes
          devices: [
            { date: '2025-04-11', online: 42, offline: 6 },
            { date: '2025-04-12', online: 43, offline: 5 },
            { date: '2025-04-13', online: 40, offline: 8 },
            { date: '2025-04-14', online: 41, offline: 7 },
            { date: '2025-04-15', online: 44, offline: 4 },
            { date: '2025-04-16', online: 43, offline: 5 },
            { date: '2025-04-17', online: 42, offline: 6 }
          ],
          // Alert types breakdown
          alertTypes: [
            { type: 'Network Anomaly', count: 22 },
            { type: 'Unusual Mouse Movement', count: 15 },
            { type: 'Unusual Typing Pattern', count: 18 },
            { type: 'Temperature Anomaly', count: 8 },
            { type: 'Motion Anomaly', count: 12 }
          ],
          // Device types breakdown
          deviceTypes: [
            { type: 'Keyboard', count: 12 },
            { type: 'Mouse', count: 12 },
            { type: 'Router', count: 3 },
            { type: 'Switch', count: 5 },
            { type: 'Temperature Sensor', count: 8 },
            { type: 'Motion Sensor', count: 8 }
          ]
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      }
    };
    
    fetchAnalyticsData();
  }, [timeRange]);
  
  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>Security Analytics</h2>
        <div className="time-range-selector">
          <label>Time Range:</label>
          <select value={timeRange} onChange={handleTimeRangeChange}>
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>
      
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Alerts Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.alerts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="alerts" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card">
          <h3>Device Status Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.devices}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="online" stackId="a" fill="#2ecc71" />
              <Bar dataKey="offline" stackId="a" fill="#e74c3c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card">
          <h3>Alert Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.alertTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="type"
                label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.alertTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card">
          <h3>Device Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.deviceTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="type"
                label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.deviceTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="insights-section">
        <h3>Security Insights</h3>
        <div className="insights-cards">
          <div className="insight-card">
            <h4>Most Common Alert Type</h4>
            <div className="insight-value">Network Anomaly</div>
            <p>Network anomalies represent 29% of all alerts in the selected period.</p>
          </div>
          
          <div className="insight-card">
            <h4>Peak Alert Time</h4>
            <div className="insight-value">15:00 - 16:00</div>
            <p>The highest number of alerts occur between 3PM and 4PM.</p>
          </div>
          
          <div className="insight-card">
            <h4>Most Alerting Device</h4>
            <div className="insight-value">router-005</div>
            <p>This device has triggered 8 alerts in the selected period.</p>
          </div>
          
          <div className="insight-card">
            <h4>Recent Trend</h4>
            <div className="insight-value">+35% Alerts</div>
            <p>Alert volume has increased 35% compared to the previous period.</p>
          </div>
        </div>
      </div>
    </div>
  );
};