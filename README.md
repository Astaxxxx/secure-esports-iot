# Secure IoT Monitoring System for Esports Environments with AI-Powered Threat Detection Dashboard

This project implements a secure IoT monitoring system specifically designed for esports environments, with an AI-powered security dashboard for real-time threat detection.

## Project Overview

The system addresses security concerns in IoT deployments by implementing "secure by design" methods and appropriate security controls for esports venues. It monitors various IoT devices throughout an esports venue, securely processes the data, and provides real-time threat detection through AI-based anomaly detection.

## System Components

### 1. IoT Device Simulation
- Simulates various types of IoT devices commonly found in esports environments
- Includes player peripherals (keyboards, mice), network devices (routers, switches), and environmental sensors
- Generates realistic data patterns with occasional anomalies for testing

### 2. Secure Gateway
- Implements device authentication using JWT and mutual TLS
- Validates and sanitizes all incoming data
- Implements rate limiting and other security controls
- Routes validated data to the processing engine

### 3. AI Anomaly Detection
- Processes device data using machine learning models
- Implements Isolation Forest algorithm for anomaly detection
- Maintains device-specific models for more accurate detection
- Generates alerts based on detected anomalies

### 4. Security Dashboard
- Provides a real-time monitoring interface for security personnel
- Visualizes threats and device status
- Enables alert management and investigation
- Includes analytics for trend detection and reporting

## Security Features

- End-to-end encryption for all communications
- Mutual TLS authentication for devices
- JWT-based API authentication
- Comprehensive input validation and sanitization
- Rate limiting to prevent DDoS attacks
- AI-based anomaly detection for identifying unusual patterns
- Secure user authentication and role-based access control

## Testing Environment

The system is designed to be testable on a single laptop environment:

1. **Device Simulation**: Script that simulates multiple device types on your laptop
2. **Local Development**: All components can run locally using Docker or direct installation
3. **Virtual Network**: Simulated networks to test secure communications
4. **Mock Data**: Pre-generated datasets for training and testing the AI models

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- Python 3.8+
- SQLite
- Docker (optional, for containerization)

### Installation Steps

1. Clone the repository:
```
git clone https://github.com/yourusername/secure-esports-iot.git
cd secure-esports-iot
```

2. Install backend dependencies:
```
cd backend
npm install
```

3. Install frontend dependencies:
```
cd ../frontend
npm install
```

4. Install Python dependencies for the AI system:
```
cd ../ai-detection
pip install -r requirements.txt
```

5. Generate certificates for secure communications:
```
cd ../scripts
./generate-certificates.sh
```

### Running the System

1. Start the backend server:
```
cd backend
npm start
```

2. Start the frontend dashboard:
```
cd frontend
npm start
```

3. Start the AI detection system:
```
cd ai-detection
python anomaly_detection.py
```

4. Run device simulations:
```
cd iot-simulation
python device_simulator.py --device keyboard --anomalies
```

The dashboard will be available at: http://localhost:3000

Default login credentials:
- Username: admin
- Password: admin123

## Testing the System

1. **Security Testing**:
   - Run the included penetration testing scripts
   - Test authentication bypass attempts
   - Validate input sanitization effectiveness

2. **Device Simulation**:
   - Run multiple device simulations with different parameters
   - Enable anomaly injection to test detection capabilities

3. **AI Model Evaluation**:
   - Test detection accuracy with the provided test datasets
   - Measure false positive and false negative rates

## Project Structure

```
secure-esports-iot/
├── backend/               # API and backend services
│   ├── server.js          # Main server file
│   └── routes/            # API endpoints
├── frontend/              # React-based dashboard
│   ├── src/               # Source code
│   └── public/            # Static assets
├── ai-detection/          # AI-based anomaly detection
│   └── anomaly_detection.py # Main AI processing script
├── iot-simulation/        # IoT device simulators
│   └── device_simulator.py # Device simulation script
├── gateway/               # Secure gateway implementation
│   └── secure_gateway.py  # Gateway code
└── docs/                  # Documentation
```

## Future Enhancements

1. **Expanded Device Support**: Add more IoT device types specific to esports
2. **Advanced AI Models**: Implement deep learning models for more accurate detection
3. **Threat Intelligence**: Integrate with external threat intelligence feeds
4. **Mobile Application**: Develop a companion mobile app for alerts on the go
5. **Automated Response**: Implement automatic countermeasures for certain threats

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- This project was developed as part of a BSc Cybersecurity course
- Special thanks to [Your Institution Name] for supporting this work