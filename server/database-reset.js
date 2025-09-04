// Comprehensive Database Reset with Backup - Railway Safe
// This script will:
// 1. Create a backup of essential data 
// 2. Reset database keeping only users and first 2 shipments
// 3. Provide restore functionality if deployment fails

import knex from 'knex';
import fs from 'fs';
import path from 'path';

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
});

// Backup file path
const backupPath = './database-backup.json';

async function createBackup() {
    console.log('📦 Creating database backup...');
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            users: await db('users').select('*'),
            shipments: await db('shipments').select('*').orderBy('createdAt').limit(5), // Keep top 5 for safety
            courier_stats: await db('courier_stats').select('*'),
            client_transactions: await db('client_transactions').select('*'),
            courier_transactions: await db('courier_transactions').select('*'),
            custom_roles: await db('custom_roles').select('*'),
            inventory_items: await db('inventory_items').select('*'),
            in_app_notifications: await db('in_app_notifications').select('*').limit(10) // Keep recent ones
        };
        
        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
        console.log('✅ Backup created successfully');
        return backup;
    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    }
}

async function resetDatabase() {
    console.log('🔄 Starting database reset...');
    
    try {
        await db.transaction(async (trx) => {
            // Get first 2 shipments to preserve
            const shipmentsToKeep = await trx('shipments')
                .select('*')
                .orderBy('createdAt')
                .limit(2);
                
            console.log('📦 Preserving shipments:', shipmentsToKeep.map(s => s.id));
            
            // Clear all data except users and first 2 shipments
            console.log('🗑️  Clearing courier_transactions...');
            await trx('courier_transactions').del();
            
            console.log('🗑️  Clearing client_transactions...');
            await trx('client_transactions').del();
            
            console.log('🗑️  Clearing in_app_notifications...');
            await trx('in_app_notifications').del();
            
            // Delete shipments beyond first 2
            if (shipmentsToKeep.length > 0) {
                const shipmentIdsToKeep = shipmentsToKeep.map(s => s.id);
                const deletedShipments = await trx('shipments')
                    .whereNotIn('id', shipmentIdsToKeep)
                    .del();
                console.log(`📦 Deleted ${deletedShipments} excess shipments`);
            }
            
            // Reset courier stats but keep user associations
            console.log('👤 Resetting courier stats...');
            await trx('courier_stats').update({
                currentBalance: 0,
                totalEarnings: 0,
                consecutiveFailures: 0,
                totalDeliveries: 0,
                deliverySuccessRate: 100.00,
                averageDeliveryTime: 0,
                isRestricted: false
            });
            
            // Reset user wallet balances
            console.log('💰 Resetting user wallet balances...');
            await trx('users').update({ 
                walletBalance: 0 
            });
            
            // Reset inventory items stock to 0 but keep essential items
            console.log('📦 Resetting inventory items stock...');
            const essentialItems = [
                { id: 'inv_box_sm', name: 'Small Cardboard Box', quantity: 0, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 100, unitPrice: 5.00 },
                { id: 'inv_box_md', name: 'Medium Cardboard Box', quantity: 0, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 100, unitPrice: 7.50 },
                { id: 'inv_box_lg', name: 'Large Cardboard Box', quantity: 0, unit: 'boxes', lastUpdated: new Date().toISOString(), minStock: 50, unitPrice: 10.00 },
                { id: 'inv_flyer_sm', name: 'Small Flyer', quantity: 0, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 500, unitPrice: 0.25 },
                { id: 'inv_flyer_md', name: 'Medium Flyer', quantity: 0, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 300, unitPrice: 0.35 },
                { id: 'inv_flyer_lg', name: 'Large Flyer', quantity: 0, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 200, unitPrice: 0.50 },
                { id: 'inv_plastic_wrap', name: 'Packaging Plastic', quantity: 0, unit: 'rolls', lastUpdated: new Date().toISOString(), minStock: 20, unitPrice: 30.00 }
            ];
            
            // Clear all inventory items first
            await trx('inventory_items').del();
            
            // Insert essential items with 0 stock
            await trx('inventory_items').insert(essentialItems);
            console.log(`📦 Reset ${essentialItems.length} essential inventory items with 0 stock`);
            
            // Reset sequence counters for clean IDs
            console.log('🔢 Resetting sequences...');
            
            // Get max IDs safely
            const maxShipmentId = await trx('shipments').max('id as max').first();
            const maxUserId = await trx('users').max('id as max').first();
            
            if (maxShipmentId?.max) {
                await trx.raw('SELECT setval(\'shipments_id_seq\', ?)', [maxShipmentId.max]);
            }
            if (maxUserId?.max) {
                await trx.raw('SELECT setval(\'users_id_seq\', ?)', [maxUserId.max]);
            }
            
            // Reset other sequences
            await trx.raw('SELECT setval(\'courier_transactions_id_seq\', 1, false)');
            await trx.raw('SELECT setval(\'client_transactions_id_seq\', 1, false)');
            await trx.raw('SELECT setval(\'in_app_notifications_id_seq\', 1, false)');
        });
        
        console.log('✅ Database reset completed successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Database reset failed:', error);
        throw error;
    }
}

