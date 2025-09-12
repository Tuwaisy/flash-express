#!/usr/bin/env node

// Script to get Railway database connection details
// This helps you extract the DATABASE_URL for local scripts

const https = require('https');
const { execSync } = require('child_process');

console.log('🚂 Railway Database Connection Helper');
console.log('═══════════════════════════════════════');

function showInstructions() {
    console.log('');
    console.log('📋 TO GET YOUR RAILWAY DATABASE_URL:');
    console.log('');
    console.log('1️⃣ Method 1 - Railway CLI (Recommended):');
    console.log('   railway login');
    console.log('   railway link 4a13f477-87b2-4d0f-b2ac-2d35107882fd');
    console.log('   railway variables');
    console.log('   # Copy the DATABASE_URL value');
    console.log('');
    console.log('2️⃣ Method 2 - Railway Dashboard:');
    console.log('   • Go to: https://railway.app/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd');
    console.log('   • Click on PostgreSQL service');
    console.log('   • Go to "Variables" tab');
    console.log('   • Copy the DATABASE_URL value');
    console.log('');
    console.log('3️⃣ Method 3 - From Environment Variables:');
    console.log('   • Go to Settings → Variables in Railway Dashboard');
    console.log('   • Find DATABASE_URL and copy its value');
    console.log('');
    console.log('🔧 THEN RUN THE CLEAR SCRIPT:');
    console.log('   export DATABASE_URL="your_copied_database_url"');
    console.log('   node scripts/clear-railway-db.js');
    console.log('');
    console.log('🔗 Your Railway Project Links:');
    console.log('   Dashboard: https://railway.app/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd');
    console.log('   Service: https://railway.com/project/4a13f477-87b2-4d0f-b2ac-2d35107882fd/service/43f4592a-78c3-43cd-b136-9486d84dfdbd');
}

// Check if Railway CLI is available
function checkRailwayCLI() {
    try {
        execSync('railway --version', { stdio: 'pipe' });
        console.log('✅ Railway CLI is installed');
        
        try {
            // Try to get variables if already linked
            const result = execSync('railway variables', { encoding: 'utf8' });
            if (result.includes('DATABASE_URL')) {
                console.log('🎯 Found Railway variables! Look for DATABASE_URL above.');
                return true;
            }
        } catch (e) {
            console.log('💡 Railway CLI found but project not linked.');
            console.log('   Run: railway link 4a13f477-87b2-4d0f-b2ac-2d35107882fd');
        }
    } catch (error) {
        console.log('📦 Railway CLI not found. Install it for easier access:');
        console.log('   npm install -g @railway/cli');
    }
    return false;
}

// Main execution
console.log('');
const hasVars = checkRailwayCLI();

if (!hasVars) {
    showInstructions();
}

console.log('');
console.log('⚡ Quick Commands Summary:');
console.log('   npm install -g @railway/cli    # Install Railway CLI');
console.log('   railway login                  # Login to Railway');
console.log('   railway link [project-id]      # Link to your project');
console.log('   railway variables              # View all variables');
console.log('   node scripts/clear-railway-db.js  # Clear database');
console.log('');
