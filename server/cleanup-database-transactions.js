// Database cleanup script - Remove all transactions except those for first and second shipments
// Keep all users intact

import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
});

async function cleanupDatabase() {
    try {
        console.log('🧹 Starting database cleanup...');
        
        // Get the first and second shipments to preserve their transactions
        const shipmentsToKeep = await db('shipments')
            .select('id')
            .orderBy('createdAt')
            .limit(2);
            
        console.log('📦 Shipments to keep:', shipmentsToKeep.map(s => s.id));
        
        if (shipmentsToKeep.length < 2) {
            console.log('⚠️  Warning: Less than 2 shipments found. Keeping all existing shipments.');
        }
        
        const shipmentIdsToKeep = shipmentsToKeep.map(s => s.id);
        
        // Start transaction for cleanup
        await db.transaction(async (trx) => {
            // 1. Get transaction IDs that should be preserved (related to first 2 shipments)
            const transactionsToKeep = await trx('courier_transactions')
                .select('id')
                .where(function() {
                    this.whereIn('description', shipmentIdsToKeep.map(id => `Commission for shipment ${id}`))
                        .orWhereIn('description', shipmentIdsToKeep.map(id => `Referral bonus for shipment ${id}`));
                });
                
            const transactionIdsToKeep = transactionsToKeep.map(t => t.id);
            console.log('💰 Courier transactions to keep:', transactionIdsToKeep.length);
            
            // 2. Get client transaction IDs to preserve (related to first 2 shipments) 
            const clientTransactionsToKeep = await trx('client_transactions')
                .select('id')
                .where(function() {
                    this.whereIn('description', shipmentIdsToKeep.map(id => `Shipping fee for delivered shipment ${id}`))
                        .orWhereIn('description', shipmentIdsToKeep.map(id => `Payment for shipment ${id}`));
                });
                
            const clientTransactionIdsToKeep = clientTransactionsToKeep.map(t => t.id);
            console.log('🧾 Client transactions to keep:', clientTransactionIdsToKeep.length);
            
            // 3. Remove courier transactions not related to first 2 shipments
            const deletedCourierTransactions = await trx('courier_transactions')
                .whereNotIn('id', transactionIdsToKeep)
                .del();
            console.log(`🗑️  Deleted ${deletedCourierTransactions} courier transactions`);
            
            // 4. Remove client transactions not related to first 2 shipments
            const deletedClientTransactions = await trx('client_transactions')
                .whereNotIn('id', clientTransactionIdsToKeep)
                .del();
            console.log(`🗑️  Deleted ${deletedClientTransactions} client transactions`);
            
            // 5. Remove shipments beyond the first 2
            const deletedShipments = await trx('shipments')
                .whereNotIn('id', shipmentIdsToKeep)
                .del();
            console.log(`📦 Deleted ${deletedShipments} shipments`);
            
            // 6. Reset courier stats balances to 0 and let the system recalculate
            const updatedCourierStats = await trx('courier_stats')
                .update({ 
                    currentBalance: 0,
                    totalEarnings: 0,
                    consecutiveFailures: 0,
                    totalDeliveries: 0
                });
            console.log(`👤 Reset ${updatedCourierStats} courier stats`);
            
            // 7. Reset user wallet balances to 0 and let the system recalculate
            const updatedUsers = await trx('users')
                .update({ walletBalance: 0 });
            console.log(`💰 Reset ${updatedUsers} user wallet balances`);
            
            // 8. Remove all in-app notifications (they'll be outdated)
            const deletedNotifications = await trx('in_app_notifications').del();
            console.log(`🔔 Deleted ${deletedNotifications} in-app notifications`);
            
            console.log('✅ Database cleanup completed successfully!');
        });
        
    } catch (error) {
        console.error('❌ Database cleanup failed:', error);
        throw error;
    } finally {
        await db.destroy();
    }
}

// Run cleanup
cleanupDatabase()
    .then(() => {
        console.log('🎉 Cleanup script completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Cleanup script failed:', error);
        process.exit(1);
    });
