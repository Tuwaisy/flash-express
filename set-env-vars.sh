#!/bin/bash

# Set remaining environment variables for flash-express-app service
# Usage: ./set-env-vars.sh

echo "🔧 Setting up remaining environment variables for flash-express-app..."

# Make sure we're linked to the correct service
railway service flash-express-app

echo "📧 Email configuration (for sending notifications):"
echo "Please provide your Gmail settings:"
read -p "EMAIL_USER (Gmail address): " EMAIL_USER
read -s -p "EMAIL_PASS (Gmail app password): " EMAIL_PASS
echo

echo "📱 Twilio configuration (for SMS):"
read -p "TWILIO_ACCOUNT_SID: " TWILIO_ACCOUNT_SID
read -s -p "TWILIO_AUTH_TOKEN: " TWILIO_AUTH_TOKEN
echo
read -p "TWILIO_PHONE_NUMBER (e.g., +1234567890): " TWILIO_PHONE_NUMBER

echo "💬 WhatsApp configuration:"
read -s -p "WHATSAPP_ACCESS_TOKEN: " WHATSAPP_ACCESS_TOKEN
echo
read -p "WHATSAPP_VERIFY_TOKEN: " WHATSAPP_VERIFY_TOKEN

echo ""
echo "🚀 Setting environment variables..."

# Set all the variables
railway variables --set "EMAIL_USER=$EMAIL_USER"
railway variables --set "EMAIL_PASS=$EMAIL_PASS"
railway variables --set "TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID"
railway variables --set "TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN"
railway variables --set "TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER"
railway variables --set "WHATSAPP_ACCESS_TOKEN=$WHATSAPP_ACCESS_TOKEN"
railway variables --set "WHATSAPP_VERIFY_TOKEN=$WHATSAPP_VERIFY_TOKEN"

echo "✅ Environment variables set successfully!"
echo "🌐 Your application is available at:"
echo "   https://flash-express-app-production-3e30.up.railway.app"
echo ""
echo "📊 To view logs: railway logs"
echo "📱 To view in browser: railway open"
