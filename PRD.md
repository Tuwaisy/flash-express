Product Requirements Document (PRD)
1. Executive Summary
This Product Requirements Document (PRD) details the comprehensive backend functionality of the Shuhna Express logistics management system based on the complete server.js implementation. The system provides a complete solution for e-commerce shipping operations, including user management, shipment processing, financial transactions, real-time notifications, and automated business processes.

2. Product Overview
2.1 Purpose
Shuhna Express is a comprehensive logistics management platform designed to streamline e-commerce shipping operations in Egypt, providing professional handling, real-time tracking, and automated financial management for small businesses and e-commerce entrepreneurs.

2.2 Target Users
Clients: Small business owners and e-commerce entrepreneurs
Couriers: Delivery personnel managing shipments and earnings
Administrators: System managers overseeing operations and financials
Recipients: End customers receiving deliveries
2.3 Key Value Propositions
Professional Handling: Expert team trained for product care
3-Day Delivery Guarantee: Maximum 3 business days delivery
Real-time Tracking: End-to-end shipment visibility
Automated Financial Management: Transparent pricing and earnings
Multi-language Support: English and Arabic interfaces
3. Core Features and Functionality
3.1 User Management System
Multi-role Architecture: Client, Courier, Administrator, Super User, Assigning User
Secure Authentication: bcrypt password hashing with email-based login
Profile Management: User creation, updates, password resets
Role-based Permissions: Granular access control system
Referral System: Courier referral bonuses and tracking
3.2 Shipment Lifecycle Management
Shipment Creation: Single and bulk import capabilities
Status Tracking: Comprehensive status workflow (Waiting → Packaged → Assigned → Out for Delivery → Delivered)
Auto-assignment: Intelligent courier assignment based on zones and workload
Delivery Verification: SMS-based recipient verification system
Failure Handling: Automated penalty system for failed deliveries
3.3 Financial Management
Client Billing: Flat rate pricing with partner tier discounts
Courier Earnings: Commission-based system with performance tracking
Wallet System: Prepaid balances for clients, earnings tracking for couriers
Payout Processing: Automated withdrawal requests and processing
Transaction History: Complete audit trail for all financial operations
3.4 Real-time Communication
WebSocket Integration: Live data synchronization across clients
Email Notifications: Automated shipment updates and alerts
SMS Integration: Delivery verification and status updates
In-app Notifications: Internal messaging system
3.5 Automated Business Processes
Overdue Monitoring: Automatic alerts for delayed shipments
Tier Management: Dynamic client tier updates based on activity
Balance Calculations: Real-time financial balance updates
Scheduled Jobs: Automated maintenance and monitoring tasks
4. Technical Architecture
4.1 Backend Stack
Runtime: Node.js
Framework: Express.js
Database ORM: Knex.js
Database Support: PostgreSQL (primary), SQLite (fallback)
Real-time: Socket.IO
Authentication: bcrypt
Email: Nodemailer
SMS: Twilio
4.2 Database Schema (Inferred from Server Operations)
Core Tables:
users: User accounts with roles, contact info, wallet balances
shipments: Shipment records with status, addresses, pricing
courier_stats: Courier performance and commission settings
client_transactions: Client financial transactions
courier_transactions: Courier earnings and payouts
notifications: Email/SMS notification history
in_app_notifications: Internal user notifications
custom_roles: Role-based permission system
tier_settings: Partner tier configurations
delivery_verifications: SMS verification codes
inventory_items: Packaging materials tracking
assets: Equipment and asset management
suppliers: Supplier relationship management
supplier_transactions: Supplier payment tracking
4.3 API Architecture
RESTful Endpoints:
Health Monitoring: /api/health, /api/debug
Authentication: /api/login
Data Management: /api/data (bulk data retrieval)
User Management: /api/users/* (CRUD operations)
Shipment Operations: /api/shipments/* (create, update, assign)
Financial Operations: /api/couriers/*/financials, /api/clients/*/payouts
Notification System: /api/shipments/*/send-delivery-code
File Uploads: /uploads/* (evidence and documentation)
Bulk Operations:
Bulk Import: /api/shipments/bulk-import
Bulk Packaging: /api/shipments/bulk-package
Bulk Assignment: /api/shipments/bulk-assign
Bulk Status Updates: /api/shipments/bulk-status-update
Inventory & Asset Management:
Inventory CRUD: /api/inventory/*
Asset Management: /api/assets/*
Supplier Management: /api/suppliers/*
Administrative Functions:
Database Maintenance: /api/debug/cleanup-database, /api/admin/reset-database-complete
Tier Management: /api/tier-settings, /api/clients/*/tier
4.4 Security Features
Password Hashing: bcrypt with salt rounds
Input Validation: Comprehensive request validation
CORS Configuration: Cross-origin resource sharing controls
Transaction Safety: Database transaction wrapping for critical operations
File Upload Security: Restricted file types and size limits
5. Business Logic and Workflows
5.1 Shipment Processing Workflow
Creation: Client submits shipment with details and payment method
Validation: Server validates client balance and shipment data
Pricing: Calculates fees with tier discounts and priority multipliers
Payment: Processes wallet payments or records COD amounts
Packaging: Updates status and tracks materials used
Assignment: Auto-assigns to optimal courier based on zone and workload
Delivery: Courier updates status through mobile/web interface
Verification: SMS code sent to recipient for confirmation
Completion: Financial transactions processed, notifications sent
5.2 Financial Flow Management
Client Payments: Wallet top-ups, shipment fees, COD collections
Courier Earnings: Commission calculations, referral bonuses, penalties
Automated Calculations: Real-time balance updates from transaction history
Payout Processing: Withdrawal requests with admin approval workflow
5.3 Notification System
Email Alerts: Shipment status updates, payment confirmations
SMS Notifications: Delivery verification codes, urgent alerts
In-app Messages: Internal notifications for users
Admin Alerts: System issues, overdue shipments, financial discrepancies
6. Integration Points
6.1 External Services
Twilio: SMS delivery for verification codes
Email Service: SMTP for notification emails
File Storage: Local file system for evidence uploads
Database: PostgreSQL/SQLite for data persistence
6.2 Internal Modules
Database Layer: Knex.js for query building and connection management
WebSocket Layer: Socket.IO for real-time client synchronization
Authentication Layer: bcrypt for secure password management
File Handling: Express middleware for upload processing
7. Performance and Scalability
7.1 Optimization Features
WebSocket Throttling: Prevents excessive real-time updates (3-second throttle)
Database Indexing: Optimized queries for large datasets
Connection Pooling: Efficient database connection management
File Upload Limits: Controlled resource usage for uploads
7.2 Monitoring and Maintenance
Health Check Endpoints: System status monitoring
Debug Endpoints: Development and troubleshooting tools
Scheduled Jobs: Automated maintenance tasks
Error Logging: Comprehensive error tracking and reporting
8. Deployment and Operations
8.1 Environment Configuration
Production: Railway platform with PostgreSQL
Development: Local SQLite database
Environment Variables: Secure configuration management
8.2 Maintenance Procedures
Database Cleanup: Automated removal of old test data
Balance Reconciliation: Automated financial balance verification
User Validation: Role and permission integrity checks
Scheduled Tasks: Overdue monitoring and tier updates
9. Future Enhancement Opportunities
9.1 Advanced Features
Mobile App: Native iOS/Android applications for couriers
API Integration: Third-party e-commerce platform connections
Advanced Analytics: Detailed reporting and business intelligence
Multi-tenant Architecture: White-label solutions for partners
9.2 Technical Improvements
Microservices Architecture: Service decomposition for scalability
Caching Layer: Redis integration for performance optimization
Containerization: Docker deployment for consistent environments
API Versioning: Backward compatibility for client applications
10. Conclusion
The Shuhna Express backend system provides a robust, scalable foundation for e-commerce logistics operations. With comprehensive user management, automated shipment processing, real-time financial tracking, and extensive integration capabilities, the platform delivers professional-grade logistics management suitable for growing e-commerce businesses in Egypt.

The system's modular architecture, comprehensive API coverage, and automated business processes ensure reliable operation while providing the flexibility needed for future enhancements and scaling.