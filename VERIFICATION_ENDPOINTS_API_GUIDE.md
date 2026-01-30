# Order Verification Endpoints - Quick Reference Guide

## Available Endpoints

### 1. Send Delivery Code
**Endpoint**: `POST /api/shipments/{shipmentId}/send-delivery-code`

**Request**:
```json
{
  // No body required - uses shipment ID from URL
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Verification code sent via whatsapp",
  "channel": "whatsapp",
  "codeExpiresIn": 600
}
```

**Rate Limit (429)**:
```json
{
  "error": "Too many attempts",
  "message": "Please wait before requesting another code. (Maximum 3 attempts per minute)",
  "retryAfter": 60
}
```

**Service Unavailable (503)**:
```json
{
  "error": "Account exceeded the 50 daily messages limit",
  "message": "Verification service is temporarily unavailable due to rate limits. Please try again in a few moments.",
  "serviceStatus": {
    "whatsapp": "unavailable",
    "sms": "unavailable"
  },
  "retryAfter": 60
}
```

---

### 2. Verify Delivery Code
**Endpoint**: `POST /api/shipments/{shipmentId}/verify-delivery-code`

**Request**:
```json
{
  "code": "123456"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Delivery verified successfully"
}
```

**Invalid Code (400)**:
```json
{
  "error": "Code not found",
  "message": "Code not found. Please check the code you entered."
}
```

**Expired Code (410)**:
```json
{
  "error": "Code has expired",
  "message": "Your verification code has expired. Please request a new one."
}
```

**Rate Limit (429)**:
```json
{
  "error": "Too many verification attempts",
  "message": "Please wait before trying again. (Maximum 5 attempts per 5 minutes)",
  "retryAfter": 300
}
```

---

### 3. Send Login/Signup Verification Code
**Endpoint**: `POST /api/send-verification-code`

**Request**:
```json
{
  "phone": "+201234567890",
  "purpose": "login",
  "metadata": {}
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Verification code sent via whatsapp",
  "verificationId": "VER_1234567890123",
  "channel": "whatsapp",
  "expiresAt": "2026-01-31T12:10:00Z",
  "codeExpiresIn": 600
}
```

**Cooldown Active (429)**:
```json
{
  "success": false,
  "error": "Please wait before requesting another code",
  "message": "Please wait before requesting another code",
  "cooldownRemaining": 45000,
  "retryAfter": 45
}
```

---

### 4. Verify Login/Signup Code
**Endpoint**: `POST /api/verify-code`

**Request**:
```json
{
  "phone": "+201234567890",
  "code": "123456",
  "purpose": "login"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Code verified successfully",
  "verificationId": "VER_1234567890123",
  "metadata": {}
}
```

**Invalid Code (400)**:
```json
{
  "success": false,
  "error": "Code not found",
  "message": "Verification failed. Please check your code and try again."
}
```

**Code Expired (410)**:
```json
{
  "success": false,
  "error": "Code has expired",
  "message": "Your verification code has expired. Please request a new one."
}
```

---

### 5. Verification Health Check
**Endpoint**: `GET /api/verification/health`

**Response (200)**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T12:00:00.000Z",
  "services": {
    "whatsapp": {
      "enabled": true,
      "provider": "Business API"
    },
    "verification_database": {
      "accessible": true,
      "recentVerifications": 42,
      "recentDeliveryVerifications": 18,
      "failedAttempts": 3
    }
  },
  "recommendations": []
}
```

**Degraded Status (200)**:
```json
{
  "status": "degraded",
  "timestamp": "2026-01-31T12:00:00.000Z",
  "services": {
    "whatsapp": {
      "enabled": false,
      "provider": "unavailable"
    },
    "verification_database": {
      "accessible": true,
      "recentVerifications": 42,
      "recentDeliveryVerifications": 18,
      "failedAttempts": 15
    }
  },
  "recommendations": [
    "WhatsApp service is not available. Verification codes cannot be sent.",
    "High number of failed verification attempts. Check rate limiting."
  ]
}
```

---

### 6. Get Service Status
**Endpoint**: `GET /api/verification/status`

**Response (200)**:
```json
{
  "whatsapp": {
    "enabled": true,
    "provider": "Business API",
    "businessPhone": "+201008831881"
  },
  "sms": {
    "enabled": true,
    "provider": "Twilio"
  },
  "codeExpiry": 600000,
  "maxAttempts": 3
}
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| **200** | OK | Request succeeded |
| **400** | Bad Request | Invalid input or code |
| **404** | Not Found | Shipment/user not found |
| **410** | Gone | Code expired |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Server Error | Unexpected error |
| **503** | Service Unavailable | WhatsApp/SMS service down |

