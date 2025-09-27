#!/usr/bin/env node

/**
 * Railway DATABASE_URL Validator and Fixer
 */

console.log('🔍 Railway DATABASE_URL Analysis\n');

const currentUrl = process.env.DATABASE_URL;

if (!currentUrl) {
    console.log('❌ No DATABASE_URL found');
    process.exit(1);
}

console.log('📋 Current DATABASE_URL:');
console.log(`   ${currentUrl.replace(/:([^:@]+)@/, ':****@')}`); // Hide password

if (currentUrl.includes('postgres.railway.internal')) {
    console.log('\n⚠️  ISSUE DETECTED: Internal Railway hostname');
    console.log('   This URL only works INSIDE Railway containers, not from your local machine.');
    console.log('\n📝 To fix this:');
    console.log('\n1️⃣ Go to Railway Dashboard:');
    console.log('   https://railway.app/dashboard');
    console.log('\n2️⃣ Select your project');
    console.log('\n3️⃣ Click on PostgreSQL service');
    console.log('\n4️⃣ Go to "Connect" tab (not Variables tab)');
    console.log('\n5️⃣ Look for "External URL" or "Public URL"');
    console.log('   It should look like: postgresql://postgres:password@host-xxx.railway.app:5432/railway');
    console.log('\n6️⃣ Copy that URL and use it instead');
    
    // Try to convert internal to external format
    const externalUrl = currentUrl.replace('postgres.railway.internal', 'YOUR_HOST.railway.app');
    console.log('\n🔧 Expected format:');
    console.log(`   ${externalUrl.replace(/:([^:@]+)@/, ':****@')}`);
    console.log('   (Replace YOUR_HOST with your actual Railway host)');
    
} else if (currentUrl.includes('.railway.app')) {
    console.log('\n✅ This looks like a valid external Railway URL');
    console.log('   You should be able to connect from your local machine');
    
} else {
    console.log('\n❓ This doesn\'t look like a Railway URL');
    console.log('   Make sure you\'re using the correct DATABASE_URL from Railway');
}

console.log('\n🎯 Alternative: Deploy via Git Push');
console.log('   Since the barcode scanner is integrated into your main app,');
console.log('   you can deploy it by just pushing to Railway:');
console.log('   ');
console.log('   git add .');
console.log('   git commit -m "Add barcode scanner system"');
console.log('   git push origin main');
console.log('   ');
console.log('   Railway will automatically run the database setup and create');
console.log('   the barcode_scans table when it deploys your app.');