import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with auth header
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle authentication errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
const getStats = () => {
  return apiClient.get('/stats');
};

const getAlerts = (params) => {
  return apiClient.get('/alerts', { params });
};

const getRecentAlerts = (limit) => {
  return apiClient.get('/alerts/recent', { params: { limit } });
};

const acknowledgeAlert = (alertId) => {
  return apiClient.post(`/alerts/${alertId}/acknowledge`);
};

const getDevices = (params) => {
  return apiClient.get('/devices', { params });
};

const updateDeviceStatus = (deviceId, status) => {
  return apiClient.put(`/devices/${deviceId}/status`, { status });
};

const getAnalytics = (timeRange) => {
  return apiClient.get('/analytics', { params: { timeRange } });
};

const apiService = {
  getStats,
  getAlerts,
  getRecentAlerts,
  acknowledgeAlert,
  getDevices,
  updateDeviceStatus,
  getAnalytics
};

export default apiService;