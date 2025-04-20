"""
Secure Gateway for IoT Devices in Esports Environment
---------------------------------------------------
This Flask server acts as a secure gateway for IoT devices:
1. Authenticates devices using JWT and mutual TLS
2. Validates and sanitizes incoming data
3. Implements rate limiting and security controls
4. Forwards valid data to the processing engine
"""

from flask import Flask, request, jsonify, abort
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import jwt
import json
import logging
import datetime
import sqlite3
import os
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from functools import wraps
import uuid
import ssl

# Initialize Flask application
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'development-key-change-me')
app.config['DEVICE_REGISTRY_DB'] = 'device_registry.db'
app.config['PUBLIC_KEY_DIR'] = 'device_keys'

# Set up rate limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100 per minute", "1 per second"],
    storage_uri="memory://"
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("gateway.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("secure_gateway")

# Database initialization
def init_db():
    conn = sqlite3.connect(app.config['DEVICE_REGISTRY_DB'])
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        device_type TEXT NOT NULL,
        public_key TEXT NOT NULL,
        registration_date TEXT NOT NULL,
        last_seen TEXT,
        status TEXT DEFAULT 'active'
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        ip_address TEXT,
        success INTEGER,
        details TEXT
    )
    ''')
    
    conn.commit()
    conn.close()
    
    # Ensure the device keys directory exists
    if not os.path.exists(app.config['PUBLIC_KEY_DIR']):
        os.makedirs(app.config['PUBLIC_KEY_DIR'])

# Get device public key from registry
def get_device_public_key(device_id):
    conn = sqlite3.connect(app.config['DEVICE_REGISTRY_DB'])
    cursor = conn.cursor()
    cursor.execute("SELECT public_key FROM devices WHERE id = ? AND status = 'active'", (device_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return result[0]
    return None

# Log access attempt
def log_access(device_id, action, success, details=None):
    conn = sqlite3.connect(app.config['DEVICE_REGISTRY_DB'])
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO access_logs (device_id, timestamp, action, ip_address, success, details) VALUES (?, ?, ?, ?, ?, ?)",
        (device_id, datetime.datetime.now().isoformat(), action, request.remote_addr, 1 if success else 0, details)
    )
    
    if success:
        # Update last_seen timestamp
        cursor.execute(
            "UPDATE devices SET last_seen = ? WHERE id = ?",
            (datetime.datetime.now().isoformat(), device_id)
        )
    
    conn.commit()
    conn.close()

# JWT authentication decorator
def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if authorization header exists
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                logger.warning("Invalid Authorization header format")
                abort(401, description="Invalid Authorization header format")
        
        if not token:
            logger.warning("Missing authentication token")
            abort(401, description="Authentication token is missing")
        
        try:
            # Get device ID from headers
            device_id = request.headers.get('X-Device-ID')
            if not device_id:
                logger.warning("Missing device ID in headers")
                abort(400, description="Device ID is required")
            
            # Get public key for the device
            public_key_pem = get_device_public_key(device_id)
            if not public_key_pem:
                logger.warning(f"Device not registered: {device_id}")
                abort(401, description="Device not registered or inactive")
            
            # Load the public key
            public_key = load_pem_public_key(
                public_key_pem.encode('utf-8'),
                backend=default_backend()
            )
            
            # Decode and verify the token
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                options={"verify_signature": True}
            )
            
            # Verify the device ID in the token matches the header
            if payload['device_id'] != device_id:
                logger.warning(f"Token device ID mismatch: {payload['device_id']} != {device_id}")
                log_access(device_id, "authentication", False, "Token device ID mismatch")
                abort(401, description="Token device ID mismatch")
            
            # Log successful authentication
            log_access(device_id, "authentication", True)
            
        except jwt.ExpiredSignatureError:
            logger.warning(f"Expired token for device: {device_id}")
            log_access(device_id, "authentication", False, "Expired token")
            abort(401, description="Authentication token has expired")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token for device: {device_id}, Error: {str(e)}")
            log_access(device_id, "authentication", False, f"Invalid token: {str(e)}")
            abort(401, description="Invalid authentication token")
        
        return f(payload, *args, **kwargs)
    
    return decorated

# Validate incoming data based on device type
def validate_data(device_type, data):
    # Define expected fields for each device type
    expected_fields = {
        "keyboard": ["keys_pressed_per_minute", "special_keys_frequency", "timestamp", "device_id"],
        "mouse": ["movement_speed", "clicks_per_minute", "movement_pattern_regularity", "timestamp", "device_id"],
        "router": ["bandwidth_usage_percent", "packet_loss_percent", "latency_ms", "active_connections", "timestamp", "device_id"],
        "switch": ["bandwidth_usage_percent", "packet_loss_percent", "latency_ms", "active_connections", "timestamp", "device_id"],
        "temp_sensor": ["temperature_celsius", "humidity_percent", "timestamp", "device_id"],
        "motion_sensor": ["activity_level", "motion_detected", "location", "timestamp", "device_id"]
    }
    
    # Check if the device type is supported
    if device_type not in expected_fields:
        return False, f"Unsupported device type: {device_type}"
    
    # Check for required fields
    for field in expected_fields[device_type]:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    # Validate numeric ranges for specific device types
    if device_type == "keyboard":
        if not (0 <= data["keys_pressed_per_minute"] <= 2000):
            return False, "Invalid keys_pressed_per_minute range"
        if not (0 <= data["special_keys_frequency"] <= 1):
            return False, "Invalid special_keys_frequency range"
    
    elif device_type == "mouse":
        if not (0 <= data["movement_speed"] <= 1000):
            return False, "Invalid movement_speed range"
        if not (0 <= data["clicks_per_minute"] <= 1000):
            return False, "Invalid clicks_per_minute range"
    
    elif device_type in ["router", "switch"]:
        if not (0 <= data["bandwidth_usage_percent"] <= 100):
            return False, "Invalid bandwidth_usage_percent range"
        if not (0 <= data["packet_loss_percent"] <= 100):
            return False, "Invalid packet_loss_percent range"
    
    elif device_type == "temp_sensor":
        if not (-20 <= data["temperature_celsius"] <= 50):
            return False, "Invalid temperature_celsius range"
        if not (0 <= data["humidity_percent"] <= 100):
            return False, "Invalid humidity_percent range"
    
    # All validations passed
    return True, None

# Device registration endpoint
@app.route('/api/register', methods=['POST'])
def register_device():
    try:
        # Get registration data
        data = request.json
        
        # Validate required fields
        required_fields = ['device_id', 'device_type', 'public_key']
        for field in required_fields:
            if field not in data:
                logger.warning(f"Missing required field in registration: {field}")
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400
        
        device_id = data['device_id']
        device_type = data['device_type']
        public_key = data['public_key']
        
        # Validate device type
        valid_device_types = ["keyboard", "mouse", "router", "switch", "temp_sensor", "motion_sensor"]
        if device_type not in valid_device_types:
            logger.warning(f"Invalid device type in registration: {device_type}")
            return jsonify({"success": False, "error": "Invalid device type"}), 400
        
        # Check if device already exists
        conn = sqlite3.connect(app.config['DEVICE_REGISTRY_DB'])
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM devices WHERE id = ?", (device_id,))
        if cursor.fetchone():
            conn.close()
            logger.warning(f"Device already registered: {device_id}")
            return jsonify({"success": False, "error": "Device already registered"}), 409
        
        # Store device information
        cursor.execute(
            "INSERT INTO devices (id, device_type, public_key, registration_date, status) VALUES (?, ?, ?, ?, ?)",
            (device_id, device_type, public_key, datetime.datetime.now().isoformat(), "active")
        )
        conn.commit()
        conn.close()
        
        # Log successful registration
        logger.info(f"Device registered successfully: {device_id} ({device_type})")
        
        return jsonify({"success": True, "message": "Device registered successfully"}), 201
    
    except Exception as e:
        logger.error(f"Error during device registration: {str(e)}")
        return jsonify({"success": False, "error": "Registration failed: " + str(e)}), 500

# Data ingestion endpoint
@app.route('/api/data', methods=['POST'])
@limiter.limit("10 per second")  # Rate limiting to prevent DDoS
@jwt_required
def receive_data(jwt_payload):
    try:
        # Get data from request
        data = request.json
        device_id = jwt_payload['device_id']
        device_type = jwt_payload['device_type']
        
        # Validate the data
        is_valid, error_msg = validate_data(device_type, data)
        if not is_valid:
            logger.warning(f"Invalid data from device {device_id}: {error_msg}")
            log_access(device_id, "data_submission", False, error_msg)
            return jsonify({"success": False, "error": error_msg}), 400
        
        # Log data receipt
        log_access(device_id, "data_submission", True)
        
        # Process the data (in a real system, this would forward to a message queue or processing engine)
        # Here we're just logging it
        logger.info(f"Received valid data from device {device_id}")
        
        # Forward to processing engine (stub for now)
        # process_data(data)
        
        return jsonify({"success": True})
    
    except Exception as e:
        logger.error(f"Error processing data: {str(e)}")
        return jsonify({"success": False, "error": "Data processing error: " + str(e)}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.datetime.now().isoformat()})

# Run the app
if __name__ == '__main__':
    init_db()
    logger.info("Secure Gateway starting up...")
    
    # Configure SSL context for HTTPS
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('server.crt', 'server.key')
    
    # In a production environment, configure proper certificate verification
    context.verify_mode = ssl.CERT_REQUIRED
    context.load_verify_locations('ca.crt')
    
    app.run(host='0.0.0.0', port=5000, ssl_context=context, debug=False)