---

## Rate Limits

### Delivery Code (per shipment)
- **Sending**: 3 attempts per 60 seconds
- **Verification**: 5 attempts per 5 minutes

### Login Code (per phone number)
- **Sending**: 1 attempt per 60 seconds (cooldown)
- **Verification**: 3 attempts total

---

## Headers

### Request Headers
```
Content-Type: application/json
```

### Response Headers
```
Retry-After: 60  (included when rate limited)
```

---

## Error Handling Best Practices

### Client-Side
```javascript
async function sendDeliveryCode(shipmentId) {
  try {
    const response = await fetch(`/api/shipments/${shipmentId}/send-delivery-code`, {
      method: 'POST'
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      showError(`Please wait ${retryAfter} seconds before trying again`);
      return;
    }

    if (response.status === 503) {
      showWarning('Verification service temporarily unavailable. Try again soon.');
      return;
    }

    if (response.status === 400) {
      const data = await response.json();
      showError(data.message);
      return;
    }

    const data = await response.json();
    if (data.success) {
      showSuccess(`Code sent via ${data.channel}. Expires in ${data.codeExpiresIn} seconds.`);
    }
  } catch (error) {
    showError('Failed to send verification code');
  }
}

async function verifyDeliveryCode(shipmentId, code) {
  try {
    const response = await fetch(`/api/shipments/${shipmentId}/verify-delivery-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (response.status === 410) {
      showError('Your code has expired. Please request a new one.');
      return;
    }

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '300');
      showError(`Too many attempts. Try again in ${retryAfter} seconds.`);
      return;
    }

    const data = await response.json();
    if (data.success) {
      showSuccess('Delivery confirmed!');
    } else {
      showError(data.message || data.error);
    }
  } catch (error) {
    showError('Failed to verify code');
  }
}
```

---

## Monitoring Commands

### Check API Health
```bash
curl https://www.shuhna.net/api/health
```

### Check Verification Health
```bash
curl https://www.shuhna.net/api/verification/health
```

### Check Service Status
```bash
curl https://www.shuhna.net/api/verification/status
curl https://www.shuhna.net/api/whatsapp/status
```

---

## Common Issues & Solutions

### Issue: "Account exceeded the 50 daily messages limit"
**Cause**: Twilio free tier daily limit reached
**Solution**: 
- Wait until UTC midnight for limit reset
- Upgrade Twilio account
- Implement manual verification fallback

### Issue: "Too many attempts"
**Cause**: Rate limit exceeded
**Solution**: 
- Wait the time indicated in `Retry-After` header
- Check `retryAfter` field in response
- Don't retry immediately

### Issue: "Code not found"
**Cause**: Invalid code or code already verified
**Solution**:
- Request a new code
- Check code hasn't already been used
- Verify code format is correct

### Issue: "Your verification code has expired"
**Cause**: Code is older than 10 minutes
**Solution**:
- Request a new code immediately
- Codes are only valid for 10 minutes

---

## Database Tables

### delivery_verification_attempts
Tracks verification attempts for rate limiting
```sql
SELECT * FROM delivery_verification_attempts 
WHERE shipmentId = 'CAI-260130-0-0000' 
ORDER BY created_at DESC 
LIMIT 5;
```

### delivery_verifications
Stores delivery verification codes
```sql
SELECT * FROM delivery_verifications 
WHERE shipmentId = 'CAI-260130-0-0000';
```

### verifications
Stores login/signup verification codes
```sql
SELECT * FROM verifications 
WHERE phone = '+201234567890' 
ORDER BY created_at DESC 
LIMIT 5;
```

