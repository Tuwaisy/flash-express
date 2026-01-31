#!/bin/bash

# Quick Database Recovery Script
# This script helps recover from backup restore issues

set -e

RAILWAY_URL="${RAILWAY_URL:-https://flash-express-prod.up.railway.app}"
JWT_TOKEN="${JWT_TOKEN}"

echo "=========================================="
echo "🚀 Flash Express Database Recovery Script"
echo "=========================================="
echo ""

# Check if JWT token is provided
if [ -z "$JWT_TOKEN" ]; then
    echo "❌ JWT_TOKEN not set"
    echo "Usage: export JWT_TOKEN='your_token' && bash quick-recovery.sh"
    exit 1
fi

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X $method "$RAILWAY_URL$endpoint" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "Content-Type: application/json"
    else
        curl -s -X $method "$RAILWAY_URL$endpoint" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

echo "1️⃣ Checking available backups..."
BACKUPS=$(api_call GET "/api/admin/backups" | jq -r '.backups[] | .filename' 2>/dev/null || echo "")

if [ -z "$BACKUPS" ]; then
    echo "❌ No backups found or API error"
    echo "Available backups might not be accessible"
    exit 1
fi

echo "✅ Found backups:"
echo "$BACKUPS" | nl

echo ""
echo "2️⃣ Which backup would you like to restore? (Enter number)"
read -p "Enter backup number (1-$(echo "$BACKUPS" | wc -l)): " BACKUP_NUM

SELECTED_BACKUP=$(echo "$BACKUPS" | sed -n "${BACKUP_NUM}p")

if [ -z "$SELECTED_BACKUP" ]; then
    echo "❌ Invalid selection"
    exit 1
fi

echo "📦 Selected backup: $SELECTED_BACKUP"
echo ""

echo "3️⃣ Starting restore from backup..."
RESTORE_RESPONSE=$(api_call POST "/api/admin/restore-backup" "{\"filename\": \"$SELECTED_BACKUP\"}")

echo "Response:"
echo "$RESTORE_RESPONSE" | jq '.' 2>/dev/null || echo "$RESTORE_RESPONSE"

echo ""
echo "4️⃣ Verifying restore success..."

ADMIN_RESTORED=$(echo "$RESTORE_RESPONSE" | jq -r '.adminStatus.restored' 2>/dev/null || echo "false")
SUCCESS=$(echo "$RESTORE_RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")

if [ "$SUCCESS" = "true" ] || [ "$ADMIN_RESTORED" = "true" ]; then
    echo "✅ Restore appears successful!"
    echo ""
    echo "5️⃣ Testing admin login..."
    
    LOGIN_TEST=$(curl -s -X POST "$RAILWAY_URL/api/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@shuhna.net",
            "password": "password123"
        }')
    
    ADMIN_LOGIN=$(echo "$LOGIN_TEST" | jq -r '.email' 2>/dev/null || echo "")
    
    if [ "$ADMIN_LOGIN" = "admin@shuhna.net" ]; then
        echo "✅ Admin login successful!"
        echo "✅ Admin email: $ADMIN_LOGIN"
        echo ""
        echo "🎉 Database restore completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Try logging in with other user accounts"
        echo "2. Check if sidebar items (inventory, assets) are visible"
        echo "3. Test sending verification codes"
    else
        echo "⚠️ Admin login test failed"
        echo "You may need to use the emergency password reset endpoint"
        echo ""
        echo "To reset admin password:"
        echo 'curl -X POST $RAILWAY_URL/api/admin/reset-password \'
        echo '  -d "{\"adminSecret\": \"YOUR_ADMIN_SECRET\", \"email\": \"admin@shuhna.net\", \"newPassword\": \"NewPassword123\"}"'
    fi
else
    echo "❌ Restore may have failed"
    echo "Check the response above for error details"
    echo ""
    echo "Error details:"
    echo "$RESTORE_RESPONSE" | jq '.results.errors' 2>/dev/null || echo "Could not parse errors"
fi

echo ""
echo "=========================================="
echo "Recovery script completed"
echo "=========================================="
