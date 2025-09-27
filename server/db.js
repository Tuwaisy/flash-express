// server/db.js - Fixed for proper PostgreSQL JSON handling
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;

let knex;

// Database connection setup
try {
  if (process.env.DATABASE_URL) {
    console.log("Production environment detected. Connecting to PostgreSQL...");
    knex = require('knex')({
      client: 'pg',
      connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      },
      pool: { 
        min: 1, 
        max: 5,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000
      },
      acquireConnectionTimeout: 60000
    });
    
  } else {
    console.log("Development environment detected. Using local SQLite database...");
    knex = require('knex')({
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname, 'flash.sqlite'),
      },
      useNullAsDefault: true,
    });
  }
} catch (error) {
  console.error("FATAL: Knex connection failed to initialize.", error);
  process.exit(1); // Exit if the database connection can't even be configured
}


// #region --- Helper Functions ---

// Safely stringify a value only if it's an object or array
const safeStringify = (value) => {
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    return value;
};

// Helper to create JSON columns based on DB type
const createJsonColumn = (table, columnName, notNull = false) => {
  const columnType = process.env.DATABASE_URL ? 'jsonb' : 'json';
  const column = table[columnType](columnName);
  return notNull ? column.notNullable() : column;
};

// #endregion

// #region --- Schema and Seeding ---

