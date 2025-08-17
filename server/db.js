
// server/db.js
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// =================================================================================
// Environment-Aware Database Configuration for Railway Compatibility
// =================================================================================
// This setup automatically detects if the app is running in a production environment
// (like Railway) and uses the appropriate database configuration.
//
// - In Production (on Railway): It connects to your PostgreSQL database using the
//   `DATABASE_URL` environment variable that Railway provides automatically.
// - In Development (on your local machine): It falls back to using the local
//   `flash.sqlite` file, so your development process remains unchanged.
// =================================================================================

let knex;

if (process.env.DATABASE_URL) {
  // Production configuration for PostgreSQL (used by Railway)
  console.log("Production environment detected. Connecting to PostgreSQL...");
  knex = require('knex')({
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Required for many cloud database providers
    },
    pool: { min: 2, max: 10 },
  });
} else {
  // Development configuration for SQLite
  console.log("Development environment detected. Using local SQLite database...");
  knex = require('knex')({
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'flash.sqlite'),
    },
    useNullAsDefault: true,
  });
}


async function setupDatabase() {
  console.log('Setting up database...');
  try {
    const hasUsersTable = await knex.schema.hasTable('users');
    if (!hasUsersTable) {
      console.log('Creating "users" table...');
      await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('publicId').unique();
        table.string('name').notNullable();
        table.string('email').unique().notNullable();
        table.string('password').notNullable();
        table.json('roles').notNullable(); // Stored as JSON array of strings
        table.json('zones');
        table.string('phone');
        table.json('address');
        table.decimal('flatRateFee', 10, 2);
        table.string('taxCardNumber');
        table.json('priorityMultipliers');
        // For courier referrals
        table.integer('referrerId').unsigned().references('id').inTable('users');
        table.decimal('referralCommission', 10, 2);
        // For partner tiers
        table.string('partnerTier');
        table.boolean('manualTierAssignment').defaultTo(false);
      });
    } else {
      // Add new columns if they don't exist
      if (!(await knex.schema.hasColumn('users', 'publicId'))) {
        await knex.schema.alterTable('users', t => t.string('publicId').unique());
      }
      if (!(await knex.schema.hasColumn('users', 'roles'))) {
        await knex.schema.alterTable('users', t => t.json('roles'));
      }
      if (!(await knex.schema.hasColumn('users', 'priorityMultipliers'))) {
        await knex.schema.alterTable('users', t => t.json('priorityMultipliers'));
      }
      if (!(await knex.schema.hasColumn('users', 'referrerId'))) {
        await knex.schema.alterTable('users', t => t.integer('referrerId').unsigned().references('id').inTable('users'));
      }
      if (!(await knex.schema.hasColumn('users', 'referralCommission'))) {
        await knex.schema.alterTable('users', t => t.decimal('referralCommission', 10, 2));
      }
       if (!(await knex.schema.hasColumn('users', 'zones'))) {
        await knex.schema.alterTable('users', t => t.json('zones'));
      }
      if (!(await knex.schema.hasColumn('users', 'partnerTier'))) {
        await knex.schema.alterTable('users', t => t.string('partnerTier'));
      }
      if (!(await knex.schema.hasColumn('users', 'manualTierAssignment'))) {
        await knex.schema.alterTable('users', t => t.boolean('manualTierAssignment').defaultTo(false));
      }
    }
    
    const hasTierSettingsTable = await knex.schema.hasTable('tier_settings');
    if (!hasTierSettingsTable) {
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


    const hasCustomRolesTable = await knex.schema.hasTable('custom_roles');
    if (!hasCustomRolesTable) {
        console.log('Creating "custom_roles" table...');
        await knex.schema.createTable('custom_roles', table => {
            table.string('id').primary();
            table.string('name').unique().notNullable();
            table.json('permissions').notNullable();
            table.boolean('isSystemRole').defaultTo(false);
        });
    }

    // Always re-seed roles to ensure permissions are up-to-date
    console.log('Seeding default roles and permissions...');
    await knex('custom_roles').del(); // Clear old roles
    const allPermissions = [
        'manage_users', 'edit_user_profile', 'manage_roles', 'create_shipments', 'view_own_shipments', 'view_all_shipments',
        'assign_shipments', 'view_courier_tasks', 'update_shipment_status', 
        'view_own_wallet', 'view_own_financials', 'view_admin_financials', 'view_client_analytics', 
        'view_courier_performance', 'manage_courier_payouts', 'view_courier_earnings', 
        'view_notifications_log', 'view_dashboard', 'view_profile', 'view_total_shipments_overview',
        'view_courier_completed_orders', 'manage_inventory', 'manage_assets', 'view_own_assets',
        'delete_inventory_item', 'delete_asset', 'manage_client_payouts', 'manage_suppliers',
        'create_shipments_for_others', 'print_labels', 'view_delivered_shipments', 'view_couriers_by_zone',
        'manage_partner_tiers', 'edit_client_address', 'view_admin_delivery_management'
    ];
    const clientPermissions = ['create_shipments', 'view_own_shipments', 'view_own_wallet', 'view_own_financials', 'view_dashboard', 'view_profile', 'view_own_assets'];
    const courierPermissions = ['view_courier_tasks', 'update_shipment_status', 'view_courier_earnings', 'view_dashboard', 'view_profile', 'view_courier_completed_orders', 'view_own_assets'];
    const superUserPermissions = allPermissions.filter(p => ![
        'manage_roles', 'view_admin_financials'
    ].includes(p));
    const assigningUserPermissions = ['assign_shipments', 'view_dashboard', 'view_total_shipments_overview', 'manage_inventory', 'view_all_shipments', 'view_profile', 'print_labels', 'view_delivered_shipments', 'view_couriers_by_zone'];

    const rolesToSeed = [
        { id: 'role_admin', name: 'Administrator', permissions: JSON.stringify(allPermissions), isSystemRole: true },
        { id: 'role_super_user', name: 'Super User', permissions: JSON.stringify(superUserPermissions), isSystemRole: true },
        { id: 'role_client', name: 'Client', permissions: JSON.stringify(clientPermissions), isSystemRole: true },
        { id: 'role_courier', name: 'Courier', permissions: JSON.stringify(courierPermissions), isSystemRole: true },
        { id: 'role_assigning_user', name: 'Assigning User', permissions: JSON.stringify(assigningUserPermissions), isSystemRole: true },
    ];
    await knex('custom_roles').insert(rolesToSeed);

    // Seed admin user
    const adminExists = await knex('users').where({ email: 'admin@flash.com' }).first();
    if (!adminExists) {
        console.log('Seeding admin user...');
        const hashedPassword = await bcrypt.hash('password123', saltRounds);
        await knex('users').insert({
          id: 1, // Explicitly set ID for referral testing
          publicId: 'AD-1',
          name: 'Admin User',
          email: 'admin@flash.com',
          password: hashedPassword,
          roles: JSON.stringify(['Administrator']),
        });
        console.log('Admin user created: admin@flash.com / password123');
    } else {
        console.log('Admin user already exists: admin@flash.com');
    }

    // Seed test client user with proper priority multipliers
    const testClientExists = await knex('users').where({ email: 'client@test.com' }).first();
    if (!testClientExists) {
        console.log('Seeding test client user...');
        const hashedPassword = await bcrypt.hash('password123', saltRounds);
        await knex('users').insert({
          id: 2,
          publicId: 'CL-2',
          name: 'Test Client',
          email: 'client@test.com',
          password: hashedPassword,
          roles: JSON.stringify(['Client']),
          flatRateFee: 75.0,
          priorityMultipliers: JSON.stringify({ Standard: 1.0, Urgent: 1.5, Express: 2.0 }),
          address: JSON.stringify({
            street: "123 Test Street",
            details: "Building A",
            city: "Cairo",
            zone: "Downtown"
          })
        });
        console.log('Test client created: client@test.com / password123');
    }

    // Seed test courier user  
    const testCourierExists = await knex('users').where({ email: 'courier@test.com' }).first();
    if (!testCourierExists) {
        console.log('Seeding test courier user...');
        const hashedPassword = await bcrypt.hash('password123', saltRounds);
        await knex('users').insert({
          id: 3,
          publicId: 'CO-3',
          name: 'Test Courier',
          email: 'courier@test.com',
          password: hashedPassword,
          roles: JSON.stringify(['Courier']),
          zones: JSON.stringify(['Downtown', 'Heliopolis', 'Nasr City'])
        });
        console.log('Test courier created: courier@test.com / password123');
    }


    const hasShipmentsTable = await knex.schema.hasTable('shipments');
    if (!hasShipmentsTable) {
        console.log('Creating "shipments" table...');
        await knex.schema.createTable('shipments', table => {
            table.string('id').primary();
            table.integer('clientId').unsigned().references('id').inTable('users');
            table.string('clientName').notNullable();
            table.string('recipientName').notNullable();
            table.string('recipientPhone').notNullable();
            table.json('fromAddress').notNullable();
            table.json('toAddress').notNullable();
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
            table.json('packagingLog');
            table.json('statusHistory');
            table.decimal('amountReceived', 10, 2);
            table.decimal('amountToCollect', 10, 2);
        });
    } else {
       if (!(await knex.schema.hasColumn('shipments', 'packagingNotes'))) {
         await knex.schema.alterTable('shipments', t => t.text('packagingNotes'));
       }
       if (!(await knex.schema.hasColumn('shipments', 'packagingLog'))) {
         await knex.schema.alterTable('shipments', t => t.json('packagingLog'));
       }
       if (!(await knex.schema.hasColumn('shipments', 'statusHistory'))) {
         await knex.schema.alterTable('shipments', t => t.json('statusHistory'));
       }
       if (!(await knex.schema.hasColumn('shipments', 'amountReceived'))) {
        await knex.schema.alterTable('shipments', t => t.decimal('amountReceived', 10, 2));
      }
      if (!(await knex.schema.hasColumn('shipments', 'amountToCollect'))) {
        await knex.schema.alterTable('shipments', t => t.decimal('amountToCollect', 10, 2));
      }
    }
    
    const hasShipmentCountersTable = await knex.schema.hasTable('shipment_counters');
    if (!hasShipmentCountersTable) {
        console.log('Creating "shipment_counters" table...');
        await knex.schema.createTable('shipment_counters', table => {
            table.string('id').primary();
            table.integer('count').notNullable().defaultTo(0);
        });
        await knex('shipment_counters').insert({ id: 'global', count: 0 });
    }


    const hasClientTransactionsTable = await knex.schema.hasTable('client_transactions');
    if (!hasClientTransactionsTable) {
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
    } else {
        if (!(await knex.schema.hasColumn('client_transactions', 'status'))) {
            await knex.schema.alterTable('client_transactions', t => t.string('status').notNullable().defaultTo('Processed'));
        }
    }

    const hasCourierStatsTable = await knex.schema.hasTable('courier_stats');
    if (!hasCourierStatsTable) {
        console.log('Creating "courier_stats" table...');
        await knex.schema.createTable('courier_stats', table => {
            table.integer('courierId').primary().unsigned().references('id').inTable('users');
            table.string('commissionType').notNullable();
            table.decimal('commissionValue', 10, 2).notNullable();
            table.integer('consecutiveFailures').defaultTo(0);
            table.boolean('isRestricted').defaultTo(false);
            table.string('restrictionReason');
            table.decimal('performanceRating', 3, 1).defaultTo(5.0);
        });
    }

    const hasCourierTransactionsTable = await knex.schema.hasTable('courier_transactions');
     if (!hasCourierTransactionsTable) {
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
    } else {
        if (!(await knex.schema.hasColumn('courier_transactions', 'paymentMethod'))) {
            await knex.schema.alterTable('courier_transactions', t => t.string('paymentMethod'));
        }
        if (!(await knex.schema.hasColumn('courier_transactions', 'transferEvidencePath'))) {
            await knex.schema.alterTable('courier_transactions', t => t.string('transferEvidencePath'));
        }
    }
    
    const hasNotificationsTable = await knex.schema.hasTable('notifications');
    if (!hasNotificationsTable) {
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

    const hasInAppNotificationsTable = await knex.schema.hasTable('in_app_notifications');
    if (!hasInAppNotificationsTable) {
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
    
    const hasDeliveryVerificationsTable = await knex.schema.hasTable('delivery_verifications');
    if (!hasDeliveryVerificationsTable) {
        console.log('Creating "delivery_verifications" table...');
        await knex.schema.createTable('delivery_verifications', (table) => {
            table.string('shipmentId').primary();
            table.string('code').notNullable();
            table.string('expires_at').notNullable();
        });
    }
    
    // Add failurePhotoPath column if it doesn't exist
    if (await knex.schema.hasTable('shipments') && !(await knex.schema.hasColumn('shipments', 'failurePhotoPath'))) {
        console.log('Migration: Adding "failurePhotoPath" column to "shipments" table.');
        await knex.schema.alterTable('shipments', (table) => {
          table.string('failurePhotoPath');
        });
    }

    // --- New Tables for Inventory & Asset Management ---
    const hasInventoryTable = await knex.schema.hasTable('inventory_items');
    if (!hasInventoryTable) {
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
    } else {
        if (!(await knex.schema.hasColumn('inventory_items', 'minStock'))) {
            await knex.schema.alterTable('inventory_items', t => t.integer('minStock').defaultTo(10));
        }
        if (!(await knex.schema.hasColumn('inventory_items', 'unitPrice'))) {
            await knex.schema.alterTable('inventory_items', t => t.decimal('unitPrice', 10, 2).defaultTo(0));
        }
    }

    // Always re-seed inventory to ensure it's up to date with new items
    console.log('Seeding inventory items...');
    await knex('inventory_items').del(); // Clear old items
    await knex('inventory_items').insert([
        { id: 'inv_label', name: 'Shipping Label', quantity: 10000, unit: 'labels', lastUpdated: new Date().toISOString(), minStock: 500, unitPrice: 0.50 },
        { id: 'inv_box_sm', name: 'Small Cardboard Box', quantity: 1000, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 100, unitPrice: 5.00 },
        { id: 'inv_box_md', name: 'Medium Cardboard Box', quantity: 1000, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 100, unitPrice: 7.50 },
        { id: 'inv_box_lg', name: 'Large Cardboard Box', quantity: 500, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 50, unitPrice: 10.00 },
        { id: 'inv_plastic_wrap', name: 'Packaging Plastic', quantity: 200, unit: 'rolls', lastUpdated: new Date().toISOString(), minStock: 20, unitPrice: 30.00 },
      ]);
    
    
    const hasAssetsTable = await knex.schema.hasTable('assets');
    if (!hasAssetsTable) {
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
    } else {
        if (!(await knex.schema.hasColumn('assets', 'purchaseDate'))) {
            await knex.schema.alterTable('assets', t => t.string('purchaseDate'));
        }
        if (!(await knex.schema.hasColumn('assets', 'purchasePrice'))) {
            await knex.schema.alterTable('assets', t => t.decimal('purchasePrice', 10, 2));
        }
        if (!(await knex.schema.hasColumn('assets', 'usefulLifeMonths'))) {
            await knex.schema.alterTable('assets', t => t.integer('usefulLifeMonths'));
        }
    }
    
    const hasSuppliersTable = await knex.schema.hasTable('suppliers');
    if (!hasSuppliersTable) {
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

    const hasSupplierTransactionsTable = await knex.schema.hasTable('supplier_transactions');
    if (!hasSupplierTransactionsTable) {
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

    console.log('Database setup complete.');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

module.exports = { knex, setupDatabase };
