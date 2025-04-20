#!/bin/bash
# Environment Setup Script for Secure IoT Monitoring System

echo "Setting up environment for Secure IoT Monitoring System..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd ../backend
npm install

# Initialize database
echo "Initializing database..."
node init-db.js

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install

# Set up Python virtual environment for gateway
echo "Setting up gateway environment..."
cd ../gateway
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Set up Python virtual environment for AI detection
echo "Setting up AI detection environment..."
cd ../ai-detection
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Set up Python virtual environment for IoT simulation
echo "Setting up IoT simulation environment..."
cd ../iot-simulation
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

echo "Environment setup complete!"
cd ../scripts