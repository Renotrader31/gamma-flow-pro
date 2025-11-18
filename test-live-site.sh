#!/bin/bash
# Quick diagnostic script
# Run this to check what data your site is returning

SITE_URL=${1:-"http://localhost:3000"}

echo "🔍 Testing API endpoint: ${SITE_URL}/api/stocks"
echo ""

# Fetch the API data
RESPONSE=$(curl -s "${SITE_URL}/api/stocks")

# Check if it's mock data
if echo "$RESPONSE" | grep -q "No API data available, using defaults"; then
    echo "❌ MOCK DATA DETECTED"
    echo "   The API is returning fallback mock data"
else
    echo "✅ API Response received"
fi

# Count stocks
COUNT=$(echo "$RESPONSE" | grep -o '"symbol"' | wc -l)
echo ""
echo "📊 Stock count: $COUNT"

# Check for liquidity data
LIQ_COUNT=$(echo "$RESPONSE" | grep -o '"liquidity"' | wc -l)
echo "💧 Stocks with liquidity data: $LIQ_COUNT"

# Show first 3 symbols
echo ""
echo "🏢 First few symbols:"
echo "$RESPONSE" | grep -o '"symbol":"[^"]*"' | head -5

# Check status
echo ""
echo "📡 Response status:"
echo "$RESPONSE" | grep -o '"status":"[^"]*"'

echo ""
echo "💡 If you see 5 stocks (NVDA, TSLA, AAPL, SPY, QQQ) = MOCK DATA"
echo "💡 If you see 50+ stocks with variety = LIVE DATA"
