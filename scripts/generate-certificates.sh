#!/bin/bash
# Certificate Generation Script for Secure IoT Monitoring System

# Create certificates directory if it doesn't exist
mkdir -p ../certificates
cd ../certificates

echo "Generating SSL certificates for secure communications..."

# Generate CA certificate
openssl genrsa -out ca.key 2048
openssl req -new -x509 -days 365 -key ca.key -out ca.crt -subj "/CN=IoT-Security-CA"

# Generate server certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=localhost"
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt

echo "Certificate generation complete."
echo "CA certificate: ca.crt"
echo "Server certificate: server.crt"
echo "Server key: server.key"

cd ../scripts