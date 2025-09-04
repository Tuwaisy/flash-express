#!/bin/bash

# Railway Setup Script for Shuhna Express
echo "Setting up Shuhna Express on Railway..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the flashexpress project directory"
    exit 1
fi

# Set environment variables
echo "Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set EMAIL_USER=$1
railway variables set EMAIL_PASS=$2
railway variables set TWILIO_ACCOUNT_SID=$3
railway variables set TWILIO_AUTH_TOKEN=$4
railway variables set TWILIO_PHONE_NUMBER=$5

# Deploy the application
echo "Deploying to Railway..."
railway up

echo "Setup complete! Your app should be available shortly."
echo "Run 'railway open' to view your deployed application."