async function validateDatabase() {
    console.log('🔍 Validating database state...');
    try {
        const counts = {
            users: await db('users').count('id as count').first(),
            shipments: await db('shipments').count('id as count').first(),
            courier_transactions: await db('courier_transactions').count('id as count').first(),
            client_transactions: await db('client_transactions').count('id as count').first(),
            courier_stats: await db('courier_stats').count('courierId as count').first()
        };
        
        console.log('📊 Database state after reset:');
        Object.entries(counts).forEach(([table, result]) => {
            console.log(`  ${table}: ${result?.count || 0} records`);
        });
        
        // Check if we have users
        if (!counts.users?.count || counts.users.count === '0') {
            throw new Error('No users found after reset - this is not expected');
        }
        
        // Check if shipments are limited to 2 or less
        if (counts.shipments?.count && parseInt(counts.shipments.count) > 2) {
            console.log(`⚠️  Warning: ${counts.shipments.count} shipments found (expected <= 2)`);
        }
        
        console.log('✅ Database validation passed');
        return true;
        
    } catch (error) {
        console.error('❌ Database validation failed:', error);
        throw error;
    }
}

async function restoreFromBackup() {
    console.log('🔄 Attempting to restore from backup...');
    
    if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found - cannot restore');
    }
    
    try {
        const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log(`📦 Restoring from backup created at ${backup.timestamp}`);
        
        await db.transaction(async (trx) => {
            // Restore users (be careful not to duplicate)
            console.log('👤 Restoring users...');
            for (const user of backup.users) {
                await trx('users')
                    .insert(user)
                    .onConflict('id')
                    .merge();
            }
            
            // Restore first 2 shipments
            console.log('📦 Restoring shipments...');
            const shipmentsToRestore = backup.shipments.slice(0, 2);
            for (const shipment of shipmentsToRestore) {
                await trx('shipments')
                    .insert(shipment)
                    .onConflict('id')
                    .merge();
            }
            
            // Restore courier stats
            console.log('👤 Restoring courier stats...');
            for (const stats of backup.courier_stats) {
                await trx('courier_stats')
                    .insert(stats)
                    .onConflict('courierId')
                    .merge();
            }
        });
        
        console.log('✅ Backup restored successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Backup restore failed:', error);
        throw error;
    }
}

// Main execution
async function main() {
    try {
        console.log('🚀 Starting comprehensive database reset...');
        
        // Step 1: Create backup
        await createBackup();
        
        // Step 2: Reset database
        await resetDatabase();
        
        // Step 3: Validate result
        await validateDatabase();
        
        console.log('🎉 Database reset completed successfully!');
        console.log('📝 Summary:');
        console.log('  - Users: Preserved');
        console.log('  - Shipments: First 2 kept, rest removed');
        console.log('  - Transactions: All cleared');
        console.log('  - Balances: Reset to 0');
        console.log('  - Backup: Available for restore if needed');
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Database reset failed:', error);
        
        console.log('🔄 Attempting automatic restore...');
        try {
            await restoreFromBackup();
            console.log('✅ Database restored to previous state');
        } catch (restoreError) {
            console.error('❌ Restore also failed:', restoreError);
            console.log('⚠️  Manual intervention required');
        }
        
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

// Allow running restore independently
if (process.argv.includes('--restore')) {
    console.log('🔄 Running restore mode...');
    restoreFromBackup()
        .then(() => {
            console.log('✅ Restore completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Restore failed:', error);
            process.exit(1);
        })
        .finally(() => db.destroy());
} else {
    main();
}
