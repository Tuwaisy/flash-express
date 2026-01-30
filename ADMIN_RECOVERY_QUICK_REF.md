# Admin Account Recovery - Quick Commands

## Emergency Admin Password Reset

If your admin account is locked after backup restore, use this command:

```bash
# Using curl
curl -X POST https://your-railway-domain/api/admin/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "adminSecret": "your-admin-secret-from-railway-env",
    "email": "admin@shuhna.net",
    "newPassword": "TemporaryPassword123"
  }'
```

## Via Node.js/JavaScript

```javascript
const response = await fetch('/api/admin/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    adminSecret: process.env.ADMIN_SECRET,
    email: 'admin@shuhna.net',
    newPassword: 'TemporaryPassword123'
  })
});

const result = await response.json();
console.log(result);
```

## Via Python

```python
import requests

response = requests.post('https://your-railway-domain/api/admin/reset-password', 
  json={
    'adminSecret': 'your-admin-secret',
    'email': 'admin@shuhna.net',
    'newPassword': 'TemporaryPassword123'
  }
)

print(response.json())
```

## Restoring a Backup

```bash
# Restore with automatic admin preservation
curl -X POST https://your-railway-domain/api/admin/restore-backup \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "backup-2024-01-15-10-30-00.json"
  }'

# Response includes admin status
# {
#   "adminStatus": { 
#     "preserved": true,
#     "restored": true 
#   }
# }
```

## Getting ADMIN_SECRET from Railway

1. Go to Railway dashboard
2. Select your project
3. Go to "Variables" tab
4. Find `ADMIN_SECRET`
5. Copy the value (it will be displayed as dots, click to reveal)

## Testing Admin Login

```bash
# Login with reset credentials
curl -X POST https://your-railway-domain/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@shuhna.net",
    "password": "TemporaryPassword123"
  }'

# Response should include JWT token
# {
#   "success": true,
#   "user": { "id": 1, "email": "admin@shuhna.net", ... }
# }
```

## Immediate Steps if Locked Out

1. **Get ADMIN_SECRET** from Railway environment variables
2. **Call reset endpoint** with temporary password
3. **Login** with new temporary password
4. **Change password** to something secure in admin settings
5. **Update ADMIN_SECRET** in Railway (optional security measure)

## Environment Variables to Check in Railway

```
ADMIN_SECRET=your-secure-admin-secret
JWT_SECRET=your-jwt-secret
WHATSAPP_ACCESS_TOKEN=your-token
DATABASE_URL=your-postgres-url
```

## Verify Admin After Restore

```bash
# Check backup restore status
curl -X GET https://your-railway-domain/api/admin/backups

# Then restore specific backup
curl -X POST https://your-railway-domain/api/admin/restore-backup \
  -H "Content-Type: application/json" \
  -d '{ "filename": "backup-name.json" }'

# Check response for:
# "adminStatus": { "preserved": true, "restored": true }
```

## Common Issues

### 403 Unauthorized
- Wrong ADMIN_SECRET
- Secret not set in Railway environment
- Check Railway variables dashboard

### 404 Not Found
- Admin user doesn't exist
- Use reset-password endpoint with correct email
- Or restore from backup that has admin user

### 500 Server Error
- Check server logs in Railway
- Verify database connection
- Ensure backup file exists

## Prevention: Backup Best Practices

1. Always check restore response for admin status
2. Test admin login immediately after restore
3. Keep ADMIN_SECRET secure and documented
4. Save admin credentials separately
5. Verify backup timestamps before restoring

## Support Commands

```bash
# Check if API is running
curl https://your-railway-domain/api/verification/health

# List available backups
curl https://your-railway-domain/api/admin/backups

# Check server status
curl https://your-railway-domain/health
```
