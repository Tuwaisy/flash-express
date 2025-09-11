#!/usr/bin/env node

// Script to update Railway PostgreSQL database with latest schema and features
// This will run the database migrations and ensure all new features are available

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function updateRailwayDatabase() {
    console.log('🚂 Railway Database Update Script');
    console.log('═══════════════════════════════════');
    
    // Get database URL from environment variable
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable not found!');
        console.log('💡 Get your DATABASE_URL from Railway:');
        console.log('   1. Run: railway login');
        console.log('   2. Run: railway link 4a13f477-87b2-4d0f-b2ac-2d35107882fd');
        console.log('   3. Run: railway variables');
        console.log('   4. Copy the DATABASE_URL value');
        console.log('   5. Run: export DATABASE_URL="your_database_url"');
        console.log('   6. Run: node scripts/update-railway-db.js');
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
        
        console.log('🔧 Checking and updating database schema...');
        
        // Step 1: Check if partnerTier column exists in users table
        console.log('📊 Checking partner tier columns...');
        const partnerTierExists = await checkColumnExists(client, 'users', 'partnerTier');
        const manualTierExists = await checkColumnExists(client, 'users', 'manualTierAssignment');
        
        if (!partnerTierExists) {
            console.log('➕ Adding partnerTier column...');
            await client.query('ALTER TABLE users ADD COLUMN "partnerTier" VARCHAR');
            console.log('✅ Added partnerTier column');
        } else {
            console.log('✅ partnerTier column already exists');
        }
        
        if (!manualTierExists) {
            console.log('➕ Adding manualTierAssignment column...');
            await client.query('ALTER TABLE users ADD COLUMN "manualTierAssignment" BOOLEAN DEFAULT false');
            console.log('✅ Added manualTierAssignment column');
        } else {
            console.log('✅ manualTierAssignment column already exists');
        }
        
        // Step 2: Check and create tier_settings table
        console.log('📊 Checking tier_settings table...');
        const tierTableExists = await checkTableExists(client, 'tier_settings');
        
        if (!tierTableExists) {
            console.log('➕ Creating tier_settings table...');
            await client.query(`
                CREATE TABLE tier_settings (
                    "tierName" VARCHAR PRIMARY KEY,
                    "shipmentThreshold" INTEGER NOT NULL,
                    "discountPercentage" DECIMAL(5,2) NOT NULL
                )
            `);
            
            // Seed tier settings
            console.log('🌱 Seeding tier settings...');
            await client.query(`
                INSERT INTO tier_settings ("tierName", "shipmentThreshold", "discountPercentage") VALUES
                ('Bronze', 50, 2.0),
                ('Silver', 150, 10.0),
                ('Gold', 300, 15.0)
            `);
            console.log('✅ Created and seeded tier_settings table');
        } else {
            console.log('✅ tier_settings table already exists');
            
            // Update existing tier settings to ensure they're current
            console.log('🔄 Updating tier settings...');
            await client.query(`
                INSERT INTO tier_settings ("tierName", "shipmentThreshold", "discountPercentage") VALUES
                ('Bronze', 50, 2.0),
                ('Silver', 150, 10.0),
                ('Gold', 300, 15.0)
                ON CONFLICT ("tierName") DO UPDATE SET
                "shipmentThreshold" = EXCLUDED."shipmentThreshold",
                "discountPercentage" = EXCLUDED."discountPercentage"
            `);
            console.log('✅ Updated tier settings');
        }
        
        // Step 3: Initialize existing client users with tier settings
        console.log('👥 Initializing client users with tier settings...');
        const clientsToUpdate = await client.query(`
            SELECT id, name, roles FROM users 
            WHERE "partnerTier" IS NULL 
            AND (roles::text LIKE '%Client%' OR roles @> '"Client"'::jsonb)
        `);
        
        if (clientsToUpdate.rows.length > 0) {
            console.log(`📝 Found ${clientsToUpdate.rows.length} client(s) to initialize`);
            for (const user of clientsToUpdate.rows) {
                await client.query(`
                    UPDATE users 
                    SET "partnerTier" = NULL, "manualTierAssignment" = false
                    WHERE id = $1
                `, [user.id]);
            }
            console.log('✅ Initialized client users with tier settings');
        } else {
            console.log('✅ No client users need tier initialization');
        }
        
        // Step 4: Check walletBalance column
        console.log('💰 Checking walletBalance column...');
        const walletBalanceExists = await checkColumnExists(client, 'users', 'walletBalance');
        
        if (!walletBalanceExists) {
            console.log('➕ Adding walletBalance column...');
            await client.query('ALTER TABLE users ADD COLUMN "walletBalance" DECIMAL(10,2) DEFAULT 0');
            console.log('✅ Added walletBalance column');
        } else {
            console.log('✅ walletBalance column already exists');
        }
        
        // Step 5: Verify all tables and structure
        console.log('🔍 Verifying database structure...');
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📋 Current tables:');
        tables.rows.forEach(row => {
            console.log(`   • ${row.table_name}`);
        });
        
        // Step 6: Show current tier configuration
        console.log('⚙️ Current tier configuration:');
        const tierSettings = await client.query('SELECT * FROM tier_settings ORDER BY "shipmentThreshold"');
        tierSettings.rows.forEach(tier => {
            console.log(`   • ${tier.tierName}: ${tier.shipmentThreshold}+ shipments (${tier.discountPercentage}% discount)`);
        });
        
        console.log('');
        console.log('🎉 Railway database updated successfully!');
        console.log('📊 New features available:');
        console.log('   • Partnership tier system (Bronze, Silver, Gold)');
        console.log('   • Client analytics with tier information');
        console.log('   • Automatic tier assignment based on shipment count');
        console.log('   • Enhanced wallet balance tracking');
        console.log('');
        console.log('🚀 Next steps:');
        console.log('   1. Redeploy your application: railway up');
        console.log('   2. Test the tier system with clients who have 50+ shipments');
        console.log('   3. Monitor client analytics for tier assignments');
        
    } catch (error) {
        console.error('❌ Error updating Railway database:', error.message);
        
        if (error.message.includes('connect')) {
            console.log('');
            console.log('💡 Connection troubleshooting:');
            console.log('   1. Verify DATABASE_URL is correct');
            console.log('   2. Check Railway database is running');
            console.log('   3. Ensure SSL connection is allowed');
            console.log('   4. Try: railway logs to see if database is healthy');
        }
        
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

// Helper function to check if table exists
async function checkTableExists(client, tableName) {
    const result = await client.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
        )
    `, [tableName]);
    return result.rows[0].exists;
}

// Helper function to check if column exists
async function checkColumnExists(client, tableName, columnName) {
    const result = await client.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = $2
        )
    `, [tableName, columnName]);
    return result.rows[0].exists;
}

// Handle script execution
if (require.main === module) {
    updateRailwayDatabase().catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

module.exports = { updateRailwayDatabase };
