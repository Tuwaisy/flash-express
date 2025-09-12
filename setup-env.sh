#!/bin/bash

echo "Setting up Railway environment variables..."

# Set basic environment variables
railway variables --set "NODE_ENV=production"

# Check current status
echo "Current Railway status:"
railway status

# Get database URL from PostgreSQL service
echo "Getting database connection info..."
railway variables --service Postgres

echo "Setup script completed. Please check Railway dashboard for DATABASE_URL."
echo "Visit: https://railway.app/dashboard"
