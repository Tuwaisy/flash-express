#!/bin/bash

echo "🧹 Cleaning project for GitHub push..."

# Remove all test files that might contain credentials
echo "📁 Removing test and development files..."

rm -f *.cjs 2>/dev/null || true
rm -f test-*.js 2>/dev/null || true
rm -f *-test.js 2>/dev/null || true
rm -f sandbox-*.cjs 2>/dev/null || true
rm -f check-*.cjs 2>/dev/null || true
rm -f final-*.cjs 2>/dev/null || true
rm -f direct-*.cjs 2>/dev/null || true
rm -f pre-*.cjs 2>/dev/null || true

# Remove service development files
rm -rf services/ 2>/dev/null || true

# Clean up any remaining credential references
echo "🔒 Sanitizing remaining files..."

# Update .env.example to use placeholders
if [ -f ".env.example" ]; then
    sed -i 's/AC[a-zA-Z0-9]*/YOUR_TWILIO_ACCOUNT_SID/g' .env.example
    sed -i 's/[0-9a-f]\{32\}/YOUR_TWILIO_AUTH_TOKEN/g' .env.example
fi

echo "✅ Project cleaned for GitHub push!"
echo "📋 Removed files:"
echo "   - All .cjs test files"
echo "   - Development service files"
echo "   - Files with embedded credentials"
echo ""
echo "🚀 Ready to commit and push to GitHub!"
