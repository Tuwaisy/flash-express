#!/usr/bin/env node

// Script to fix client wallet balance calculations
// This will recalculate all client balances from their transactions

import { knex } from '../server/db.js';

async function fixClientBalances() {
    console.log('🔧 Fixing client wallet balance calculations...');
    
    try {
        // Get all clients (users with client role)
        const clients = await knex('users')
            .whereRaw("JSON_EXTRACT(roles, '$') LIKE '%Client%' OR roles LIKE '%Client%'")
            .select('*');
        
        console.log(`📊 Found ${clients.length} clients to check`);
        
        for (const client of clients) {
            console.log(`\n👤 Processing client: ${client.name} (ID: ${client.id})`);
            
            // Get all transactions for this client
            const transactions = await knex('client_transactions')
                .where({ userId: client.id })
                .select('*');
            
            console.log(`  📋 Found ${transactions.length} transactions`);
            
            // Calculate balance from transactions
            const calculatedBalance = transactions.reduce((sum, transaction) => {
                const amount = Number(transaction.amount) || 0;
                console.log(`    💰 Transaction: ${transaction.type} = ${amount} (${transaction.description || 'No description'})`);
                return sum + amount;
            }, 0);
            
            console.log(`  🏦 Current stored balance: ${client.walletBalance || 'NULL'}`);
            console.log(`  🧮 Calculated balance: ${calculatedBalance}`);
            
            // Note: We don't store wallet balance in users table anymore, it's calculated on frontend
            // But let's verify the transactions are correct
            
            if (transactions.length === 0) {
                console.log(`  ⚠️  No transactions found for client`);
            } else {
                console.log(`  ✅ Client has ${transactions.length} transactions totaling ${calculatedBalance.toFixed(2)} EGP`);
            }
        }
        
        console.log('\n🎉 Client balance check completed!');
        console.log('💡 Note: Client balances are calculated real-time from transactions on the frontend');
        
        } finally {
            await knex.destroy();
        }
    }

    // Run the script
    fixClientBalances()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
