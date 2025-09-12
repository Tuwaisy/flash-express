# WhatsApp Business API Token Management Guide

## Current Status
✅ **WhatsApp Service Working**: Messages sending via Twilio fallback
⚠️ **Token Expires**: Your current token expires on September 12, 2025 (1 day)
🔧 **Action Required**: Set up permanent token to avoid interruptions

## 🎯 Quick Solution: Get Your Permanent Token

### Method 1: Using Facebook Business Manager (Recommended)

1. **Go to Facebook Business Manager**
   - Visit: https://business.facebook.com/
   - Select your business account

2. **Navigate to WhatsApp Business API**
   - Go to "Business Settings" → "WhatsApp Business API"
   - Find your phone number: +20 10 08831881

3. **Generate Permanent Access Token**
   - Click on "System Users" in Business Settings
   - Create or select a system user
   - Assign WhatsApp Business Management and Messaging permissions
   - Generate Access Token → **This token never expires!**

### Method 2: Using Meta Developer Console

1. **Visit Meta Developer Console**
   - Go to: https://developers.facebook.com/apps/1450785819375989
   - This is your app ID from the token test

2. **Get Long-lived Token**
   - Go to "Tools" → "Access Token Tool"
   - Select "Get User Access Token"
   - Choose required permissions
   - Use "Exchange for Long-lived Token" button

3. **Convert to Permanent**
   - Use the token exchange endpoint
   - Get page access token (permanent)

### Method 3: Automated (Via Our System)

Once you have the required credentials, our system can generate permanent tokens automatically:

```bash
# Add these to Railway environment variables:
WHATSAPP_APP_ID=1450785819375989
WHATSAPP_APP_SECRET=your_app_secret_here
WHATSAPP_CLIENT_ID=your_client_id_here  
WHATSAPP_CLIENT_SECRET=your_client_secret_here
```

Then call: `POST /api/whatsapp/generate-permanent-token`

## 🔑 Current Working Configuration

```bash
# Your current setup (working but temporary):
WHATSAPP_ACCESS_TOKEN=EAAUne2VouXUBPc26v9nrHbZCE2XRmx2OZAsiYfotKLsQPLSEF3wvv0ZBzXkm7sFWkphC6rG3HhjMGOhjnhqT1kfYgfUkhJvZB2V1pWGQKFy4WvlQ0hTwt6YAb3O096seZAwneNZBFY5Dnjevpeb5a5glCM1Y4usOZAaGf28AW5Qu9ZA93D711ceJpZB8IshKhJuNHSCZCY4UnF8UVfcU7pZAnderrFwD41mOY80ff577grvfG4ZD
WHATSAPP_BUSINESS_PHONE_ID=725991710605466
WHATSAPP_BUSINESS_ID=640912622407126

# Test phone issue:
# Error 131032: +201000909899 needs to be verified in Meta Console for test mode
```

## 📱 Fix Test Phone Number Issue

Your phone number +201000909899 is not verified for test mode. Here's how to fix:

### Option A: Add as Test Number
1. Go to Meta Developer Console → Your App → WhatsApp → Getting Started
2. Add +201000909899 to "Test Phone Numbers"
3. Verify with SMS code sent to your phone

### Option B: Get Production Approval
1. Go to Meta Developer Console → App Review
2. Submit for "whatsapp_business_messaging" permission
3. Once approved, no test phone restrictions

## 🔄 Token Refresh System (Implemented)

Your system now includes automatic token monitoring:

### Features:
- ✅ **24-hour token health checks**
- ✅ **Automatic refresh when expiring**
- ✅ **Fallback to Twilio if token fails**
- ✅ **Admin endpoints for manual management**

### Admin Endpoints:
```bash
GET  /api/whatsapp/status              # Check current status
POST /api/whatsapp/check-token         # Manual token check
POST /api/whatsapp/refresh-token       # Refresh current token  
POST /api/whatsapp/generate-permanent-token  # Generate permanent token
POST /api/whatsapp/test-message        # Send test message
```

## 🛠️ Immediate Action Plan

### Today (Token expires in 1 day):
1. **Get new temporary token** from Meta Developer Console if needed
2. **Add test phone** +201000909899 to verified numbers
3. **Test messaging** using: `POST /api/whatsapp/test-message`

### This Week:
1. **Set up permanent token** using Method 1 above
2. **Update Railway** with new permanent token
3. **Remove Twilio dependency** (optional, but permanent token is better)

### Long-term:
1. **Monitor token health** via admin dashboard
2. **Set up alerts** for token issues
3. **Document backup procedures**

## 🧪 Testing Your Setup

Use the test script to verify everything:

```bash
node test-whatsapp-token.cjs
```

Expected results:
- ✅ Token Valid: YES
- ✅ Phone Access: YES  
- ✅ Business Access: YES
- ❌ Message Sending: NO (until phone verified)
- ✅ Account Info: YES

## 📞 Support Contacts

If you need help:
- **Meta Support**: Developer Console → Help Center
- **Direct Support**: Contact support via your Meta Business account
- **Documentation**: https://developers.facebook.com/docs/whatsapp/business-management-api

## 🔧 Troubleshooting

### Common Issues:

**Error 190: Invalid Application ID**
- Check your app ID: 1450785819375989
- Verify token permissions in Meta Console

**Error 131032: Invalid Test Phone**
- Add +201000909899 to test numbers in Meta Console
- Or get production approval

**Error 401: Token Expired**  
- Generate new token from Meta Console
- Update Railway environment variables

**Error 101: Missing Parameters**
- Add APP_SECRET and CLIENT_SECRET to Railway
- Check token manager credentials

## 🎉 Success Criteria

You'll know everything is working when:
1. ✅ Messages send successfully via Business API
2. ✅ No more Twilio fallback needed
3. ✅ Token shows "Never expires" in status check
4. ✅ Test phone +201000909899 verified
5. ✅ No more token expiry warnings
