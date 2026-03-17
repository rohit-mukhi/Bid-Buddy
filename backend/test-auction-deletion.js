import pool from './config/database.js';

async function testAuctionDeletion() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing: What happens when admin deletes an expired auction?\n');
    
    // Step 1: Check current state
    console.log('1️⃣ Current state:');
    const auctionsCount = await client.query('SELECT COUNT(*) FROM auctions WHERE status = \'completed\'');
    const invoicesCount = await client.query('SELECT COUNT(*) FROM invoices');
    console.log(`   - Completed auctions: ${auctionsCount.rows[0].count}`);
    console.log(`   - Total invoices: ${invoicesCount.rows[0].count}\n`);
    
    // Step 2: Get a completed auction with an invoice
    const auctionWithInvoice = await client.query(`
      SELECT a.id, a.title, a.status, i.id as invoice_id, i.invoice_number
      FROM auctions a
      JOIN invoices i ON a.id = i.auction_id
      WHERE a.status = 'completed'
      LIMIT 1
    `);
    
    if (auctionWithInvoice.rows.length === 0) {
      console.log('❌ No completed auctions with invoices found for testing');
      return;
    }
    
    const testAuction = auctionWithInvoice.rows[0];
    console.log('2️⃣ Test auction selected:');
    console.log(`   - Auction ID: ${testAuction.id}`);
    console.log(`   - Title: ${testAuction.title}`);
    console.log(`   - Status: ${testAuction.status}`);
    console.log(`   - Invoice ID: ${testAuction.invoice_id}`);
    console.log(`   - Invoice Number: ${testAuction.invoice_number}\n`);
    
    // Step 3: Simulate deletion
    console.log('3️⃣ Simulating auction deletion...');
    console.log('   ⚠️  NOTE: This is a DRY RUN - not actually deleting\n');
    
    // Check what would be deleted
    const relatedData = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM bids WHERE auction_id = $1) as bids_count,
        (SELECT COUNT(*) FROM invoices WHERE auction_id = $1) as invoices_count,
        (SELECT COUNT(*) FROM auction_credits WHERE auction_id = $1) as credits_count,
        (SELECT COUNT(*) FROM bidding_requests WHERE auction_id = $1) as requests_count,
        (SELECT COUNT(*) FROM auction_bidders WHERE auction_id = $1) as bidders_count
    `, [testAuction.id]);
    
    const related = relatedData.rows[0];
    console.log('4️⃣ Related data that would be affected:');
    console.log(`   - Bids: ${related.bids_count} (CASCADE DELETE)`);
    console.log(`   - Invoices: ${related.invoices_count} (CASCADE DELETE) ⚠️`);
    console.log(`   - Auction Credits: ${related.credits_count} (CASCADE DELETE)`);
    console.log(`   - Bidding Requests: ${related.requests_count} (CASCADE DELETE)`);
    console.log(`   - Auction Bidders: ${related.bidders_count} (CASCADE DELETE)\n`);
    
    console.log('📋 SUMMARY:\n');
    console.log('❌ PROBLEM IDENTIFIED:');
    console.log('   When an admin deletes an expired auction:');
    console.log('   1. The auction is deleted from the database');
    console.log('   2. ALL INVOICES for that auction are CASCADE DELETED');
    console.log('   3. Buyers and sellers LOSE their invoice records');
    console.log('   4. No financial trail remains\n');
    
    console.log('⚠️  CONSEQUENCES:');
    console.log('   - Buyers cannot see what they won');
    console.log('   - Sellers cannot see what they sold');
    console.log('   - No payment/transaction history');
    console.log('   - Potential legal/accounting issues\n');
    
    console.log('✅ RECOMMENDED SOLUTION:');
    console.log('   1. Change invoice foreign key from CASCADE to SET NULL');
    console.log('   2. OR prevent deletion of auctions with invoices');
    console.log('   3. OR implement soft delete (status = "deleted")');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testAuctionDeletion();
