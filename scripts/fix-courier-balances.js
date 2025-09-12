#!/usr/bin/env node

// Script to fix courier balance calculations
// This will recalculate all courier balances from their transactions

import { knex } from '../server/db.js';

async function fixCourierBalances() {
    console.log('🔧 Fixing courier balance calculations...');
    
    try {
        // Get all couriers who have stats
        const courierStats = await knex('courier_stats').select('*');
        console.log(`📊 Found ${courierStats.length} courier stats to check`);
        
        for (const stats of courierStats) {
            console.log(`\n👤 Processing courier ID: ${stats.courierId}`);
            
            // Get all transactions for this courier
            const transactions = await knex('courier_transactions')
                .where({ courierId: stats.courierId })
                .select('*');
            
            console.log(`  📋 Found ${transactions.length} transactions`);
            
            // Calculate balance from transactions
            const calculatedBalance = transactions.reduce((sum, transaction) => {
                const amount = Number(transaction.amount) || 0;
                console.log(`    💰 Transaction: ${transaction.type} = ${amount}`);
                return sum + amount;
            }, 0);
            
            console.log(`  🏦 Current stored balance: ${stats.currentBalance}`);
            console.log(`  🧮 Calculated balance: ${calculatedBalance}`);
            
            if (Math.abs(Number(stats.currentBalance) - calculatedBalance) > 0.01) {
                console.log(`  ⚠️  Balance mismatch! Updating...`);
                
                // Update the courier stats with correct balance
                await knex('courier_stats')
                    .where({ courierId: stats.courierId })
                    .update({ 
                        currentBalance: calculatedBalance,
                        totalEarnings: Math.max(calculatedBalance, stats.totalEarnings || 0) // Ensure totalEarnings is at least the current balance
                    });
                
                console.log(`  ✅ Updated balance to ${calculatedBalance}`);
            } else {
                console.log(`  ✅ Balance is correct`);
            }
        }
        
        console.log('\n🎉 Courier balance fix completed!');
        
    } catch (error) {
        console.error('❌ Error fixing courier balances:', error);
        throw error;
    } finally {
        await knex.destroy();
    }
}

// Run the script
fixCourierBalances()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
