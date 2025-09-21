#!/bin/bash

# Deploy Shuhna Express to Different Railway Account
echo "🚀 Deploying Shuhna Express to Mohamed Lashin's Railway Account..."

# Build the project first
echo "📦 Building the project..."
npm run build

echo "🔧 Creating new Railway service with environment variables..."

# Create new service and set all environment variables
echo "🆕 Creating main application service..."

# Add service with variables (based on old deployment scripts)
railway add --service "flash-express-app" \
    --variables "NODE_ENV=production" \
    --variables "EMAIL_USER=$EMAIL_USER" \
    --variables "EMAIL_PASS=$EMAIL_PASS" \
    --variables "TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID" \
    --variables "TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN" \
    --variables "TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER" \
    --variables "BUSINESS_PHONE_NUMBER=+201008831881" \
    --variables "WHATSAPP_ACCESS_TOKEN=$WHATSAPP_ACCESS_TOKEN" \
    --variables "WHATSAPP_VERIFY_TOKEN=$WHATSAPP_VERIFY_TOKEN" \
    --variables "WHATSAPP_BUSINESS_PHONE_ID=725991710605466" \
    --variables "WHATSAPP_BUSINESS_ID=640912622407126" \
    --variables "WHATSAPP_APP_ID=1450785819375989" \
    --variables "ENABLE_WHATSAPP_NOTIFICATIONS=true"

echo "🌐 Setting additional environment variables if needed..."

# Set variables using the newer syntax (backup method)
railway variables --set "NODE_ENV=production"
railway variables --set "BUSINESS_PHONE_NUMBER=+201008831881"  
railway variables --set "WHATSAPP_BUSINESS_PHONE_ID=725991710605466"
railway variables --set "WHATSAPP_BUSINESS_ID=640912622407126"
railway variables --set "WHATSAPP_APP_ID=1450785819375989"
railway variables --set "ENABLE_WHATSAPP_NOTIFICATIONS=true"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Generated URLs:"
railway domain

echo ""
echo "Project URL: https://railway.com/project/c9dd6730-b9c2-4f70-bbc6-ed1ebc87800c"
echo ""
echo "🔐 Required Environment Variables (set these if not already provided):"
echo "   - EMAIL_USER (Gmail address for sending emails)"
echo "   - EMAIL_PASS (Gmail app password)"
echo "   - TWILIO_ACCOUNT_SID"
echo "   - TWILIO_AUTH_TOKEN" 
echo "   - TWILIO_PHONE_NUMBER"
echo "   - WHATSAPP_ACCESS_TOKEN"
echo "   - WHATSAPP_VERIFY_TOKEN"
