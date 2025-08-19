// Simple database cleanup endpoint - accessible via API call
// This will be added to server.js as a temporary debug endpoint

// Add this to server.js after other debug endpoints:

app.delete('/api/debug/cleanup-database', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        // Only allow in development or with special authorization
        return res.status(403).json({ error: 'Not allowed in production without authorization' });
    }
    
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
            
            // Delete shipments beyond first 2
            const deletedShipments = await trx('shipments')
                .whereNotIn('id', shipmentIds)
                .del();
            console.log(`📦 Deleted ${deletedShipments} shipments`);
            
            // Delete courier transactions not related to kept shipments
            const deletedCourierTxn = await trx('courier_transactions')
                .where(function() {
                    shipmentIds.forEach(id => {
                        this.orWhere('description', 'not like', `%${id}%`);
                    });
                })
                .del();
            console.log(`💰 Deleted ${deletedCourierTxn} courier transactions`);
            
            // Delete client transactions not related to kept shipments  
            const deletedClientTxn = await trx('client_transactions')
                .where(function() {
                    shipmentIds.forEach(id => {
                        this.orWhere('description', 'not like', `%${id}%`);
                    });
                })
                .del();
            console.log(`🧾 Deleted ${deletedClientTxn} client transactions`);
            
            // Reset all courier stats
            await trx('courier_stats').update({
                currentBalance: 0,
                totalEarnings: 0,
                consecutiveFailures: 0,
                totalDeliveries: 0
            });
            console.log('👤 Reset courier stats');
            
            // Reset all user wallet balances
            await trx('users').update({ walletBalance: 0 });
            console.log('💰 Reset user wallet balances');
            
            // Clear notifications
            await trx('in_app_notifications').del();
            console.log('🔔 Cleared notifications');
        });
        
        console.log('✅ Database cleanup completed');
        res.json({ 
            success: true, 
            message: 'Database cleaned - kept first 2 shipments, reset all balances' 
        });
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        res.status(500).json({ error: error.message });
    }
});
