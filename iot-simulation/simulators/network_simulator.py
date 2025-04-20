"""
Network Device Simulator Module
-------------------------------
Simulates network device data patterns
"""

import random
import datetime

def generate_data(device_type, include_anomaly=False):
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