#!/usr/bin/env node

// Railway PostgreSQL Connection Test Script
const pg = require('pg');
const { Client } = pg;

const DATABASE_URL = "postgresql://postgres:JIpLoPURlVZNLAauxlookUezQnSVjQmM@postgres.railway.internal:5432/railway";

async function testRailwayConnection() {
    console.log('🚂 Testing Railway PostgreSQL Connection...\n');
    console.log('🔗 Database URL:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
    
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        query_timeout: 10000,
        statement_timeout: 10000
    });

    try {
        console.log('🔌 Attempting to connect...');
        await client.connect();
        console.log('✅ Successfully connected to Railway PostgreSQL!\n');

        // Test 1: Basic connection test
        console.log('🧪 Test 1: Basic query test...');
        const versionResult = await client.query('SELECT version() as version, current_database() as database');
        console.log('✅ Database:', versionResult.rows[0].database);
        console.log('✅ PostgreSQL Version:', versionResult.rows[0].version.split(' ')[0] + ' ' + versionResult.rows[0].version.split(' ')[1]);

        // Test 2: Check existing tables
        console.log('\n🧪 Test 2: Checking database schema...');
        const tablesResult = await client.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        if (tablesResult.rows.length === 0) {
            console.log('⚠️  No tables found - Database is empty and needs initialization');
        } else {
            console.log('✅ Found tables:');
            tablesResult.rows.forEach(table => {
                console.log(`   - ${table.table_name} (${table.table_type})`);
            });
        }

        // Test 3: Check for Shuhna Express specific tables
        console.log('\n🧪 Test 3: Checking Shuhna Express tables...');
        const expectedTables = ['users', 'shipments', 'courier_stats', 'inventory_items', 'shipment_counters'];
        const existingTables = tablesResult.rows.map(r => r.table_name);
        
        expectedTables.forEach(expectedTable => {
            if (existingTables.includes(expectedTable)) {
                console.log(`   ✅ ${expectedTable} - exists`);
            } else {
                console.log(`   ❌ ${expectedTable} - missing`);
            }
        });

        // Test 4: Check data if tables exist
        if (existingTables.includes('users')) {
            console.log('\n🧪 Test 4: Checking data...');
            
            const usersCount = await client.query('SELECT COUNT(*) as count FROM users');
            console.log(`   👤 Users: ${usersCount.rows[0].count}`);
            
            if (existingTables.includes('shipments')) {
                const shipmentsCount = await client.query('SELECT COUNT(*) as count FROM shipments');
                console.log(`   📦 Shipments: ${shipmentsCount.rows[0].count}`);
            }
            
            if (existingTables.includes('inventory_items')) {
                const inventoryCount = await client.query('SELECT COUNT(*) as count FROM inventory_items');
                console.log(`   📋 Inventory Items: ${inventoryCount.rows[0].count}`);
            }

            // Check if admin user exists
            const adminCheck = await client.query("SELECT id, email, roles FROM users WHERE email LIKE '%admin%' OR roles LIKE '%Administrator%' LIMIT 1");
            if (adminCheck.rows.length > 0) {
                console.log(`   👑 Admin user found: ${adminCheck.rows[0].email}`);
            } else {
                console.log(`   ⚠️  No admin user found`);
            }
        }

        // Test 5: Test write capabilities
        console.log('\n🧪 Test 5: Testing write capabilities...');
        try {
            await client.query('CREATE TABLE IF NOT EXISTS connection_test (id SERIAL PRIMARY KEY, test_time TIMESTAMP DEFAULT NOW())');
            await client.query('INSERT INTO connection_test DEFAULT VALUES');
            const testResult = await client.query('SELECT COUNT(*) as count FROM connection_test');
            console.log(`   ✅ Write test successful - ${testResult.rows[0].count} test records`);
            await client.query('DROP TABLE connection_test');
            console.log(`   ✅ Cleanup successful`);
        } catch (writeError) {
            console.log(`   ❌ Write test failed: ${writeError.message}`);
        }

        console.log('\n🎉 Connection test completed successfully!');
        
        // Recommendations
        console.log('\n📋 RECOMMENDATIONS:');
        if (tablesResult.rows.length === 0) {
            console.log('   1. Database is empty - deploy your application to initialize schema');
            console.log('   2. Set DATABASE_URL environment variable in Railway backend service');
            console.log('   3. Set NODE_ENV=production in Railway backend service');
        } else if (!existingTables.includes('users') || !existingTables.includes('shipments')) {
            console.log('   1. Some Shuhna Express tables are missing');
            console.log('   2. Redeploy your application to run database setup');
        } else {
            console.log('   ✅ Database appears to be properly set up!');
            console.log('   ✅ Ready for application deployment');
        }

    } catch (error) {
        console.error('\n❌ Connection test failed!');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        
        console.log('\n🔧 TROUBLESHOOTING STEPS:');
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log('   1. Check if PostgreSQL service is running in Railway');
            console.log('   2. Verify the database URL is correct');
            console.log('   3. Ensure you\'re running this from Railway environment or with proper network access');
        } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            console.log('   1. Network connectivity issue - check Railway service status');
            console.log('   2. Try running this script from Railway environment');
        } else if (error.message.includes('authentication')) {
            console.log('   1. Database credentials are incorrect');
            console.log('   2. Get fresh DATABASE_URL from Railway PostgreSQL service');
        } else {
            console.log('   1. Unknown error - check Railway logs');
            console.log('   2. Verify PostgreSQL service is healthy');
        }
        
    } finally {
        try {
            await client.end();
            console.log('\n🔌 Database connection closed');
        } catch (closeError) {
            console.log('\n⚠️  Error closing connection:', closeError.message);
        }
    }
}

// Add proper error handling for the script
process.on('unhandledRejection', (reason, promise) => {
    console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('\n💥 Uncaught Exception:', error);
    process.exit(1);
});

testRailwayConnection();
