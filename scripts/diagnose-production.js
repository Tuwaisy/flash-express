#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:BKwMNWEVQEhJHHNDZPPrYkQVHUOmwGOa@roundhouse.proxy.rlwy.net:43533/railway";

async function diagnoseProduction() {
    const client = new Client({ 
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to production database');

        // Check courier stats table
        console.log('\n🔍 Checking courier stats...');
        const courierStatsResult = await client.query(`
            SELECT cs.*, u.name as courier_name 
            FROM courier_stats cs 
            JOIN users u ON cs."courierId" = u.id
            ORDER BY cs."courierId"
        `);
        
        console.log('Courier Stats:');
        courierStatsResult.rows.forEach(row => {
            console.log(`${row.courier_name} (ID: ${row.courierId}): Balance=${row.currentBalance}, TotalEarnings=${row.totalEarnings}`);
        });

        // Check courier transactions 
        console.log('\n💰 Checking courier transactions...');
        const courierTransactionsResult = await client.query(`
            SELECT ct.*, u.name as courier_name 
            FROM courier_transactions ct 
            JOIN users u ON ct."courierId" = u.id
            ORDER BY ct."courierId", ct.timestamp DESC
        `);
        
        console.log('Recent Courier Transactions:');
        courierTransactionsResult.rows.slice(0, 10).forEach(row => {
            console.log(`${row.courier_name}: ${row.type} ${row.amount} EGP on ${new Date(row.timestamp).toLocaleDateString()}`);
        });

        // Calculate actual balance from transactions
        console.log('\n🧮 Calculating balances from transactions...');
        const transactionsByCourier = {};
        courierTransactionsResult.rows.forEach(row => {
            if (!transactionsByCourier[row.courierId]) {
                transactionsByCourier[row.courierId] = {
                    name: row.courier_name,
                    total: 0,
                    transactions: []
                };
            }
            const amount = parseFloat(row.amount) || 0;
            transactionsByCourier[row.courierId].total += amount;
            transactionsByCourier[row.courierId].transactions.push(row);
        });

        console.log('Calculated balances from transactions:');
        Object.entries(transactionsByCourier).forEach(([courierId, data]) => {
            const storedBalance = courierStatsResult.rows.find(r => r.courierId == courierId)?.currentBalance || 0;
            console.log(`${data.name}: Calculated=${data.total.toFixed(2)}, Stored=${storedBalance}, Diff=${(data.total - storedBalance).toFixed(2)}`);
        });

        // Check client transactions
        console.log('\n💳 Checking client transactions...');
        const clientTransactionsResult = await client.query(`
            SELECT ct.*, u.name as client_name 
            FROM client_transactions ct 
            JOIN users u ON ct."userId" = u.id
            ORDER BY ct."userId", ct.timestamp DESC
        `);
        
        console.log('Recent Client Transactions:');
        clientTransactionsResult.rows.slice(0, 10).forEach(row => {
            console.log(`${row.client_name}: ${row.type} ${row.amount} EGP on ${new Date(row.timestamp).toLocaleDateString()}`);
        });

        // Calculate client wallet balances from transactions
        console.log('\n🧮 Calculating client wallet balances...');
        const clientBalances = {};
        clientTransactionsResult.rows.forEach(row => {
            if (!clientBalances[row.userId]) {
                clientBalances[row.userId] = {
                    name: row.client_name,
                    total: 0
                };
            }
            const amount = parseFloat(row.amount) || 0;
            clientBalances[row.userId].total += amount;
        });

        console.log('Client wallet balances:');
        Object.entries(clientBalances).forEach(([userId, data]) => {
            console.log(`${data.name}: ${data.total.toFixed(2)} EGP`);
        });

        // Check for pending payout requests
        console.log('\n⏳ Checking pending courier payouts...');
        const pendingPayouts = await client.query(`
            SELECT ct.*, u.name as courier_name 
            FROM courier_transactions ct 
            JOIN users u ON ct."courierId" = u.id
            WHERE ct.type = 'Withdrawal Request' AND ct.status = 'Pending'
            ORDER BY ct.timestamp DESC
        `);
        
        console.log('Pending Payout Requests:');
        pendingPayouts.rows.forEach(row => {
            console.log(`${row.courier_name}: ${Math.abs(row.amount)} EGP (${row.paymentMethod}) - ${new Date(row.timestamp).toLocaleDateString()}`);
        });

        console.log('\n✅ Diagnosis complete');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

diagnoseProduction();
