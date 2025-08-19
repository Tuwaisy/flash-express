const knex = require('knex');
const config = require('./server/knexfile.js')[process.env.NODE_ENV || 'development'];

async function cleanupDatabase() {
    const db = knex(config);
    
    try {
        console.log('🧹 Starting database cleanup...');
        
        await db.transaction(async trx => {
            // 1. Clear all transactions except those related to order 00000
            const preserveOrderId = '00000';
            
            // Delete client transactions not related to order 00000
            const deletedClientTransactions = await trx('client_transactions')
                .whereNot('description', 'like', `%${preserveOrderId}%`)
                .del();
            console.log(`🗑️  Deleted ${deletedClientTransactions} client transactions`);
            
            // Delete courier transactions not related to order 00000
            const deletedCourierTransactions = await trx('courier_transactions')
                .whereNot('description', 'like', `%${preserveOrderId}%`)
                .del();
            console.log(`🗑️  Deleted ${deletedCourierTransactions} courier transactions`);
            
            // 2. Reset wallet balances for all users
            const updatedUsers = await trx('users')
                .update({ walletBalance: 0 });
            console.log(`💳 Reset wallet balance for ${updatedUsers} users`);
            
            // 3. Reset courier stats
            const updatedCourierStats = await trx('courier_stats')
                .update({ 
                    currentBalance: 0, 
                    totalEarnings: 0,
                    totalDeliveries: 0,
                    averageRating: 0,
                    totalRatings: 0
                });
            console.log(`📊 Reset stats for ${updatedCourierStats} couriers`);
            
            // 4. Delete all shipments except order 00000
            const deletedShipments = await trx('shipments')
                .whereNot('id', preserveOrderId)
                .del();
            console.log(`📦 Deleted ${deletedShipments} shipments (preserved order ${preserveOrderId})`);
            
            // 5. Clear notifications
            const deletedNotifications = await trx('in_app_notifications').del();
            console.log(`🔔 Deleted ${deletedNotifications} notifications`);
            
            // 6. Reset inventory to default quantities (optional)
            const inventoryItems = await trx('inventory_items').select('*');
            for (const item of inventoryItems) {
                // Reset to a default quantity based on item type
                let defaultQuantity = 100; // Default
                if (item.name.toLowerCase().includes('box')) defaultQuantity = 50;
                if (item.name.toLowerCase().includes('tape')) defaultQuantity = 20;
                if (item.name.toLowerCase().includes('bag')) defaultQuantity = 30;
                
                await trx('inventory_items')
                    .where({ id: item.id })
                    .update({ quantity: defaultQuantity });
            }
            console.log(`📋 Reset inventory quantities for ${inventoryItems.length} items`);
            
            // 7. Clear tier settings (optional - keeps default settings)
            const deletedTiers = await trx('tier_settings')
                .whereNot('tier', 'Bronze') // Keep Bronze as default
                .del();
            console.log(`🏆 Removed ${deletedTiers} custom tier settings (kept Bronze default)`);
        });
        
        console.log('✅ Database cleanup completed successfully!');
        console.log('📝 Preserved:');
        console.log('   - All user accounts');
        console.log('   - Order 00000 and related transactions');
        console.log('   - Basic inventory and Bronze tier settings');
        console.log('🗑️  Cleared:');
        console.log('   - All other transactions');
        console.log('   - All other shipments');
        console.log('   - All notifications');
        console.log('   - Reset wallet balances and courier stats');
        
    } catch (error) {
        console.error('❌ Database cleanup failed:', error);
        throw error;
    } finally {
        await db.destroy();
    }
}

// Run cleanup if called directly
if (require.main === module) {
    cleanupDatabase()
        .then(() => {
            console.log('🎉 Cleanup script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Cleanup script failed:', error);
            process.exit(1);
        });
}

module.exports = cleanupDatabase;
