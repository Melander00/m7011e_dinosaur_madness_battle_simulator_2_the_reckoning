#!/bin/bash

# Configuration
KEYCLOAK_URL="https://keycloak.ltu-m7011e-1.se"
REALM="myapp"
ADMIN_USER="admin"
ADMIN_PASSWORD="DinoAdmin2024!"

# User details (can be overridden via command line)
USERNAME="${1:-testuser}"
EMAIL="${2:-test@example.com}"
FIRST_NAME="${3:-Test}"
LAST_NAME="${4:-User}"
PASSWORD="${5:-testpass123}"

# Get admin access token
echo "Getting admin token..."
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASSWORD" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get admin token. Check your credentials."
  exit 1
fi

echo "Creating user: $USERNAME..."

# Create user
USER_ID=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"email\": \"$EMAIL\",
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\",
    \"enabled\": true,
    \"emailVerified\": true
  }" -i | grep -i location | sed 's/.*\///')

if [ -z "$USER_ID" ]; then
  echo "Failed to create user. User may already exist."
  exit 1
fi

echo "User created with ID: $USER_ID"

# Set password
echo "Setting password..."
curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"password\",
    \"value\": \"$PASSWORD\",
    \"temporary\": false
  }"

echo "User created successfully!"
echo "Username: $USERNAME"
echo "Email: $EMAIL"
echo "Password: $PASSWORD"
