#!/bin/bash

# Shuhna Express Railway Deployment Script
echo "🚀 Deploying Shuhna Express to Railway..."

# Set production environment
echo "Setting environment variables..."
railway variables --set "NODE_ENV=production"

# Check if environment variables are needed
echo ""
echo "📧 Email Configuration:"
echo "If you haven't set email credentials yet, you'll need to set:"
echo "- EMAIL_USER (your email)"
echo "- EMAIL_PASS (your email password)"
echo ""

echo "📱 SMS Configuration (optional):"
echo "If you want SMS functionality, set:"
echo "- TWILIO_ACCOUNT_SID"
echo "- TWILIO_AUTH_TOKEN" 
echo "- TWILIO_PHONE_NUMBER"
echo ""

read -p "Do you want to set email credentials now? (y/n): " setup_email

if [ "$setup_email" = "y" ]; then
    read -p "Enter your email: " email_user
    read -s -p "Enter your email password: " email_pass
    echo ""
    
    railway variables --set "EMAIL_USER=$email_user"
    railway variables --set "EMAIL_PASS=$email_pass"
    echo "✅ Email credentials set"
fi

echo ""
read -p "Do you want to set Twilio credentials now? (y/n): " setup_twilio

if [ "$setup_twilio" = "y" ]; then
    read -p "Enter Twilio Account SID: " twilio_sid
    read -s -p "Enter Twilio Auth Token: " twilio_token
    echo ""
    read -p "Enter Twilio Phone Number: " twilio_phone
    
    railway variables --set "TWILIO_ACCOUNT_SID=$twilio_sid"
    railway variables --set "TWILIO_AUTH_TOKEN=$twilio_token"
    railway variables --set "TWILIO_PHONE_NUMBER=$twilio_phone"
    echo "✅ Twilio credentials set"
fi

echo ""
echo "🔨 Building and deploying to Railway..."

# Deploy the application
railway up --detach

echo ""
echo "✅ Deployment initiated!"
echo "🌐 You can view your deployment logs with: railway logs"
echo "🌐 You can view build logs with: railway logs --build"
echo "🔗 Open your app with: railway open"
echo "🔗 Get your domain with: railway domain"
echo ""
echo "📊 Monitor deployment: https://railway.app/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd"
