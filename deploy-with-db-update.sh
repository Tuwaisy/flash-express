#!/bin/bash

# Complete Railway deployment script with database updates
# This script handles the full deployment process including database migrations

echo "🚂 Complete Railway Deployment with Database Updates"
echo "═══════════════════════════════════════════════════"

# Step 1: Check Railway CLI
echo "🔧 Checking Railway CLI..."
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo "📦 Install Railway CLI:"
    echo "   npm install -g @railway/cli"
    echo "   # or"
    echo "   curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

echo "✅ Railway CLI found"

# Step 2: Login and link project if needed
echo ""
echo "🔗 Ensuring Railway project is linked..."

# Check if already linked to correct project
if railway status 2>/dev/null | grep -q "4a13f477-87b2-4d0f-b2ac-2d35107882fd"; then
    echo "✅ Already linked to correct Railway project"
else
    echo "🔗 Linking to Railway project..."
    echo "💡 If you haven't logged in to Railway, you'll be prompted to do so"
    
    railway link 4a13f477-87b2-4d0f-b2ac-2d35107882fd
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully linked to Railway project"
    else
        echo "❌ Failed to link Railway project"
        echo "💡 Try manually: railway login && railway link 4a13f477-87b2-4d0f-b2ac-2d35107882fd"
        exit 1
    fi
fi

# Step 3: Get DATABASE_URL for migrations
echo ""
echo "📊 Preparing database update..."
echo "🔍 Getting DATABASE_URL from Railway..."

# Get the DATABASE_URL from Railway variables
DATABASE_URL=$(railway variables --kv | grep "DATABASE_URL=" | cut -d'=' -f2- | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Could not retrieve DATABASE_URL from Railway"
    echo "💡 Please ensure your Railway project has a PostgreSQL database attached"
    exit 1
fi

echo "✅ Retrieved DATABASE_URL from Railway"

# Step 4: Run database migrations
echo ""
echo "🗄️ Updating Railway database schema..."

# Export DATABASE_URL for the Node.js script
export DATABASE_URL="$DATABASE_URL"

# Run the database update script
if [ -f "scripts/update-railway-db.cjs" ]; then
    echo "🔧 Running database migrations..."
    node scripts/update-railway-db.cjs
    
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations completed successfully"
    else
        echo "❌ Database migration failed"
        echo "💡 Check the error messages above and try again"
        exit 1
    fi
else
    echo "❌ Database migration script not found at scripts/update-railway-db.cjs"
    exit 1
fi

# Step 5: Deploy the application
echo ""
echo "🚀 Deploying application to Railway..."
echo "📦 Building and deploying (this may take a few minutes)..."

railway up --detach

if [ $? -eq 0 ]; then
    echo "✅ Deployment initiated successfully!"
else
    echo "❌ Deployment failed"
    echo "💡 Check Railway logs: railway logs"
    exit 1
fi

# Step 6: Show deployment info
echo ""
echo "🎉 Deployment Complete!"
echo "═══════════════════════"
echo ""
echo "📊 What was updated:"
echo "   ✅ Partnership tier system (Bronze, Silver, Gold)"
echo "   ✅ Client analytics with tier information"
echo "   ✅ Enhanced wallet balance tracking"
echo "   ✅ All database migrations applied"
echo "   ✅ Latest application code deployed"
echo ""
echo "🔗 Useful commands:"
echo "   railway logs           # View deployment logs"
echo "   railway logs --build   # View build logs"
echo "   railway open          # Open your deployed app"
echo "   railway domain        # Get your app domain"
echo "   railway status        # Check deployment status"
echo ""
echo "📊 Railway Dashboard:"
echo "   https://railway.app/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd"
echo ""
echo "💡 Next steps:"
echo "   1. Wait for deployment to complete (check with: railway logs)"
echo "   2. Test the application with existing clients"
echo "   3. Verify tier assignments work for clients with 50+ shipments"
echo "   4. Monitor client analytics dashboard"
echo ""
echo "🎯 Partnership Tiers:"
echo "   • Bronze: 50+ shipments (2% discount)"
echo "   • Silver: 150+ shipments (10% discount)"  
echo "   • Gold: 300+ shipments (15% discount)"
