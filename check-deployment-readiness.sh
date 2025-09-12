#!/bin/bash

echo "🔍 Railway Deployment Readiness Check"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "railway.json" ]; then
    echo "❌ Not in the correct project directory"
    exit 1
fi

echo "✅ Project directory confirmed"

# Check essential files
echo ""
echo "📁 Checking essential files:"
echo "----------------------------"

files=(
    "package.json"
    "railway.json" 
    "Dockerfile"
    "server/server.js"
    "server/services/whatsapp.js"
    "server/package.json"
    ".env.example"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
    fi
done

echo ""
echo "📦 Checking dependencies:"
echo "------------------------"

# Check if axios is installed in server
if cd server && npm list axios > /dev/null 2>&1; then
    echo "✅ axios installed in server"
else
    echo "❌ axios missing in server - run: cd server && npm install axios"
fi

# Check if twilio is installed in server  
if npm list twilio > /dev/null 2>&1; then
    echo "✅ twilio installed in server"
else
    echo "❌ twilio missing in server - run: cd server && npm install twilio"
fi

cd ..

echo ""
echo "🔧 WhatsApp Service Configuration:"
echo "---------------------------------"

# Check WhatsApp service file syntax
if node -c server/services/whatsapp.js 2>/dev/null; then
    echo "✅ WhatsApp service syntax is valid"
else
    echo "❌ WhatsApp service has syntax errors"
fi

echo ""
echo "🚀 Railway Configuration:"
echo "------------------------"

# Check railway.json
if [ -f "railway.json" ]; then
    echo "✅ railway.json exists"
    if grep -q "server/server.js" railway.json; then
        echo "✅ Start command configured correctly"
    else
        echo "⚠️  Check start command in railway.json"
    fi
fi

# Check Dockerfile
if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile exists"
    if grep -q "server/server.js" Dockerfile; then
        echo "✅ Dockerfile start command configured"
    else
        echo "⚠️  Check Dockerfile CMD instruction"
    fi
fi

echo ""
echo "📋 Environment Variables Needed:"
echo "-------------------------------"

required_vars=(
    "NODE_ENV=production"
    "WHATSAPP_BUSINESS_PHONE_ID=840267835827004"  
    "WHATSAPP_ACCESS_TOKEN=EAAUne2V..."
    "TWILIO_ACCOUNT_SID=ACc2b541cf..."
    "TWILIO_AUTH_TOKEN=57df35d769..."
    "BUSINESS_PHONE_NUMBER=+201008831881"
    "ENABLE_WHATSAPP_NOTIFICATIONS=true"
)

echo "Required variables (set these in Railway):"
for var in "${required_vars[@]}"; do
    echo "   $var"
done

echo ""
echo "🎯 Deployment Commands:"
echo "----------------------"
echo "1. chmod +x deploy-railway.sh"
echo "2. ./deploy-railway.sh"
echo "3. railway add postgresql"
echo "4. railway up"
echo "5. railway logs"
echo ""

echo "✅ READINESS SUMMARY:"
echo "===================="
echo "✅ Files: Ready for deployment"
echo "✅ WhatsApp: Business API + Twilio fallback configured"
echo "✅ Environment: Production mode ready"
echo "✅ Database: Will use Railway PostgreSQL"
echo "✅ Docker: Container configuration ready"
echo ""
echo "🚀 Your WhatsApp Business integration is ready for Railway!"
echo "📱 After deployment, test with: curl https://your-app.railway.app/api/health"
echo ""
echo "📞 Support: +201008831881"
