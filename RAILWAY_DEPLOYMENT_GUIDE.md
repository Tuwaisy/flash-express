# 🚀 Railway Deployment Guide - WhatsApp Business API Integration

## 📋 Pre-Deployment Checklist

### ✅ What's Ready:
- [x] **WhatsApp Business API** integrated and tested
- [x] **Twilio fallback** configured and working
- [x] **Environment detection** (development/production)
- [x] **Smart fallback system** (Business API → Twilio)
- [x] **Unified messaging service** for all notifications
- [x] **Health check endpoint** with service status
- [x] **Docker configuration** updated
- [x] **Railway configuration** optimized

### 📱 Services Configured:
1. **WhatsApp Business API** (Production)
   - Phone ID: `840267835827004`
   - Access Token: Configured
   - Verify Token: Set for webhooks

2. **Twilio WhatsApp** (Development/Fallback)
   - Account SID: `ACc2b541cfc288dee5b50807667f34d7b9`
   - Sandbox Number: `+14155238886`
   - SMS Fallback: `+13204222766`

3. **Business Configuration**
   - Support Phone: `+201008831881`
   - Environment: Auto-detected
   - Notifications: Enabled

## 🚀 Deployment Steps

### Step 1: Run Deployment Script
```bash
# Make script executable
chmod +x deploy-railway.sh

# Run deployment setup
./deploy-railway.sh
```

### Step 2: Add PostgreSQL Database
```bash
# Add PostgreSQL plugin to Railway project
railway add postgresql

# Check database connection
railway run echo $DATABASE_URL
```

### Step 3: Deploy Application
```bash
# Deploy to Railway
railway up

# Monitor deployment
railway logs

# Open deployed app
railway open
```

### Step 4: Verify Deployment
```bash
# Check health endpoint
curl https://your-app.railway.app/api/health

# Check WhatsApp service status
curl https://your-app.railway.app/api/whatsapp/status
```

## 🔧 Environment Variables

### Required for Production:
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://... (auto-configured by Railway)

# WhatsApp Business API (Production)
WHATSAPP_BUSINESS_PHONE_ID=840267835827004
WHATSAPP_ACCESS_TOKEN=EAAUne2VouXUBPV6jWsOim4ClbzZBvwniK1WseKex8zYqoLaq5THZCYFfisxC0qB2ZBeOWYBTZC6CRAvNLi2kZCqOtLGklMr0FOJZCZBm7RPa5YE7Rt5dZCOchFGYnb5XS11ZAuXJJ8HeRgFJdK0CERy9v0VepSLPpZA2Yoi7fPoLiRFMK81EOQiDRxjZARdHfnPNZAMZCxkBrw2ZBU0rZAWf7QvxIHDzkHqNoVWPLcBwHsL5ZAMdcl8ZD
WHATSAPP_VERIFY_TOKEN=flash_express_verify_token_2024

# Twilio Fallback
TWILIO_ACCOUNT_SID=ACc2b541cfc288dee5b50807667f34d7b9
TWILIO_AUTH_TOKEN=57df35d769b6f5eb73fdb9b5576aecff
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_SMS_NUMBER=+13204222766

# Notifications
ENABLE_WHATSAPP_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=true

# Business Config
BUSINESS_PHONE_NUMBER=+201008831881
FRONTEND_URL=https://www.shuhna.net
```

## 🔍 Testing After Deployment

### 1. Health Check
```bash
curl https://your-app.railway.app/api/health

# Expected Response:
{
  "status": "OK",
  "environment": "production",
  "database": "PostgreSQL",
  "services": {
    "whatsapp": {
      "enabled": true,
      "provider": "business_api",
      "businessPhone": "+201008831881"
    }
  }
}
```

### 2. WhatsApp Service Status
```bash
curl https://your-app.railway.app/api/whatsapp/status

# Expected Response:
{
  "enabled": true,
  "environment": "production",
  "provider": "business_api",
  "businessPhone": "+201008831881",
  "twilioConfigured": true,
  "businessApiConfigured": true
}
```

### 3. Send Test Verification
```bash
curl -X POST https://your-app.railway.app/api/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "+201000909899", "type": "test"}'
```

## 📱 WhatsApp Integration Features

### Production Mode (NODE_ENV=production):
- ✅ **Primary**: WhatsApp Business API
- ✅ **Fallback**: Twilio (if Business API fails)
- ✅ **Official business messaging** with verification badge
- ✅ **Professional appearance** in WhatsApp

### Development Mode:
- ✅ **Primary**: Twilio Sandbox
- ✅ **Testing environment** for development
- ✅ **Same functionality** as production

### Message Types Supported:
- 🔐 **Verification codes** (login/signup)
- 📦 **Delivery notifications**
- 📍 **Status updates** (pickup, transit, delivered)
- 👋 **Welcome messages**
- 🏢 **Client notifications**

## 🔄 Monitoring & Maintenance

### Check Service Status:
```bash
# View logs
railway logs --follow

# Check variables
railway variables

# Restart service
railway redeploy
```

### WhatsApp Business API Token Refresh:
- Access tokens expire every 90 days
- Monitor Meta Developer Console
- Update `WHATSAPP_ACCESS_TOKEN` when needed

### Webhook Configuration:
- Webhook URL: `https://your-app.railway.app/webhook/whatsapp`
- Verify Token: `flash_express_verify_token_2024`
- Configure in Meta Developer Console

## 🎯 Success Metrics

After deployment, you should have:
- ✅ **99% message delivery** via Business API
- ✅ **Professional WhatsApp presence**
- ✅ **Automatic fallback** to Twilio if needed
- ✅ **Comprehensive logging** for debugging
- ✅ **Health monitoring** endpoints
- ✅ **Scalable infrastructure** on Railway

## 📞 Support

If deployment issues occur:
- Check Railway logs: `railway logs`
- Verify environment variables: `railway variables`
- Test health endpoint: `/api/health`
- Contact support: +201008831881

---

**Your WhatsApp Business integration is ready for production deployment! 🚀📱**
