// server/db.js - Fixed for proper PostgreSQL JSON handling
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;

let knex;

if (process.env.DATABASE_URL) {
  // Production configuration for PostgreSQL (used by Railway)
  console.log("Production environment detected. Connecting to PostgreSQL...");
  knex = require('knex')({
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
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

// Helper function to create JSON columns properly for each database type
const createJsonColumn = (table, columnName, notNull = false) => {
  if (process.env.DATABASE_URL) {
    // PostgreSQL: Use JSONB for better performance and native operators
    const column = table.jsonb(columnName);
    return notNull ? column.notNullable() : column;
  } else {
    // SQLite: Use JSON
    const column = table.json(columnName);
    return notNull ? column.notNullable() : column;
  }
};

// Data migration helper to convert existing JSON strings to proper format
const migrateJsonData = async () => {
  if (!process.env.DATABASE_URL) return; // Skip for SQLite
  
  console.log('🔄 Migrating JSON data for PostgreSQL...');
  
  try {
    // Check if we need to migrate users table JSON columns
    const sampleUser = await knex('users').first();
    if (sampleUser && typeof sampleUser.roles === 'string') {
      console.log('📦 Converting user roles from string to JSONB...');
      const users = await knex('users').select('id', 'roles', 'zones', 'address', 'priorityMultipliers');
      
      for (const user of users) {
        const updates = {};
        try {
            if (user.roles && typeof user.roles === 'string') updates.roles = JSON.parse(user.roles);
            if (user.zones && typeof user.zones === 'string') updates.zones = JSON.parse(user.zones);
            if (user.address && typeof user.address === 'string') updates.address = JSON.parse(user.address);
            if (user.priorityMultipliers && typeof user.priorityMultipliers === 'string') updates.priorityMultipliers = JSON.parse(user.priorityMultipliers);
        } catch(e) {
            console.warn(`Could not parse JSON for user ${user.id}, skipping update for this user.`);
        }
        
        if (Object.keys(updates).length > 0) {
          await knex('users').where({ id: user.id }).update(updates);
        }
      }
    }
    
    // Migrate shipments JSON columns
    const sampleShipment = await knex('shipments').first();
    if (sampleShipment && typeof sampleShipment.fromAddress === 'string') {
      console.log('📦 Converting shipment JSON fields...');
      const shipments = await knex('shipments').select('id', 'fromAddress', 'toAddress', 'statusHistory', 'packagingLog');
      
      for (const shipment of shipments) {
        const updates = {};
        try {
            if (shipment.fromAddress && typeof shipment.fromAddress === 'string') updates.fromAddress = JSON.parse(shipment.fromAddress);
            if (shipment.toAddress && typeof shipment.toAddress === 'string') updates.toAddress = JSON.parse(shipment.toAddress);
            if (shipment.statusHistory && typeof shipment.statusHistory === 'string') updates.statusHistory = JSON.parse(shipment.statusHistory);
            if (shipment.packagingLog && typeof shipment.packagingLog === 'string') updates.packagingLog = JSON.parse(shipment.packagingLog);
        } catch(e) {
            console.warn(`Could not parse JSON for shipment ${shipment.id}, skipping update.`);
        }
        
        if (Object.keys(updates).length > 0) {
          await knex('shipments').where({ id: shipment.id }).update(updates);
        }
      }
    }
    
    // Migrate custom_roles permissions
    const sampleRole = await knex('custom_roles').first();
    if (sampleRole && typeof sampleRole.permissions === 'string') {
      console.log('📦 Converting role permissions...');
      const roles = await knex('custom_roles').select('id', 'permissions');
      
      for (const role of roles) {
        if (role.permissions && typeof role.permissions === 'string') {
          try {
            const updates = { permissions: JSON.parse(role.permissions) };
            await knex('custom_roles').where({ id: role.id }).update(updates);
          } catch (e) {
            console.warn(`Failed to parse permissions for role ${role.id}`);
          }
        }
      }
    }
    
    console.log('✅ JSON data migration complete');
  } catch (error) {
    console.error('❌ Error during JSON data migration:', error);
  }
};

const resetSequences = async () => {
    if (!process.env.DATABASE_URL) return; // Only for PostgreSQL
    console.log('🔄 Resetting PostgreSQL sequences...');
    try {
        await knex.raw(`SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users), true);`);
        // Add more for other tables with auto-incrementing IDs if you seed them manually
        console.log('✅ Sequences reset successfully.');
    } catch (error) {
        console.error('❌ Error resetting PostgreSQL sequences:', error);
    }
};

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
        createJsonColumn(table, 'roles', true); // JSON array of strings - NOT NULL
        createJsonColumn(table, 'zones'); // JSON array for courier zones
        table.string('phone');
        createJsonColumn(table, 'address'); // JSON object for address
        table.decimal('flatRateFee', 10, 2);
        table.string('taxCardNumber');
        createJsonColumn(table, 'priorityMultipliers'); // JSON object for multipliers
        table.integer('referrerId').unsigned().references('id').inTable('users');
        table.decimal('referralCommission', 10, 2);
        table.string('partnerTier');
        table.boolean('manualTierAssignment').defaultTo(false);
      });
    } else {
      // Add new columns if they don't exist
      const userAlterations = [];
      if (!(await knex.schema.hasColumn('users', 'publicId'))) userAlterations.push(t => t.string('publicId').unique());
      if (!(await knex.schema.hasColumn('users', 'roles'))) userAlterations.push(t => createJsonColumn(t, 'roles', true).defaultTo('[]'));
      if (!(await knex.schema.hasColumn('users', 'priorityMultipliers'))) userAlterations.push(t => createJsonColumn(t, 'priorityMultipliers'));
      if (!(await knex.schema.hasColumn('users', 'referrerId'))) userAlterations.push(t => t.integer('referrerId').unsigned().references('id').inTable('users'));
      if (!(await knex.schema.hasColumn('users', 'referralCommission'))) userAlterations.push(t => t.decimal('referralCommission', 10, 2));
      if (!(await knex.schema.hasColumn('users', 'zones'))) userAlterations.push(t => createJsonColumn(t, 'zones'));
      if (!(await knex.schema.hasColumn('users', 'partnerTier'))) userAlterations.push(t => t.string('partnerTier'));
      if (!(await knex.schema.hasColumn('users', 'manualTierAssignment'))) userAlterations.push(t => t.boolean('manualTierAssignment').defaultTo(false));
      
      if(userAlterations.length > 0) {
          await knex.schema.alterTable('users', table => {
              userAlterations.forEach(alteration => alteration(table));
          });
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
            createJsonColumn(table, 'permissions', true); // NOT NULL JSON array
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
    const superUserPermissions = allPermissions.filter(p => !['manage_roles', 'view_admin_financials'].includes(p));
    const assigningUserPermissions = ['assign_shipments', 'view_dashboard', 'view_total_shipments_overview', 'manage_inventory', 'view_all_shipments', 'view_profile', 'print_labels', 'view_delivered_shipments', 'view_couriers_by_zone'];

    const rolesToSeed = [
        { id: 'role_admin', name: 'Administrator', permissions: allPermissions, isSystemRole: true },
        { id: 'role_super_user', name: 'Super User', permissions: superUserPermissions, isSystemRole: true },
        { id: 'role_client', name: 'Client', permissions: clientPermissions, isSystemRole: true },
        { id: 'role_courier', name: 'Courier', permissions: courierPermissions, isSystemRole: true },
        { id: 'role_assigning_user', name: 'Assigning User', permissions: assigningUserPermissions, isSystemRole: true },
    ];
    await knex('custom_roles').insert(rolesToSeed);

    // Seed admin user
    const adminExists = await knex('users').where({ email: 'admin@flash.com' }).first();
    if (!adminExists) {
        console.log('Seeding admin user...');
        const hashedPassword = await bcrypt.hash('password123', saltRounds);
        await knex('users').insert({
          id: 1,
          publicId: 'AD-1',
          name: 'Admin User',
          email: 'admin@flash.com',
          password: hashedPassword,
          roles: ['Administrator'],
        });
        console.log('Admin user created: admin@flash.com / password123');
    }

    // Seed test client user
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
          roles: ['Client'],
          flatRateFee: 75.0,
          priorityMultipliers: { Standard: 1.0, Urgent: 1.5, Express: 2.0 },
          address: { street: "123 Test Street", details: "Building A", city: "Cairo", zone: "Downtown" }
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
          roles: ['Courier'],
          zones: ['Downtown', 'Heliopolis', 'Nasr City']
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
    } else {
       const shipmentAlterations = [];
       if (!(await knex.schema.hasColumn('shipments', 'packagingNotes'))) shipmentAlterations.push(t => t.text('packagingNotes'));
       if (!(await knex.schema.hasColumn('shipments', 'packagingLog'))) shipmentAlterations.push(t => createJsonColumn(t, 'packagingLog'));
       if (!(await knex.schema.hasColumn('shipments', 'statusHistory'))) shipmentAlterations.push(t => createJsonColumn(t, 'statusHistory'));
       if (!(await knex.schema.hasColumn('shipments', 'amountReceived'))) shipmentAlterations.push(t => t.decimal('amountReceived', 10, 2));
       if (!(await knex.schema.hasColumn('shipments', 'amountToCollect'))) shipmentAlterations.push(t => t.decimal('amountToCollect', 10, 2));
       if (!(await knex.schema.hasColumn('shipments', 'failurePhotoPath'))) shipmentAlterations.push(t => t.string('failurePhotoPath'));

       if(shipmentAlterations.length > 0) {
           await knex.schema.alterTable('shipments', table => {
               shipmentAlterations.forEach(alt => alt(table));
           });
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

    // Always re-seed inventory
    console.log('Seeding inventory items...');
    await knex('inventory_items').del();
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

    // Run migrations and reset sequences
    await migrateJsonData();
    await resetSequences();

    console.log('✅ Database setup complete!');
    console.log('🔗 Connection info:', process.env.DATABASE_URL ? 'PostgreSQL (Production)' : 'SQLite (Development)');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

module.exports = { knex, setupDatabase };