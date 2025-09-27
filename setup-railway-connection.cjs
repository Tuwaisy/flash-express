#!/usr/bin/env node

/**
 * Railway Connection Helper
 * 
 * This script helps you set up the correct DATABASE_URL for Railway deployment.
 */

console.log('🚂 Railway PostgreSQL Connection Setup Helper');
console.log('');

console.log('📋 To get your Railway DATABASE_URL:');
console.log('');
console.log('1️⃣ Go to your Railway dashboard: https://railway.app/dashboard');
console.log('2️⃣ Select your project');
console.log('3️⃣ Go to your PostgreSQL service');
console.log('4️⃣ Click on "Variables" tab');
console.log('5️⃣ Copy the DATABASE_URL value');
console.log('');

console.log('📝 Your DATABASE_URL should look like this:');
console.log('   postgresql://postgres:password@host.railway.app:5432/railway');
console.log('');

console.log('🔧 To set it up:');
console.log('');
console.log('Option 1 - Environment Variable (Linux/Mac):');
console.log('   export DATABASE_URL="postgresql://postgres:your_password@your_host.railway.app:5432/railway"');
console.log('');
console.log('Option 2 - Environment Variable (Windows):');
console.log('   set DATABASE_URL=postgresql://postgres:your_password@your_host.railway.app:5432/railway');
console.log('');
console.log('Option 3 - Create .env file:');
console.log('   echo "DATABASE_URL=postgresql://postgres:your_password@your_host.railway.app:5432/railway" > .env');
console.log('');

console.log('✅ After setting the DATABASE_URL, run:');
console.log('   node deploy-barcode-scanner-railway.cjs');
console.log('');

console.log('🔍 Current DATABASE_URL status:');
const currentUrl = process.env.DATABASE_URL;
if (!currentUrl) {
    console.log('   ❌ Not set');
} else if (currentUrl.includes('user:pass@host:port')) {
    console.log('   ⚠️  Using placeholder URL - please replace with real Railway URL');
} else if (currentUrl.startsWith('postgresql://')) {
    console.log('   ✅ Looks good!');
    console.log(`   🔗 ${currentUrl.replace(/:([^:@]+)@/, ':****@')}`); // Hide password
} else {
    console.log('   ❓ Unexpected format');
}