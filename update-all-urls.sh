#!/bin/bash

echo "🔄 Updating remaining hardcoded URLs..."

# List of files that need updating
files=(
  "src/pages/AuctionListing.tsx"
  "src/pages/ManageAuctions.tsx"
  "src/pages/LiveMonitoring.tsx"
  "src/pages/Home.tsx"
  "src/pages/AuctionDetail.tsx"
  "src/pages/CreateAuction.tsx"
  "src/pages/UserManagement.tsx"
  "src/services/aiConcierge.ts"
)

cd frontend

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Processing $file..."
    
    # Add import if not present
    if ! grep -q "getApiUrl" "$file"; then
      # Find appropriate import location and add our import
      if grep -q "from '../lib/" "$file"; then
        sed -i "/from '\.\.\/lib\//a import { getApiUrl } from '../lib/api'" "$file"
      elif grep -q "from '../" "$file"; then
        sed -i "/from '\.\.\/.*'/a import { getApiUrl } from '../lib/api'" "$file"
      else
        # Add after the last import
        sed -i "/^import.*from/a import { getApiUrl } from '../lib/api'" "$file"
      fi
    fi
    
    # Replace localhost URLs
    sed -i "s|'http://localhost:3000/api/|getApiUrl('/api/|g" "$file"
    sed -i 's|`http://localhost:3000/api/|getApiUrl(`/api/|g' "$file"
    
    echo "✅ Updated $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 All files updated!"