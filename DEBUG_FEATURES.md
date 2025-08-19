# DEBUG GUIDE - How to Test Features

## 1. Client Packaging Privacy
**What to test:** Client users should NOT see packaging information
- Log in as a client user  
- Go to "My Shipments"
- Click on any delivered shipment
- **Expected:** No "Packaging Info" section should appear
- **If still visible:** Clear browser cache and hard refresh (Ctrl+F5)

## 2. Supplier Management Sorting/Filtering  
**Where to find:** Admin users only
- Go to Supplier Management page
- **Expected:** You should see a card with sorting/filtering controls ABOVE the supplier table
- Controls include:
  - Sort dropdown: Name, Balance, Total Paid, Total Owed
  - Sort direction button (↑/↓)  
  - Filter dropdown: All, We Owe Money, They Owe Money, Balanced
  - Supplier count display

## 3. Courier Performance Referral Features
**Where to find:** Admin users only
- Go to Courier Performance page
- Click "Manage Courier" button on any courier card
- **Expected:** You should see a "Referral Management" section in the modal
- Shows: Referrer info, referrals made by courier, total referral earnings

## 4. Calculation Errors
**What was fixed:** All toFixed() crashes
- Printing labels should work without errors
- Opening courier accounts should work
- Admin financials should display without crashes
- Client financial view should work

## 5. Wallet Balance  
**What to test:** Client wallet balance calculation
- Log in as client who has delivered shipments
- Check Dashboard wallet balance  
- Check Wallet page
- **Expected:** Should show correct balance based on delivered shipment transactions

## If features still don't appear:
1. **Hard refresh:** Ctrl+F5 or Cmd+Shift+R
2. **Clear cache:** Browser settings → Clear cache
3. **Check permissions:** Ensure user has required admin permissions
4. **Try different browser:** Test in incognito/private mode
5. **Check console:** F12 → Console tab for any JavaScript errors

## Current Deployment Status:
- Latest commit: 6f50706
- Timestamp: 2025-08-19  
- All fixes deployed to Railway production
