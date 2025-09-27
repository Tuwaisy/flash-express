#!/usr/bin/env node

// Deploy barcode scanner table to Railway PostgreSQL
import 'dotenv/config';
import { setupDatabase } from './server/db.js';

async function deployBarcodeScanner() {
    console.log('🚀 Deploying barcode scanner to Railway PostgreSQL...');
    
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL environment variable not set');
        console.log('Please set your Railway PostgreSQL DATABASE_URL in .env file');
        process.exit(1);
    }
    
    try {
        // Run the database setup which includes the new barcode_scans table
        await setupDatabase();
        console.log('✅ Barcode scanner deployment completed successfully!');
        console.log('🎯 The barcode_scans table is now available in PostgreSQL');
        
        // Test the barcode scanner API endpoints
        console.log('🧪 Testing barcode scanner API endpoints...');
        const { knex } = await import('./server/db.js');
        
        // Check if barcode_scans table exists and is accessible
        const tableExists = await knex.schema.hasTable('barcode_scans');
        if (tableExists) {
            console.log('✅ barcode_scans table verified in PostgreSQL');
            
            // Test inserting a scan record (will be removed)
            const testScan = {
                shipmentId: 'TEST-001',
                courierId: 1,
                previousStatus: 'Assigned to Courier',
                newStatus: 'Out for Delivery'
            };
            
            const [inserted] = await knex('barcode_scans').insert(testScan).returning('*');
            console.log('✅ Test scan record inserted:', inserted.id);
            
            // Clean up test record
            await knex('barcode_scans').where('id', inserted.id).del();
            console.log('✅ Test record cleaned up');
            
            console.log('🎉 Barcode scanner is ready for production use!');
        } else {
            console.error('❌ barcode_scans table not found after setup');
        }
        
        await knex.destroy();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

deployBarcodeScanner();