# 📋 Complete Data Flow Diagram

## Delivery Verification → Revenue Update → Dashboard Refresh

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: DELIVERY CODE VERIFICATION                                     │
└─────────────────────────────────────────────────────────────────────────┘

Frontend (Courier App)
  │
  └──> POST /api/shipments/:id/verify-delivery-code { code: "123456" }
       │
       └──> Backend Route (server/server.js:1796)
            │
            └──> verificationService.verifyDeliveryCode(shipmentId, code)
                 │
                 ├─ Lookup delivery_verifications record
                 ├─ Validate code matches
                 ├─ Check not expired
                 └─ Check not already verified


┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: TRANSACTION BEGINS (ACID - All or Nothing)                     │
└─────────────────────────────────────────────────────────────────────────┘

verification.js verifyDeliveryCode() → knex.transaction()
  │
  ├──── 2a. Mark delivery verified ────────────────────────────
  │    UPDATE delivery_verifications
  │    SET verified = true, verified_at = NOW
  │    WHERE shipmentId = ?
  │
  ├──── 2b. Update shipment to Delivered ────────────────────
  │    UPDATE shipments
  │    SET status = 'Delivered', 
  │        deliveryDate = NOW,
  │        statusHistory = (append record)
  │    WHERE id = ?
  │
  ├──── 2c. Process Courier Commission ──────────────────────
  │    IF courierId exists AND courier found in users:
  │      ├─ INSERT courier_transactions:
  │      │  - type: 'Commission'
  │      │  - amount: shipment.courierCommission
  │      │  - status: 'Processed'
  │      │  - shipmentId: ? (links back to delivery)
  │      │
  │      ├─ INSERT in_app_notifications (notify courier)
  │      │
  │      └─ UPDATE courier_stats:
  │         - consecutiveFailures = 0
  │
  ├──── 2d. Process Referral Bonus (if exists) ─────────────
  │    IF courier.referrerId is valid AND referrer found:
  │      ├─ INSERT courier_transactions:
  │      │  - type: 'Referral Bonus'
  │      │  - amount: 15 (fixed)
  │      │  - courierId: referrer.id
  │      │
  │      └─ INSERT in_app_notifications (notify referrer)
  │
  ├──── 2e. Recalculate Courier Wallet ──────────────────────
  │    SELECT SUM(amount) FROM courier_transactions
  │    WHERE courierId = ? AND status = 'Processed'
  │    AND type NOT IN ('Withdrawal Request', 'Withdrawal Declined')
  │    
  │    UPDATE courier_stats SET currentBalance = CalculatedSum
  │    UPDATE users SET walletBalance = CalculatedSum
  │
  ├──── 2f. Process Client Deposit ──────────────────────────
  │    CASE shipment.paymentMethod:
  │      COD: INSERT client_transactions:
  │            - Deposit: +packageValue
  │            - Payment: -clientFlatRateFee
  │      
  │      Transfer: INSERT client_transactions:
  │               - Deposit: +amountToCollect
  │      
  │      Wallet: INSERT client_transactions:
  │             - Deposit: +packageValue
  │
  ├──── 2g. Recalculate Client Wallet ───────────────────────
  │    SELECT SUM(amount) FROM client_transactions
  │    WHERE userId = client.id
  │    
  │    UPDATE users SET walletBalance = CalculatedSum
  │
  └──── TRANSACTION COMMITTED (all or nothing) ──────────────


┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: REAL-TIME NOTIFICATION                                         │
└─────────────────────────────────────────────────────────────────────────┘

After transaction success, Backend:
  │
  ├──> io.emit('data_updated', { shipmentId, type: 'shipment_delivered' })
  │    (broadcasts to all connected clients)
  │
  └──> throttledDataUpdate()
       └─> Refreshes /api/data cache on server
           (next fetch will get updated balances)


┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: CLIENT RECEIVES UPDATE                                         │
└─────────────────────────────────────────────────────────────────────────┘

Frontend Socket.IO Handler:
  │
  ├─ Receives: 'data_updated' event
  │
  └─> setTimeout(() => fetchAppData(), 500)
      (debounce 500ms - wait for other events)
      
      fetchAppData():
        │
        └──> GET /api/data (with fresh=false allows cache)
             │
             Backend processes:
               ├─ Fetch all shipments
               ├─ Fetch courier_transactions
               ├─ Recalculate each courier balance:
               │   SUM(transactions) for each courier
               │   Update DB if differs
               ├─ Fetch client_transactions
               ├─ Recalculate each client balance
               │   Update DB if differs
               └─ Cache result for 2 seconds
             │
             └──> Return updated state to frontend
                  │
                  ├─ Updated shipments with new status
                  ├─ Updated courierStats with new currentBalance
                  ├─ Updated users with new walletBalance
                  └─ Updated courierTransactions with commission
             │
             Frontend updates state:
               ├─ setShipments(newShipments)
               ├─ setCourierStats(newStats)
               ├─ setUsers(newUsers)
               └─ setCourierTransactions(newTransactions)


┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: DASHBOARD UPDATES                                              │
└─────────────────────────────────────────────────────────────────────────┘

React components re-render with new data:

Dashboard Component:
  │
  ├─ Calls getAdminFinancials() (if admin):
  │   ├─ Sums: clientFlatRateFee (✅ FIXED)
  │   │        (was: using price, now using actual fees earned)
  │   └─ Displays: "Total Revenue: 7,500 EGP" ✅ CORRECT
  │
  ├─ Calls getClientFinancials() (if client):
  │   ├─ Sums: packageValue (✅ FIXED)
  │   │        (was: packageValue - fee, now total collected)
  │   └─ Displays: "Total Collected: 50,000 EGP" ✅ CORRECT
  │
  └─ Renders live dashboards:
     ├─ Admin sees: Revenue, commission breakdown, courier earnings
     ├─ Courier sees: Current balance, today's earnings, total deliveries
     └─ Client sees: Total collections, delivered orders, wallet balance


┌─────────────────────────────────────────────────────────────────────────┐
│ SPECIAL CASE: Network Disconnect/Reconnect                            │
└─────────────────────────────────────────────────────────────────────────┘

Socket Event: 'reconnect' (triggered when connection restored)
  │
  └──> newSocket.on('reconnect', (attemptNumber) => {
       console.log(`Reconnected after ${attemptNumber} attempts`);
       
       setTimeout(() => {
         fetchAppData(true);  // ✅ FIXED: Force refresh (was: fetchSummary())
         // Forces fetch even if within throttle window
         // Ensures client gets any updates missed during disconnect
       }, 1000);
     });


┌─────────────────────────────────────────────────────────────────────────┐
│ SPECIAL CASE: Browser Page Refresh (Session Restore)                 │
└─────────────────────────────────────────────────────────────────────────┘

App Component mounts:
  │
  ├─ useEffect(() => {
  │    // Attempt to restore from JWT cookie
  │    GET /api/me
  │      └─ Server reads HttpOnly cookie
  │         Verifies JWT token
  │         Returns user if valid
  │
  │    If user found:
  │      ├─ setCurrentUser(user)
  │      ├─ fetchSummary() (lightweight initial load)
  │      └─ Socket connection established
  │      
  │    Socket then emits 'connect' event
  │      └─ fetchAppData() for full state
  │  }, [])


┌─────────────────────────────────────────────────────────────────────────┐
│ DATA CONSISTENCY CHECKS                                                │
└─────────────────────────────────────────────────────────────────────────┘

Every GET /api/data request:

1. Fetch all courier_transactions
2. For each courier:
   ├─ Calculate balance = SUM(transactions where status='Processed')
   ├─ Get stored balance from courier_stats
   ├─ If DIFFERENCE > 0.01:
   │   ├─ UPDATE courier_stats.currentBalance
   │   ├─ UPDATE users.walletBalance  
   │   └─ Log: "Corrected courier X balance: Y → Z"
   └─ Return calculated balance in response

3. Same for client_transactions and users.walletBalance

Result: Even if data gets out of sync, it auto-corrects on next fetch
        Balance always = SUM(transaction_ledger)


┌─────────────────────────────────────────────────────────────────────────┐
│ FLOW SUMMARY                                                           │
└─────────────────────────────────────────────────────────────────────────┘

DELIVERY CODE ENTERED
         ↓
    [VERIFICATION]
         ↓
   [COMMISSION CREATED] ← Uses shipment.courierCommission
         ↓
   [REFERRAL BONUS] ← If referrer exists
         ↓
   [BALANCES RECALCULATED] ← From transaction ledger
         ↓
   [SOCKET EVENT SENT] ← io.emit('data_updated')
         ↓
   [BROWSER RECEIVES] ← Socket listener triggers
         ↓
   [FETCH NEW DATA] ← GET /api/data with recalculation
         ↓
   [STATE UPDATED] ← React re-renders with new balances
         ↓
   [DASHBOARD SHOWS] ← Admin sees revenue, Courier sees earnings, etc.

✅ ENTIRE FLOW IS ATOMIC - Either all updates succeed or none do
✅ SELF-CORRECTING - If balance diverges, auto-fixes on next fetch
✅ REAL-TIME - Socket events ensure clients stay in sync
✅ SESSION PERSISTENT - JWT cookie survives page refresh
```

---

## Key Integration Points Verified

| Component | Responsibility | Status |
|-----------|-----------------|--------|
| DB Schema | Stores all transaction data | ✅ Complete |
| verification.js | Processes delivery code, creates transactions | ✅ Safe + Validated |
| server.js routes | Expose endpoints, emit events | ✅ Integrated |
| Socket.IO | Broadcasts updates to all clients | ✅ Working |
| AppContext | Fetches data, calculates financials | ✅ Fixed revenue calc |
| Components | Display updated balances | ✅ Rendering correct |

---

**All systems connected, tested, and ready for production delivery workflows.**
