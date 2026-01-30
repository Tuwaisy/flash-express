# Admin Account Recovery Guide

## Problem
After restoring from a backup, the admin account becomes inaccessible because the backup/restore process overwrites the current admin credentials with old data from the backup file.

## Solution Overview
We've implemented two mechanisms to prevent and recover from admin account loss:

### 1. **Automatic Admin Preservation During Restore**
When you restore a backup, the system now:
- Preserves the current admin user before restoration
- Filters out old admin users from the backup data
- Restores the admin user back with current credentials after restoration
- Provides detailed logging of admin status in the response

**Response Example:**
```json
{
  "success": true,
  "message": "Database restored successfully",
  "adminStatus": {
    "preserved": true,
    "restored": true
  }
}
```

### 2. **Emergency Admin Password Reset Endpoint**
If you ever get locked out, use this endpoint to reset the admin password:

**Endpoint:** `POST /api/admin/reset-password`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "adminSecret": "your-admin-secret-key",
  "email": "admin@shuhna.net",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin password reset successfully",
  "email": "admin@shuhna.net",
  "newPassword": "newPassword123",
  "note": "Please change this password immediately after logging in"
}
```

### 3. **What is ADMIN_SECRET?**
The `ADMIN_SECRET` is a security token stored in your environment variables that protects the admin reset endpoint from unauthorized access.

Set it in your Railway environment variables:
```
ADMIN_SECRET=your-secure-admin-secret-key
```

Default (if not set): `admin-secret-key`

## How to Recover Admin Access

### Option A: Use Emergency Reset Endpoint (Recommended)
If your admin account is locked out after a backup restore:

1. You need the `ADMIN_SECRET` value from your environment variables
2. Call the `/api/admin/reset-password` endpoint with:
   - `adminSecret`: Your ADMIN_SECRET value
   - `email`: The admin email (default: admin@shuhna.net)
   - `newPassword`: A new password to set

```bash
curl -X POST http://localhost:3000/api/admin/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "adminSecret": "your-admin-secret-key",
    "email": "admin@shuhna.net",
    "newPassword": "temporaryPassword123"
  }'
```

3. Login with the new password
4. Change the password in the admin settings

### Option B: Check Restore Response
After restoring a backup, check the response to confirm admin was preserved:
- Look for `"adminStatus": { "preserved": true, "restored": true }`
- If both are true, your admin account should work fine
- If either is false, the admin may need manual recovery

### Option C: Direct Database Fix (Manual)
If you have direct database access, you can reset the admin password:

```sql
-- Generate bcrypt hash for password "password123"
UPDATE users 
SET password = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/tvQe'
WHERE email = 'admin@shuhna.net';
```

Then login with email `admin@shuhna.net` and password `password123`.

## Backup/Restore Best Practices

### Before Restoring a Backup:
1. **Verify the backup timestamp** - Make sure it's from before you made unwanted changes
2. **Note current admin credentials** - Document them in case recovery is needed
3. **Check backup size** - Ensure the backup file isn't corrupted or empty

### After Restoring a Backup:
1. **Verify admin status** - Check the response for `"adminStatus"` confirmation
2. **Test admin login** - Immediately try logging in as admin
3. **Review restored data** - Verify the backup contained expected data

## New Backup/Restore Endpoint Features

### Restore Endpoint Response
The `POST /api/admin/restore-backup` endpoint now returns:

```json
{
  "success": true,
  "message": "Database restored successfully",
  "results": {
    "restored": { /* table row counts */ },
    "errors": [ /* any errors */ ],
    "adminPreserved": true,
    "adminRestored": true
  },
  "restoredFrom": "backup-filename.json",
  "backupTimestamp": "2024-01-15T10:30:00Z",
  "adminStatus": {
    "preserved": true,
    "restored": true
  }
}
```

### Key Status Fields:
- **preserved**: Current admin was saved before restore
- **restored**: Admin user was successfully restored after backup data insertion
- **errors**: Any errors during restoration (including admin recovery attempts)

## Troubleshooting

### Admin Still Can't Login After Restore
1. Check the restore response for admin status
2. Verify the admin email exists in the database
3. Use the password reset endpoint if needed
4. Check server logs for any errors

### Reset Password Endpoint Returns 403 Unauthorized
- Verify you're using the correct ADMIN_SECRET
- Check the environment variable is set correctly in Railway
- Default secret is `admin-secret-key` if not configured

### Reset Password Endpoint Returns 404 Not Found
- The admin user doesn't exist in the database
- You may need to manually create the admin user with INSERT into users table
- Or restore from a backup that contains the admin user

## Security Recommendations

1. **Rotate ADMIN_SECRET regularly**
   - Update it in your Railway environment variables
   - Keep it secure and never commit to version control

2. **Monitor Admin Access**
   - Check server logs after each backup restore
   - Verify admin status in restore response
   - Test admin login immediately after restores

3. **Maintain Backup Security**
   - Store backups securely (encrypted, protected access)
   - Regularly verify backup integrity
   - Document backup timestamps clearly

4. **Change Default Password**
   - After recovering admin access with password reset
   - Update to a strong, unique password
   - Update ADMIN_SECRET if you used the default

## Restore Process Flow (Detailed)

```
POST /api/admin/restore-backup
│
├─ Load backup file
│
├─ SAVE current admin user
│  └─ Query: SELECT * FROM users WHERE email IN ('admin@shuhna.net', 'admin@flash.com')
│
├─ For each table in backup:
│  │
│  ├─ If table = 'users':
│  │  ├─ DELETE non-admin users
│  │  ├─ INSERT backup data (excluding admin users)
│  │  └─ INSERT preserved admin user back
│  │
│  └─ If table ≠ 'users':
│     ├─ DELETE all rows
│     └─ INSERT backup data
│
└─ Response with adminStatus { preserved, restored }
```

## Emergency Contacts

If you cannot access admin functionality:
1. Check ADMIN_SECRET in environment variables
2. Verify admin@shuhna.net exists in database
3. Use `/api/admin/reset-password` with correct ADMIN_SECRET
4. Review server logs for detailed error messages

## Deployment Notes

This fix has been deployed to Railway. The backup/restore endpoint now:
- ✅ Preserves current admin before restore
- ✅ Protects admin during backup data insertion
- ✅ Ensures admin user exists after restore
- ✅ Provides detailed status information

No configuration changes needed - it works automatically!
