"""
Feature Extraction Utilities
---------------------------
Extracts features from device data for anomaly detection
"""

import pandas as pd

def extract_features_keyboard(data_df):
    """Extract relevant features from keyboard data"""
    features = data_df[['keys_pressed_per_minute', 'special_keys_frequency']]
    
    # Add time-based features
    data_df['timestamp'] = pd.to_datetime(data_df['timestamp'])
    features['hour'] = data_df['timestamp'].dt.hour
    features['minute'] = data_df['timestamp'].dt.minute
    features['day_of_week'] = data_df['timestamp'].dt.dayofweek
    
    # Add rolling statistics (if enough data)
    if len(data_df) > 5:
        features['keys_pressed_rolling_mean'] = data_df['keys_pressed_per_minute'].rolling(window=5).mean()
        features['keys_pressed_rolling_std'] = data_df['keys_pressed_per_minute'].rolling(window=5).std()
        features = features.fillna(method='bfill')
    
    return features

def extract_features_mouse(data_df):
    """Extract relevant features from mouse data"""
    features = data_df[['movement_speed', 'clicks_per_minute', 'movement_pattern_regularity']]
    
    # Add time-based features
    data_df['timestamp'] = pd.to_datetime(data_df['timestamp'])
    features['hour'] = data_df['timestamp'].dt.hour
    features['minute'] = data_df['timestamp'].dt.minute
    features['day_of_week'] = data_df['timestamp'].dt.dayofweek
    
    # Add rolling statistics (if enough data)
    if len(data_df) > 5:
        features['movement_speed_rolling_mean'] = data_df['movement_speed'].rolling(window=5).mean()
        features['clicks_per_minute_rolling_mean'] = data_df['clicks_per_minute'].rolling(window=5).mean()
        features = features.fillna(method='bfill')
    
    return features

def extract_features_network(data_df):
    """Extract relevant features from network device data"""
    features = data_df[['bandwidth_usage_percent', 'packet_loss_percent', 'latency_ms', 'active_connections']]
    
    # Add time-based features
    data_df['timestamp'] = pd.to_datetime(data_df['timestamp'])
    features['hour'] = data_df['timestamp'].dt.hour
    features['minute'] = data_df['timestamp'].dt.minute
    features['day_of_week'] = data_df['timestamp'].dt.dayofweek
    
    # Add calculated features
    features['connection_bandwidth_ratio'] = data_df['bandwidth_usage_percent'] / (data_df['active_connections'] + 1)
    
    # Add rolling statistics
    if len(data_df) > 5:
        features['bandwidth_rolling_mean'] = data_df['bandwidth_usage_percent'].rolling(window=5).mean()
        features['latency_rolling_mean'] = data_df['latency_ms'].rolling(window=5).mean()
        features['connections_rolling_mean'] = data_df['active_connections'].rolling(window=5).mean()
        features = features.fillna(method='bfill')
    
    return features