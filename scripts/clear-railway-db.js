#!/usr/bin/env node

// Script to clear Railway PostgreSQL database for testing
// Run this script to clear all orders and related data from production

const { Client } = require('pg');

async function clearRailwayDatabase() {
    console.log('🚂 Connecting to Railway PostgreSQL database...');
    
    // Get database URL from environment variable
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable not found!');
        console.log('💡 Make sure to set DATABASE_URL before running this script:');
        console.log('   export DATABASE_URL="your_railway_postgres_url"');
        console.log('   node scripts/clear-railway-db.js');
        process.exit(1);
    }

    const client = new Client({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false // Railway requires SSL
        }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Railway PostgreSQL database');
        
        console.log('🗑️ Clearing all orders and related data...');
        
        // Delete in proper order to avoid foreign key constraints
        await client.query('DELETE FROM client_transactions');
        console.log('✅ Cleared client_transactions');
        
        await client.query('DELETE FROM courier_transactions'); 
        console.log('✅ Cleared courier_transactions');
        
        await client.query('DELETE FROM courier_stats');
        console.log('✅ Cleared courier_stats');
        
        await client.query('DELETE FROM in_app_notifications');
        console.log('✅ Cleared in_app_notifications');
        
        await client.query('DELETE FROM shipments');
        console.log('✅ Cleared shipments');
        
        // Reset auto-increment sequences if needed
        await client.query('ALTER SEQUENCE IF EXISTS shipments_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE IF EXISTS client_transactions_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE IF EXISTS courier_transactions_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE IF EXISTS courier_stats_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE IF EXISTS in_app_notifications_id_seq RESTART WITH 1');
        console.log('✅ Reset ID sequences');
        
        console.log('');
        console.log('🎉 Railway PostgreSQL database cleared successfully!');
        console.log('💡 Database is now ready for fresh testing of:');
        console.log('   • Order creation');
        console.log('   • Client wallet transactions');
        console.log('   • Courier wallet transactions');
        console.log('   • All shipment functionality');
        
    } catch (error) {
        console.error('❌ Error clearing Railway database:', error.message);
        
        if (error.message.includes('connect')) {
            console.log('');
            console.log('💡 Connection troubleshooting:');
            console.log('   1. Verify DATABASE_URL is correct');
            console.log('   2. Check Railway database is running');
            console.log('   3. Ensure SSL connection is allowed');
        }
        
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

// Handle script execution
if (require.main === module) {
    clearRailwayDatabase().catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

module.exports = { clearRailwayDatabase };
