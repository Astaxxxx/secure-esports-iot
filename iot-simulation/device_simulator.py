"""
IoT Device Simulator for Esports Environment
-------------------------------------------
This script simulates various IoT devices in an esports environment:
1. Player peripherals (keyboards, mice)
2. Network devices (routers, switches)
3. Environmental sensors (temperature, motion)

It generates realistic data with occasional anomalies and sends it to the secure gateway.
"""

import time
import json
import random
import uuid
import requests
import ssl
import jwt
import datetime
import argparse
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

# Configuration
API_ENDPOINT = "https://localhost:5000/api/data"
DEVICE_TYPES = ["keyboard", "mouse", "router", "switch", "temp_sensor", "motion_sensor"]
SECRET_KEY = "your-secret-key-should-be-stored-securely"  # In production, use secure storage
DEVICE_ID = str(uuid.uuid4())  # Generate a unique device ID

# Generate device key pair
def generate_key_pair():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return private_pem, public_pem

# Create a JWT token for device authentication
def create_auth_token(device_id, device_type, private_key):
    payload = {
        'device_id': device_id,
        'device_type': device_type,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    token = jwt.encode(payload, private_key, algorithm='RS256')
    return token

# Simulate normal keyboard data
def generate_keyboard_data(include_anomaly=False):
    # Normal keyboard activity would have certain typing patterns and key press rates
    keys_pressed = random.randint(50, 200)  # Normal typing rate per minute
    
    # Anomalies could be extremely rapid key presses (potential macro/automation)
    if include_anomaly and random.random() < 0.1:  # 10% chance of anomaly if enabled
        keys_pressed = random.randint(300, 1000)  # Suspiciously high typing rate
    
    return {
        "device_type": "keyboard",
        "keys_pressed_per_minute": keys_pressed,
        "special_keys_frequency": random.uniform(0.1, 0.3),
        "timestamp": datetime.datetime.now().isoformat()
    }

# Simulate normal mouse data
def generate_mouse_data(include_anomaly=False):
    # Normal mouse movement patterns
    movement_speed = random.uniform(10, 100)  # Normal mouse movement speed
    clicks_per_minute = random.randint(20, 100)  # Normal clicking rate
    
    # Anomalies could be extremely precise movements or unusual click patterns
    if include_anomaly and random.random() < 0.1:
        movement_speed = random.uniform(150, 300)  # Unusually fast/precise movement
        clicks_per_minute = random.randint(150, 300)  # Unusually high click rate
    
    return {
        "device_type": "mouse",
        "movement_speed": movement_speed,
        "clicks_per_minute": clicks_per_minute,
        "movement_pattern_regularity": random.uniform(0.1, 0.9),
        "timestamp": datetime.datetime.now().isoformat()
    }

# Simulate normal network device data
def generate_network_data(device_type, include_anomaly=False):
    # Normal network traffic patterns
    bandwidth_usage = random.uniform(10, 70)  # % of available bandwidth
    packet_loss = random.uniform(0, 2)  # % packet loss
    latency = random.uniform(5, 50)  # ms
    connection_count = random.randint(5, 50)  # number of active connections
    
    # Anomalies could be unusual traffic spikes, high latency, or connection floods
    if include_anomaly and random.random() < 0.1:
        anomaly_type = random.choice(["bandwidth", "packet_loss", "latency", "connections"])
        
        if anomaly_type == "bandwidth":
            bandwidth_usage = random.uniform(85, 100)
        elif anomaly_type == "packet_loss":
            packet_loss = random.uniform(5, 20)
        elif anomaly_type == "latency":
            latency = random.uniform(100, 500)
        elif anomaly_type == "connections":
            connection_count = random.randint(100, 1000)
    
    return {
        "device_type": device_type,
        "bandwidth_usage_percent": bandwidth_usage,
        "packet_loss_percent": packet_loss,
        "latency_ms": latency,
        "active_connections": connection_count,
        "timestamp": datetime.datetime.now().isoformat()
    }

# Simulate environmental sensor data
def generate_sensor_data(sensor_type, include_anomaly=False):
    if sensor_type == "temp_sensor":
        # Normal temperature range for a gaming venue (20-25°C)
        temperature = random.uniform(20, 25)
        humidity = random.uniform(40, 60)
        
        # Anomalies could be unusual temperature spikes
        if include_anomaly and random.random() < 0.1:
            temperature = random.choice([random.uniform(5, 15), random.uniform(30, 40)])
        
        return {
            "device_type": "temp_sensor",
            "temperature_celsius": temperature,
            "humidity_percent": humidity,
            "timestamp": datetime.datetime.now().isoformat()
        }
    
    elif sensor_type == "motion_sensor":
        # Normal motion patterns in an esports venue
        activity_level = random.randint(1, 5)  # Scale of 1-10
        
        # Anomalies could be motion detected in restricted areas or at unusual times
        if include_anomaly and random.random() < 0.1:
            activity_level = random.randint(8, 10)
        
        return {
            "device_type": "motion_sensor",
            "activity_level": activity_level,
            "motion_detected": activity_level > 2,
            "location": "main_stage",
            "timestamp": datetime.datetime.now().isoformat()
        }

# Send data to the secure gateway with proper authentication
def send_data_to_gateway(data, auth_token):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
        "X-Device-ID": DEVICE_ID
    }
    
    try:
        # Create a custom SSL context that verifies certificates
        context = ssl.create_default_context()
        context.check_hostname = True
        context.verify_mode = ssl.CERT_REQUIRED
        
        # In a real implementation, you would specify the path to CA certificates
        # context.load_verify_locations("path/to/ca-certificate.pem")
        
        # For testing purposes, we're using requests without the custom context
        # In production, you should use proper certificate verification
        response = requests.post(
            API_ENDPOINT,
            data=json.dumps(data),
            headers=headers,
            verify=False  # Set to True in production with proper certificates
        )
        
        if response.status_code == 200:
            print(f"Successfully sent data for {data['device_type']}")
        else:
            print(f"Failed to send data: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"Error sending data: {e}")

# Main simulation function
def run_simulation(device_type, include_anomalies=False, interval=5):
    # Generate device keys
    private_key, public_key = generate_key_pair()
    print(f"Generated keys for {device_type} device with ID: {DEVICE_ID}")
    
    # Registration would happen here in a real system
    # This would involve securely sending the public key to the server
    print(f"[Simulation] Device {device_type} registered with the server")
    
    # Simulation loop
    try:
        while True:
            # Create authentication token
            auth_token = create_auth_token(DEVICE_ID, device_type, private_key)
            
            # Generate appropriate data based on device type
            if device_type == "keyboard":
                data = generate_keyboard_data(include_anomalies)
            elif device_type == "mouse":
                data = generate_mouse_data(include_anomalies)
            elif device_type in ["router", "switch"]:
                data = generate_network_data(device_type, include_anomalies)
            elif device_type in ["temp_sensor", "motion_sensor"]:
                data = generate_sensor_data(device_type, include_anomalies)
            else:
                print(f"Unknown device type: {device_type}")
                break
            
            # Add common fields
            data["device_id"] = DEVICE_ID
            
            # Print the data (for simulation purposes)
            print(f"Generated data: {json.dumps(data, indent=2)}")
            
            # Uncomment to actually send data to the gateway
            # send_data_to_gateway(data, auth_token)
            
            # Wait for the next interval
            time.sleep(interval)
    
    except KeyboardInterrupt:
        print("Simulation stopped")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='IoT Device Simulator for Esports Environment')
    parser.add_argument('--device', choices=DEVICE_TYPES, required=True, help='Type of device to simulate')
    parser.add_argument('--anomalies', action='store_true', help='Include occasional anomalies in the data')
    parser.add_argument('--interval', type=int, default=5, help='Interval between data points in seconds')
    
    args = parser.parse_args()
    
    print(f"Starting simulation for {args.device} device")
    print(f"Anomalies enabled: {args.anomalies}")
    print(f"Data interval: {args.interval} seconds")
    
    run_simulation(args.device, args.anomalies, args.interval)