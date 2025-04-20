"""
Data Validation Utilities for Secure Gateway
-------------------------------------------
Validates incoming data from IoT devices
"""

def validate_data(device_type, data):
    """Validate incoming data based on device type"""
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