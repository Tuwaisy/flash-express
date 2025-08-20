# Bulk Shipment Import System

## Overview
The bulk shipment import system allows clients to create multiple shipments efficiently using a CSV template file. This system includes:
- Excel template generation with dropdown validation
- CSV import processing with comprehensive validation
- Detailed error reporting and success tracking
- Real-time preview functionality

## Components

### 1. Excel Template Generator (`create_bulk_template.py`)
- Generates Excel files with dropdown validation
- Creates multiple worksheets:
  - **Shipments**: Main data entry sheet with dropdown menus
  - **Choices**: Reference sheet containing all dropdown options
  - **Instructions**: Detailed guidance for users
- Uses `openpyxl` library for advanced Excel features

### 2. Frontend Component (`BulkShipmentImport.tsx`)
- React component for file upload and import processing
- Features:
  - Template download functionality
  - CSV file upload with validation
  - Preview of first 5 rows before import
  - Real-time import progress
  - Detailed results display with success/failure breakdown

### 3. Backend API Endpoint (`/api/shipments/bulk-import`)
- Comprehensive validation for all shipment fields
- Client lookup and phone number formatting
- Payment method validation
- Wallet integration for Transfer payments
- Transaction-based processing for data integrity
- Detailed error reporting per row

## Usage Instructions

### For Clients:
1. Navigate to "Bulk Import" in the sidebar
2. Download the CSV template
3. Fill in shipment data following the format
4. Upload the completed CSV file
5. Review the preview and click Import
6. Check results for any errors

### For Administrators:
- The system automatically validates client permissions
- Failed imports provide detailed error messages
- Successful imports create notifications and update wallets
- All operations are logged for auditing

## Template Structure

### Required Fields:
- **Client Email**: Must match existing client in system
- **Recipient Name**: Full name of package recipient
- **Recipient Phone**: Valid Egyptian phone number (+201XXXXXXXXX)
- **Package Description**: Detailed description of contents
- **Package Value (EGP)**: Numeric value in Egyptian Pounds
- **From/To Addresses**: Complete address information
- **Payment Method**: COD or Transfer
- **Amount to Collect**: For COD orders

### Optional Fields:
- **Is Large Order**: TRUE/FALSE for oversized packages
- **Package Weight**: Weight in kilograms
- **Package Dimensions**: LxWxH in centimeters
- **Notes**: Additional instructions

## Dropdown Options

### Cities:
- Cairo, Alexandria, Giza, Port Said, Suez, Luxor, Aswan, Asyut, Tanta, Mansoura, Zagazig, Ismailia, Damanhour, Minya, Sohag, Hurghada, Marsa Alam, Sharm El Sheikh

### Zones (by City):
- **Cairo**: Nasr City, Heliopolis, Maadi, Zamalek, Dokki, Mohandessin, New Cairo, 5th Settlement, Tagamoa, Rehab
- **Alexandria**: Downtown, Gleem, Stanley, Montazah, Borg El Arab, Sidi Gaber
- **Giza**: Dokki, Mohandessin, Agouza, Haram, 6th October, Sheikh Zayed

### Package Types:
- Electronics, Clothing, Books, Food Items, Cosmetics, Medical Supplies, Documents, Home Appliances, Jewelry, Gifts, Auto Parts, Sports Equipment, Toys, Furniture

### Payment Methods:
- COD (Cash on Delivery)
- Transfer (Prepaid)

## Error Handling

### Common Validation Errors:
- **Client not found**: Email doesn't match any client in system
- **Invalid phone number**: Phone must be in format +201XXXXXXXXX
- **Missing required fields**: All required fields must be filled
- **Invalid payment method**: Must be either "COD" or "Transfer"
- **Insufficient wallet balance**: For Transfer payments, client must have sufficient funds
- **Invalid numeric values**: Package value and weight must be valid numbers

### Success Indicators:
- Shipment ID generated
- Client wallet debited (for Transfer payments)
- Notification sent to client
- Courier notification created (if auto-assigned)

## Security Features

- Client email validation against database
- Phone number format validation
- Payment method verification
- Wallet balance checks for Transfer payments
- Transaction rollback on any failure
- Permission-based access control

## Performance Considerations

- Batch processing with transaction management
- Efficient database queries with prepared statements
- Memory-efficient CSV parsing
- Error aggregation for bulk feedback
- Asynchronous processing for large files

## Future Enhancements

1. **Excel File Support**: Direct upload of .xlsx files
2. **Bulk Assignment**: Automatic courier assignment during import
3. **Template Customization**: Client-specific templates
4. **Import History**: Track and review past imports
5. **Scheduling**: Delayed processing for off-peak hours
6. **API Integration**: Webhook notifications for import completion

## Troubleshooting

### Template Issues:
- Ensure all required fields are filled
- Check dropdown selections match available options
- Verify phone number format (+201XXXXXXXXX)
- Confirm client email exists in system

### Import Failures:
- Check server logs for detailed error messages
- Verify file format is CSV
- Ensure file size is within limits
- Check client permissions for bulk import

### Performance Issues:
- Break large imports into smaller batches
- Ensure stable internet connection
- Check server resources during peak hours

## Technical Specifications

### Dependencies:
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, PostgreSQL
- **Python**: openpyxl, pandas for template generation

### File Formats:
- **Template**: .xlsx with data validation
- **Import**: .csv with proper encoding (UTF-8)
- **Sample**: Included with realistic data

### Database Schema:
- Utilizes existing shipments, users, and transactions tables
- Maintains referential integrity
- Supports atomic operations

---

*Last Updated: August 2025*
*Version: 1.0*
