# 🗑️ Railway Database Clearing Guide

This guide helps you clear your Railway PostgreSQL database for fresh testing.

## 🚀 Quick Start (Recommended)

### Option 1: Use Railway CLI (Easiest)
```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login and link to your project
railway login
railway link 4a13f477-87b2-4d0f-b2ac-2d35107882fd

# Clear the database
npm run clear-railway-db
```

### Option 2: Manual Setup
```bash
# Get your DATABASE_URL
npm run get-railway-db

# Follow the instructions to get DATABASE_URL
# Then set it and run:
export DATABASE_URL="your_database_url_here"
npm run clear-railway-manual
```

## 📋 What Gets Cleared

The script will delete ALL data from these tables:
- ✅ `shipments` - All shipment records
- ✅ `client_transactions` - All client wallet transactions  
- ✅ `courier_transactions` - All courier wallet transactions
- ✅ `courier_stats` - All courier statistics
- ✅ `in_app_notifications` - All notifications

## 🔒 What Stays Safe

These tables are NOT affected (preserved):
- ✅ `users` - All user accounts
- ✅ `custom_roles` - Role definitions
- ✅ `tier_settings` - Partner tier settings
- ✅ `inventory_items` - Inventory data

## 🛠️ Available Commands

```bash
# Quick clear with Railway CLI
npm run clear-railway-db

# Get Railway database connection info
npm run get-railway-db  

# Clear with manual DATABASE_URL setup
npm run clear-railway-manual
```

## 🔗 Railway Project Links

- **Dashboard**: https://railway.app/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd
- **PostgreSQL Service**: Click on the PostgreSQL service in your dashboard
- **Variables**: Settings → Variables tab

## 🆘 Troubleshooting

### "Railway CLI not found"
```bash
npm install -g @railway/cli
railway login
```

### "Project not linked"
```bash
railway link 4a13f477-87b2-4d0f-b2ac-2d35107882fd
```

### "DATABASE_URL not found"
1. Go to Railway Dashboard → Your Project
2. Click PostgreSQL service
3. Go to Variables tab
4. Copy DATABASE_URL value
5. Run: `export DATABASE_URL="your_url"`

### "Connection failed"
- Verify DATABASE_URL is correct
- Check Railway PostgreSQL service is running
- Ensure SSL connection settings are correct

## ⚡ After Clearing

Your database will be ready for testing:
- 🧪 Order creation functionality
- 💰 Client wallet transactions
- 🚛 Courier wallet transactions  
- 📦 All shipment workflows
- 🔄 Real-time updates

The application will start with a clean slate but retain all users and configuration!