async function setupDatabase() {
  console.log('Setting up database...');
  try {
    // Table: users
    if (!(await knex.schema.hasTable('users'))) {
      console.log('Creating "users" table...');
      await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('publicId').unique();
        table.string('name').notNullable();
        table.string('email').unique().notNullable();
        table.string('password').notNullable();
        createJsonColumn(table, 'roles', true);
        createJsonColumn(table, 'zones');
        table.string('phone');
        createJsonColumn(table, 'address');
        table.decimal('flatRateFee', 10, 2);
        table.string('taxCardNumber');
        createJsonColumn(table, 'priorityMultipliers');
        table.integer('referrerId').unsigned().references('id').inTable('users');
        table.decimal('referralCommission', 10, 2);
        table.string('partnerTier');
        table.boolean('manualTierAssignment').defaultTo(false);
        table.decimal('walletBalance', 10, 2).defaultTo(0); // Store calculated wallet balance
      });
    } else {
        // Migration: Add walletBalance column if it doesn't exist
        const hasWalletBalance = await knex.schema.hasColumn('users', 'walletBalance');
        if (!hasWalletBalance) {
            console.log('Adding walletBalance column to users table...');
            await knex.schema.alterTable('users', table => {
                table.decimal('walletBalance', 10, 2).defaultTo(0);
            });
        }
    }

    // Table: tier_settings
    if (!(await knex.schema.hasTable('tier_settings'))) {
        console.log('Creating "tier_settings" table...');
        await knex.schema.createTable('tier_settings', table => {
            table.string('tierName').primary();
            table.integer('shipmentThreshold').notNullable();
            table.decimal('discountPercentage', 5, 2).notNullable();
        });
        console.log('Seeding tier settings...');
        await knex('tier_settings').insert([
            { tierName: 'Bronze', shipmentThreshold: 50, discountPercentage: 2.0 },
            { tierName: 'Silver', shipmentThreshold: 150, discountPercentage: 10.0 },
            { tierName: 'Gold', shipmentThreshold: 300, discountPercentage: 15.0 },
        ]);
    }

    // Table: custom_roles
    if (!(await knex.schema.hasTable('custom_roles'))) {
        console.log('Creating "custom_roles" table...');
        await knex.schema.createTable('custom_roles', table => {
            table.string('id').primary();
            table.string('name').unique().notNullable();
            createJsonColumn(table, 'permissions', true);
            table.boolean('isSystemRole').defaultTo(false);
        });
    }
    
    // Seeding: custom_roles (always re-seed to keep permissions fresh)
    console.log('Seeding default roles and permissions...');
    await knex('custom_roles').del();
    const allPermissions = ['manage_users', 'edit_user_profile', 'manage_roles', 'create_shipments', 'view_own_shipments', 'view_all_shipments', 'assign_shipments', 'view_courier_tasks', 'update_shipment_status', 'view_own_wallet', 'view_own_financials', 'view_client_revenue', 'view_admin_financials', 'view_client_analytics', 'view_courier_performance', 'manage_courier_payouts', 'view_courier_earnings', 'view_notifications_log', 'view_dashboard', 'view_profile', 'view_total_shipments_overview', 'view_courier_completed_orders', 'manage_inventory', 'manage_assets', 'view_own_assets', 'delete_inventory_item', 'delete_asset', 'manage_client_payouts', 'manage_suppliers', 'create_shipments_for_others', 'print_labels', 'view_delivered_shipments', 'view_couriers_by_zone', 'manage_partner_tiers', 'edit_client_address', 'view_admin_delivery_management'];
    const clientPermissions = ['create_shipments', 'view_own_shipments', 'view_own_wallet', 'view_own_financials', 'view_client_revenue', 'view_dashboard', 'view_profile', 'view_own_assets'];
    const courierPermissions = ['view_courier_tasks', 'update_shipment_status', 'view_courier_earnings', 'view_dashboard', 'view_profile', 'view_courier_completed_orders', 'view_own_assets'];
    const superUserPermissions = allPermissions.filter(p => !['manage_roles', 'view_admin_financials'].includes(p));
    const assigningUserPermissions = ['assign_shipments', 'view_dashboard', 'view_total_shipments_overview', 'manage_inventory', 'view_all_shipments', 'view_profile', 'print_labels', 'view_delivered_shipments', 'view_couriers_by_zone'];
    
    const rolesToSeed = [
        { id: 'role_admin', name: 'Administrator', permissions: allPermissions, isSystemRole: true },
        { id: 'role_super_user', name: 'Super User', permissions: superUserPermissions, isSystemRole: true },
        { id: 'role_client', name: 'Client', permissions: clientPermissions, isSystemRole: true },
        { id: 'role_courier', name: 'Courier', permissions: courierPermissions, isSystemRole: true },
        { id: 'role_assigning_user', name: 'Assigning User', permissions: assigningUserPermissions, isSystemRole: true },
    ].map(role => ({ ...role, permissions: safeStringify(role.permissions) })); // Stringify permissions
    await knex('custom_roles').insert(rolesToSeed);

    // Seeding: admin user - Handle existing user updates
    const existingAdmin = await knex('users').where({ email: 'admin@shuhna.net' }).first();
    const existingOldAdmin = await knex('users').where({ email: 'admin@flash.com' }).first();
    
    if (existingOldAdmin && !existingAdmin) {
        // Update old admin email to new one
        console.log('Updating existing admin user email from admin@flash.com to admin@shuhna.net...');
        await knex('users')
            .where({ email: 'admin@flash.com' })
            .update({ email: 'admin@shuhna.net' });
    } else if (!existingAdmin && !existingOldAdmin) {
        // Create new admin user only if none exists
        console.log('Seeding admin user...');
        const hashedPassword = await bcrypt.hash('password123', saltRounds);
        
        // Let database auto-generate ID and then get it
        const [insertedUser] = await knex('users').insert({
          name: 'Admin User',
          email: 'admin@shuhna.net',
          password: hashedPassword,
          roles: safeStringify(['Administrator']),
        }).returning(['id']);
        
        const userId = insertedUser.id;
        
        // Update with proper publicId after getting the auto-generated ID
        await knex('users').where({ id: userId }).update({
          publicId: `AD-${userId}`
        });
        
    } else if (existingAdmin) {
        console.log('Admin user with admin@shuhna.net already exists, skipping...');
    }

    // Seeding: test client user
    if (!(await knex('users').where({ email: 'client@test.com' }).first())) {
        console.log('Seeding test client user...');
        const hashedPassword = await bcrypt.hash('password123', saltRounds);
        
        // Let database auto-generate ID and then get it
        const [insertedUser] = await knex('users').insert({
          name: 'Test Client',
          email: 'client@test.com',
          password: hashedPassword,
          roles: safeStringify(['Client']),
          flatRateFee: 75.0,
          priorityMultipliers: safeStringify({ Standard: 1.0, Urgent: 1.5, Express: 2.0 }),
          address: safeStringify({ street: "123 Test Street", details: "Building A", city: "Cairo", zone: "Downtown" })
        }).returning(['id']);
        
        const userId = insertedUser.id;
        
        // Update with proper publicId after getting the auto-generated ID
        await knex('users').where({ id: userId }).update({
          publicId: `CL-${userId}`
        });
    }

    // Seeding: test courier user
    if (!(await knex('users').where({ email: 'courier@test.com' }).first())) {
        console.log('Seeding test courier user...');
        const hashedPassword = await bcrypt.hash('password123', saltRounds);
        
        // Let database auto-generate ID and then get it
        const [insertedUser] = await knex('users').insert({
          name: 'Test Courier',
          email: 'courier@test.com',
          password: hashedPassword,
          roles: safeStringify(['Courier']),
          zones: safeStringify(['Downtown', 'Heliopolis', 'Nasr City'])
        }).returning(['id']);
        
        const userId = insertedUser.id;
        
        // Update with proper publicId after getting the auto-generated ID
        await knex('users').where({ id: userId }).update({
          publicId: `CO-${userId}`
        });
    }

    // Table: shipments
    if (!(await knex.schema.hasTable('shipments'))) {
        console.log('Creating "shipments" table...');
        await knex.schema.createTable('shipments', table => {
            table.string('id').primary();
            table.integer('clientId').unsigned().references('id').inTable('users');
            table.string('clientName').notNullable();
            table.string('recipientName').notNullable();
            table.string('recipientPhone').notNullable();
            createJsonColumn(table, 'fromAddress', true);
            createJsonColumn(table, 'toAddress', true);
            table.text('packageDescription');
            table.boolean('isLargeOrder').defaultTo(false);
            table.decimal('price', 10, 2).notNullable();
            table.string('paymentMethod').notNullable();
            table.string('status').notNullable();
            table.integer('courierId').unsigned().references('id').inTable('users');
            table.string('creationDate').notNullable();
            table.string('deliveryDate');
            table.string('priority').notNullable();
            table.decimal('packageValue', 10, 2).notNullable();
            table.decimal('clientFlatRateFee', 10, 2);
            table.decimal('courierCommission', 10, 2);
            table.text('failureReason');
            table.string('failurePhotoPath');
            table.text('packagingNotes');
            createJsonColumn(table, 'packagingLog');
            createJsonColumn(table, 'statusHistory');
            table.decimal('amountReceived', 10, 2);
            table.decimal('amountToCollect', 10, 2);
        });
    }

    // Table: shipment_counters
    if (!(await knex.schema.hasTable('shipment_counters'))) {
        console.log('Creating "shipment_counters" table...');
        await knex.schema.createTable('shipment_counters', table => {
            table.string('id').primary();
            table.integer('count').notNullable().defaultTo(0);
        });
        await knex('shipment_counters').insert({ id: 'global', count: 0 });
    }

    // Table: client_transactions
    if (!(await knex.schema.hasTable('client_transactions'))) {
        console.log('Creating "client_transactions" table...');
        await knex.schema.createTable('client_transactions', table => {
            table.string('id').primary();
            table.integer('userId').unsigned().references('id').inTable('users');
            table.string('type').notNullable();
            table.decimal('amount', 10, 2).notNullable();
            table.string('date').notNullable();
            table.string('description').notNullable();
            table.string('status').notNullable().defaultTo('Processed');
        });
    }

    // Table: courier_stats
    if (!(await knex.schema.hasTable('courier_stats'))) {
        console.log('Creating "courier_stats" table...');
        await knex.schema.createTable('courier_stats', table => {
            table.integer('courierId').primary().unsigned().references('id').inTable('users');
            table.string('commissionType').notNullable();
            table.decimal('commissionValue', 10, 2).notNullable();
            table.integer('consecutiveFailures').defaultTo(0);
            table.boolean('isRestricted').defaultTo(false);
            table.string('restrictionReason');
            table.decimal('performanceRating', 3, 1).defaultTo(5.0);
            table.decimal('currentBalance', 10, 2).defaultTo(0);
            table.decimal('totalEarnings', 10, 2).defaultTo(0);
        });
    } else {
        // Migration: Add missing columns if they don't exist
        const hasCurrentBalance = await knex.schema.hasColumn('courier_stats', 'currentBalance');
        const hasTotalEarnings = await knex.schema.hasColumn('courier_stats', 'totalEarnings');
        
        if (!hasCurrentBalance || !hasTotalEarnings) {
            console.log('Adding missing columns to courier_stats table...');
            await knex.schema.alterTable('courier_stats', table => {
                if (!hasCurrentBalance) {
                    table.decimal('currentBalance', 10, 2).defaultTo(0);
                }
                if (!hasTotalEarnings) {
                    table.decimal('totalEarnings', 10, 2).defaultTo(0);
                }
            });
        }
    }

    // Table: courier_transactions
     if (!(await knex.schema.hasTable('courier_transactions'))) {
        console.log('Creating "courier_transactions" table...');
        await knex.schema.createTable('courier_transactions', table => {
            table.string('id').primary();
            table.integer('courierId').unsigned().references('id').inTable('users');
            table.string('type').notNullable();
            table.decimal('amount', 10, 2).notNullable();
            table.string('description');
            table.string('shipmentId');
            table.string('timestamp').notNullable();
            table.string('status').notNullable();
            table.string('paymentMethod');
            table.string('transferEvidencePath');
        });
    }
    
    // Table: notifications
    if (!(await knex.schema.hasTable('notifications'))) {
        console.log('Creating "notifications" table...');
        await knex.schema.createTable('notifications', table => {
            table.string('id').primary();
            table.string('shipmentId').notNullable();
            table.string('channel').notNullable();
            table.string('recipient').notNullable();
            table.text('message').notNullable();
            table.string('date').notNullable();
            table.string('status').notNullable();
            table.boolean('sent').defaultTo(false);
        });
    }

    // Table: in_app_notifications
    if (!(await knex.schema.hasTable('in_app_notifications'))) {
        console.log('Creating "in_app_notifications" table...');
        await knex.schema.createTable('in_app_notifications', table => {
            table.string('id').primary();
            table.integer('userId').unsigned().references('id').inTable('users').onDelete('CASCADE');
            table.text('message').notNullable();
            table.string('link');
            table.boolean('isRead').defaultTo(false);
            table.string('timestamp').notNullable();
        });
    }
    
    // Table: verifications (for login/signup verification codes)
    if (!(await knex.schema.hasTable('verifications'))) {
        console.log('Creating "verifications" table...');
        await knex.schema.createTable('verifications', (table) => {
            table.string('id').primary();
            table.string('phone').notNullable();
            table.string('code').notNullable();
            table.string('purpose').notNullable(); // 'login', 'signup', 'password_reset', etc.
            table.string('channel').notNullable(); // 'whatsapp', 'sms', 'email'
            table.timestamp('expires_at').notNullable();
            table.integer('attempts').defaultTo(0);
            table.boolean('verified').defaultTo(false);
            table.timestamp('verified_at').nullable();
            table.text('metadata').nullable(); // JSON string for additional data
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
            table.index(['phone', 'purpose']);
            table.index(['expires_at']);
        });
    }

    // Table: delivery_verifications
    if (!(await knex.schema.hasTable('delivery_verifications'))) {
        console.log('Creating "delivery_verifications" table...');
        await knex.schema.createTable('delivery_verifications', (table) => {
            table.string('shipmentId').primary();
            table.string('code').notNullable();
            table.string('expires_at').notNullable();
            table.string('channel').defaultTo('whatsapp'); // Track which channel was used
            table.boolean('verified').defaultTo(false);
            table.timestamp('verified_at').nullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());
        });
    } else {
        // Add new columns to existing delivery_verifications table
        const hasChannelColumn = await knex.schema.hasColumn('delivery_verifications', 'channel');
        const hasVerifiedColumn = await knex.schema.hasColumn('delivery_verifications', 'verified');
        const hasVerifiedAtColumn = await knex.schema.hasColumn('delivery_verifications', 'verified_at');
        const hasCreatedAtColumn = await knex.schema.hasColumn('delivery_verifications', 'created_at');
        
        if (!hasChannelColumn || !hasVerifiedColumn || !hasVerifiedAtColumn || !hasCreatedAtColumn) {
            console.log('Updating delivery_verifications table with new columns...');
            await knex.schema.alterTable('delivery_verifications', table => {
                if (!hasChannelColumn) table.string('channel').defaultTo('whatsapp');
                if (!hasVerifiedColumn) table.boolean('verified').defaultTo(false);
                if (!hasVerifiedAtColumn) table.timestamp('verified_at').nullable();
                if (!hasCreatedAtColumn) table.timestamp('created_at').defaultTo(knex.fn.now());
            });
        }
    }
    
    // Table: inventory_items
    if (!(await knex.schema.hasTable('inventory_items'))) {
      console.log('Creating "inventory_items" table...');
      await knex.schema.createTable('inventory_items', table => {
        table.string('id').primary();
        table.string('name').unique().notNullable();
        table.integer('quantity').notNullable();
        table.string('unit').notNullable();
        table.string('lastUpdated').notNullable();
        table.integer('minStock').defaultTo(10);
        table.decimal('unitPrice', 10, 2).defaultTo(0);
      });
    }

    // Seeding: inventory_items (only if empty)
    const existingItems = await knex('inventory_items').count('id as count').first();
    if (!existingItems || existingItems.count === 0) {
        console.log('Seeding inventory items...');
        await knex('inventory_items').insert([
            { id: 'inv_box_sm', name: 'Small Cardboard Box', quantity: 1000, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 100, unitPrice: 5.00 },
            { id: 'inv_box_md', name: 'Medium Cardboard Box', quantity: 1000, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 100, unitPrice: 7.50 },
            { id: 'inv_box_lg', name: 'Large Cardboard Box', quantity: 500, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 50, unitPrice: 10.00 },
            { id: 'inv_flyer_sm', name: 'Small Flyer', quantity: 2000, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 500, unitPrice: 0.25 },
            { id: 'inv_flyer_md', name: 'Medium Flyer', quantity: 1500, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 300, unitPrice: 0.35 },
            { id: 'inv_flyer_lg', name: 'Large Flyer', quantity: 1000, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 200, unitPrice: 0.50 },
            { id: 'inv_plastic_wrap', name: 'Packaging Plastic', quantity: 200, unit: 'rolls', lastUpdated: new Date().toISOString(), minStock: 20, unitPrice: 30.00 },
        ]);
    } else {
        console.log('Inventory items already exist, skipping seeding...');
    }
    
    // Table: assets
    if (!(await knex.schema.hasTable('assets'))) {
      console.log('Creating "assets" table...');
      await knex.schema.createTable('assets', table => {
        table.string('id').primary();
        table.string('type').notNullable();
        table.string('name').notNullable();
        table.string('identifier').unique();
        table.string('status').notNullable();
        table.integer('assignedToUserId').unsigned().references('id').inTable('users');
        table.string('assignmentDate');
        table.string('purchaseDate');
        table.decimal('purchasePrice', 10, 2);
        table.integer('usefulLifeMonths');
      });
    }
    
    // Table: suppliers
    if (!(await knex.schema.hasTable('suppliers'))) {
        console.log('Creating "suppliers" table...');
        await knex.schema.createTable('suppliers', table => {
            table.string('id').primary();
            table.string('name').notNullable();
            table.string('contact_person');
            table.string('phone');
            table.string('email');
            table.text('address');
        });
    }

    // Table: supplier_transactions
    if (!(await knex.schema.hasTable('supplier_transactions'))) {
        console.log('Creating "supplier_transactions" table...');
        await knex.schema.createTable('supplier_transactions', table => {
            table.string('id').primary();
            table.string('supplier_id').notNullable().references('id').inTable('suppliers').onDelete('CASCADE');
            table.string('date').notNullable();
            table.string('description');
            table.string('type').notNullable(); // 'Payment' or 'Credit'
            table.decimal('amount', 10, 2).notNullable();
        });
    }

    // Table: barcode_scans
    if (!(await knex.schema.hasTable('barcode_scans'))) {
        console.log('Creating "barcode_scans" table...');
        await knex.schema.createTable('barcode_scans', table => {
            table.increments('id').primary();
            table.string('shipmentId').notNullable();
            table.integer('courierId').unsigned().references('id').inTable('users');
            table.string('previousStatus').notNullable();
            table.string('newStatus').notNullable();
            table.timestamp('scannedAt').defaultTo(knex.fn.now());
            table.index('shipmentId');
            table.index('courierId');
            table.index('scannedAt');
        });
    }

    // Final step: Reset primary key sequences for PostgreSQL
    if (process.env.DATABASE_URL) {
        console.log('🔄 Resetting PostgreSQL sequences...');
        try {
            await knex.raw(`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true);`);
            console.log('✅ Sequences reset successfully.');
        } catch (error) {
            console.error('❌ Error resetting PostgreSQL sequences:', error);
        }
    }

    console.log('✅ Database setup complete!');
    console.log('🔗 Connection info:', process.env.DATABASE_URL ? 'PostgreSQL (Production)' : 'SQLite (Development)');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    // Re-throw the error to ensure the calling process knows about the failure
    throw error;
  }
}

// #endregion

module.exports = { knex, setupDatabase };