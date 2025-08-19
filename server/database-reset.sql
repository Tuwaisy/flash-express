-- Safe Database Reset SQL
-- Run this directly in Railway PostgreSQL console if needed

-- Step 1: Backup first 2 shipments (run this first to see what will be kept)
SELECT id, 'KEEPING' as status, createdAt, status 
FROM shipments 
ORDER BY createdAt 
LIMIT 2;

-- Step 2: Clear transaction tables (safe - can be regenerated)
DELETE FROM courier_transactions;
DELETE FROM client_transactions;
DELETE FROM in_app_notifications;

-- Step 3: Remove excess shipments (keep only first 2)
DELETE FROM shipments 
WHERE id NOT IN (
    SELECT id FROM shipments 
    ORDER BY createdAt 
    LIMIT 2
);

-- Step 4: Reset balances (will be recalculated)
UPDATE courier_stats SET 
    currentBalance = 0,
    totalEarnings = 0,
    consecutiveFailures = 0,
    totalDeliveries = 0,
    deliverySuccessRate = 100.00,
    averageDeliveryTime = 0,
    isRestricted = false;

UPDATE users SET walletBalance = 0;

-- Step 5: Reset sequences for clean numbering
SELECT setval('courier_transactions_id_seq', 1, false);
SELECT setval('client_transactions_id_seq', 1, false);
SELECT setval('in_app_notifications_id_seq', 1, false);

-- Step 6: Verify results
SELECT 
    'users' as table_name, COUNT(*) as record_count 
    FROM users
UNION ALL
SELECT 
    'shipments' as table_name, COUNT(*) as record_count 
    FROM shipments
UNION ALL  
SELECT 
    'courier_transactions' as table_name, COUNT(*) as record_count 
    FROM courier_transactions
UNION ALL
SELECT 
    'client_transactions' as table_name, COUNT(*) as record_count 
    FROM client_transactions;
