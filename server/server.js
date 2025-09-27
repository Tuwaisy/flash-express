// server/server.js - Your new backend file

// 1. Import necessary libraries
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const nodemailer = require('nodemailer');
const cors =require('cors');
const path = require('path');
const twilio = require('twilio');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { knex, setupDatabase } = require('./db');

// Import verification and notification services
const whatsAppService = require('./services/whatsapp');
const smsService = require('./services/sms');
const verificationService = require('./services/verification');
const notificationService = require('./services/notifications');

const saltRounds = 10; // For bcrypt hashing

// --- Helper Functions ---
const generateId = (prefix) => `${prefix}_${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

// Safely parse JSON fields - handles both SQLite (string) and PostgreSQL (object) formats
const safeJsonParse = (value, defaultValue = null) => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'object') return value; // Already parsed (from PG)
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (e) {
            console.warn('safeJsonParse: Failed to parse string, returning default. Value:', value);
            return defaultValue;
        }
    }
    return defaultValue; // Fallback
};

// Centralized parser for User objects
const parseUser = (user) => {
    if (!user) return null;
    const parsedUser = { ...user };
    delete parsedUser.password; // Ensure password is never sent
    parsedUser.roles = safeJsonParse(user.roles, []);
    parsedUser.address = safeJsonParse(user.address, null);
    parsedUser.zones = safeJsonParse(user.zones, []);
    parsedUser.priorityMultipliers = safeJsonParse(user.priorityMultipliers, null);
    return parsedUser;
};

// Centralized parser for Shipment objects
const parseShipment = (shipment) => {
    if (!shipment) return null;
    const parsedShipment = { ...shipment };
    parsedShipment.fromAddress = safeJsonParse(shipment.fromAddress, null);
    parsedShipment.toAddress = safeJsonParse(shipment.toAddress, null);
    parsedShipment.packagingLog = safeJsonParse(shipment.packagingLog, []);
    parsedShipment.statusHistory = safeJsonParse(shipment.statusHistory, []);
    return parsedShipment;
};

// Centralized parser for Role objects
const parseRole = (role) => {
    if (!role) return null;
    const parsedRole = { ...role };
    parsedRole.permissions = safeJsonParse(role.permissions, []);
    return parsedRole;
};

// Centralized parser for Asset objects
const parseAsset = (asset) => {
    if (!asset) return null;
    // No JSON fields in asset currently, but good practice to have a parser
    return { ...asset };
};

// Centralized parser for InventoryItem objects
const parseInventoryItem = (item) => {
    if (!item) return null;
    // No JSON fields in inventory item currently
    return { ...item };
};

// Main async function to set up and start the server

// 6. Add a data validation function to check for JSON parsing issues
const validateUserRoles = async () => {
    try {
        const users = await knex('users').select('id', 'name', 'roles');
        let issues = 0;
        for (const user of users) {
            const parsedRoles = safeJsonParse(user.roles, []);
            if (!Array.isArray(parsedRoles)) {
                console.warn(`⚠️  User ${user.name} (${user.id}) has invalid roles:`, user.roles);
                issues++;
                // Try to fix common issues
                if (typeof user.roles === 'string' && !user.roles.startsWith('[')) {
                    // Single role not in array format
                    const fixedRoles = [user.roles.replace(/"/g, '')];
                    await knex('users').where({ id: user.id }).update({ roles: JSON.stringify(fixedRoles) });
                    console.log(`✅ Fixed roles for user ${user.name}: ${JSON.stringify(fixedRoles)}`);
                }
            }
        }
        console.log(`📊 User roles validation complete. Issues found: ${issues}`);
        return issues;
    } catch (error) {
        console.error('Error validating user roles:', error);
        return -1;
    }
};
async function main() {
    try {
        // Test database connection first
        console.log('Testing database connection... (attempt 1/3)');
        try {
            await knex.raw('SELECT 1+1 as result');
            console.log('✅ Database connection successful');
        } catch (connectionError) {
            console.log('❌ Database connection attempt 1 failed:', connectionError.message);
            console.log('Waiting 3 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('Testing database connection... (attempt 2/3)');
            try {
                await knex.raw('SELECT 1+1 as result');
                console.log('✅ Database connection successful on retry');
            } catch (retryError) {
                console.log('❌ Database connection attempt 2 failed:', retryError.message);
                console.log('Waiting 5 seconds before final retry...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                console.log('Testing database connection... (attempt 3/3)');
                await knex.raw('SELECT 1+1 as result');
                console.log('✅ Database connection successful on final retry');
            }
        }

        // Wait for database setup to complete
        await setupDatabase();
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        console.error('Exiting application due to database connection failure');
        process.exit(1);
    }

    // 2. Initialize Express app
    const app = express();
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production' 
                ? [
                    process.env.RAILWAY_STATIC_URL,
                    /\.up\.railway\.app$/,
                    /\.railway\.app$/
                  ]
                : "*", // Allow all origins in development
            methods: ["GET", "POST"]
        }
    });
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
        console.log('Created "uploads" directory.');
    }
    const evidenceDir = path.join(uploadsDir, 'evidence');
    if (!fs.existsSync(evidenceDir)) {
        fs.mkdirSync(evidenceDir);
        console.log('Created "uploads/evidence" directory.');
    }


    // Explicitly configure CORS for better proxy compatibility
    app.use(cors({
        origin: true, // Allow all origins for now to debug
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));
    
    // Add request logging middleware
    app.use((req, res, next) => {
        console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
        console.log(`   Headers:`, req.headers);
        if (req.body && Object.keys(req.body).length > 0) {
            console.log(`   Body:`, req.body);
        }
        next();
    });
    
    app.use(express.json({limit: '5mb'})); // To parse JSON request bodies, increased limit for photos

    // Serve static files from the React app and uploaded images
    app.use(express.static(path.join(__dirname, '../dist')));
    app.use('/uploads', express.static(uploadsDir));


    // WebSocket connection handler with throttled data updates
    let lastDataUpdateEmit = 0;
    const DATA_UPDATE_THROTTLE_MS = 3000; // Only emit data_updated every 3 seconds
    let pendingDataUpdate = null;
    
    const throttledDataUpdate = () => {
        const now = Date.now();
        
        // If enough time has passed, emit immediately
        if (now - lastDataUpdateEmit >= DATA_UPDATE_THROTTLE_MS) {
            lastDataUpdateEmit = now;
            io.emit('data_updated');
            console.log('🔄 data_updated emitted immediately');
            return;
        }
        
        // Otherwise, schedule a delayed emit if none is pending
        if (!pendingDataUpdate) {
            const delay = DATA_UPDATE_THROTTLE_MS - (now - lastDataUpdateEmit);
            console.log(`⏳ data_updated throttled, will emit in ${delay}ms`);
            pendingDataUpdate = setTimeout(() => {
                lastDataUpdateEmit = Date.now();
                io.emit('data_updated');
                pendingDataUpdate = null;
                console.log('🔄 data_updated emitted after throttle delay');
            }, delay);
        }
    };

    io.on('connection', (socket) => {
        console.log(`WebSocket Client connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`WebSocket Client disconnected: ${socket.id}`);
        });
    });
    
    // --- Scheduled Job for Overdue Shipments ---
    const checkForOverdueShipments = async () => {
        console.log('Running scheduled job: checking for overdue shipments...');
        const twoAndHalfDaysAgo = new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString();
        try {
            const overdueCandidates = await knex('shipments')
                .whereIn('status', ['Out for Delivery', 'Assigned to Courier'])
                .where('creationDate', '<', twoAndHalfDaysAgo);

            for (const shipment of overdueCandidates) {
                // Check if an overdue notification already exists for this shipment
                const existingNotification = await knex('notifications')
                    .where({ shipmentId: shipment.id })
                    .andWhere('message', 'like', '%OVERDUE%')
                    .first();

                if (!existingNotification) {
                    console.log(`Shipment ${shipment.id} is overdue. Logging notification.`);
                    const notification = {
                        id: generateId('NOT_OVERDUE'),
                        shipmentId: shipment.id,
                        channel: 'System',
                        recipient: 'admin',
                        message: `SYSTEM ALERT: Shipment ${shipment.id} is OVERDUE. It has been in transit for more than 2.5 days.`,
                        date: new Date().toISOString(),
                        status: shipment.status,
                        sent: true,
                    };
                    await knex('notifications').insert(notification);
                    throttledDataUpdate(); // Notify admins
                }
            }
        } catch (error) {
            console.error('Error in overdue shipment job:', error);
        }
    };
    
    // --- Scheduled Job for Partner Tiers ---
    const updateClientTiers = async () => {
        console.log('Running scheduled job: updating client partner tiers...');
        try {
            await knex.transaction(async (trx) => {
                const tierSettings = await trx('tier_settings').orderBy('shipmentThreshold', 'desc');
                // PostgreSQL compatible JSON query using JSON functions
                let clients;
                if (process.env.DATABASE_URL) {
                    // PostgreSQL: Use JSONB contains operator
                    clients = await trx('users')
                        .where('manualTierAssignment', false)
                        .whereRaw(`roles @> '["Client"]'::jsonb`);
                } else {
                    // SQLite: Use LIKE operator
                    clients = await trx('users')
                        .where('manualTierAssignment', false)
                        .where('roles', 'like', '%"Client"%');
                }
                
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

                for (const client of clients) {
                    const shipmentCount = await trx('shipments')
                        .where({ clientId: client.id })
                        .andWhere('creationDate', '>=', thirtyDaysAgo)
                        .count('id as count')
                        .first();
                    
                    const count = shipmentCount.count;
                    let newTier = null;
                    for (const setting of tierSettings) {
                        if (count >= setting.shipmentThreshold) {
                            newTier = setting.tierName;
                            break;
                        }
                    }

                    if (client.partnerTier !== newTier) {
                        await trx('users').where({ id: client.id }).update({ partnerTier: newTier });
                        if(newTier) {
                            await createInAppNotification(trx, client.id, `Congratulations! You've been promoted to the ${newTier} partner tier.`);
                        } else {
                            await createInAppNotification(trx, client.id, `Your partner tier has been updated based on recent activity.`);
                        }
                        throttledDataUpdate();
                    }
                }
            });
        } catch (error) {
            console.error('Error in update client tiers job:', error);
        }
    };

    // Run jobs
    setInterval(checkForOverdueShipments, 4 * 60 * 60 * 1000); // 4 hours
    setInterval(updateClientTiers, 24 * 60 * 60 * 1000); // Daily
    
    // Run startup jobs safely without blocking server start
    setTimeout(() => {
        checkForOverdueShipments().catch(err => console.error('Startup job error (overdue shipments):', err));
        updateClientTiers().catch(err => console.error('Startup job error (client tiers):', err));
    }, 5000); // Wait 5 seconds after server starts


    
    // Twilio Client
    const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        : null;


    // --- Nodemailer Transporter ---
    const transporter = nodemailer.createTransport({
      host: 'smtpout.secureserver.net',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    async function sendEmail(notification) {
        const { recipient, subject, message } = notification;

        const mailOptions = {
            from: `"Shuhna Express" <${process.env.EMAIL_USER}>`,
            to: recipient,
            subject: subject,
            html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully to:', recipient);
            return true;
        } catch (error) {
            console.error('Failed to send email:', error);
            return false;
        }
    }
    
    const createInAppNotification = async (trx, userId, message, link = null) => {
        await trx('in_app_notifications').insert({
            id: generateId('INAPP'),
            userId,
            message,
            link,
            isRead: false,
            timestamp: new Date().toISOString()
        });
    };

    // Helper to update client wallet balance after transaction changes
    const updateClientWalletBalance = async (trx, clientId) => {
        const clientTransactions = await trx('client_transactions').where({ userId: clientId });
        const newBalance = clientTransactions.reduce((sum, t) => {
            const amount = Number(t.amount) || 0;
            return sum + amount;
        }, 0);
        
        await trx('users').where({ id: clientId }).update({ walletBalance: newBalance });
        console.log(`💰 Updated client ${clientId} wallet balance: ${newBalance.toFixed(2)} EGP`);
        return newBalance;
    };


    // --- Internal Business Logic ---
    const updateStatusAndHistory = async (trx, shipmentId, newStatus) => {
        const shipment = await trx('shipments').where({ id: shipmentId }).first();
        if (!shipment) return;

        const currentHistory = safeJsonParse(shipment.statusHistory, []);
        
        // Avoid duplicate status entries
        if (currentHistory.length > 0 && currentHistory[currentHistory.length - 1].status === newStatus) {
            return;
        }
        
        currentHistory.push({ status: newStatus, timestamp: new Date().toISOString() });
        
        await trx('shipments').where({ id: shipmentId }).update({
            status: newStatus,
            statusHistory: JSON.stringify(currentHistory)
        });
        
        await createNotification(trx, shipment, newStatus);
    };

    const createNotification = async (trx, shipment, newStatus) => {
        // Add guard clause to prevent crash on undefined status
        if (!newStatus || typeof newStatus !== 'string') {
            console.warn(`createNotification was called for shipment ${shipment.id} with an invalid status. Notification will be skipped.`);
            return;
        }

        const client = await trx('users').where({ id: shipment.clientId }).first();
        if (!client) return;

        const message = `Shipment Update\n\nHello ${client.name},\n\nThe status of your shipment ${shipment.id} to ${shipment.recipientName} has been updated to: ${newStatus}.`;
        
        // Create email notification record
        const notification = {
            id: generateId('NOT'),
            shipmentId: shipment.id,
            channel: 'Email',
            recipient: client.email,
            message: message,
            date: new Date().toISOString(),
            status: newStatus,
            sent: false, // Set to false, emails are now sent manually
        };

        await trx('notifications').insert(notification);

        // Send WhatsApp notification using new templates
        try {
            const firstName = shipment.recipientName ? shipment.recipientName.split(' ')[0] : 'عميلنا الكريم';
            
            // Send appropriate WhatsApp template based on status
            switch (newStatus) {
                case 'Waiting for Packaging':
                case 'Packaged and Waiting for Assignment':
                    // Template 1: Order Received (sent to CLIENT who placed the order)
                    if (whatsappService.isAvailable() && client.phone) {
                        const clientFirstName = client.name ? client.name.split(' ')[0] : 'عميلنا الكريم';
                        await whatsappService.sendOrderReceived(
                            shipment.id, 
                            client.phone, // Send to CLIENT's phone, not recipient's phone
                            clientFirstName,
                            shipment.priority || 'Standard'
                        );
                        console.log(`📱 Order received WhatsApp sent to client ${client.phone} for ${shipment.id}`);
                    }
                    break;
                case 'Out for Delivery':
                    // Template 2: Out for Delivery
                    if (whatsappService.isAvailable()) {
                        await whatsappService.sendOutForDelivery(
                            shipment.id, 
                            shipment.recipientPhone, 
                            firstName
                        );
                        console.log(`🚚 Out for delivery WhatsApp sent for ${shipment.id}`);
                    }
                    break;
                default:
                    // For other statuses, use legacy method
                    if (whatsappService.isAvailable()) {
                        await whatsappService.sendStatusUpdate(
                            shipment.id, 
                            shipment.recipientPhone, 
                            firstName, 
                            newStatus
                        );
                    }
                    break;
            }
        } catch (error) {
            console.error('❌ Failed to send WhatsApp notification:', error.message);
        }

        // Send WhatsApp notifications asynchronously (don't block the transaction)
        process.nextTick(async () => {
            try {
                await notificationService.sendNotification(shipment, newStatus, ['WHATSAPP']);
            } catch (error) {
                console.error('WhatsApp notification error:', error);
            }
        });
    };

    const processDeliveredShipment = async (trx, shipment) => {
        const newStatus = 'Delivered';
        const updatePayload = { 
            status: newStatus, 
            deliveryDate: new Date().toISOString() 
        };
        
        const currentHistory = safeJsonParse(shipment.statusHistory, []);
        currentHistory.push({ status: newStatus, timestamp: updatePayload.deliveryDate });
        updatePayload.statusHistory = JSON.stringify(currentHistory);

        await trx('shipments').where({ id: shipment.id }).update(updatePayload);
        await createNotification(trx, shipment, newStatus);
    
        if (shipment.courierId) {
            // Standard commission for delivery
            const courierStats = await trx('courier_stats').where({ courierId: shipment.courierId }).first();
            if (courierStats) {
                const commissionAmount = Number(shipment.courierCommission) || 0;
                if (commissionAmount > 0) {
                    await trx('courier_transactions').insert({
                        id: generateId('TRN'),
                        courierId: shipment.courierId,
                        type: 'Commission',
                        amount: commissionAmount,
                        description: `Commission for shipment ${shipment.id}`,
                        shipmentId: shipment.id,
                        timestamp: new Date().toISOString(),
                        status: 'Processed'
                    });
                    
                    // Note: currentBalance and totalEarnings are now calculated automatically from transactions
                    // Only update non-calculated fields
                    await trx('courier_stats').where({ courierId: shipment.courierId }).update({
                        consecutiveFailures: 0
                    });
                    
                    console.log(`💰 Commission added: Courier ${shipment.courierId} earned ${commissionAmount.toFixed(2)} EGP - balance will be updated automatically`);
                    
                     await createInAppNotification(trx, shipment.courierId, `You earned ${commissionAmount.toFixed(2)} EGP for delivering shipment ${shipment.id}.`, '/courier-financials');
                } else {
                    await trx('courier_stats').where({ courierId: shipment.courierId }).update({ consecutiveFailures: 0 });
                }
            }

            // Referral commission - company pays referrer for successful deliveries
            const deliveringCourier = await trx('users').where({ id: shipment.courierId }).first();
            if (deliveringCourier && deliveringCourier.referrerId) {
                const referrer = await trx('users').where({ id: deliveringCourier.referrerId }).first();
                // Standard company-provided referral bonus: 15 EGP per successful delivery
                const standardReferralBonus = 15;
                if (referrer) {
                    await trx('courier_transactions').insert({
                        id: generateId('TRN_REF'),
                        courierId: referrer.id,
                        type: 'Referral Bonus',
                        amount: standardReferralBonus,
                        description: `Company referral bonus for shipment ${shipment.id} delivered by ${deliveringCourier.name}`,
                        shipmentId: shipment.id,
                        timestamp: new Date().toISOString(),
                        status: 'Processed'
                    });
                    
                    // Note: currentBalance and totalEarnings are now calculated automatically from transactions
                    // No manual updates needed for referrer stats
                    console.log(`💰 Referral bonus added: Courier ${referrer.id} earned ${standardReferralBonus} EGP - balance will be updated automatically`);
                    
                    await createInAppNotification(trx, referrer.id, `You earned ${standardReferralBonus} EGP referral bonus for ${deliveringCourier.name}'s delivery.`, '/courier-financials');
                }
            }
        }
        // Client wallet transactions for delivered shipments
        const client = await trx('users').where({ id: shipment.clientId }).first();
        if (client) {
            const shippingFee = Number(shipment.clientFlatRateFee) || 0;
            let walletChange = 0;
            
            if (shipment.paymentMethod === 'COD') {
                // For COD: Credit package value collected, deduct shipping fee
                const packageValue = Number(shipment.packageValue) || 0;
                const transactions = [];
                
                // Always credit package value (even if 0) and deduct shipping fee
                transactions.push(
                    { id: generateId('TRN'), userId: client.id, type: 'Deposit', amount: packageValue, date: new Date().toISOString(), description: `Package value collected for delivered shipment ${shipment.id}`, status: 'Processed' },
                    { id: generateId('TRN'), userId: client.id, type: 'Payment', amount: -shippingFee, date: new Date().toISOString(), description: `Shipping fee for delivered shipment ${shipment.id}`, status: 'Processed' }
                );
                
                await trx('client_transactions').insert(transactions);
                walletChange = packageValue - shippingFee;
                console.log(`💳 COD delivery: Client ${client.id} wallet change: +${packageValue} - ${shippingFee} = ${walletChange.toFixed(2)} EGP`);
                
                // Update stored wallet balance
                await updateClientWalletBalance(trx, client.id);
            } else if (shipment.paymentMethod === 'Transfer') {
                // For Transfer: Client already paid shipping fee, credit amount collected from recipient
                const amountToCollect = Number(shipment.amountToCollect) || 0;
                if (amountToCollect > 0) {
                    await trx('client_transactions').insert({
                        id: generateId('TRN'), userId: client.id, type: 'Deposit', amount: amountToCollect, date: new Date().toISOString(), description: `Amount collected from recipient for delivered shipment ${shipment.id}`, status: 'Processed'
                    });
                    walletChange = amountToCollect;
                    console.log(`💳 Transfer delivery: Client ${client.id} wallet change: +${amountToCollect.toFixed(2)} EGP`);
                    
                    // Update stored wallet balance
                    await updateClientWalletBalance(trx, client.id);
                }
            } else if (shipment.paymentMethod === 'Wallet') {
                // For Wallet payments: Shipping fee already charged at creation, just credit package value collected
                const packageValue = Number(shipment.packageValue) || 0;
                
                // Credit package value collected from recipient (if any)
                if (packageValue > 0) {
                    await trx('client_transactions').insert({
                        id: generateId('TRN'), 
                        userId: client.id, 
                        type: 'Deposit', 
                        amount: packageValue, 
                        date: new Date().toISOString(), 
                        description: `Package value collected for delivered shipment ${shipment.id}`, 
                        status: 'Processed'
                    });
                    walletChange = packageValue; // Only package value, shipping fee already deducted at creation
                    console.log(`💳 Wallet delivery: Client ${client.id} wallet change: +${packageValue.toFixed(2)} EGP`);
                    
                    // Update stored wallet balance
                    await updateClientWalletBalance(trx, client.id);
                }
            }
            
            // Note: Client wallet balance is calculated from transactions in /api/data
            // No need to update users.walletBalance as it's calculated real-time
        }
    };


    // --- API Endpoints ---

    // Health check endpoint
    app.get('/api/health', (req, res) => {
        console.log('🏥 Health check requested');
        
        // Safely get WhatsApp status
        let whatsappStatus = { enabled: false, provider: 'none', businessPhone: 'unknown' };
        try {
            if (whatsAppService && typeof whatsAppService.getStatus === 'function') {
                whatsappStatus = whatsAppService.getStatus();
            } else if (whatsAppService && typeof whatsAppService.isAvailable === 'function') {
                whatsappStatus = {
                    enabled: whatsAppService.isAvailable(),
                    provider: 'unknown',
                    businessPhone: process.env.BUSINESS_PHONE_NUMBER || '+201116306013'
                };
            }
        } catch (error) {
            console.log('⚠️ WhatsApp status check failed:', error.message);
            whatsappStatus = { 
                enabled: false, 
                provider: 'error', 
                businessPhone: process.env.BUSINESS_PHONE_NUMBER || '+201116306013',
                error: error.message 
            };
        }
        
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
            services: {
                whatsapp: whatsappStatus
            }
        });
    });

    // Debug endpoint to check request handling
    app.get('/api/debug', (req, res) => {
        console.log('🔍 Debug endpoint requested');
        res.json({ 
            status: 'OK',
            timestamp: new Date().toISOString(),
            headers: req.headers,
            environment: process.env.NODE_ENV || 'development',
            nodeEnv: process.env.NODE_ENV,
            railwayUrl: process.env.RAILWAY_STATIC_URL,
            userAgent: req.headers['user-agent']
        });
    });

    // Role Management
    app.get('/api/roles', async (req, res) => {
        try {
            const roles = await knex('custom_roles').select();
            res.json(roles.map(parseRole));
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch roles' });
        }
    });

    app.post('/api/roles', async (req, res) => {
        const { name, permissions } = req.body;
        if (!name || !permissions) {
            return res.status(400).json({ error: 'Missing role name or permissions' });
        }
        try {
            const newRoleData = { id: generateId('role'), name, permissions: JSON.stringify(permissions), isSystemRole: false };
            await knex('custom_roles').insert(newRoleData);
            res.status(201).json(parseRole(newRoleData));
            throttledDataUpdate();
        } catch (error) {
            res.status(500).json({ error: 'Server error creating role' });
        }
    });

    app.put('/api/roles/:id', async (req, res) => {
        const { id } = req.params;
        const { name, permissions } = req.body;
        const updatePayload = {};
        if (name) updatePayload.name = name;
        if (permissions) updatePayload.permissions = JSON.stringify(permissions);

        try {
            await knex('custom_roles').where({ id }).update(updatePayload);
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch (error) {
            res.status(500).json({ error: 'Server error updating role' });
        }
    });

    app.delete('/api/roles/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const role = await knex('custom_roles').where({ id }).first();
            if (role.isSystemRole) {
                return res.status(403).json({ error: 'Cannot delete a system role.' });
            }
            await knex('custom_roles').where({ id }).del();
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch (error) {
            res.status(500).json({ error: 'Server error deleting role' });
        }
    });
    

    // User Login
    app.post('/api/login', async (req, res) => {
        console.log('📥 Login request received:', { email: req.body.email, hasPassword: !!req.body.password });
        const { email, password } = req.body;
        try {
            console.log('🔍 Looking up user in database...');
            const user = await knex('users').where({ email: email.toLowerCase() }).first();
            if (user) {
                console.log('👤 User found:', user.name, user.email);
                const match = await bcrypt.compare(password, user.password);
                if (match) {
                    console.log('✅ Password match successful');
                    // The user object is passed to parseUser which handles password removal and parsing
                    const finalUser = parseUser(user);
                    console.log('🚀 Sending user data:', finalUser.name, finalUser.roles);
                    res.json(finalUser);
                } else {
                    console.log('❌ Password mismatch');
                    res.status(401).json({ error: 'Invalid credentials' });
                }
            } else {
                console.log('❌ User not found for email:', email);
                res.status(401).json({ error: 'Invalid credentials' });
            }
// 9. Add a debug endpoint to check user permissions (remove in production)
app.get('/api/debug/users/:id', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    try {
        const { id } = req.params;
        const user = await knex('users').where({ id }).first();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const debugInfo = {
            original: user,
            parsed: parseUser(user),
            types: {
                roles: typeof user.roles,
                address: typeof user.address,
                zones: typeof user.zones,
                priorityMultipliers: typeof user.priorityMultipliers
            }
        };
        res.json(debugInfo);
    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});
        } catch (error) {
            console.error("🔥 Login error:", error);
            res.status(500).json({ error: 'Server error during login' });
        }
    });

    // Fetch all application data
    app.get('/api/data', async (req, res) => {
      try {
        const [users, shipments, clientTransactions, courierStats, courierTransactions, notifications, customRoles, inventoryItems, assets, suppliers, supplierTransactions, inAppNotifications, tierSettings] = await Promise.all([
          knex('users').select(),
          knex('shipments').select(),
          knex('client_transactions').select(),
          knex('courier_stats').select(),
          knex('courier_transactions').select(),
          knex('notifications').select(),
          knex('custom_roles').select(),
          knex('inventory_items').select(),
          knex('assets').select(),
          knex('suppliers').select(),
          knex('supplier_transactions').select(),
          knex('in_app_notifications').select(),
          knex('tier_settings').select(),
        ]);

        const safeUsers = await Promise.all(users.map(async (user) => {
            const parsedUser = parseUser(user);
            // Calculate and store wallet balance from client transactions
            if (parsedUser.roles.includes('Client')) {
                const userTransactions = clientTransactions.filter(t => t.userId === user.id);
                const balance = userTransactions.reduce((sum, t) => {
                    const amount = Number(t.amount) || 0;
                    return sum + amount;
                }, 0);
                
                // Update stored wallet balance if it differs from calculated balance
                if (Math.abs(balance - (Number(user.walletBalance) || 0)) > 0.01) {
                    console.log(`🔄 Updating client ${user.id} wallet balance: ${user.walletBalance} → ${balance.toFixed(2)}`);
                    await knex('users').where({ id: user.id }).update({ walletBalance: balance });
                }
                
                parsedUser.walletBalance = balance;
            }
            return parsedUser;
        }));
        
        // Recalculate courier balances from transactions and update stored balances to ensure consistency
        const correctedCourierStats = await Promise.all(courierStats.map(async (stats) => {
            const courierTransactionsForCourier = courierTransactions.filter(t => 
                t.courierId === stats.courierId && 
                t.status !== 'Declined' &&
                // Exclude only pending and declined withdrawals (processed withdrawals should reduce balance)
                !['Withdrawal Request', 'Withdrawal Declined'].includes(t.type)
            );
            const calculatedBalance = courierTransactionsForCourier.reduce((sum, t) => {
                const amount = Number(t.amount) || 0;
                return Number(sum) + Number(amount);
            }, 0);
            
            // Debug: Always log balance calculation for courier
            console.log(`🧮 Courier ${stats.courierId} balance calculation: ${calculatedBalance.toFixed(2)} from ${courierTransactionsForCourier.length} transactions`);
            console.log(`📝 Included transactions:`, courierTransactionsForCourier.map(t => `${t.type}: ${t.amount} (${t.status}, ${t.timestamp || t.date})`));
            
            // Calculate total earnings (sum of all positive earnings, excluding all withdrawal types)
            const totalEarnings = courierTransactions
                .filter(t => 
                    t.courierId === stats.courierId && 
                    t.status === 'Processed' &&
                    !['Withdrawal Request', 'Withdrawal Processed', 'Withdrawal Declined'].includes(t.type) &&
                    Number(t.amount) > 0 // Only positive earnings
                )
                .reduce((sum, t) => Number(sum) + (Number(t.amount) || 0), 0);
            
            // Update stored balance if it differs from calculated balance
            // CRITICAL: Ensure both values are numbers before comparison to prevent string concatenation
            const currentBalanceNum = Number(stats.currentBalance) || 0;
            const totalEarningsNum = Number(stats.totalEarnings) || 0;
            const calculatedBalanceNum = Number(calculatedBalance) || 0;
            const totalEarningsCalcNum = Number(totalEarnings) || 0;
            
            if (Math.abs(calculatedBalanceNum - currentBalanceNum) > 0.01 || 
                Math.abs(totalEarningsCalcNum - totalEarningsNum) > 0.01) {
                console.log(`🔄 Updating courier ${stats.courierId}: balance ${currentBalanceNum} → ${calculatedBalanceNum.toFixed(2)}, earnings ${totalEarningsNum} → ${totalEarningsCalcNum.toFixed(2)}`);
                console.log(`📊 Transactions for courier ${stats.courierId}:`, courierTransactionsForCourier.map(t => `${t.type}: ${t.amount} (${t.status})`));
                await knex('courier_stats').where({ courierId: stats.courierId }).update({ 
                    currentBalance: calculatedBalanceNum,
                    totalEarnings: totalEarningsCalcNum
                });
                
                // CRITICAL FIX: Also update the walletBalance in the users table so frontend displays correct balance
                await knex('users').where({ id: stats.courierId }).update({ 
                    walletBalance: calculatedBalanceNum
                });
                console.log(`💰 Updated user ${stats.courierId} walletBalance to ${calculatedBalanceNum.toFixed(2)}`);
            }
            
            return {
                ...stats,
                currentBalance: calculatedBalanceNum,
                totalEarnings: totalEarningsCalcNum
            };
        }));
        
        const parsedShipments = shipments.map(parseShipment);
        const parsedRoles = customRoles.map(parseRole);
        const parsedAssets = assets.map(parseAsset);
        const parsedInventory = inventoryItems.map(parseInventoryItem);

        res.json({ users: safeUsers, shipments: parsedShipments, clientTransactions, courierStats: correctedCourierStats, courierTransactions, notifications, customRoles: parsedRoles, inventoryItems: parsedInventory, assets: parsedAssets, suppliers, supplierTransactions, inAppNotifications, tierSettings });
      } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch application data' });
      }
    });

    // User Management
    app.post('/api/users', async (req, res) => {
        const { name, email, password, roles, zones, address, phone, flatRateFee, taxCardNumber, referrerId, referralCommission } = req.body;
        
        if (!name || !email || !password || !roles || roles.length === 0) {
            return res.status(400).json({ error: 'Missing required fields: name, email, password, roles' });
        }

        try {
            let newUser = null;
            await knex.transaction(async (trx) => {
                const hashedPassword = await bcrypt.hash(password, saltRounds);
                const userPayload = {
                    name,
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    roles: JSON.stringify(roles),
                    phone: phone || null,
                    address: address ? JSON.stringify(address) : null,
                    referrerId: referrerId || null,
                    referralCommission: referralCommission || null,
                };

                if (roles.includes('Client')) {
                    userPayload.flatRateFee = flatRateFee !== undefined ? flatRateFee : 75.0;
                    userPayload.taxCardNumber = taxCardNumber || null;
                }
                if (roles.includes('Courier')) {
                    userPayload.zones = zones ? JSON.stringify(zones) : JSON.stringify([]);
                }
                
                // Insert user to get the ID
                const [insertedId] = await trx('users').insert(userPayload).returning('id');
                const id = insertedId.id || insertedId;

                // Generate publicId and update
                const rolePrefixes = { 'Client': 'CL', 'Administrator': 'AD', 'Courier': 'CO', 'Super User': 'SA', 'Assigning User': 'AS'};
                const prefix = rolePrefixes[roles[0]] || 'USR';
                const publicId = `${prefix}-${id}`;
                await trx('users').where({id}).update({ publicId });
                
                const finalUser = await trx('users').where({id}).first();


                if (roles.includes('Courier')) {
                    await trx('courier_stats').insert({
                        courierId: id,
                        commissionType: 'flat',
                        commissionValue: 30,
                        consecutiveFailures: 0,
                        isRestricted: false,
                        performanceRating: 5.0,
                    });
                }
                newUser = finalUser;
            });
            
            // The finalUser object from the DB is passed to the parser
            res.status(201).json(parseUser(newUser));
            throttledDataUpdate();
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.code === '23505' || (error.message && (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key')))) {
                 // Check for email constraint specifically if possible (depends on constraint name)
                if (error.constraint && error.constraint.includes('email')) {
                    return res.status(409).json({ error: 'A user with this email already exists.' });
                }
                 // Handle generic primary key violation
                if (error.constraint === 'users_pkey') {
                    console.error('FATAL: Primary key sequence for users is out of sync!');
                    return res.status(500).json({ error: 'Server error: Could not assign a unique ID to the new user. Please contact support.' });
                }
                // Fallback for other unique constraints
                return res.status(409).json({ error: 'A user with this value already exists.' });
            }
            res.status(500).json({ error: 'Server error creating user' });
        }
    });

    app.put('/api/users/:id', async (req, res) => {
        const { id } = req.params;
        const { address, roles, zones, priorityMultipliers, ...userData } = req.body;
        if (address) userData.address = JSON.stringify(address);
        if (roles) userData.roles = JSON.stringify(roles);
        if (zones) userData.zones = JSON.stringify(zones);
        if (priorityMultipliers) userData.priorityMultipliers = JSON.stringify(priorityMultipliers);
        
        try {
            // Do not allow password to be changed via this generic endpoint
            delete userData.password;
            await knex('users').where({ id }).update(userData);
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } 
        catch (error) { res.status(500).json({ error: 'Server error updating user' }); }
    });

    // Admin Profile Update - Allow admin to change their email
    app.put('/api/admin/profile', async (req, res) => {
        try {
            const { email, name, currentPassword } = req.body;
            
            // Get the current admin user (assuming it's passed in the request or session)
            const currentUserId = req.body.userId || req.headers['user-id'];
            if (!currentUserId) {
                return res.status(401).json({ error: 'User ID required' });
            }
            
            const currentUser = await knex('users').where({ id: currentUserId }).first();
            if (!currentUser) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Verify user is admin
            const userRoles = safeJsonParse(currentUser.roles, []);
            if (!userRoles.includes('Administrator')) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            
            // Verify current password if provided
            if (currentPassword) {
                const bcrypt = require('bcrypt');
                const passwordMatch = await bcrypt.compare(currentPassword, currentUser.password);
                if (!passwordMatch) {
                    return res.status(400).json({ error: 'Current password is incorrect' });
                }
            }
            
            // Check if new email already exists (for another user)
            if (email && email !== currentUser.email) {
                const existingUser = await knex('users').where({ email }).first();
                if (existingUser) {
                    return res.status(400).json({ error: 'Email already in use by another user' });
                }
            }
            
            // Update admin profile
            const updateData = {};
            if (email) updateData.email = email;
            if (name) updateData.name = name;
            
            if (Object.keys(updateData).length > 0) {
                await knex('users').where({ id: currentUserId }).update(updateData);
                
                // Get updated user data
                const updatedUser = await knex('users').where({ id: currentUserId }).first();
                
                res.json({
                    success: true,
                    message: 'Admin profile updated successfully',
                    user: {
                        id: updatedUser.id,
                        email: updatedUser.email,
                        name: updatedUser.name,
                        roles: safeJsonParse(updatedUser.roles, [])
                    }
                });
                
                throttledDataUpdate();
            } else {
                res.status(400).json({ error: 'No valid fields provided for update' });
            }
            
        } catch (error) {
            console.error('Admin profile update error:', error);
            res.status(500).json({ error: 'Server error updating admin profile' });
        }
    });

    app.delete('/api/users/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await knex.transaction(async (trx) => {
                // Check if user exists
                const user = await trx('users').where({ id }).first();
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                console.log(`Deleting user ${id}: ${user.name} (${user.email})`);

                // Delete related records first to avoid foreign key constraints
                console.log('Deleting client transactions...');
                await trx('client_transactions').where({ userId: id }).del();
                
                console.log('Deleting courier transactions...');
                await trx('courier_transactions').where({ courierId: id }).del();
                
                console.log('Deleting courier stats...');
                await trx('courier_stats').where({ courierId: id }).del();
                
                console.log('Deleting in-app notifications...');
                await trx('in_app_notifications').where({ userId: id }).del();
                
                // Check if assets table exists and clear assignments
                const hasAssetsTable = await knex.schema.hasTable('assets');
                if (hasAssetsTable) {
                    console.log('Clearing asset assignments...');
                    await trx('assets').where({ assignedToUserId: id }).update({ 
                        assignedToUserId: null,
                        status: 'Available',
                        assignmentDate: null
                    });
                }
                
                // Update shipments to remove courier references
                console.log('Updating shipments...');
                await trx('shipments').where({ courierId: id }).update({ 
                    courierId: null, 
                    status: 'Unassigned'
                });
                
                // Handle referral relationships - update referred users
                console.log('Clearing referrer relationships...');
                await trx('users').where({ referrerId: id }).update({ referrerId: null });
                
                // Finally delete the user
                console.log('Deleting user record...');
                const deletedCount = await trx('users').where({ id }).del();
                
                if (deletedCount === 0) {
                    throw new Error('User deletion failed - no rows affected');
                }

                console.log(`Successfully deleted user ${id}`);
            });
            
            res.status(200).json({ success: true, message: 'User deleted successfully' });
            throttledDataUpdate();
        } catch (error) { 
            console.error('Error deleting user:', error);
            res.status(500).json({ 
                error: 'Server error deleting user', 
                details: error.message,
                hint: 'Check server logs for detailed error information'
            }); 
        }
    });

    app.put('/api/users/:id/password', async (req, res) => {
        const { id } = req.params;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        try { 
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            await knex('users').where({ id }).update({ password: hashedPassword });
            res.status(200).json({ success: true });
            throttledDataUpdate();
        }
        catch (error) { res.status(500).json({ error: 'Server error resetting password' }); }
    });

    app.put('/api/clients/:id/flatrate', async (req, res) => {
        const { id } = req.params;
        const { flatRateFee } = req.body;
        try {
            if (process.env.DATABASE_URL) {
                // PostgreSQL: Use JSONB contains operator
                await knex('users')
                    .where({ id })
                    .whereRaw("roles::jsonb ? 'Client'")
                    .update({ flatRateFee });
            } else {
                // SQLite: Use JSON superset check
                await knex('users')
                    .where({ id })
                    .andWhereJsonSupersetOf('roles', ['Client'])
                    .update({ flatRateFee });
            }
            res.status(200).json({ success: true });
            throttledDataUpdate();
        }
        catch (error) { 
            console.error('Error updating client flat rate:', error);
            res.status(500).json({ error: 'Server error' }); 
        }
    });

    app.put('/api/clients/:id/taxcard', async (req, res) => {
        const { id } = req.params;
        const { taxCardNumber } = req.body;
        try {
            if (process.env.DATABASE_URL) {
                // PostgreSQL: Use JSONB contains operator
                await knex('users')
                    .where({ id })
                    .whereRaw("roles::jsonb ? 'Client'")
                    .update({ taxCardNumber });
            } else {
                // SQLite: Use JSON superset check
                await knex('users')
                    .where({ id })
                    .andWhereJsonSupersetOf('roles', ['Client'])
                    .update({ taxCardNumber });
            }
            res.status(200).json({ success: true });
            throttledDataUpdate();
        }
        catch (error) { 
            console.error('Error updating tax card:', error);
            res.status(500).json({ error: 'Server error' }); 
        }
    });


    // Shipment Management
    app.post('/api/shipments', async (req, res) => {
        const shipmentData = req.body;
        try {
            let newId;
            await knex.transaction(async (trx) => {
                const client = await trx('users').where({ id: shipmentData.clientId }).first();
                if (!client) {
                    throw new Error('Client not found');
                }

                // Recalculate fees on backend for security
                const priorityMultipliers = safeJsonParse(client.priorityMultipliers, { Standard: 1.0, Urgent: 1.5, Express: 2.0 });
                let clientFee = (client.flatRateFee || 75) * (priorityMultipliers[shipmentData.priority] || 1.0);
                
                // Apply partner tier discount
                if (client.partnerTier) {
                    const tierSetting = await trx('tier_settings').where({ tierName: client.partnerTier }).first();
                    if (tierSetting && tierSetting.discountPercentage > 0) {
                        clientFee = clientFee * (1 - (tierSetting.discountPercentage / 100));
                    }
                }

                let finalPrice;
                if (shipmentData.paymentMethod === 'Transfer') {
                    // For Transfer, COD amount is what's left to collect
                    finalPrice = shipmentData.amountToCollect || 0; 
                } else {
                    finalPrice = shipmentData.packageValue + clientFee;
                }


                const govMap = { 'Cairo': 'CAI', 'Giza': 'GIZ', 'Alexandria': 'ALX' };
                
                // Safely parse toAddress if it's a string
                const toAddress = safeJsonParse(shipmentData.toAddress, shipmentData.toAddress);
                const govCode = govMap[toAddress?.city] || 'GOV';
    
                const [counter] = await trx('shipment_counters').where({ id: 'global' }).forUpdate().select('count');
                const newCount = counter.count + 1;
                await trx('shipment_counters').where({ id: 'global' }).update({ count: newCount });
                
                const today = new Date();
                const yymmdd = today.toISOString().slice(2, 10).replace(/-/g, "");
                
                const batch = Math.floor((newCount - 1) / 10000);
                const sequence = ((newCount - 1) % 10000).toString().padStart(4, '0');
                
                newId = `${govCode}-${yymmdd}-${batch}-${sequence}`;
    
                const initialStatus = 'Waiting for Packaging';
                const statusHistory = [{ status: initialStatus, timestamp: new Date().toISOString() }];
    
                const newShipment = {
                    ...shipmentData,
                    id: newId,
                    price: finalPrice, // Use server-calculated price
                    clientFlatRateFee: clientFee, // Use server-calculated fee
                    status: initialStatus,
                    statusHistory: JSON.stringify(statusHistory),
                    creationDate: new Date().toISOString(),
                    fromAddress: JSON.stringify(shipmentData.fromAddress),
                    toAddress: JSON.stringify(shipmentData.toAddress),
                    amountReceived: shipmentData.paymentMethod === 'Transfer' ? shipmentData.amountReceived : null,
                    amountToCollect: shipmentData.paymentMethod === 'Transfer' ? shipmentData.amountToCollect : null,
                };
    
                await trx('shipments').insert(newShipment);
                
                // Send notification for shipment creation (triggers Arabic WhatsApp "Order Received" message)
                await createNotification(trx, newShipment, initialStatus);
                
                // For wallet payments, charge the client immediately at shipment creation
                if (shipmentData.paymentMethod === 'Wallet') {
                    // Check client wallet balance first
                    const clientTransactions = await trx('client_transactions').where({ userId: client.id });
                    const currentBalance = clientTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                    
                    if (currentBalance < clientFee) {
                        throw new Error(`Insufficient wallet balance. Available: ${currentBalance.toFixed(2)} EGP, Required: ${clientFee.toFixed(2)} EGP`);
                    }
                    
                    // Charge the shipping fee from wallet
                    await trx('client_transactions').insert({
                        id: generateId('TRN'),
                        userId: client.id,
                        type: 'Payment',
                        amount: -clientFee,
                        date: new Date().toISOString(),
                        description: `Shipping fee for shipment ${newId}`,
                        status: 'Processed'
                    });
                    
                    console.log(`💳 Charged ${clientFee.toFixed(2)} EGP from client ${client.id} wallet for shipment ${newId}`);
                }
            });
            
            const createdShipment = await knex('shipments').where({ id: newId }).first();
            // The newly created shipment is parsed before being sent back
            res.status(201).json(parseShipment(createdShipment));
            throttledDataUpdate();
        } catch (error) {
            console.error("Error creating shipment:", error);
            res.status(500).json({ error: 'Server error creating shipment' });
        }
    });

    app.put('/api/shipments/:id/status', async (req, res) => {
        const { id } = req.params;
        const { status, failureReason, failurePhoto, isRevert } = req.body;
    
        try {
            await knex.transaction(async (trx) => {
                const shipment = await trx('shipments').where({ id }).first();
                if (!shipment) {
                    const err = new Error('Shipment not found'); err.statusCode = 404; throw err;
                }
    
                let newStatus;
                let updatePayload = {};
                const currentHistory = safeJsonParse(shipment.statusHistory, []);
    
                if (isRevert) {
                    // --- REVERT LOGIC ---
                    if (currentHistory.length <= 1) {
                        const err = new Error('Cannot revert initial status.'); err.statusCode = 400; throw err;
                    }
                    newStatus = currentHistory[currentHistory.length - 2]?.status;
                    if (!newStatus) {
                        const err = new Error('Could not determine previous status to revert to.'); err.statusCode = 400; throw err;
                    }
    
                    if (shipment.status === 'Packaged and Waiting for Assignment' && newStatus === 'Waiting for Packaging') {
                        // When reverting from 'Packaged' to 'Waiting', we clear the packaging log from the shipment
                        // but DO NOT return items to inventory, as the physical package is likely still packed.
                        updatePayload = { status: newStatus, packagingLog: null, packagingNotes: null };
                    } else if (shipment.status === 'Assigned to Courier' && newStatus === 'Packaged and Waiting for Assignment') {
                        updatePayload = { status: newStatus, courierId: null, courierCommission: null };
                    } else {
                        const err = new Error(`Reverting from ${shipment.status} is not supported.`); err.statusCode = 400; throw err;
                    }
                    currentHistory.pop();
                    updatePayload.statusHistory = JSON.stringify(currentHistory);
    
                } else {
                    // --- STANDARD UPDATE LOGIC ---
                    newStatus = status;
                    if (typeof newStatus !== 'string' || !newStatus) {
                        const err = new Error('A valid shipment status must be provided.'); err.statusCode = 400; throw err;
                    }
                    if (newStatus === 'Delivered') {
                        const err = new Error("Deliveries must be confirmed via the verification endpoint."); err.statusCode = 400; throw err;
                    }
    
                    updatePayload = { status: newStatus };
                    if (req.body.hasOwnProperty('failureReason')) updatePayload.failureReason = failureReason || null;
                    
                    if (newStatus === 'Delivery Failed' && failurePhoto) {
                        try {
                            const matches = failurePhoto.match(/^data:(.+?);base64,(.+)$/);
                            if (matches && matches.length === 3) {
                                const imageType = matches[1].split('/')[1];
                                const buffer = Buffer.from(matches[2], 'base64');
                                const fileName = `${shipment.id}_${Date.now()}.${imageType}`;
                                const filePath = path.join(uploadsDir, fileName);
                                fs.writeFileSync(filePath, buffer);
                                updatePayload.failurePhotoPath = `uploads/${fileName}`;
                            }
                        } catch (e) { console.error('Could not save failure photo:', e); }
                    }
    
                    currentHistory.push({ status: newStatus, timestamp: new Date().toISOString() });
                    updatePayload.statusHistory = JSON.stringify(currentHistory);
                    
                    if (newStatus === 'Delivery Failed') {
                        // Handle failure side-effects
                        if (shipment.courierId) {
                            const courierStats = await trx('courier_stats').where({ courierId: shipment.courierId }).first();
                            if (courierStats) {
                                const newFailures = (courierStats.consecutiveFailures || 0) + 1;
                                const failureLimit = 3;
                                const shouldRestrict = newFailures >= failureLimit;
                                await trx('courier_stats').where({ courierId: shipment.courierId }).update({
                                    consecutiveFailures: newFailures,
                                    isRestricted: shouldRestrict,
                                    restrictionReason: shouldRestrict ? `Exceeded failure limit of ${failureLimit}.` : null
                                });
                                await createInAppNotification(trx, shipment.courierId, `Delivery failed for shipment ${shipment.id}. A penalty may be applied.`, '/courier-financials');
                            }
                        }
                        const clientFee = shipment.clientFlatRateFee || 0;
                        if (shipment.clientId && clientFee > 0) {
                            await trx('client_transactions').insert({
                                id: generateId('TRN_FAIL'), userId: shipment.clientId, type: 'Payment',
                                amount: -Math.abs(clientFee), date: new Date().toISOString(),
                                description: `Fee for rejected shipment ${id}`, status: 'Processed'
                            });
                        }
                    }
                }
    
                // --- COMMIT CHANGES & NOTIFY ---
                // Ensure we have a valid status before proceeding
                if (!newStatus || typeof newStatus !== 'string') {
                    const err = new Error('Internal Server Error: Invalid status determined.'); err.statusCode = 500; throw err;
                }
    
                await trx('shipments').where({ id }).update(updatePayload);
                await createNotification(trx, shipment, newStatus);
            });
    
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch (error) {
            console.error("Error updating shipment status:", error);
            const statusCode = error.statusCode || 500;
            const message = error.message || 'Server error while updating status';
            res.status(statusCode).json({ error: message });
        }
    });

    app.put('/api/shipments/:id/assign', async (req, res) => {
        const { id } = req.params;
        const { courierId } = req.body;
        try {
            await knex.transaction(async (trx) => {
                const shipment = await trx('shipments').where({ id }).first();
                if (!shipment) {
                    const err = new Error('Shipment not found');
                    err.statusCode = 404;
                    throw err;
                }
                
                const client = await trx('users').where({ id: shipment.clientId }).first();
                if (!client) {
                    const err = new Error('Client not found for shipment');
                    err.statusCode = 404;
                    throw err;
                }

                let courierStats = await trx('courier_stats').where({ courierId }).first();

                if (!courierStats) {
                    const defaultStats = { courierId: courierId, commissionType: 'flat', commissionValue: 30, consecutiveFailures: 0, isRestricted: false, performanceRating: 5.0 };
                    await trx('courier_stats').insert(defaultStats);
                    courierStats = defaultStats;
                }

                // Calculate commission based on shipment priority
                let commission;
                if (courierStats.commissionType === 'flat') {
                    // Priority-based commission rates
                    const priorityCommissions = {
                        'Standard': 30,
                        'Express': 50,
                        'Urgent': 70
                    };
                    commission = priorityCommissions[shipment.priority] || 30;
                } else {
                    commission = shipment.price * (courierStats.commissionValue / 100);
                }
                
                const newStatus = 'Assigned to Courier';
                
                const currentHistory = safeJsonParse(shipment.statusHistory, []);
                currentHistory.push({ status: newStatus, timestamp: new Date().toISOString() });

                await trx('shipments').where({ id }).update({
                    courierId,
                    status: newStatus,
                    statusHistory: JSON.stringify(currentHistory),
                    courierCommission: commission
                });
                
                await createInAppNotification(trx, courierId, `You have a new shipment assigned: ${id}`, '/tasks');
                await createNotification(trx, shipment, newStatus);
            });
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch (error) {
            console.error("Error in shipment assignment:", error);
            const statusCode = error.statusCode || 500;
            const message = error.message || 'Server error during assignment';
            res.status(statusCode).json({ error: message });
        }
    });
    
    app.post('/api/shipments/auto-assign', async (req, res) => {
        try {
            let assignmentsMade = 0;
            await knex.transaction(async trx => {
                const shipmentsToAssign = await trx('shipments').where('status', 'Packaged and Waiting for Assignment');
                if (shipmentsToAssign.length === 0) return;

                const couriers = await trx('users')
                    .join('courier_stats', 'users.id', 'courier_stats.courierId')
                    .where('courier_stats.isRestricted', false)
                    .select('users.*');

                const activeShipments = await trx('shipments')
                    .whereIn('status', ['Assigned to Courier', 'Out for Delivery'])
                    .select('id', 'courierId');

                const courierWorkload = couriers.reduce((acc, c) => {
                    acc[c.id] = activeShipments.filter(s => s.courierId === c.id).length;
                    return acc;
                }, {});

                for (const shipment of shipmentsToAssign) {
                    const toAddress = safeJsonParse(shipment.toAddress, {});
                    const suitableCouriers = couriers
                        .filter(c => safeJsonParse(c.zones, []).includes(toAddress.zone))
                        .sort((a, b) => courierWorkload[a.id] - courierWorkload[b.id]);
                    
                    if (suitableCouriers.length > 0) {
                        const bestCourier = suitableCouriers[0];
                        
                        const client = await trx('users').where({ id: shipment.clientId }).first();
                        const courierStats = await trx('courier_stats').where({ courierId: bestCourier.id }).first();
                        
                        // Calculate commission based on shipment priority
                        let commission;
                        if (courierStats.commissionType === 'flat') {
                            // Priority-based commission rates
                            const priorityCommissions = {
                                'Standard': 30,
                                'Express': 50,
                                'Urgent': 70
                            };
                            commission = priorityCommissions[shipment.priority] || 30;
                        } else {
                            commission = shipment.price * (courierStats.commissionValue / 100);
                        }
                        
                        const newStatus = 'Assigned to Courier';
                        const currentHistory = safeJsonParse(shipment.statusHistory, []);
                        currentHistory.push({ status: newStatus, timestamp: new Date().toISOString() });

                        await trx('shipments').where({ id: shipment.id }).update({
                            courierId: bestCourier.id,
                            status: newStatus,
                            statusHistory: JSON.stringify(currentHistory),
                            courierCommission: commission
                        });

                        await createInAppNotification(trx, bestCourier.id, `You have a new shipment assigned: ${shipment.id}`, '/tasks');
                        await createNotification(trx, shipment, newStatus);
                        
                        courierWorkload[bestCourier.id]++;
                        assignmentsMade++;
                    }
                }
            });
            res.status(200).json({ success: true, message: `${assignmentsMade} shipments were auto-assigned.` });
            throttledDataUpdate();
        } catch (error) {
            console.error("Auto-assignment error:", error);
            res.status(500).json({ error: 'Failed to auto-assign shipments.' });
        }
    });


    app.put('/api/shipments/:id/fees', async (req, res) => {
        const { id } = req.params;
        const { clientFlatRateFee, courierCommission } = req.body;
        try {
            const payload = {};
            if (clientFlatRateFee !== undefined) payload.clientFlatRateFee = clientFlatRateFee;
            if (courierCommission !== undefined) payload.courierCommission = courierCommission;
            await knex('shipments').where({ id }).update(payload);
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    // --- Updated Delivery Verification Endpoints ---
    app.post('/api/shipments/:id/send-delivery-code', async (req, res) => {
        const { id } = req.params;
        try {
            const shipment = await knex('shipments').where({ id }).first();
            if (!shipment) return res.status(404).json({ error: "Shipment not found." });
            if (!shipment.recipientPhone) return res.status(400).json({ error: "Recipient phone number not available for this shipment." });

            // Use verification service to send delivery code
            const result = await verificationService.sendDeliveryVerificationCode(
                id, 
                shipment.recipientPhone, 
                shipment.recipientName
            );
            
            console.log(`==== Delivery Verification for ${id} to ${shipment.recipientPhone} ====\nCode: ${result.code}\nChannel: ${result.channel}\nSuccess: ${result.success}\n=======================================`);
            
            if (result.success) {
                res.json({ 
                    success: true, 
                    message: result.message,
                    channel: result.channel
                });
            } else {
                res.status(500).json({ 
                    error: result.error || 'Failed to send delivery code',
                    details: result
                });
            }
            throttledDataUpdate();
        } catch (error) {
            console.error('Delivery code sending error:', error);
            res.status(500).json({ error: 'Failed to send delivery code.' });
        }
    });

    // Verify delivery code
    app.post('/api/shipments/:id/verify-delivery-code', async (req, res) => {
        const { id } = req.params;
        const { code } = req.body;
        try {
            const result = await verificationService.verifyDeliveryCode(id, code);
            
            if (result.success) {
                res.json({ 
                    success: true, 
                    message: result.message 
                });
            } else {
                res.status(400).json({ 
                    error: result.error 
                });
            }
        } catch (error) {
            console.error('Delivery code verification error:', error);
            res.status(500).json({ error: 'Failed to verify delivery code.' });
        }
    });

    // --- New User Verification Endpoints ---
    
    // Send verification code for login/signup
    app.post('/api/send-verification-code', async (req, res) => {
        const { phone, purpose = 'login', metadata = {} } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        try {
            const result = await verificationService.sendVerificationCode(phone, purpose, metadata);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    verificationId: result.verificationId,
                    channel: result.channel,
                    expiresAt: result.expiresAt
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                    cooldownRemaining: result.cooldownRemaining
                });
            }
        } catch (error) {
            console.error('Send verification code error:', error);
            res.status(500).json({ error: 'Failed to send verification code' });
        }
    });

    // Verify code for login/signup
    app.post('/api/verify-code', async (req, res) => {
        const { phone, code, purpose = 'login' } = req.body;
        
        if (!phone || !code) {
            return res.status(400).json({ error: 'Phone number and code are required' });
        }

        try {
            const result = await verificationService.verifyCode(phone, code, purpose);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    verificationId: result.verificationId,
                    metadata: result.metadata
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Verify code error:', error);
            res.status(500).json({ error: 'Failed to verify code' });
        }
    });

    // Send welcome WhatsApp message to new users
    app.post('/api/users/:id/send-welcome', async (req, res) => {
        const { id } = req.params;
        try {
            const user = await knex('users').where({ id }).first();
            if (!user) return res.status(404).json({ error: 'User not found' });

            const result = await notificationService.sendWelcomeNotification(user);
            
            res.json({ 
                success: result.success || false, 
                message: result.success ? 'Welcome message sent via WhatsApp' : 'Failed to send welcome message',
                details: result
            });
        } catch (error) {
            console.error('Welcome message error:', error);
            res.status(500).json({ error: 'Failed to send welcome message' });
        }
    });

    // WhatsApp webhook endpoint for receiving messages
    app.post('/webhook/whatsapp', (req, res) => {
        console.log('📱 WhatsApp webhook received:', JSON.stringify(req.body, null, 2));
        
        // Verify webhook (for production)
        if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
            console.log('✅ WhatsApp webhook verified');
            res.status(200).send(req.query['hub.challenge']);
            return;
        }

        // Handle incoming WhatsApp messages here if needed
        // For now, just acknowledge receipt
        res.status(200).send('OK');
    });

    // Get WhatsApp and SMS service status
    app.get('/api/verification/status', (req, res) => {
        res.json(verificationService.getStatus());
    });

    app.get('/api/whatsapp/status', (req, res) => {
        try {
            if (whatsAppService && typeof whatsAppService.getStatus === 'function') {
                res.json(whatsAppService.getStatus());
            } else {
                res.json({
                    enabled: false,
                    provider: 'unavailable',
                    businessPhone: process.env.BUSINESS_PHONE_NUMBER || '+201116306013',
                    error: 'WhatsApp service not properly initialized'
                });
            }
        } catch (error) {
            res.status(500).json({
                enabled: false,
                provider: 'error',
                businessPhone: process.env.BUSINESS_PHONE_NUMBER || '+201116306013',
                error: error.message
            });
        }
    });

    // WhatsApp Token Management Routes
    app.post('/api/whatsapp/refresh-token', async (req, res) => {
        try {
            const result = await whatsAppService.refreshToken();
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Token refreshed successfully',
                    data: {
                        newToken: result.token.substring(0, 20) + '...'
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    app.post('/api/whatsapp/generate-permanent-token', async (req, res) => {
        try {
            const result = await whatsAppService.generatePermanentToken();
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Permanent token generated successfully',
                    data: {
                        permanentToken: result.token,
                        instructions: [
                            '1. Copy the permanent token above',
                            '2. Update your Railway environment variable: WHATSAPP_ACCESS_TOKEN',
                            '3. Restart your Railway service',
                            '4. This token should never expire and won\'t need refresh'
                        ]
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    app.post('/api/whatsapp/check-token', async (req, res) => {
        try {
            const result = await whatsAppService.checkTokenStatus();
            res.json({
                success: result.success,
                data: result,
                message: result.success ? 'Token status checked successfully' : 'Failed to check token status'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    app.post('/api/whatsapp/test-message', async (req, res) => {
        try {
            const { phone, message } = req.body;
            if (!phone || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone and message are required'
                });
            }
            const result = await whatsAppService.sendMessage(phone, message);
            res.json({
                success: result.success,
                data: result,
                message: result.success ? 'Test message sent successfully' : 'Failed to send test message'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Courier Financials
    app.put('/api/couriers/:id/settings', async (req, res) => {
        const { id } = req.params;
        const { commissionType, commissionValue } = req.body;
        try {
            await knex('courier_stats').where({ courierId: id }).update({ commissionType, commissionValue });
            res.status(200).json({ success: true });
            throttledDataUpdate();
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.post('/api/couriers/:id/penalty', async (req, res) => {
        const { id } = req.params;
        const { amount, description, shipmentId } = req.body;
        try { 
            await knex.transaction(async trx => {
                const penaltyAmount = -Math.abs(amount);
                await trx('courier_transactions').insert({ 
                    id: generateId('TRN'), courierId: id, type: 'Penalty', amount: penaltyAmount, description, 
                    shipmentId: shipmentId || null, timestamp: new Date().toISOString(), status: 'Processed' 
                });
                
                // Note: currentBalance is now calculated automatically from transactions
                // No manual balance update needed
                console.log(`⚠️  Penalty applied: Courier ${id} penalized ${amount} EGP - balance will be updated automatically`);
                
                await createInAppNotification(trx, id, `A penalty of ${amount} EGP was applied to your account. Reason: ${description}`, '/courier-financials');
            });
            res.status(200).json({ success: true });
            throttledDataUpdate();
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.post('/api/couriers/:id/failed-delivery-penalty', async (req, res) => {
        const { id } = req.params;
        const { shipmentId, description } = req.body;
        try {
            const shipment = await knex('shipments').where({ id: shipmentId }).first();
            if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
            
            const penaltyAmount = shipment.packageValue;
            const finalDescription = description || `Penalty for failed delivery of ${shipmentId} - Package value: ${penaltyAmount} EGP`;
            
            await knex.transaction(async trx => {
                const negativePenalty = -penaltyAmount;
                await trx('courier_transactions').insert({ 
                    id: generateId('TRN'), courierId: id, type: 'Penalty', amount: negativePenalty, 
                    description: finalDescription,
                    shipmentId: shipmentId, timestamp: new Date().toISOString(), status: 'Processed' 
                });
                
                // Note: currentBalance is now calculated automatically from transactions
                // No manual balance update needed
                console.log(`⚠️  Failed delivery penalty: Courier ${id} penalized ${penaltyAmount} EGP for shipment ${shipmentId} - balance will be updated automatically`);
                
                await createInAppNotification(trx, id, `A penalty of ${penaltyAmount} EGP was applied for failed delivery of ${shipmentId}.`, '/courier-financials');
            });
            res.status(200).json({ success: true, penaltyAmount, message: `Penalty of ${penaltyAmount} EGP applied` });
            throttledDataUpdate();
        } catch (error) { 
            console.error('Error applying failed delivery penalty:', error);
            res.status(500).json({ error: 'Server error applying penalty' }); 
        }
    });

    app.post('/api/couriers/payouts', async (req, res) => {
        const { courierId, amount, paymentMethod } = req.body;
        try {
            await knex.transaction(async trx => {
                // Check for existing pending payout requests
                const existingPendingPayout = await trx('courier_transactions')
                    .where({ 
                        courierId, 
                        type: 'Withdrawal Request', 
                        status: 'Pending' 
                    })
                    .first();
                
                if (existingPendingPayout) {
                    throw new Error('You already have a pending payout request. Please wait for it to be processed before requesting another.');
                }
                
                // Calculate real-time balance from transactions (exclude pending and declined withdrawals only)
                const courierTransactions = await trx('courier_transactions').where({ courierId });
                const calculatedBalance = courierTransactions.reduce((sum, transaction) => {
                    const amount = Number(transaction.amount) || 0;
                    // Exclude only pending and declined withdrawals (processed withdrawals should affect balance)
                    if (['Withdrawal Request', 'Withdrawal Declined'].includes(transaction.type)) {
                        return sum; // Don't add pending/declined withdrawal transactions to available balance
                    }
                    // Include all processed transactions (including processed withdrawals which reduce balance)
                    if (transaction.status === 'Processed') {
                        return sum + amount;
                    }
                    return sum;
                }, 0);
                
                console.log(`💰 Courier ${courierId} balance check: calculated=${calculatedBalance.toFixed(2)}, requested=${amount}`);
                console.log(`📊 Transactions used for balance:`, courierTransactions.filter(t => 
                    !['Withdrawal Request', 'Withdrawal Declined'].includes(t.type) &&
                    t.status === 'Processed'
                ).map(t => `${t.type}: ${t.amount} (${t.status})`));
                
                if (calculatedBalance < amount) {
                    throw new Error(`Insufficient balance for payout request. Available: ${calculatedBalance.toFixed(2)} EGP, Requested: ${amount} EGP`);
                }
                
                const withdrawalAmount = -Math.abs(amount);
                await trx('courier_transactions').insert({ 
                    id: generateId('TRN'), courierId, type: 'Withdrawal Request', 
                    amount: withdrawalAmount, 
                    description: `Payout request via ${paymentMethod}`, 
                    timestamp: new Date().toISOString(), status: 'Pending',
                    paymentMethod
                });
                
                console.log(`💸 Payout request created: Courier ${courierId}, Amount: ${amount} EGP, Method: ${paymentMethod}`);
                
                // Note: Payout requests don't affect current balance until processed/declined
                // The negative amount in the transaction will be excluded from balance calculation
            });
            res.status(200).json({ success: true, message: 'Payout request submitted successfully' });
            throttledDataUpdate();
        }
        catch (error) { 
            console.error('Payout request error:', error.message);
            res.status(400).json({ error: error.message }); 
        }
    });

    app.put('/api/payouts/:id/process', async (req, res) => {
        const { id } = req.params;
        const { transferEvidence, processedAmount } = req.body; // base64 string and optional amount
        try {
            await knex.transaction(async trx => {
                const payoutRequest = await trx('courier_transactions').where({ id }).first();
                if (!payoutRequest) return res.status(404).json({ error: 'Payout request not found.' });
                
                const finalAmount = processedAmount !== undefined ? -Math.abs(processedAmount) : payoutRequest.amount;

                const updatePayload = { 
                    status: 'Processed', 
                    type: 'Withdrawal Processed', 
                    description: `Payout processed by admin. Requested: ${-payoutRequest.amount}, Paid: ${-finalAmount}`,
                    amount: finalAmount
                };

                if (transferEvidence) {
                     try {
                        const matches = transferEvidence.match(/^data:(.+?);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const imageType = matches[1].split('/')[1];
                            const buffer = Buffer.from(matches[2], 'base64');
                            const fileName = `evidence_${id}_${Date.now()}.${imageType}`;
                            const filePath = path.join(evidenceDir, fileName);
                            
                            fs.writeFileSync(filePath, buffer);
                            updatePayload.transferEvidencePath = `uploads/evidence/${fileName}`;
                        }
                    } catch (e) { console.error('Could not save transfer evidence:', e); }
                }

                const [payout] = await trx('courier_transactions').where({ id }).update(updatePayload).returning('*');
                
                console.log(`✅ Payout processed: ID ${id}, Type changed from 'Withdrawal Request' to 'Withdrawal Processed'`);
                console.log(`💸 Courier ${payout.courierId} payout of ${Math.abs(Number(finalAmount)).toFixed(2)} EGP processed - balance will be updated automatically`);
                
                // Note: Balance is calculated automatically by excluding 'Withdrawal Processed' transactions
                // No manual balance deduction needed as the transaction type change handles this
                
                await createInAppNotification(trx, payout.courierId, `Your payout request for ${Math.abs(Number(payout.amount)).toFixed(2)} EGP has been processed.`, '/courier-financials');
            });
            res.status(200).json({ success: true });
            throttledDataUpdate();
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.put('/api/payouts/:id/decline', async (req, res) => {
        const { id } = req.params;
        try {
            await knex.transaction(async trx => {
                const payoutRequest = await trx('courier_transactions').where({ id }).first();
                if (!payoutRequest) return res.status(404).json({ error: 'Payout request not found.' });

                const updatePayload = {
                    status: 'Failed',
                    type: 'Withdrawal Declined',
                    description: `Payout request for ${(-payoutRequest.amount).toFixed(2)} EGP declined by admin.`
                };
                
                // When declining, we just change the transaction type to 'Withdrawal Declined'
                // The balance will be automatically restored because 'Withdrawal Declined' transactions are excluded from balance calculation
                // No need for manual refund transaction or balance update
                
                const [payout] = await trx('courier_transactions').where({ id }).update(updatePayload).returning('*');
                console.log(`❌ Payout declined: ID ${id}, Type changed from 'Withdrawal Request' to 'Withdrawal Declined'`);
                console.log(`🔄 Courier ${payoutRequest.courierId} balance will be automatically restored on next data refresh`);
                await createInAppNotification(trx, payout.courierId, `Your payout request for ${Math.abs(Number(payout.amount)).toFixed(2)} EGP has been declined.`, '/courier-financials');
            });
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch(error) {
            console.error("Error declining payout:", error);
            res.status(500).json({ error: 'Server error declining payout request' });
        }
    });

    // --- Client Payouts ---
    app.post('/api/clients/:id/payouts', async (req, res) => {
        const { id } = req.params;
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid payout amount.' });
        }
        try {
            await knex.transaction(async trx => {
                // Check for existing pending payout requests
                const existingPendingPayout = await trx('client_transactions')
                    .where({ 
                        userId: id, 
                        type: 'Withdrawal Request', 
                        status: 'Pending' 
                    })
                    .first();
                
                if (existingPendingPayout) {
                    throw new Error('You already have a pending payout request. Please wait for it to be processed before requesting another.');
                }
                
                // Check client's current available balance (exclude pending withdrawal requests)
                const clientTransactions = await trx('client_transactions').where({ userId: id });
                const availableBalance = clientTransactions.reduce((sum, t) => {
                    const transactionAmount = Number(t.amount) || 0;
                    // Exclude withdrawal requests (both pending and processed) from available balance
                    if (['Withdrawal Request', 'Withdrawal Processed', 'Withdrawal Declined'].includes(t.type)) {
                        return sum; // Don't add withdrawal transactions to available balance
                    }
                    return sum + transactionAmount;
                }, 0);
                
                if (amount > availableBalance) {
                    throw new Error(`Insufficient balance for payout request. Available: ${availableBalance.toFixed(2)} EGP, Requested: ${amount} EGP`);
                }
                
                // Create withdrawal request transaction
                await trx('client_transactions').insert({
                    id: generateId('TRN_PAYOUT'),
                    userId: id,
                    type: 'Withdrawal Request',
                    amount: -Math.abs(amount),
                    date: new Date().toISOString(),
                    description: 'Client payout request',
                    status: 'Pending'
                });
                
                // Update client's stored wallet balance immediately
                await updateClientWalletBalance(trx, id);
                
                console.log(`💸 Client payout request created: Client ${id}, Amount: ${amount} EGP`);
            });
            
            res.status(200).json({ success: true, message: 'Payout request submitted successfully' });
            throttledDataUpdate();
        } catch (error) {
            console.error('Client payout request error:', error.message);
            res.status(400).json({ error: error.message });
        }
    });

    // Client wallet top-up endpoint
    app.post('/api/clients/:id/topup', async (req, res) => {
        const { id } = req.params;
        const { amount, description } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid top-up amount.' });
        }
        try {
            await knex('client_transactions').insert({
                id: generateId('TRN'),
                userId: parseInt(id),
                type: 'Deposit',
                amount: Math.abs(amount),
                date: new Date().toISOString(),
                description: description || 'Wallet top-up',
                status: 'Processed'
            });
            res.status(200).json({ success: true, message: 'Wallet topped up successfully' });
            throttledDataUpdate();
        } catch (error) {
            console.error('Client wallet top-up error:', error);
            res.status(500).json({ error: 'Server error processing wallet top-up.' });
        }
    });

    app.put('/api/client-transactions/:id/process', async (req, res) => {
        const { id } = req.params;
        try {
            await knex.transaction(async trx => {
                // Update the transaction status
                await trx('client_transactions')
                    .where({ id, type: 'Withdrawal Request' })
                    .update({ status: 'Processed', type: 'Withdrawal Processed', description: 'Payout processed by admin' });
                
                // Get the transaction to find the user
                const transaction = await trx('client_transactions').where({ id }).first();
                if (transaction) {
                    // Update client's stored wallet balance
                    await updateClientWalletBalance(trx, transaction.userId);
                }
            });
            
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch (error) {
            console.error('Client payout processing error:', error);
            res.status(500).json({ error: 'Server error processing payout.' });
        }
    });

    app.put('/api/client-transactions/:id/decline', async (req, res) => {
        const { id } = req.params;
        try {
            await knex.transaction(async trx => {
                // Update the transaction status to declined
                await trx('client_transactions')
                    .where({ id, type: 'Withdrawal Request' })
                    .update({ status: 'Declined', type: 'Withdrawal Declined', description: 'Payout declined by admin' });
                
                // Get the transaction to find the user
                const transaction = await trx('client_transactions').where({ id }).first();
                if (transaction) {
                    // Update client's stored wallet balance (this will restore available balance)
                    await updateClientWalletBalance(trx, transaction.userId);
                }
            });
            
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch (error) {
            console.error('Client payout decline error:', error);
            res.status(500).json({ error: 'Server error declining payout.' });
        }
    });

    // --- DEBUG ENDPOINT: Check courier balance calculation ---
    app.get('/api/debug/courier-balance/:courierId', async (req, res) => {
        const { courierId } = req.params;
        try {
            const courierTransactions = await knex('courier_transactions').where({ courierId });
            const courierStats = await knex('courier_stats').where({ courierId }).first();
            
            // Calculate balance excluding withdrawal transactions
            const includedTransactions = courierTransactions.filter(t => 
                t.status !== 'Declined' &&
                !['Withdrawal Request', 'Withdrawal Processed', 'Withdrawal Declined'].includes(t.type)
            );
            
            const excludedTransactions = courierTransactions.filter(t => 
                t.status === 'Declined' ||
                ['Withdrawal Request', 'Withdrawal Processed', 'Withdrawal Declined'].includes(t.type)
            );
            
            const calculatedBalance = includedTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            
            res.json({
                courierId,
                storedBalance: courierStats?.currentBalance || 0,
                calculatedBalance,
                totalTransactions: courierTransactions.length,
                includedTransactions: includedTransactions.map(t => ({
                    id: t.id,
                    type: t.type,
                    amount: t.amount,
                    status: t.status,
                    description: t.description,
                    date: t.date
                })),
                excludedTransactions: excludedTransactions.map(t => ({
                    id: t.id,
                    type: t.type,
                    amount: t.amount,
                    status: t.status,
                    description: t.description,
                    date: t.date
                }))
            });
        } catch (error) {
            console.error('Debug courier balance error:', error);
            res.status(500).json({ error: 'Debug failed' });
        }
    });

    // --- DEBUG ENDPOINT: Database cleanup ---
    app.delete('/api/debug/cleanup-database', async (req, res) => {
        try {
            console.log('🧹 Starting database cleanup...');
            
            await knex.transaction(async (trx) => {
                // Get first 2 shipments by creation date
                const shipmentsToKeep = await trx('shipments')
                    .select('id')
                    .orderBy('createdAt')
                    .limit(2);
                    
                const shipmentIds = shipmentsToKeep.map(s => s.id);
                console.log('📦 Keeping shipments:', shipmentIds);
                
                if (shipmentIds.length === 0) {
                    return res.json({ success: true, message: 'No shipments to clean' });
                }
                
                // Delete shipments beyond first 2
                const deletedShipments = await trx('shipments')
                    .whereNotIn('id', shipmentIds)
                    .del();
                console.log(`📦 Deleted ${deletedShipments} shipments`);
                
                // Delete all courier transactions and let system recalculate from remaining shipments
                const deletedCourierTxn = await trx('courier_transactions').del();
                console.log(`💰 Deleted ${deletedCourierTxn} courier transactions`);
                
                // Delete all client transactions and let system recalculate from remaining shipments  
                const deletedClientTxn = await trx('client_transactions').del();
                console.log(`🧾 Deleted ${deletedClientTxn} client transactions`);
                
                // Reset all courier stats
                const resetCourierStats = await trx('courier_stats').update({
                    currentBalance: 0,
                    totalEarnings: 0,
                    consecutiveFailures: 0,
                    totalDeliveries: 0
                });
                console.log(`👤 Reset ${resetCourierStats} courier stats`);
                
                // Reset all user wallet balances
                const resetUserBalances = await trx('users').update({ walletBalance: 0 });
                console.log(`💰 Reset ${resetUserBalances} user wallet balances`);
                
                // Clear notifications
                const deletedNotifications = await trx('in_app_notifications').del();
                console.log(`🔔 Deleted ${deletedNotifications} notifications`);
            });
            
            console.log('✅ Database cleanup completed');
            res.json({ 
                success: true, 
                message: `Database cleaned - kept first 2 shipments, reset all balances and transactions`,
                shipmentsKept: 2
            });
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // --- DEBUG ENDPOINT: Complete Database Reset ---
    app.post('/api/debug/reset-database', async (req, res) => {
        try {
            console.log('🔄 Starting COMPLETE database reset...');
            
            const resetResults = {
                backup: {},
                deleted: {},
                reset: {}
            };
            
            // Step 1: Record current state (outside transaction)
            console.log('📊 Recording current state...');
            resetResults.backup = {
                users: await knex('users').count('id as count').first(),
                shipments: await knex('shipments').count('id as count').first(),
                courier_transactions: await knex('courier_transactions').count('id as count').first(),
                client_transactions: await knex('client_transactions').count('id as count').first(),
                courier_stats: await knex('courier_stats').count('courierId as count').first()
            };
            
            // Step 2: Get first 2 shipments to preserve (outside transaction)
            const shipmentsToKeep = await knex('shipments')
                .select('id', 'creationDate')
                .orderBy('creationDate')
                .limit(2);
                
            const shipmentIds = shipmentsToKeep.map(s => s.id);
            console.log('📦 Preserving shipments:', shipmentIds);
            
            // Step 3: Perform deletions (outside transaction to avoid constraint issues)
            console.log('🗑️  Clearing all transactions...');
            resetResults.deleted.courier_transactions = await knex('courier_transactions').del();
            resetResults.deleted.client_transactions = await knex('client_transactions').del();
            resetResults.deleted.notifications = await knex('in_app_notifications').del();
            
            // Step 4: Remove excess shipments
            if (shipmentIds.length > 0) {
                resetResults.deleted.shipments = await knex('shipments')
                    .whereNotIn('id', shipmentIds)
                    .del();
            } else {
                resetResults.deleted.shipments = await knex('shipments').del();
            }
            
            // Step 5: Reset all courier stats
            console.log('👤 Resetting courier stats...');
            resetResults.reset.courier_stats = await knex('courier_stats').update({
                currentBalance: 0,
                totalEarnings: 0,
                consecutiveFailures: 0,
                isRestricted: false,
                restrictionReason: null
            });
            
            // Step 6: Reset user wallet balances
            console.log('💰 Resetting user wallet balances...');
            resetResults.reset.user_balances = await knex('users').update({ 
                walletBalance: 0 
            });
            
            // Step 7: Reset sequences for clean numbering (PostgreSQL only)
            console.log('🔢 Resetting sequences...');
            if (process.env.DATABASE_URL) {
                try {
                    await knex.raw(`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true);`);
                    console.log('🔢 Reset user sequence');
                } catch (error) {
                    console.log('⚠️ Sequence reset skipped:', error.message);
                }
            }
            
            // Step 8: Get final counts for verification
            resetResults.final = {
                users: await knex('users').count('id as count').first(),
                shipments: await knex('shipments').count('id as count').first(),
                courier_transactions: await knex('courier_transactions').count('id as count').first(),
                client_transactions: await knex('client_transactions').count('id as count').first()
            };
            
            console.log('✅ Complete database reset finished');
            console.log('📊 Reset Summary:', resetResults);
            
            res.json({ 
                success: true, 
                message: 'Complete database reset successful',
                results: resetResults,
                preserved: 'Users and first 2 shipments',
                cleared: 'All transactions, excess shipments, balances reset'
            });
            
        } catch (error) {
            console.error('❌ Complete reset failed:', error);
            res.status(500).json({ 
                error: 'Reset failed', 
                details: error.message,
                stack: error.stack,
                suggestion: 'Check server logs for detailed error information'
            });
        }
    });

    // Complete Database Reset Endpoint - Admin Only with Full Cleanup
    app.post('/api/admin/reset-database-complete', async (req, res) => {
        try {
            console.log('🚨 COMPLETE DATABASE RESET INITIATED by Admin');
            
            // Remove transaction wrapper to avoid PostgreSQL foreign key constraint abort issues
            const results = {
                    backup: {},
                    deleted: {},
                    reset: {},
                    recreated: {},
                    final: {}
                };
                
                // STEP 1: Backup current counts for reporting
                console.log('📋 Taking backup count...');
                results.backup = {
                    users: await knex('users').count('id as count').first(),
                    shipments: await knex('shipments').count('id as count').first(),
                    courier_transactions: await knex('courier_transactions').count('id as count').first(),
                    client_transactions: await knex('client_transactions').count('id as count').first(),
                    notifications: await knex('notifications').count('id as count').first(),
                    courier_stats: await knex('courier_stats').count('courierId as count').first()
                };
                
                // STEP 2: Delete ALL transactional data first (to remove foreign key dependencies)
                console.log('🧹 Deleting all transactions and operational data...');
                
                // Check if tables exist before trying to delete from them
                const tableChecks = {};
                const tablesToCheck = ['courier_transactions', 'client_transactions', 'notifications', 'in_app_notifications', 'shipments', 'assets', 'inventory_items', 'suppliers', 'supplier_transactions', 'shipment_counters'];
                
                for (const table of tablesToCheck) {
                    try {
                        tableChecks[table] = await knex.schema.hasTable(table);
                    } catch (e) {
                        tableChecks[table] = false;
                    }
                }
                
                // Delete from tables that exist
                if (tableChecks.courier_transactions) {
                    results.deleted.courier_transactions = await knex('courier_transactions').del();
                }
                if (tableChecks.client_transactions) {
                    results.deleted.client_transactions = await knex('client_transactions').del();
                }
                if (tableChecks.notifications) {
                    results.deleted.notifications = await knex('notifications').del();
                }
                if (tableChecks.in_app_notifications) {
                    results.deleted.in_app_notifications = await knex('in_app_notifications').del();
                }
                if (tableChecks.shipments) {
                    results.deleted.shipments = await knex('shipments').del();
                }
                
                // STEP 2.5: Clear ALL assets and inventory as requested
                console.log('🗑️ Clearing assets and inventory...');
                if (tableChecks.assets) {
                    results.deleted.assets = await knex('assets').del();
                }
                if (tableChecks.inventory_items) {
                    // Reset inventory to initial state instead of deleting
                    results.deleted.inventory_items = await knex('inventory_items').del();
                    // Re-seed inventory with default items (no shipping labels)
                    await knex('inventory_items').insert([
                        { id: 'inv_box_sm', name: 'Small Cardboard Box', quantity: 1000, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 100, unitPrice: 5.00 },
                        { id: 'inv_box_md', name: 'Medium Cardboard Box', quantity: 1000, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 100, unitPrice: 7.50 },
                        { id: 'inv_box_lg', name: 'Large Cardboard Box', quantity: 500, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 50, unitPrice: 10.00 },
                        { id: 'inv_flyer_sm', name: 'Small Flyer', quantity: 2000, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 500, unitPrice: 0.25 },
                        { id: 'inv_flyer_md', name: 'Medium Flyer', quantity: 1500, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 300, unitPrice: 0.35 },
                        { id: 'inv_flyer_lg', name: 'Large Flyer', quantity: 1000, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 200, unitPrice: 0.50 },
                        { id: 'inv_plastic_wrap', name: 'Packaging Plastic', quantity: 200, unit: 'rolls', lastUpdated: new Date().toISOString(), minStock: 20, unitPrice: 30.00 },
                    ]);
                }
                if (tableChecks.suppliers) {
                    results.deleted.suppliers = await knex('suppliers').del();
                }
                if (tableChecks.supplier_transactions) {
                    results.deleted.supplier_transactions = await knex('supplier_transactions').del();
                }
                
                // STEP 3: Handle user deletions carefully with foreign key constraints
                console.log('👥 Removing non-essential users...');
                const essentialEmails = ['admin@shuhna.net', 'testcourier@flash.com', 'testclient@flash.com'];
                const essentialUsers = await knex('users').whereIn('email', essentialEmails).select('id', 'email');
                const essentialUserIds = essentialUsers.map(u => u.id);
                
                // First, get all non-essential user IDs
                const nonEssentialUsers = await knex('users').whereNotIn('email', essentialEmails).select('id');
                const nonEssentialUserIds = nonEssentialUsers.map(u => u.id);
                
                // Delete courier_stats for non-essential users (no foreign key constraints)
                if (nonEssentialUserIds.length > 0) {
                    results.deleted.courier_stats_non_essential = await knex('courier_stats').whereIn('courierId', nonEssentialUserIds).del();
                } else {
                    results.deleted.courier_stats_non_essential = 0;
                }
                
                // Check for any remaining foreign key references and delete them
                try {
                    // Delete any asset assignments for non-essential users
                    if (nonEssentialUserIds.length > 0) {
                        const assetsTable = await knex.schema.hasTable('assets');
                        if (assetsTable) {
                            await knex('assets').whereIn('assignedTo', nonEssentialUserIds).update({ assignedTo: null });
                        }
                    }
                } catch (e) {
                    console.log('⚠️ No assets table or asset cleanup needed');
                }
                
                // Finally, delete non-essential users
                if (nonEssentialUserIds.length > 0) {
                    results.deleted.users_non_essential = await knex('users').whereNotIn('email', essentialEmails).del();
                } else {
                    results.deleted.users_non_essential = 0;
                }
                
                // STEP 4: Reset essential users' data or create them if they don't exist
                console.log('🔄 Resetting essential users data...');
                const existingEssentialUsers = await knex('users').whereIn('email', essentialEmails).select('id', 'email', 'roles');
                
                // Reset existing essential users
                if (existingEssentialUsers.length > 0) {
                    results.reset.user_balances = await knex('users').whereIn('email', essentialEmails).update({ 
                        walletBalance: 0,
                        partnerTier: 'Bronze'  // Fixed: should be partnerTier, not currentTier
                    });
                }
                
                // Create missing essential users if needed
                const existingEmails = existingEssentialUsers.map(u => u.email);
                const missingUsers = [];
                
                if (!existingEmails.includes('admin@shuhna.net')) {
                    missingUsers.push({
                        firstName: 'Admin',
                        lastName: 'User',
                        email: 'admin@shuhna.net',
                        password: 'password123', // Will be hashed by the system
                        phone: '+201000000000',
                        roles: '["Administrator"]',
                        walletBalance: 0,
                        partnerTier: 'Bronze'  // Fixed: should be partnerTier, not currentTier
                    });
                }
                
                if (!existingEmails.includes('testcourier@flash.com')) {
                    missingUsers.push({
                        firstName: 'Test',
                        lastName: 'Courier',
                        email: 'testcourier@flash.com',
                        password: 'password123',
                        phone: '+201000000001',
                        roles: '["Courier"]',
                        walletBalance: 0,
                        partnerTier: 'Bronze'  // Fixed: should be partnerTier, not currentTier
                    });
                }
                
                if (!existingEmails.includes('testclient@flash.com')) {
                    missingUsers.push({
                        firstName: 'Test',
                        lastName: 'Client',
                        email: 'testclient@flash.com',
                        password: 'password123',
                        phone: '+201000000002',
                        roles: '["Client"]',
                        walletBalance: 0,
                        partnerTier: 'Bronze'  // Fixed: should be partnerTier, not currentTier
                    });
                }
                
                if (missingUsers.length > 0) {
                    results.recreated.essential_users = await knex('users').insert(missingUsers).returning('*');
                } else {
                    results.recreated.essential_users = [];
                }
                
                // STEP 5: Reset/create courier stats for essential couriers
                console.log('👤 Resetting courier stats...');
                const allEssentialUsers = await knex('users').whereIn('email', essentialEmails).select('id', 'roles');
                const courierUsers = allEssentialUsers.filter(u => 
                    u.roles && (u.roles.includes('Courier') || u.roles.includes('"Courier"'))
                );
                
                if (courierUsers.length > 0) {
                    const courierIds = courierUsers.map(u => u.id);
                    
                    // Check which couriers already have stats
                    const existingStats = await knex('courier_stats').whereIn('courierId', courierIds).select('courierId');
                    const existingStatsCourierIds = existingStats.map(s => s.courierId);
                    
                    // Update existing stats
                    if (existingStatsCourierIds.length > 0) {
                        results.reset.courier_stats = await knex('courier_stats').whereIn('courierId', existingStatsCourierIds).update({
                            currentBalance: 0,
                            totalEarnings: 0,
                            consecutiveFailures: 0,
                            isRestricted: false
                        });
                    }
                    
                    // Create stats for couriers that don't have them
                    const newStatsCourierIds = courierIds.filter(id => !existingStatsCourierIds.includes(id));
                    if (newStatsCourierIds.length > 0) {
                        const newStats = newStatsCourierIds.map(courierId => ({
                            courierId,
                            commissionType: 'flat',
                            commissionValue: 30,
                            consecutiveFailures: 0,
                            isRestricted: false,
                            performanceRating: 5.0,
                            currentBalance: 0,
                            totalEarnings: 0
                        }));
                        results.recreated.courier_stats = await knex('courier_stats').insert(newStats).returning('*');
                    }
                } else {
                    results.reset.courier_stats = 0;
                    results.recreated.courier_stats = [];
                }
                
                // STEP 6: Reset sequences for clean numbering starting from 1
                console.log('🔢 Resetting all sequences to start from 1...');
                try {
                    const sequences = await knex.raw(`
                        SELECT sequence_name 
                        FROM information_schema.sequences 
                        WHERE sequence_schema = 'public'
                    `);
                    
                    results.reset.sequences = [];
                    for (const seq of sequences.rows) {
                        await knex.raw(`ALTER SEQUENCE ${seq.sequence_name} RESTART WITH 1`);
                        results.reset.sequences.push(seq.sequence_name);
                        console.log(`🔢 Reset sequence: ${seq.sequence_name} → 1`);
                    }
                } catch (error) {
                    console.log('⚠️ Sequence reset skipped:', error.message);
                    results.reset.sequences = ['Error: ' + error.message];
                }

                // STEP 6.5: Reset shipment counter to start from 0 (so first shipment will be 0000)
                console.log('📦 Resetting shipment counter to start from 0000...');
                try {
                    const hasShipmentCounters = await knex.schema.hasTable('shipment_counters');
                    if (hasShipmentCounters) {
                        results.reset.shipment_counter = await knex('shipment_counters')
                            .where({ id: 'global' })
                            .update({ count: 0 });
                        console.log('📦 Shipment counter reset to 0 - next shipment will be 0000');
                    } else {
                        // Create the counter if it doesn't exist
                        await knex('shipment_counters').insert({ id: 'global', count: 0 });
                        results.reset.shipment_counter = 'created with count 0';
                        console.log('📦 Shipment counter created and set to 0');
                    }
                } catch (error) {
                    console.log('⚠️ Shipment counter reset failed:', error.message);
                    results.reset.shipment_counter = 'Error: ' + error.message;
                }
                
                // STEP 7: Get final counts for verification
                console.log('📊 Getting final counts...');
                results.final = {
                    users: await knex('users').count('id as count').first(),
                    shipments: await knex('shipments').count('id as count').first(),
                    courier_transactions: await knex('courier_transactions').count('id as count').first(),
                    client_transactions: await knex('client_transactions').count('id as count').first(),
                    notifications: await knex('notifications').count('id as count').first(),
                    courier_stats: await knex('courier_stats').count('courierId as count').first(),
                    essential_users: await knex('users').whereIn('email', essentialEmails).select('id', 'email', 'firstName', 'lastName', 'roles')
                };
                
                console.log('✅ COMPLETE DATABASE RESET FINISHED');
                console.log('📊 Reset Summary:', results);
                
                res.json({ 
                    success: true, 
                    message: 'Complete database reset successful - Ready for fresh start',
                    results: results,
                    preserved: 'Only Admin, Test Courier, Test Client + Inventory + Tiers',
                    cleared: 'ALL shipments, transactions, notifications, non-essential users',
                    nextOrderNumber: '0000'
                });
            
        } catch (error) {
            console.error('❌ Complete database reset failed:', error);
            res.status(500).json({ 
                error: 'Complete reset failed', 
                details: error.message,
                suggestion: 'Check logs for detailed error information'
            });
        }
    });

    // --- DEBUG ENDPOINT: Update Admin Email ---
    app.post('/api/debug/update-admin-email', async (req, res) => {
        try {
            console.log('📧 Updating admin email from admin@flash.com to admin@shuhna.net...');
            
            // Check if the old admin email exists
            const oldAdmin = await knex('users')
                .where({ email: 'admin@flash.com' })
                .andWhere('roles', 'like', '%Administrator%')
                .first();
            
            if (!oldAdmin) {
                return res.json({
                    success: true,
                    message: 'No admin user with old email found. No update needed.',
                    admin_user: await knex('users')
                        .where({ email: 'admin@shuhna.net' })
                        .andWhere('roles', 'like', '%Administrator%')
                        .select('id', 'email', 'name', 'roles')
                        .first()
                });
            }
            
            // Update the admin email
            const updateResult = await knex('users')
                .where({ email: 'admin@flash.com' })
                .andWhere('roles', 'like', '%Administrator%')
                .update({ email: 'admin@shuhna.net' });
            
            // Verify the update
            const updatedAdmin = await knex('users')
                .where({ email: 'admin@shuhna.net' })
                .andWhere('roles', 'like', '%Administrator%')
                .select('id', 'email', 'name', 'roles')
                .first();
            
            console.log('✅ Admin email updated successfully');
            res.json({
                success: true,
                message: 'Admin email updated successfully',
                rows_affected: updateResult,
                admin_user: updatedAdmin
            });
            
        } catch (error) {
            console.error('❌ Admin email update failed:', error);
            res.status(500).json({
                error: 'Admin email update failed',
                details: error.message
            });
        }
    });


    // Notifications
    app.get('/api/notifications/user/:userId', async (req, res) => {
        const { userId } = req.params;
        try {
            const notifications = await knex('in_app_notifications')
                .where({ userId })
                .orderBy('timestamp', 'desc')
                .limit(50);
            res.json(notifications);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch notifications.' });
        }
    });

    app.put('/api/notifications/:id/read', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('in_app_notifications').where({ id }).update({ isRead: true });
            res.json({ success: true });
            throttledDataUpdate();
        } catch (error) {
            res.status(500).json({ error: 'Failed to mark notification as read.' });
        }
    });

    app.post('/api/notifications/:id/resend', async (req, res) => {
        const { id } = req.params;
        try {
            const notification = await knex('notifications').where({ id }).first();
            if (!notification) return res.status(404).json({ error: 'Notification not found' });
            
            const messageParts = notification.message.split('\n\n');
            const subject = messageParts[0] || `Update for Shipment ${notification.shipmentId}`;
            
            const emailSent = await sendEmail({ recipient: notification.recipient, subject, message: notification.message });
            
            await knex('notifications').where({ id }).update({ sent: emailSent });
            res.status(200).json({ success: true, sent: emailSent });
            throttledDataUpdate();
        } catch (error) {
            res.status(500).json({ error: 'Server error resending notification' });
        }
    });

    // Public Shipment Tracking
    app.post('/api/track', async (req, res) => {
        const { trackingId, phone } = req.body;
        if (!trackingId || !phone) return res.status(400).json({ error: 'Tracking ID and phone number required.' });

        try {
            const shipment = await knex('shipments').whereRaw('UPPER(id) = ?', [trackingId.toUpperCase()]).first();
            if (shipment) {
                 const client = await knex('users').where({ id: shipment.clientId }).first();
                 if (shipment.recipientPhone === phone || client?.phone === phone) {
                    // The shipment is parsed before being sent back
                    return res.json(parseShipment(shipment));
                 }
            }
            return res.status(404).json({ error: 'Wrong shipment ID or phone number.' });

        } catch (error) {
            console.error('Error tracking shipment:', error);
            res.status(500).json({ error: 'Server error during tracking.' });
        }
    });

    // --- Bulk Shipment Import Endpoint ---
    app.post('/api/shipments/bulk-import', async (req, res) => {
        const { shipments } = req.body;
        
        if (!shipments || !Array.isArray(shipments) || shipments.length === 0) {
            return res.status(400).json({ error: 'Invalid shipments data. Expected an array of shipment objects.' });
        }

        try {
            const results = {
                successful: [],
                failed: [],
                total: shipments.length
            };

            await knex.transaction(async trx => {
                for (let i = 0; i < shipments.length; i++) {
                    const shipmentData = shipments[i];
                    
                    try {
                        // Validate required fields
                        const requiredFields = [
                            'clientEmail', 'recipientName', 'recipientPhone', 'packageDescription',
                            'packageValue', 'fromStreet', 'fromCity', 'fromZone', 
                            'toStreet', 'toCity', 'toZone', 'paymentMethod'
                        ];
                        
                        const missingFields = requiredFields.filter(field => 
                            !shipmentData[field] || shipmentData[field].toString().trim() === ''
                        );
                        
                        if (missingFields.length > 0) {
                            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                        }

                        // Find client by email
                        const client = await trx('users')
                            .where({ email: shipmentData.clientEmail.trim() })
                            .whereRaw("roles::text LIKE '%Client%'")
                            .first();
                            
                        if (!client) {
                            throw new Error(`Client not found with email: ${shipmentData.clientEmail}`);
                        }

                        // Validate phone number format
                        const phoneRegex = /^\+201[0-9]{9}$/;
                        if (!phoneRegex.test(shipmentData.recipientPhone.trim())) {
                            throw new Error('Invalid phone number format. Use +201XXXXXXXXX');
                        }

                        // Validate payment method
                        const validPaymentMethods = ['COD', 'Transfer', 'Wallet'];
                        if (!validPaymentMethods.includes(shipmentData.paymentMethod)) {
                            throw new Error(`Invalid payment method: ${shipmentData.paymentMethod}`);
                        }

                        // Generate shipment ID
                        const shipmentId = generateId('', shipmentData.fromCity);

                        // Parse package value
                        const packageValue = Number(shipmentData.packageValue) || 0;
                        if (packageValue < 0) {
                            throw new Error('Package value must be non-negative');
                        }

                        // Calculate price based on payment method
                        let price = packageValue;
                        let amountToCollect = 0;
                        
                        if (shipmentData.paymentMethod === 'COD') {
                            // For COD, add shipping fee (use client's flat rate or default)
                            const shippingFee = Number(client.flatRateFee) || 30;
                            price = packageValue + shippingFee;
                        } else if (shipmentData.paymentMethod === 'Transfer') {
                            // For Transfer, client pays shipping separately, collect specified amount
                            amountToCollect = Number(shipmentData.amountToCollect) || 0;
                            price = packageValue; // Only package value
                        } else if (shipmentData.paymentMethod === 'Wallet') {
                            // For Wallet, deduct from wallet, collect only package value
                            price = packageValue;
                        }

                        // Parse optional fields
                        const isLargeOrder = shipmentData.isLargeOrder === 'TRUE' || shipmentData.isLargeOrder === true;
                        const packageWeight = shipmentData.packageWeight ? Number(shipmentData.packageWeight) : null;

                        // Create shipment object
                        const newShipment = {
                            id: shipmentId,
                            clientId: client.id,
                            clientName: `${client.firstName} ${client.lastName}`,
                            recipientName: shipmentData.recipientName.trim(),
                            recipientPhone: shipmentData.recipientPhone.trim(),
                            packageDescription: shipmentData.packageDescription.trim(),
                            packageValue: packageValue,
                            price: price,
                            paymentMethod: shipmentData.paymentMethod,
                            amountToCollect: amountToCollect,
                            isLargeOrder: isLargeOrder,
                            packageWeight: packageWeight,
                            packageDimensions: shipmentData.packageDimensions || null,
                            specialInstructions: shipmentData.notes || null,
                            fromAddress: JSON.stringify({
                                street: shipmentData.fromStreet.trim(),
                                details: shipmentData.fromDetails?.trim() || '',
                                city: shipmentData.fromCity.trim(),
                                zone: shipmentData.fromZone.trim()
                            }),
                            toAddress: JSON.stringify({
                                street: shipmentData.toStreet.trim(),
                                details: shipmentData.toDetails?.trim() || '',
                                city: shipmentData.toCity.trim(),
                                zone: shipmentData.toZone.trim()
                            }),
                            status: 'Waiting for Packaging',
                            creationDate: new Date().toISOString(),
                            statusHistory: JSON.stringify([{
                                status: 'Waiting for Packaging',
                                timestamp: new Date().toISOString()
                            }]),
                            clientFlatRateFee: Number(client.flatRateFee) || 30
                        };

                        // Handle wallet payment
                        if (shipmentData.paymentMethod === 'Wallet') {
                            const currentBalance = Number(client.walletBalance) || 0;
                            const shippingFee = Number(client.flatRateFee) || 30;
                            
                            if (currentBalance < shippingFee) {
                                throw new Error(`Insufficient wallet balance. Required: ${shippingFee} EGP, Available: ${currentBalance} EGP`);
                            }

                            // Deduct shipping fee from wallet
                            await trx('users')
                                .where({ id: client.id })
                                .update({ walletBalance: currentBalance - shippingFee });

                            // Create wallet transaction
                            await trx('client_transactions').insert({
                                id: generateId('TRN'),
                                userId: client.id,
                                type: 'Payment',
                                amount: -shippingFee,
                                date: new Date().toISOString(),
                                description: `Shipping fee for shipment ${shipmentId}`,
                                status: 'Processed'
                            });
                        }

                        // Insert shipment
                        await trx('shipments').insert(newShipment);

                        // Create notification
                        await trx('notifications').insert({
                            id: generateId('NOT'),
                            shipmentId: shipmentId,
                            channel: 'Email',
                            recipient: client.email,
                            message: `New shipment created: ${shipmentId}\n\nRecipient: ${newShipment.recipientName}\nStatus: Waiting for Packaging`,
                            date: new Date().toISOString(),
                            status: 'Waiting for Packaging',
                            sent: false
                        });

                        results.successful.push({
                            rowIndex: i + 1,
                            shipmentId: shipmentId,
                            clientEmail: shipmentData.clientEmail,
                            recipientName: shipmentData.recipientName
                        });

                    } catch (error) {
                        results.failed.push({
                            rowIndex: i + 1,
                            error: error.message,
                            data: shipmentData
                        });
                    }
                }
            });

            console.log(`📦 Bulk import completed: ${results.successful.length} successful, ${results.failed.length} failed`);

            res.json({
                success: true,
                message: `Bulk import completed: ${results.successful.length}/${results.total} shipments created successfully`,
                results: results
            });

            throttledDataUpdate();

        } catch (error) {
            console.error('Bulk import error:', error);
            res.status(500).json({ 
                error: 'Server error during bulk import',
                details: error.message 
            });
        }
    });

    // --- Inventory & Asset Management Endpoints ---

    // Inventory
    app.delete('/api/inventory/:id', async (req, res) => {
        try {
            await knex('inventory_items').where({ id: req.params.id }).del();
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Failed to delete inventory item' }); }
    });

    app.post('/api/inventory', async (req, res) => {
        const { name, quantity, unit, minStock, unitPrice } = req.body;
        try {
            const newItem = {
                id: generateId('inv'),
                name,
                quantity,
                unit,
                lastUpdated: new Date().toISOString(),
                minStock: minStock || 10,
                unitPrice: unitPrice || 0,
            };
            await knex('inventory_items').insert(newItem);
            res.status(201).json(parseInventoryItem(newItem));
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Failed to create inventory item' }); }
    });
    
    app.put('/api/inventory/:id', async (req, res) => {
        const { id } = req.params;
        const { name, quantity, unit, minStock, unitPrice } = req.body;
        try {
            const updatePayload = {};
            if (name !== undefined) updatePayload.name = name;
            if (quantity !== undefined) updatePayload.quantity = quantity;
            if (unit !== undefined) updatePayload.unit = unit;
            if (minStock !== undefined) updatePayload.minStock = minStock;
            if (unitPrice !== undefined) updatePayload.unitPrice = unitPrice;
            
            if (Object.keys(updatePayload).length > 0) {
                 updatePayload.lastUpdated = new Date().toISOString();
                 await knex('inventory_items').where({ id }).update(updatePayload);
            }
            
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Failed to update inventory' }); }
    });

    app.put('/api/shipments/:id/packaging', async (req, res) => {
        const { id } = req.params;
        const { packagingLog, packagingNotes } = req.body;
        try {
            await knex.transaction(async trx => {
                const shipment = await trx('shipments').where({ id }).first();
                const newStatus = 'Packaged and Waiting for Assignment';
                
                const currentHistory = safeJsonParse(shipment.statusHistory, []);
                currentHistory.push({ status: newStatus, timestamp: new Date().toISOString() });
                
                await trx('shipments').where({ id }).update({ 
                    packagingLog: JSON.stringify(packagingLog), 
                    packagingNotes,
                    status: newStatus,
                    statusHistory: JSON.stringify(currentHistory)
                });

                for (const item of packagingLog) {
                    await trx('inventory_items').where({ id: item.inventoryItemId }).decrement('quantity', item.quantityUsed);
                }

                await createNotification(trx, shipment, newStatus);
            });
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) {
            console.error('Error updating packaging:', e);
            res.status(500).json({ error: 'Failed to update shipment packaging' });
        }
    });

    // --- NEW BULK ACTION ENDPOINTS ---
    app.post('/api/shipments/bulk-package', async (req, res) => {
        const { shipmentIds, materialsSummary, packagingNotes } = req.body;
        if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0 || !materialsSummary) {
            return res.status(400).json({ error: 'Missing shipment IDs or material summary.' });
        }

        try {
            const totalPackagingItems = Object.entries(materialsSummary)
                .filter(([key]) => key.startsWith('inv_box_') || key.startsWith('inv_flyer_'))
                .reduce((sum, [, value]) => sum + Number(value), 0);
            
            if (totalPackagingItems < shipmentIds.length) {
                return res.status(400).json({ error: `Not enough packaging items (${totalPackagingItems}) for the selected shipments (${shipmentIds.length}).` });
            }
            if (totalPackagingItems > shipmentIds.length && (!packagingNotes || packagingNotes.trim() === '')) {
                return res.status(400).json({ error: 'Packaging notes are mandatory when the number of packaging items exceeds the number of shipments.' });
            }

            await knex.transaction(async trx => {
                const newStatus = 'Packaged and Waiting for Assignment';
                const timestamp = new Date().toISOString();
                
                const shipmentsToUpdate = await trx('shipments').whereIn('id', shipmentIds).andWhere('status', 'Waiting for Packaging');

                if (shipmentsToUpdate.length === 0) {
                    return;
                }
                
                const inventoryItemsForLog = await trx('inventory_items').whereIn('id', Object.keys(materialsSummary));
                const packagingLogFromSummary = inventoryItemsForLog.map(item => ({
                    inventoryItemId: item.id,
                    itemName: item.name,
                    quantityUsed: materialsSummary[item.id]
                })).filter(log => log.quantityUsed > 0);

                for(const shipment of shipmentsToUpdate) {
                    const currentHistory = safeJsonParse(shipment.statusHistory, []);
                    currentHistory.push({ status: newStatus, timestamp });
                    await trx('shipments').where({ id: shipment.id }).update({
                        status: newStatus,
                        statusHistory: JSON.stringify(currentHistory),
                        packagingNotes: packagingNotes || null,
                        packagingLog: JSON.stringify(packagingLogFromSummary)
                    });
                     await createNotification(trx, shipment, newStatus);
                }

                const inventoryUpdates = Object.entries(materialsSummary).map(([itemId, quantity]) => {
                    if (Number(quantity) > 0) {
                        return trx('inventory_items').where({ id: itemId }).decrement('quantity', Number(quantity));
                    }
                    return Promise.resolve();
                });
                await Promise.all(inventoryUpdates);
            });
            
            res.json({ success: true, message: `${shipmentIds.length} shipments packaged successfully.` });
            throttledDataUpdate();
        } catch (e) {
            console.error('Error during bulk packaging:', e);
            res.status(500).json({ error: 'Failed to bulk package shipments.' });
        }
    });

    app.post('/api/shipments/bulk-assign', async (req, res) => {
        const { shipmentIds, courierId } = req.body;
        if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0 || !courierId) {
            return res.status(400).json({ error: 'Missing shipment IDs or courier ID.' });
        }

        try {
            await knex.transaction(async trx => {
                const newStatus = 'Assigned to Courier';
                const timestamp = new Date().toISOString();

                let courierStats = await trx('courier_stats').where({ courierId }).first();
                if (!courierStats) { // Should not happen but as a fallback
                    courierStats = { commissionType: 'flat', commissionValue: 30 };
                }

                for (const id of shipmentIds) {
                    const shipment = await trx('shipments').where({ id }).first();
                    if (!shipment || shipment.status !== 'Packaged and Waiting for Assignment') continue;

                    const client = await trx('users').where({ id: shipment.clientId }).first();
                    
                    // Calculate commission based on shipment priority (consistent with other endpoints)
                    let commission;
                    if (courierStats.commissionType === 'flat') {
                        // Priority-based commission rates
                        const priorityCommissions = {
                            'Standard': 30,
                            'Express': 50,
                            'Urgent': 70
                        };
                        commission = priorityCommissions[shipment.priority] || 30;
                    } else {
                        commission = shipment.price * (courierStats.commissionValue / 100);
                    }
                    
                    const currentHistory = safeJsonParse(shipment.statusHistory, []);
                    currentHistory.push({ status: newStatus, timestamp });

                    await trx('shipments').where({ id }).update({
                        courierId,
                        status: newStatus,
                        statusHistory: JSON.stringify(currentHistory),
                        courierCommission: commission
                    });
                    
                    await createInAppNotification(trx, courierId, `You have a new shipment assigned: ${id}`, '/tasks');
                    await createNotification(trx, shipment, newStatus);
                }
            });
            res.json({ success: true, message: `${shipmentIds.length} shipments assigned.` });
            throttledDataUpdate();
        } catch (e) {
            console.error('Error during bulk assignment:', e);
            res.status(500).json({ error: 'Failed to bulk assign shipments.' });
        }
    });

    app.post('/api/shipments/bulk-status-update', async (req, res) => {
        const { shipmentIds, status } = req.body;
        if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0 || !status) {
            return res.status(400).json({ error: 'Missing shipment IDs or status.' });
        }
    
        try {
            await knex.transaction(async trx => {
                for (const id of shipmentIds) {
                    const shipment = await trx('shipments').where({ id }).first();
                    if (shipment) {
                        const currentHistory = safeJsonParse(shipment.statusHistory, []);
                        // Avoid adding duplicate status if somehow called multiple times
                        if (currentHistory.length === 0 || currentHistory[currentHistory.length - 1].status !== status) {
                            currentHistory.push({ status: status, timestamp: new Date().toISOString() });
                            await trx('shipments').where({ id }).update({
                                status: status,
                                statusHistory: JSON.stringify(currentHistory)
                            });
                            await createNotification(trx, shipment, status);
                        }
                    }
                }
            });
            res.json({ success: true, message: `${shipmentIds.length} shipments updated to ${status}.` });
            throttledDataUpdate();
        } catch (e) {
            console.error('Error during bulk status update:', e);
            res.status(500).json({ error: 'Failed to bulk update shipment statuses.' });
        }
    });

    // Assets
    app.delete('/api/assets/:id', async (req, res) => {
        try {
            await knex('assets').where({ id: req.params.id }).del();
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Failed to delete asset' }); }
    });

    app.post('/api/assets', async (req, res) => {
      const { type, name, identifier, purchaseDate, purchasePrice, usefulLifeMonths } = req.body;
      try {
        const newAsset = { 
            id: generateId('asset'), 
            type, 
            name, 
            identifier, 
            status: 'Available',
            purchaseDate: purchaseDate || null,
            purchasePrice: purchasePrice || null,
            usefulLifeMonths: usefulLifeMonths || null
        };
        await knex('assets').insert(newAsset);
        res.status(201).json(parseAsset(newAsset));
        throttledDataUpdate();
      } catch (e) { res.status(500).json({ error: 'Failed to create asset' }); }
    });

    app.put('/api/assets/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('assets').where({ id }).update(req.body);
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Failed to update asset' }); }
    });

    app.post('/api/assets/:id/assign', async (req, res) => {
        const { id } = req.params;
        const { userId } = req.body;
        try {
            await knex('assets').where({ id }).update({ 
                assignedToUserId: userId, 
                status: 'Assigned',
                assignmentDate: new Date().toISOString()
            });
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Failed to assign asset' }); }
    });

    app.post('/api/assets/:id/unassign', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('assets').where({ id }).update({ 
                assignedToUserId: null, 
                status: 'Available',
                assignmentDate: null
            });
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Failed to unassign asset' }); }
    });
    
    // --- Supplier Management Endpoints ---
    app.post('/api/suppliers', async (req, res) => {
        const { name, contact_person, phone, email, address } = req.body;
        if (!name) return res.status(400).json({ error: 'Supplier name is required' });
        try {
            const newSupplier = { id: generateId('sup'), name, contact_person, phone, email, address };
            await knex('suppliers').insert(newSupplier);
            res.status(201).json(newSupplier);
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Server error creating supplier' }); }
    });

    app.put('/api/suppliers/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('suppliers').where({ id }).update(req.body);
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Server error updating supplier' }); }
    });
    
    app.delete('/api/suppliers/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('suppliers').where({ id }).del();
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Server error deleting supplier' }); }
    });

    app.post('/api/supplier-transactions', async (req, res) => {
        const { supplier_id, date, description, type, amount } = req.body;
        if (!supplier_id || !date || !type || amount === undefined) {
            return res.status(400).json({ error: 'Missing required transaction fields' });
        }
        
        // Validate amount is a valid number
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be a valid positive number' });
        }
        
        try {
            const newTransaction = { id: generateId('stran'), supplier_id, date, description, type, amount: numericAmount };
            await knex('supplier_transactions').insert(newTransaction);
            res.status(201).json(newTransaction);
            throttledDataUpdate();
        } catch (e) { 
            console.error('Supplier transaction error:', e);
            res.status(500).json({ error: 'Server error creating transaction' }); 
        }
    });

    app.delete('/api/supplier-transactions/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('supplier_transactions').where({ id }).del();
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Server error deleting transaction' }); }
    });

    // --- Partner Tier Management Endpoints ---
    app.get('/api/tier-settings', async (req, res) => {
        try {
            const settings = await knex('tier_settings').select();
            res.json(settings);
        } catch (e) { res.status(500).json({ error: 'Failed to fetch tier settings' }); }
    });

    app.put('/api/tier-settings', async (req, res) => {
        const { settings } = req.body;
        try {
            await knex.transaction(async trx => {
                for (const setting of settings) {
                    await trx('tier_settings').where({ tierName: setting.tierName }).update({
                        shipmentThreshold: setting.shipmentThreshold,
                        discountPercentage: setting.discountPercentage,
                    });
                }
            });
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Failed to update tier settings' }); }
    });

    app.put('/api/clients/:id/tier', async (req, res) => {
        const { id } = req.params;
        const { tier } = req.body; // tier can be 'Bronze', 'Silver', 'Gold', or null
        try {
            const updatePayload = {
                partnerTier: tier,
                manualTierAssignment: tier !== null,
            };
            await knex('users').where({ id }).update(updatePayload);
            res.json({ success: true });
            throttledDataUpdate();
        } catch (e) { res.status(500).json({ error: 'Failed to assign tier' }); }
    });


    // Public tracking endpoint (no authentication required)
    app.get('/api/track/:shipmentId', async (req, res) => {
        const { shipmentId } = req.params;
        
        try {
            const shipment = await knex('shipments')
                .where({ id: shipmentId })
                .first();
                
            if (!shipment) {
                return res.status(404).json({ error: 'Shipment not found' });
            }
            
            // Get courier info if assigned
            let courierName = null;
            if (shipment.courierId) {
                const courier = await knex('users')
                    .where({ id: shipment.courierId })
                    .first();
                if (courier) {
                    courierName = `${courier.firstName} ${courier.lastName}`;
                }
            }
            
            // Return public shipment information (no sensitive data)
            const publicShipment = {
                id: shipment.id,
                status: shipment.status,
                recipientName: shipment.recipientName,
                recipientPhone: shipment.recipientPhone,
                fromAddress: safeJsonParse(shipment.fromAddress, {}),
                toAddress: safeJsonParse(shipment.toAddress, {}),
                createdAt: shipment.createdAt,
                deliveredAt: shipment.deliveredAt,
                courierName,
                priority: shipment.priority || 'Standard'
            };
            
            res.json(publicShipment);
        } catch (error) {
            console.error('Error fetching shipment for tracking:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Fallback for client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });

    // --- Scheduled Cleanup Task ---
    const cleanupExpiredEvidence = async () => {
        console.log('Running scheduled job: cleaning up expired payout evidence...');
        try {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
            const expiredTransactions = await knex('courier_transactions')
                .whereNotNull('transferEvidencePath')
                .andWhere('timestamp', '<', threeDaysAgo);

            let deletedCount = 0;
            for (const transaction of expiredTransactions) {
                try {
                    console.log(`Evidence for transaction ${transaction.id} is older than 3 days. Deleting.`);
                    const fullPath = path.join(__dirname, transaction.transferEvidencePath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        deletedCount++;
                        console.log(`Deleted evidence file: ${fullPath}`);
                    }
                } catch (fileError) {
                    console.error(`Error deleting evidence file for transaction ${transaction.id}:`, fileError.message);
                }
            }
            console.log(`Evidence cleanup completed. Deleted ${deletedCount} files.`);
        } catch (error) {
            console.error('Error during evidence cleanup job:', error);
        }
    };
    
    const cleanupExpiredFailurePhotos = async () => {
        console.log('Running scheduled job: cleaning up expired failure photos...');
        try {
            const shipmentsWithPhotos = await knex('shipments').whereNotNull('failurePhotoPath');
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

            for (const shipment of shipmentsWithPhotos) {
                try {
                    const history = safeJsonParse(shipment.statusHistory, []);
                    const failureEntry = history.slice().reverse().find(h => h.status === 'Delivery Failed');
                    
                    if (failureEntry) {
                        const failureTime = new Date(failureEntry.timestamp);
                        if (failureTime < threeDaysAgo) {
                            console.log(`Photo for shipment ${shipment.id} is older than 3 days. Deleting.`);
                            const fullPath = path.join(__dirname, shipment.failurePhotoPath);
                            if (fs.existsSync(fullPath)) {
                                fs.unlinkSync(fullPath);
                                console.log(`Deleted file: ${fullPath}`);
                            }
                            await knex('shipments').where({ id: shipment.id }).update({ failurePhotoPath: null });
                            throttledDataUpdate();
                        }
                    }
                } catch (err) {
                    console.error(`Error processing shipment ${shipment.id} for photo cleanup:`, err.message);
                }
            }
        } catch (error) {
            console.error('Error during photo cleanup job:', error);
        }
    };

    // Run the cleanup job every hour
    setInterval(cleanupExpiredFailurePhotos, 60 * 60 * 1000);
    setInterval(cleanupExpiredEvidence, 60 * 60 * 1000);
    
    // Cleanup expired verification codes every hour
    setInterval(async () => {
        try {
            await verificationService.cleanupExpiredCodes();
        } catch (error) {
            console.error('Error during verification cleanup job:', error);
        }
    }, 60 * 60 * 1000);

    // ==================== BARCODE SCANNER ROUTES ====================

    // Barcode scanning endpoint for status updates
    app.post('/api/barcode/scan', async (req, res) => {
        const { barcode, scannerId, courierId } = req.body;
        
        console.log(`📱 Barcode scan attempt:`, { 
            barcode, 
            courierId: courierId || 'Unknown'
        });

        if (!barcode) {
            console.error('❌ Barcode scan failed: Missing barcode');
            return res.status(400).json({ error: 'Barcode is required' });
        }

        try {
            // Find shipment by barcode (shipment ID)
            const shipment = await knex('shipments')
                .where({ id: barcode })
                .first();

            if (!shipment) {
                console.error(`❌ Barcode scan failed: Shipment not found - ${barcode}`);
                return res.status(404).json({ 
                    error: `Shipment not found: ${barcode}`,
                    barcode: barcode
                });
            }

            // Check if shipment can be marked as out for delivery
            const validStatuses = [
                'Waiting for Packaging',
                'Packaged and Waiting for Assignment', 
                'Assigned to Courier'
            ];

            if (!validStatuses.includes(shipment.status)) {
                return res.status(400).json({ 
                    error: 'Shipment cannot be marked as out for delivery',
                    currentStatus: shipment.status,
                    shipmentId: barcode
                });
            }

            // Update shipment status to "Out for Delivery"
            const updatedData = {
                status: 'Out for Delivery',
                outForDeliveryAt: new Date()
            };

            // If courier ID is provided, assign the courier
            if (courierId) {
                updatedData.courierId = courierId;
            }

            await knex('shipments')
                .where({ id: barcode })
                .update(updatedData);

            // Get updated shipment with client and courier info
            const updatedShipment = await knex('shipments')
                .leftJoin('users as clients', 'shipments.clientId', 'clients.id')
                .leftJoin('users as couriers', 'shipments.courierId', 'couriers.id')
                .where('shipments.id', barcode)
                .select([
                    'shipments.*',
                    'clients.firstName as clientFirstName',
                    'clients.lastName as clientLastName', 
                    'clients.email as clientEmail',
                    'clients.phone as clientPhone',
                    'couriers.firstName as courierFirstName',
                    'couriers.lastName as courierLastName'
                ])
                .first();

            // Create notification
            await createNotification(
                updatedShipment.id,
                'Out for Delivery',
                updatedShipment.clientId,
                updatedShipment,
                updatedShipment.clientFirstName,
                updatedShipment.clientLastName,
                updatedShipment.clientEmail,
                updatedShipment.clientPhone
            );

            // Log the scan event
            try {
                await knex('barcode_scans').insert({
                    shipmentId: barcode,
                    scannerId: scannerId || null,
                    courierId: courierId || null,
                    previousStatus: shipment.status,
                    newStatus: 'Out for Delivery',
                    scannedAt: new Date(),
                    scannedBy: courierId || null
                });
            } catch (scanLogError) {
                console.warn('Failed to log barcode scan:', scanLogError.message);
                // Continue execution even if logging fails
            }

            console.log(`📦 Barcode scanned: ${barcode} - Status updated to "Out for Delivery"`);

            res.json({
                success: true,
                message: 'Shipment status updated successfully',
                shipment: {
                    id: updatedShipment.id,
                    previousStatus: shipment.status,
                    newStatus: 'Out for Delivery',
                    recipientName: updatedShipment.recipientName,
                    recipientPhone: updatedShipment.recipientPhone,
                    courier: courierId ? `${updatedShipment.courierFirstName} ${updatedShipment.courierLastName}` : null,
                    scannedAt: new Date()
                }
            });

        } catch (error) {
            console.error('Error processing barcode scan:', error);
            res.status(500).json({ 
                error: 'Failed to process barcode scan',
                details: error.message 
            });
        }
    });

    // Get barcode scan history
    app.get('/api/barcode/history', async (req, res) => {
        try {
            const { page = 1, limit = 50, courierId, startDate, endDate } = req.query;
            const offset = (page - 1) * limit;

            let query = knex('barcode_scans')
                .leftJoin('shipments', 'barcode_scans.shipmentId', 'shipments.id')
                .leftJoin('users as couriers', 'barcode_scans.courierId', 'couriers.id')
                .leftJoin('users as scanners', 'barcode_scans.scannedBy', 'scanners.id')
                .select([
                    'barcode_scans.*',
                    'shipments.recipientName',
                    'shipments.recipientPhone',
                    'couriers.firstName as courierFirstName',
                    'couriers.lastName as courierLastName',
                    'scanners.firstName as scannerFirstName',
                    'scanners.lastName as scannerLastName'
                ])
                .orderBy('barcode_scans.scannedAt', 'desc');

            if (courierId) {
                query = query.where('barcode_scans.courierId', courierId);
            }

            if (startDate) {
                query = query.where('barcode_scans.scannedAt', '>=', startDate);
            }

            if (endDate) {
                query = query.where('barcode_scans.scannedAt', '<=', endDate);
            }

            // Handle case where barcode_scans table might not exist yet
            let scans = [];
            let total = { count: 0 };

            try {
                scans = await query.limit(limit).offset(offset);
                total = await query.clone().count('* as count').first();
            } catch (tableError) {
                if (tableError.message.includes('no such table: barcode_scans')) {
                    console.warn('Barcode scans table does not exist yet. Returning empty results.');
                    scans = [];
                    total = { count: 0 };
                } else {
                    throw tableError;
                }
            }

            res.json({
                scans,
                pagination: {
                    total: total.count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total.count / limit)
                }
            });

        } catch (error) {
            console.error('Error fetching scan history:', error);
            res.status(500).json({ error: 'Failed to fetch scan history' });
        }
    });

    // ==================== END BARCODE SCANNER ROUTES ====================

    // Start the server
    const PORT = process.env.PORT || 8080;
    console.log(`🚀 Starting server on port ${PORT}...`);
    
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Backend and WebSocket server listening on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🎉 Server startup completed successfully!`);
      
      // Run cleanup jobs after server is fully started
      setTimeout(() => {
        cleanupExpiredFailurePhotos().catch(err => console.error('Cleanup job error (failure photos):', err));
        cleanupExpiredEvidence().catch(err => console.error('Cleanup job error (evidence):', err));
      }, 10000); // Wait 10 seconds after server starts
    });
    
    // Handle server startup errors
    server.on('error', (error) => {
      console.error('❌ Server startup error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
      }
      process.exit(1);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        
        // Close HTTP server
        server.close(() => {
            console.log('HTTP server closed.');
        });
        
        // Close database connections
        try {
            await knex.destroy();
            console.log('Database connections closed.');
        } catch (error) {
            console.error('Error closing database connections:', error);
        }
        
        process.exit(0);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Start the application
main().catch((error) => {
    console.error('Fatal error starting application:', error);
    process.exit(1);
});