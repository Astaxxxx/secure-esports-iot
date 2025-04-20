"""
AI-based Anomaly Detection System for Esports Environment
--------------------------------------------------------
This module implements machine learning models to detect anomalies in IoT device data:
1. Data preprocessing and feature extraction
2. Isolation Forest for general anomaly detection
3. Device-specific detection models
4. Real-time scoring and alert generation
"""

import pandas as pd
import numpy as np
import json
import datetime
import sqlite3
import pickle
import os
import logging
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
from kafka import KafkaConsumer, KafkaProducer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("anomaly_detection.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("anomaly_detection")

# Configuration
DB_PATH = "device_data.db"
MODEL_DIR = "models"
KAFKA_BOOTSTRAP_SERVERS = ['localhost:9092']
KAFKA_INPUT_TOPIC = "iot_data"
KAFKA_OUTPUT_TOPIC = "iot_alerts"

# Ensure model directory exists
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

# Database initialization
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Table for storing device data
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS device_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        device_type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_anomaly INTEGER DEFAULT 0,
        anomaly_score REAL,
        processed INTEGER DEFAULT 0
    )
    ''')
    
    # Table for storing alerts
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        device_type TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT,
        timestamp TEXT NOT NULL,
        data TEXT,
        acknowledged INTEGER DEFAULT 0
    )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized")

# Feature extraction functions for different device types
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

def extract_features_sensor(data_df, sensor_type):
    """Extract relevant features from environmental sensor data"""
    if sensor_type == 'temp_sensor':
        features = data_df[['temperature_celsius', 'humidity_percent']]
        
        # Add time-based features
        data_df['timestamp'] = pd.to_datetime(data_df['timestamp'])
        features['hour'] = data_df['timestamp'].dt.hour
        features['day_of_week'] = data_df['timestamp'].dt.dayofweek
        
        # Add rolling statistics
        if len(data_df) > 5:
            features['temp_rolling_mean'] = data_df['temperature_celsius'].rolling(window=5).mean()
            features['temp_rolling_std'] = data_df['temperature_celsius'].rolling(window=5).std()
            features['humidity_rolling_mean'] = data_df['humidity_percent'].rolling(window=5).mean()
            features = features.fillna(method='bfill')
    
    elif sensor_type == 'motion_sensor':
        features = pd.DataFrame()
        features['activity_level'] = data_df['activity_level']
        features['motion_detected'] = data_df['motion_detected'].astype(int)
        
        # One-hot encode location
        location_dummies = pd.get_dummies(data_df['location'], prefix='location')
        features = pd.concat([features, location_dummies], axis=1)
        
        # Add time-based features
        data_df['timestamp'] = pd.to_datetime(data_df['timestamp'])
        features['hour'] = data_df['timestamp'].dt.hour
        features['day_of_week'] = data_df['timestamp'].dt.dayofweek
        
        # Add rolling statistics
        if len(data_df) > 5:
            features['activity_rolling_mean'] = data_df['activity_level'].rolling(window=5).mean()
            features = features.fillna(method='bfill')
    
    return features

# Feature extraction dispatcher
def extract_features(data_df, device_type):
    """Extract features based on device type"""
    if device_type == "keyboard":
        return extract_features_keyboard(data_df)
    elif device_type == "mouse":
        return extract_features_mouse(data_df)
    elif device_type in ["router", "switch"]:
        return extract_features_network(data_df)
    elif device_type in ["temp_sensor", "motion_sensor"]:
        return extract_features_sensor(data_df, device_type)
    else:
        logger.warning(f"Unknown device type for feature extraction: {device_type}")
        return None

# Model training function
def train_model(device_type, device_id=None):
    """Train anomaly detection model for a specific device type or device"""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        
        # Query to get training data
        if device_id:
            query = f"SELECT * FROM device_data WHERE device_type = '{device_type}' AND device_id = '{device_id}'"
            model_filename = f"{device_type}_{device_id}_model.pkl"
        else:
            query = f"SELECT * FROM device_data WHERE device_type = '{device_type}'"
            model_filename = f"{device_type}_model.pkl"
        
        # Get data from database
        data_df = pd.read_sql_query(query, conn)
        conn.close()
        
        if len(data_df) < 100:
            logger.warning(f"Insufficient data for training {model_filename}. Need at least 100 records.")
            return None
        
        # Parse JSON data
        data_df['data_parsed'] = data_df['data'].apply(json.loads)
        for col in data_df['data_parsed'].iloc[0].keys():
            if col not in ['device_id', 'device_type', 'timestamp']:
                data_df[col] = data_df['data_parsed'].apply(lambda x: x.get(col, None))
        
        # Extract features
        features = extract_features(data_df, device_type)
        if features is None:
            return None
        
        # Train isolation forest model
        model = IsolationForest(
            n_estimators=100,
            max_samples='auto',
            contamination=0.05,  # Assume 5% of data could be anomalous
            random_state=42
        )
        
        # Fit the model
        model.fit(features)
        
        # Save the model
        model_path = os.path.join(MODEL_DIR, model_filename)
        joblib.dump(model, model_path)
        
        logger.info(f"Successfully trained and saved model: {model_filename}")
        return model
    
    except Exception as e:
        logger.error(f"Error training model for {device_type}: {str(e)}")
        return None

# Anomaly detection function
def detect_anomalies(data, device_type, device_id):
    """Detect anomalies in device data using trained models"""
    try:
        # Convert data to DataFrame format
        data_dict = json.loads(data) if isinstance(data, str) else data
        data_df = pd.DataFrame([data_dict])
        
        # Extract features
        features = extract_features(data_df, device_type)
        if features is None:
            logger.warning(f"Could not extract features for {device_type}")
            return False, 0
        
        # Try to load device-specific model first
        device_model_path = os.path.join(MODEL_DIR, f"{device_type}_{device_id}_model.pkl")
        type_model_path = os.path.join(MODEL_DIR, f"{device_type}_model.pkl")
        
        # Check if models exist, otherwise train them
        if os.path.exists(device_model_path):
            model = joblib.load(device_model_path)
            logger.debug(f"Using device-specific model for {device_id}")
        elif os.path.exists(type_model_path):
            model = joblib.load(type_model_path)
            logger.debug(f"Using device-type model for {device_type}")
        else:
            logger.info(f"No model found for {device_type}. Training new model.")
            model = train_model(device_type)
            if model is None:
                logger.warning(f"Could not train model for {device_type}")
                return False, 0
        
        # Predict anomaly
        prediction = model.predict(features)
        score = model.decision_function(features)
        
        # Isolation Forest returns -1 for anomalies and 1 for normal data
        is_anomaly = prediction[0] == -1
        anomaly_score = -score[0]  # Negate so higher values indicate more anomalous
        
        return is_anomaly, anomaly_score
    
    except Exception as e:
        logger.error(f"Error detecting anomalies: {str(e)}")
        return False, 0

# Alert generation function
def generate_alert(device_id, device_type, data, anomaly_score):
    """Generate alert based on anomaly detection results"""
    try:
        # Determine severity based on anomaly score
        if anomaly_score > 0.8:
            severity = "critical"
        elif anomaly_score > 0.6:
            severity = "high"
        elif anomaly_score > 0.4:
            severity = "medium"
        else:
            severity = "low"
        
        # Create alert description based on device type
        if device_type == "keyboard":
            alert_type = "unusual_typing_pattern"
            description = f"Unusual typing pattern detected for device {device_id}"
        elif device_type == "mouse":
            alert_type = "unusual_mouse_movement"
            description = f"Unusual mouse movement pattern detected for device {device_id}"
        elif device_type in ["router", "switch"]:
            alert_type = "network_anomaly"
            description = f"Unusual network traffic pattern detected for device {device_id}"
        elif device_type == "temp_sensor":
            alert_type = "temperature_anomaly"
            description = f"Unusual temperature reading detected for device {device_id}"
        elif device_type == "motion_sensor":
            alert_type = "motion_anomaly"
            description = f"Unusual motion pattern detected for device {device_id}"
        else:
            alert_type = "general_anomaly"
            description = f"Unusual behavior detected for device {device_id}"
        
        # Create alert object
        alert = {
            "device_id": device_id,
            "device_type": device_type,
            "alert_type": alert_type,
            "severity": severity,
            "description": description,
            "timestamp": datetime.datetime.now().isoformat(),
            "data": json.dumps(data),
            "anomaly_score": anomaly_score
        }
        
        # Store alert in database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO alerts (device_id, device_type, alert_type, severity, description, timestamp, data) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (device_id, device_type, alert_type, severity, description, alert["timestamp"], alert["data"])
        )
        conn.commit()
        conn.close()
        
        # Return the alert
        return alert
    
    except Exception as e:
        logger.error(f"Error generating alert: {str(e)}")
        return None

# Kafka consumer function
def start_consuming():
    """Start consuming IoT data from Kafka for anomaly detection"""
    try:
        # Initialize Kafka consumer
        consumer = KafkaConsumer(
            KAFKA_INPUT_TOPIC,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            auto_offset_reset='latest',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            group_id='anomaly_detection_group'
        )
        
        # Initialize Kafka producer for alerts
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda m: json.dumps(m).encode('utf-8')
        )
        
        logger.info(f"Started consuming from topic: {KAFKA_INPUT_TOPIC}")
        
        # Consume messages
        for message in consumer:
            try:
                # Get data from message
                data = message.value
                device_id = data.get('device_id')
                device_type = data.get('device_type')
                
                if not device_id or not device_type:
                    logger.warning("Received message without device_id or device_type")
                    continue
                
                # Store data in database
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO device_data (device_id, device_type, data, timestamp) VALUES (?, ?, ?, ?)",
                    (device_id, device_type, json.dumps(data), datetime.datetime.now().isoformat())
                )
                data_id = cursor.lastrowid
                conn.commit()
                
                # Detect anomalies
                is_anomaly, anomaly_score = detect_anomalies(data, device_type, device_id)
                
                # Update anomaly information in database
                cursor.execute(
                    "UPDATE device_data SET is_anomaly = ?, anomaly_score = ?, processed = 1 WHERE id = ?",
                    (1 if is_anomaly else 0, anomaly_score, data_id)
                )
                conn.commit()
                conn.close()
                
                # If anomaly detected, generate alert
                if is_anomaly:
                    alert = generate_alert(device_id, device_type, data, anomaly_score)
                    if alert:
                        # Send alert to Kafka
                        producer.send(KAFKA_OUTPUT_TOPIC, alert)
                        logger.info(f"Sent alert for {device_id} to topic {KAFKA_OUTPUT_TOPIC}")
            
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error in Kafka consumer: {str(e)}")

# Database query function for dashboard
def get_recent_alerts(limit=50, severity=None, acknowledged=None):
    """Get recent alerts for dashboard display"""
    try:
        conn = sqlite3.connect(DB_PATH)
        query = "SELECT * FROM alerts"
        conditions = []
        
        if severity:
            conditions.append(f"severity = '{severity}'")
        
        if acknowledged is not None:
            conditions.append(f"acknowledged = {1 if acknowledged else 0}")
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY timestamp DESC LIMIT " + str(limit)
        
        alerts = pd.read_sql_query(query, conn)
        conn.close()
        
        return alerts.to_dict('records')
    
    except Exception as e:
        logger.error(f"Error getting recent alerts: {str(e)}")
        return []

def get_device_stats():
    """Get statistics about devices for dashboard display"""
    try:
        conn = sqlite3.connect(DB_PATH)
        
        # Get counts by device type
        device_counts = pd.read_sql_query(
            "SELECT device_type, COUNT(DISTINCT device_id) as device_count FROM device_data GROUP BY device_type",
            conn
        )
        
        # Get anomaly counts by device type
        anomaly_counts = pd.read_sql_query(
            "SELECT device_type, COUNT(*) as anomaly_count FROM device_data WHERE is_anomaly = 1 GROUP BY device_type",
            conn
        )
        
        # Get alert counts by severity
        severity_counts = pd.read_sql_query(
            "SELECT severity, COUNT(*) as alert_count FROM alerts GROUP BY severity",
            conn
        )
        
        conn.close()
        
        return {
            "device_counts": device_counts.to_dict('records'),
            "anomaly_counts": anomaly_counts.to_dict('records'),
            "severity_counts": severity_counts.to_dict('records')
        }
    
    except Exception as e:
        logger.error(f"Error getting device stats: {str(e)}")
        return {}

# Main function
if __name__ == "__main__":
    # Initialize database
    init_db()
    
    # Start Kafka consumer in a separate thread
    import threading
    consumer_thread = threading.Thread(target=start_consuming)
    consumer_thread.daemon = True
    consumer_thread.start()
    
    logger.info("Anomaly detection system started")
    
    # Keep the main thread running
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Shutting down anomaly detection system")