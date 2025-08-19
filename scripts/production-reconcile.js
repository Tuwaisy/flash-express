#!/usr/bin/env node

// Production Balance Reconciliation Script for Railway
// This script recalculates courier balances from transactions and updates the stored values

const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

// Temporary express server to run reconciliation
const app = express();
app.use(cors());
app.use(express.json());

const DATABASE_PUBLIC_URL = "postgresql://postgres:JIpLoPURlVZNLAauxlookUezQnSVjQmM@caboose.proxy.rlwy.net:35688/railway";

async function reconcileBalances() {
    const client = new Client({ 
        connectionString: DATABASE_PUBLIC_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to production database');

        // Get all courier transactions and calculate correct balances
        console.log('\n🧮 Calculating correct balances from transactions...');
        const transactionsResult = await client.query(`
            SELECT "courierId", type, amount, status
            FROM courier_transactions 
            WHERE status != 'Declined'
            ORDER BY "courierId", timestamp
        `);

        const balancesByCourier = {};
        transactionsResult.rows.forEach(row => {
            const courierId = row.courierId;
            const amount = parseFloat(row.amount) || 0;
            
            if (!balancesByCourier[courierId]) {
                balancesByCourier[courierId] = 0;
            }
            
            balancesByCourier[courierId] += amount;
        });

        console.log('Calculated balances:');
        Object.entries(balancesByCourier).forEach(([courierId, balance]) => {
            console.log(`Courier ${courierId}: ${balance.toFixed(2)} EGP`);
        });

        // Update courier_stats table with correct balances
        console.log('\n💾 Updating courier_stats table...');
        for (const [courierId, correctBalance] of Object.entries(balancesByCourier)) {
            await client.query(`
                UPDATE courier_stats 
                SET "currentBalance" = $1 
                WHERE "courierId" = $2
            `, [correctBalance, parseInt(courierId)]);
            
            console.log(`✅ Updated courier ${courierId} balance to ${correctBalance.toFixed(2)} EGP`);
        }

        // Check and fix client wallet balances
        console.log('\n💳 Checking client wallet balances...');
        const clientTransactionsResult = await client.query(`
            SELECT "userId", amount
            FROM client_transactions 
            ORDER BY "userId", timestamp
        `);

        const clientBalances = {};
        clientTransactionsResult.rows.forEach(row => {
            const userId = row.userId;
            const amount = parseFloat(row.amount) || 0;
            
            if (!clientBalances[userId]) {
                clientBalances[userId] = 0;
            }
            
            clientBalances[userId] += amount;
        });

        console.log('Client wallet balances (calculated from transactions):');
        Object.entries(clientBalances).forEach(([userId, balance]) => {
            console.log(`Client ${userId}: ${balance.toFixed(2)} EGP`);
        });

        // Check for multiple pending payouts
        console.log('\n⏳ Checking for multiple pending payouts...');
        const pendingPayouts = await client.query(`
            SELECT "courierId", COUNT(*) as pending_count
            FROM courier_transactions 
            WHERE type = 'Withdrawal Request' AND status = 'Pending'
            GROUP BY "courierId"
            HAVING COUNT(*) > 1
        `);

        if (pendingPayouts.rows.length > 0) {
            console.log('⚠️  Found couriers with multiple pending payouts:');
            pendingPayouts.rows.forEach(row => {
                console.log(`Courier ${row.courierId}: ${row.pending_count} pending payouts`);
            });
        } else {
            console.log('✅ No multiple pending payout issues found');
        }

        console.log('\n✅ Balance reconciliation complete!');

    } catch (error) {
        console.error('❌ Error during reconciliation:', error.message);
    } finally {
        await client.end();
    }
}

// Create API endpoint for reconciliation
app.post('/api/reconcile-balances', async (req, res) => {
    try {
        await reconcileBalances();
        res.json({ success: true, message: 'Balance reconciliation completed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Reconciliation service running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Reconciliation service running on port ${PORT}`);
    console.log(`Call POST /api/reconcile-balances to run reconciliation`);
    
    // Auto-run reconciliation on startup
    setTimeout(reconcileBalances, 1000);
});

module.exports = { reconcileBalances };
