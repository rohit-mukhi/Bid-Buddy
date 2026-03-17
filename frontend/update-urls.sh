#!/bin/bash

# Script to replace all hardcoded localhost URLs with dynamic API calls

echo "🔄 Updating hardcoded URLs in frontend files..."

# Files to update
files=(
  "src/pages/Profile.tsx"
  "src/pages/AuctionListing.tsx"
  "src/pages/ManageAuctions.tsx"
  "src/pages/LiveMonitoring.tsx"
  "src/pages/Home.tsx"
  "src/pages/AuctionDetail.tsx"
  "src/pages/BiddingInterface.tsx"
  "src/pages/CreateAuction.tsx"
  "src/pages/UserManagement.tsx"
  "src/services/aiConcierge.ts"
)

# Add import statement to each file
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Updating $file..."
    
    # Add import if not already present
    if ! grep -q "import.*getApiUrl.*from.*lib/api" "$file"; then
      # Find the last import line and add our import after it
      sed -i "/^import.*from/a import { getApiUrl } from '../lib/api'" "$file"
    fi
    
    # Replace all localhost URLs
    sed -i "s|'http://localhost:3000/api/|getApiUrl('/api/|g" "$file"
    sed -i 's|`http://localhost:3000/api/|getApiUrl(`/api/|g' "$file"
    
    echo "✅ Updated $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 All files updated!"