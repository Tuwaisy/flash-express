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
    checkForOverdueShipments(); // Run on startup
    updateClientTiers(); // Run on startup


    
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
            from: `"Flash Express" <${process.env.EMAIL_USER}>`,
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
            const shippingFee = shipment.clientFlatRateFee || 0;
            let walletChange = 0;
            
            if (shipment.paymentMethod === 'COD') {
                // For COD: Credit package value collected, deduct shipping fee
                const packageValue = shipment.packageValue || 0;
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
                const amountToCollect = shipment.amountToCollect || 0;
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
                const packageValue = shipment.packageValue || 0;
                
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
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'
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
                // Exclude withdrawal transactions (both pending and processed) from balance calculation
                !['Withdrawal Request', 'Withdrawal Processed', 'Withdrawal Declined'].includes(t.type)
            );
            const calculatedBalance = courierTransactionsForCourier.reduce((sum, t) => {
                const amount = Number(t.amount) || 0;
                return Number(sum) + Number(amount);
            }, 0);
            
            // Debug: Always log balance calculation for courier
            console.log(`🧮 Courier ${stats.courierId} balance calculation: ${calculatedBalance.toFixed(2)} from ${courierTransactionsForCourier.length} transactions`);
            console.log(`📝 Included transactions:`, courierTransactionsForCourier.map(t => `${t.type}: ${t.amount} (${t.status}, ${t.timestamp || t.date})`));
            
            // Calculate total earnings (sum of all positive earnings, excluding withdrawals)
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

    app.delete('/api/users/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await knex.transaction(async (trx) => {
                // Delete related records first to avoid foreign key constraints
                await trx('client_transactions').where({ userId: id }).del();
                await trx('courier_transactions').where({ courierId: id }).del();
                await trx('courier_stats').where({ courierId: id }).del();
                await trx('in_app_notifications').where({ userId: id }).del();
                
                // Update shipments to remove courier references
                await trx('shipments').where({ courierId: id }).update({ 
                    courierId: null, 
                    status: 'Unassigned'
                });
                
                // Finally delete the user
                await trx('users').where({ id }).del();
            });
            res.status(200).json({ success: true });
            throttledDataUpdate();
        } catch (error) { 
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Server error deleting user' }); 
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

    // --- New Recipient Verification Endpoints ---
    app.post('/api/shipments/:id/send-delivery-code', async (req, res) => {
        const { id } = req.params;
        try {
            const shipment = await knex('shipments').where({ id }).first();
            if (!shipment) return res.status(404).json({ error: "Shipment not found." });
            if (!shipment.recipientPhone) return res.status(400).json({ error: "Recipient phone number not available for this shipment." });

            const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
            const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

            await knex('delivery_verifications').insert({ shipmentId: id, code, expires_at }).onConflict('shipmentId').merge();
            
            const message = `Your Flash Express delivery code for shipment ${id} is: ${code}`;
            
            await knex('notifications').insert({
                id: generateId('NOT'),
                shipmentId: id,
                channel: 'SMS',
                recipient: shipment.recipientPhone,
                message: 'Delivery verification code sent to recipient.',
                date: new Date().toISOString(),
                status: shipment.status,
                sent: true,
            });

            if (twilioClient) {
                await twilioClient.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: shipment.recipientPhone });
            }
            console.log(`==== Delivery Verification for ${id} to ${shipment.recipientPhone} ====\nCode: ${code}\n=======================================`);
            
            res.json({ success: true, message: 'Delivery verification code sent to recipient.' });
            throttledDataUpdate();
        } catch (error) {
            console.error('Delivery code sending error:', error);
            res.status(500).json({ error: 'Failed to send delivery code.' });
        }
    });

    app.post('/api/shipments/:id/verify-delivery', async (req, res) => {
        const { id } = req.params;
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Verification code is required.' });

        try {
            await knex.transaction(async trx => {
                const verification = await trx('delivery_verifications').where({ shipmentId: id }).first();
                if (!verification || new Date() > new Date(verification.expires_at)) {
                    const err = new Error('Verification code expired or invalid.');
                    err.statusCode = 400;
                    throw err;
                }

                if (verification.code === code) {
                    const rawShipment = await trx('shipments').where({ id }).first();
                    if (!rawShipment) {
                        const err = new Error('Shipment not found.');
                        err.statusCode = 404;
                        throw err;
                    }
                    const shipment = parseShipment(rawShipment);
                    await processDeliveredShipment(trx, shipment);
                    await trx('delivery_verifications').where({ shipmentId: id }).del();
                } else {
                    const err = new Error('Incorrect verification code.');
                    err.statusCode = 400;
                    throw err;
                }
            });
            res.json({ success: true, message: 'Delivery confirmed successfully.' });
            throttledDataUpdate();
        } catch (error) {
            console.error('Delivery verification error:', error);
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ error: error.message || 'Server error verifying delivery.' });
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
                
                // Calculate real-time balance from transactions (exclude all withdrawal types)
                const courierTransactions = await trx('courier_transactions').where({ courierId });
                const calculatedBalance = courierTransactions.reduce((sum, transaction) => {
                    const amount = Number(transaction.amount) || 0;
                    // Exclude withdrawal transactions (both pending and processed) from available balance
                    if (['Withdrawal Request', 'Withdrawal Processed', 'Withdrawal Declined'].includes(transaction.type)) {
                        return sum; // Don't add withdrawal transactions to available balance
                    }
                    // Only include processed transactions or non-withdrawal pending transactions
                    if (transaction.status === 'Processed' || (transaction.status === 'Pending' && transaction.type !== 'Withdrawal Request')) {
                        return sum + amount;
                    }
                    return sum;
                }, 0);
                
                console.log(`💰 Courier ${courierId} balance check: calculated=${calculatedBalance.toFixed(2)}, requested=${amount}`);
                console.log(`📊 Transactions used for balance:`, courierTransactions.filter(t => 
                    !['Withdrawal Request', 'Withdrawal Processed', 'Withdrawal Declined'].includes(t.type) &&
                    (t.status === 'Processed' || (t.status === 'Pending' && t.type !== 'Withdrawal Request'))
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
            
            await knex.transaction(async (trx) => {
                // Create backup counts
                console.log('📊 Recording current state...');
                resetResults.backup = {
                    users: await trx('users').count('id as count').first(),
                    shipments: await trx('shipments').count('id as count').first(),
                    courier_transactions: await trx('courier_transactions').count('id as count').first(),
                    client_transactions: await trx('client_transactions').count('id as count').first(),
                    courier_stats: await trx('courier_stats').count('courierId as count').first()
                };
                
                // Get first 2 shipments to preserve
                const shipmentsToKeep = await trx('shipments')
                    .select('id', 'creationDate')
                    .orderBy('creationDate')
                    .limit(2);
                    
                const shipmentIds = shipmentsToKeep.map(s => s.id);
                console.log('📦 Preserving shipments:', shipmentIds);
                
                // STEP 1: Clear all transactions
                console.log('🗑️  Clearing all transactions...');
                resetResults.deleted.courier_transactions = await trx('courier_transactions').del();
                resetResults.deleted.client_transactions = await trx('client_transactions').del();
                resetResults.deleted.notifications = await trx('in_app_notifications').del();
                
                // STEP 2: Remove excess shipments
                if (shipmentIds.length > 0) {
                    resetResults.deleted.shipments = await trx('shipments')
                        .whereNotIn('id', shipmentIds)
                        .del();
                } else {
                    resetResults.deleted.shipments = await trx('shipments').del();
                }
                
                // STEP 3: Reset all courier stats
                console.log('👤 Resetting courier stats...');
                resetResults.reset.courier_stats = await trx('courier_stats').update({
                    currentBalance: 0,
                    totalEarnings: 0,
                    consecutiveFailures: 0,
                    isRestricted: false
                });
                
                // STEP 4: Reset user wallet balances
                console.log('💰 Resetting user wallet balances...');
                resetResults.reset.user_balances = await trx('users').update({ 
                    walletBalance: 0 
                });
                
                // STEP 5: Reset sequences for clean numbering
                console.log('🔢 Resetting sequences...');
                try {
                    const sequences = await trx.raw(`
                        SELECT sequence_name 
                        FROM information_schema.sequences 
                        WHERE sequence_schema = 'public'
                    `);
                    
                    for (const seq of sequences.rows) {
                        await trx.raw(`SELECT setval('${seq.sequence_name}', 1, false)`);
                        console.log(`🔢 Reset sequence: ${seq.sequence_name}`);
                    }
                } catch (error) {
                    console.log('⚠️ Sequence reset skipped:', error.message);
                }
                
                // Get new counts for verification
                resetResults.final = {
                    users: await trx('users').count('id as count').first(),
                    shipments: await trx('shipments').count('id as count').first(),
                    courier_transactions: await trx('courier_transactions').count('id as count').first(),
                    client_transactions: await trx('client_transactions').count('id as count').first()
                };
            });
            
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
                suggestion: 'Try manual SQL reset using database-reset.sql file'
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
            const totalBoxes = Object.entries(materialsSummary)
                .filter(([key]) => key.startsWith('inv_box_'))
                .reduce((sum, [, value]) => sum + Number(value), 0);
            
            if (totalBoxes < shipmentIds.length) {
                return res.status(400).json({ error: `Not enough boxes (${totalBoxes}) for the selected shipments (${shipmentIds.length}).` });
            }
            if (totalBoxes > shipmentIds.length && (!packagingNotes || packagingNotes.trim() === '')) {
                return res.status(400).json({ error: 'Packaging notes are mandatory when the number of boxes exceeds the number of shipments.' });
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

            for (const transaction of expiredTransactions) {
                console.log(`Evidence for transaction ${transaction.id} is older than 3 days. Deleting.`);
                const fullPath = path.join(__dirname, transaction.transferEvidencePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`Deleted file: ${fullPath}`);
                }
            }
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
                    console.error(`Error processing shipment ${shipment.id} for photo cleanup:`, err);
                }
            }
        } catch (error) {
            console.error('Error during photo cleanup job:', error);
        }
    };

    // Run the cleanup job every hour
    setInterval(cleanupExpiredFailurePhotos, 60 * 60 * 1000);
    setInterval(cleanupExpiredEvidence, 60 * 60 * 1000);
    // Run once on startup as well
    cleanupExpiredFailurePhotos();
    cleanupExpiredEvidence();

    // Start the server
    const PORT = process.env.PORT || 8080;
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend and WebSocket server listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
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