"""
Keyboard Device Simulator Module
--------------------------------
Simulates keyboard device data patterns
"""

import random
import datetime

def generate_data(include_anomaly=False):
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