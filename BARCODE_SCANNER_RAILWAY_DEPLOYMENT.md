# Barcode Scanner Railway Deployment Guide

This guide explains how to deploy the barcode scanner functionality to Railway PostgreSQL.

## Overview

The barcode scanner system allows couriers to:
- Scan shipment barcodes with their mobile camera
- Automatically update shipment status to "Out for Delivery"
- Create audit logs of all scans
- View scan history with pagination

## Deployment Steps

### 1. Deploy Database Schema

Run the Railway deployment script to create the `barcode_scans` table:

```bash
# Option 1: Using environment variable
export DATABASE_URL="your-railway-postgresql-url"
node deploy-barcode-scanner-railway.cjs

# Option 2: Set in Railway dashboard and redeploy
# Add DATABASE_URL to Railway environment variables
# Then trigger a redeploy to run the database setup
```

### 2. Verify Deployment

The deployment script will:
- ✅ Create `barcode_scans` table with indexes
- ✅ Test table functionality
- ✅ Verify CRUD operations
- ✅ Show deployment summary

### 3. Frontend Integration

The barcode scanner is already integrated into the frontend:
- Added to sidebar navigation for couriers
- Available at route: `/barcode-scanner`
- Requires `VIEW_COURIER_TASKS` permission

## Database Schema

```sql
CREATE TABLE barcode_scans (
    id SERIAL PRIMARY KEY,
    shipmentId VARCHAR NOT NULL,
    courierId INTEGER NOT NULL REFERENCES users(id),
    previousStatus VARCHAR NOT NULL,
    newStatus VARCHAR NOT NULL,
    scannedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_barcode_scans_shipmentId ON barcode_scans(shipmentId);
CREATE INDEX idx_barcode_scans_courierId ON barcode_scans(courierId);
CREATE INDEX idx_barcode_scans_scannedAt ON barcode_scans(scannedAt);
```

## API Endpoints

### Scan Barcode
```http
POST /api/barcode/scan
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "shipmentId": "SH-001-2024"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shipment SH-001-2024 status updated to Out for Delivery",
  "scan": {
    "id": 123,
    "shipmentId": "SH-001-2024",
    "courierId": 45,
    "previousStatus": "Assigned to Courier",
    "newStatus": "Out for Delivery",
    "scannedAt": "2024-11-27T10:30:00.000Z"
  },
  "shipment": {
    "id": "SH-001-2024",
    "status": "Out for Delivery",
    "recipientName": "John Doe"
  }
}
```

### Get Scan History
```http
GET /api/barcode/history?page=1&limit=20
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "scans": [
    {
      "id": 123,
      "shipmentId": "SH-001-2024",
      "courierId": 45,
      "courierName": "Ahmed Hassan",
      "previousStatus": "Assigned to Courier",
      "newStatus": "Out for Delivery",
      "scannedAt": "2024-11-27T10:30:00.000Z",
      "recipientName": "John Doe"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

## Security

- JWT authentication required for all endpoints
- Couriers can only scan shipments assigned to them
- Admin/Super Users can view all scan history
- Regular couriers see only their own scans

## Frontend Components

### BarcodeScanner.tsx
- Camera-based barcode scanning
- Real-time feedback and notifications
- Scan history display
- Mobile-optimized interface
- Dark mode support

### Navigation Integration
- Added to Sidebar.tsx for courier access
- Translations: English + Arabic
- Permission-based visibility
- QR code icon for easy recognition

## Troubleshooting

### Database Connection Issues
```bash
# Test Railway connection
node -e "
const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
knex.raw('SELECT NOW()').then(result => {
  console.log('✅ Connected:', result.rows[0]);
  process.exit(0);
}).catch(err => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
"
```

### Table Issues
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'barcode_scans'
);

-- Check table structure
\d barcode_scans;

-- View recent scans
SELECT * FROM barcode_scans 
ORDER BY scannedAt DESC 
LIMIT 10;
```

### Permission Issues
- Ensure user has `VIEW_COURIER_TASKS` permission
- Check JWT token validity
- Verify courier is assigned to shipment

## Production Considerations

1. **Performance**: Indexes on shipmentId, courierId, and scannedAt
2. **Security**: JWT authentication + authorization
3. **Audit Trail**: Complete scan history with timestamps
4. **Mobile Optimization**: Camera permissions and responsive design
5. **Error Handling**: Comprehensive error messages and recovery
6. **Notifications**: Real-time updates for scan events

## Next Steps

After deployment:
1. Test barcode scanning with real shipment IDs
2. Verify notification system integration
3. Monitor scan performance and database queries
4. Set up alerts for scan failures
5. Train couriers on the new system

---

**Note**: This system integrates with existing shipment management, user authentication, and notification systems. All barcode scans are logged for audit purposes and operational analytics.