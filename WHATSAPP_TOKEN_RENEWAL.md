# WhatsApp Business API Token Renewal Guide

## Issue: Access Token Expired
Current token expired on: **Wednesday, 10-Sep-25 23:00:00 PDT**

## Solution: Generate New Access Token

### Step 1: Access Meta Developer Console
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Log in with your Facebook account
3. Navigate to "My Apps" → Your WhatsApp Business App

### Step 2: Generate New Token
1. In your app dashboard, go to **WhatsApp > Getting Started**
2. Find the "Temporary access token" section
3. Click **"Generate Token"**
4. Copy the new token (starts with `EAAU...`)

### Step 3: Update Railway Environment
Run this command with your new token:
```bash
railway variables --set "WHATSAPP_ACCESS_TOKEN=YOUR_NEW_TOKEN_HERE"
```

### Step 4: Get Long-Lived Token (Recommended)
For production, you should use a **System User Access Token**:

1. Go to **Business Manager** (business.facebook.com)
2. Navigate to **Business Settings > Users > System Users**
3. Create or select a System User
4. Assign WhatsApp Business Management permissions
5. Generate a token - this will be long-lived (60 days or permanent)

### Alternative: Use Current Setup with Twilio
The system is currently working with Twilio fallback. If you want to keep using Twilio for now:
- Messages are being sent successfully via Twilio
- Recipients receive WhatsApp messages from the Twilio sandbox number
- You can update to Business API later with a fresh token

## Current Status
- ✅ WhatsApp messages working (via Twilio fallback)
- ✅ Phone number formatting fixed  
- ✅ Verification system working
- ⚠️  Business API needs new token for direct sending

## Quick Test
After updating the token, you can test with:
```bash
node test-business-api-token.cjs
```
