#!/bin/bash
# Script to add environment variables to Vercel
# Make sure you have the Vercel CLI installed: npm i -g vercel

echo "Adding POLYGON_API_KEY to Vercel..."
echo ""
echo "Please enter your Polygon.io API key:"
read -r API_KEY

if [ -z "$API_KEY" ]; then
  echo "Error: No API key provided"
  exit 1
fi

# Add to all environments
vercel env add POLYGON_API_KEY production <<< "$API_KEY"
vercel env add POLYGON_API_KEY preview <<< "$API_KEY"
vercel env add POLYGON_API_KEY development <<< "$API_KEY"

echo ""
echo "✅ API key added to Vercel!"
echo ""
echo "Now redeploy with:"
echo "  vercel --prod"
