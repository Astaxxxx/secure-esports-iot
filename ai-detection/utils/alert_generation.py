"""
Alert Generation Utilities
-------------------------
Generates security alerts based on anomaly detection results
"""

import json
import datetime

def generate_alert(device_id, device_type, data, anomaly_score):
    """Generate alert based on anomaly detection results"""
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
        "data": json.dumps(data) if isinstance(data, dict) else data,
        "anomaly_score": anomaly_score
    }
    
    return alert