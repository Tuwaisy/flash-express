#!/usr/bin/env node

// One-liner script to clear Railway database using Railway CLI
// This script uses Railway CLI to connect and clear the database directly

const { execSync } = require('child_process');

async function clearWithRailwayCLI() {
    console.log('🚂 Clearing Railway PostgreSQL database using Railway CLI...');
    
    try {
        // Check if Railway CLI is available
        execSync('railway --version', { stdio: 'pipe' });
        console.log('✅ Railway CLI found');
        
        // Execute the clear commands through Railway CLI
        const clearScript = `
const { Client } = require('pg');

async function clear() {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('🗑️ Clearing all orders and related data...');
    await client.query('DELETE FROM client_transactions');
    await client.query('DELETE FROM courier_transactions');
    await client.query('DELETE FROM courier_stats');
    await client.query('DELETE FROM in_app_notifications');
    await client.query('DELETE FROM shipments');
    await client.query('ALTER SEQUENCE IF EXISTS shipments_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS client_transactions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS courier_transactions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS courier_stats_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS in_app_notifications_id_seq RESTART WITH 1');
    console.log('🎉 Railway database cleared successfully!');
    await client.end();
}
clear().catch(console.error);
        `;
        
        console.log('🔗 Connecting to Railway and executing clear script...');
        
        // Use Railway CLI to run the script with database access
        execSync(`railway run node -e "${clearScript.replace(/"/g, '\\"')}"`, { 
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
    } catch (error) {
        if (error.message.includes('railway')) {
            console.log('');
            console.log('❌ Railway CLI not found or not linked to project');
            console.log('');
            console.log('🔧 Setup Railway CLI:');
            console.log('   npm install -g @railway/cli');
            console.log('   railway login');
            console.log('   railway link 4a13f477-87b2-4d0f-b2ac-2d35107882fd');
            console.log('');
            console.log('💡 Alternative: Use the manual script:');
            console.log('   node scripts/get-railway-db.js    # Get DATABASE_URL');
            console.log('   node scripts/clear-railway-db.js  # Clear database');
            
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

clearWithRailwayCLI();
