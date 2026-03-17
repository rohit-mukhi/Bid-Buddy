#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;

// Generate test JWT token
const testUser = {
  email: 'test@example.com',
  isAdmin: false,
  isBidder: true,
};

const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '7d' });

console.log('🧪 Testing Create Auction Feature\n');
console.log('📋 Test Configuration:');
console.log(`   API URL: ${API_URL}`);
console.log(`   User Email: ${testUser.email}`);
console.log(`   JWT Token: ${token.substring(0, 20)}...\n`);

// Create a simple test image (1x1 pixel PNG in base64)
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const testAuction = {
  title: 'Test Vintage Watch',
  description: 'A beautiful vintage watch for testing',
  startingBid: '150.00',
  category: 'collectibles',
  duration: '24',
  image: testImageBase64,
};

console.log('📦 Test Auction Data:');
console.log(`   Title: ${testAuction.title}`);
console.log(`   Starting Bid: $${testAuction.startingBid}`);
console.log(`   Category: ${testAuction.category}`);
console.log(`   Duration: ${testAuction.duration} hours\n`);

// Test the create auction endpoint
async function testCreateAuction() {
  try {
    console.log('🚀 Sending POST request to /api/auctions/create...\n');

    const response = await fetch(`${API_URL}/api/auctions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(testAuction),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ Error Response:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error}\n`);
      return false;
    }

    console.log('✅ Success! Auction Created\n');
    console.log('📊 Response Data:');
    console.log(`   Auction ID: ${data.auction.id}`);
    console.log(`   Title: ${data.auction.title}`);
    console.log(`   User ID: ${data.auction.user_id}`);
    console.log(`   Image URL: ${data.auction.image_url}`);
    console.log(`   Cloudinary Public ID: ${data.auction.cloudinary_public_id}`);
    console.log(`   Status: ${data.auction.status}`);
    console.log(`   Created At: ${data.auction.created_at}`);
    console.log(`   Expires At: ${data.auction.expires_at}\n`);

    return true;
  } catch (error) {
    console.log('❌ Request Failed:');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

// Test the get all auctions endpoint
async function testGetAuctions() {
  try {
    console.log('🚀 Sending GET request to /api/auctions/all...\n');

    const response = await fetch(`${API_URL}/api/auctions/all`);
    const data = await response.json();

    if (!response.ok) {
      console.log('❌ Error Response:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error}\n`);
      return false;
    }

    console.log('✅ Success! Auctions Retrieved\n');
    console.log(`📊 Found ${data.auctions.length} active auction(s)\n`);

    if (data.auctions.length > 0) {
      console.log('📋 Latest Auction:');
      const auction = data.auctions[0];
      console.log(`   ID: ${auction.id}`);
      console.log(`   Title: ${auction.title}`);
      console.log(`   Seller: ${auction.seller_email}`);
      console.log(`   Current Bid: $${auction.current_bid}`);
      console.log(`   Bids: ${auction.bids}`);
      console.log(`   Image: ${auction.image_url}\n`);
    }

    return true;
  } catch (error) {
    console.log('❌ Request Failed:');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('═'.repeat(60) + '\n');

  const createSuccess = await testCreateAuction();
  console.log('═'.repeat(60) + '\n');

  const getSuccess = await testGetAuctions();
  console.log('═'.repeat(60) + '\n');

  if (createSuccess && getSuccess) {
    console.log('✅ All tests passed! Create auction feature is working.\n');
    console.log('📝 Next Steps:');
    console.log('   1. Check Cloudinary dashboard for uploaded image');
    console.log('   2. Verify auction data in Supabase database');
    console.log('   3. Test delete auction endpoint');
    console.log('   4. Integrate with frontend CreateAuction component\n');
  } else {
    console.log('❌ Some tests failed. Check the errors above.\n');
  }
}

runTests();
