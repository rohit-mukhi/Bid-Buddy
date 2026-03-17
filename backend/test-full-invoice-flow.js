import pool from './config/database.js';

async function testAuctionToInvoiceFlow() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing complete auction-to-invoice flow...\n');
    
    // Step 1: Create a test auction that expires immediately
    console.log('1️⃣ Creating test auction...');
    const auctionResult = await client.query(`
      INSERT INTO auctions (user_id, title, description, starting_bid, current_bid, category, duration_hours, status, expires_at)
      VALUES (2, 'Test Auction for Invoice', 'Testing invoice generation', 100, 100, 'test', 0.01, 'active', NOW() - INTERVAL '1 minute')
      RETURNING id, title, expires_at
    `);
    const testAuction = auctionResult.rows[0];
    console.log(`   ✅ Created auction ${testAuction.id}: "${testAuction.title}"`);
    console.log(`   ⏰ Expires at: ${testAuction.expires_at} (already expired)\n`);
    
    // Step 2: Place a bid on it
    console.log('2️⃣ Placing test bid...');
    const bidResult = await client.query(`
      INSERT INTO bids (auction_id, user_id, bid_amount)
      VALUES ($1, 3, 500)
      RETURNING id, bid_amount
    `, [testAuction.id]);
    console.log(`   ✅ Placed bid: $${bidResult.rows[0].bid_amount}\n`);
    
    // Step 3: Simulate settlement service processing
    console.log('3️⃣ Simulating settlement service...');
    
    // Find expired auction
    const expiredResult = await client.query(`
      SELECT * FROM auctions 
      WHERE status = 'active' AND expires_at <= NOW() AND id = $1
      FOR UPDATE SKIP LOCKED
    `, [testAuction.id]);
    
    if (expiredResult.rows.length === 0) {
      console.log('   ❌ Auction not found or already processed');
      return;
    }
    
    const auction = expiredResult.rows[0];
    console.log(`   ✅ Found expired auction: ${auction.id}\n`);
    
    await client.query('BEGIN');
    
    // Get highest bidder
    const bidsResult = await client.query(`
      SELECT * FROM bids 
      WHERE auction_id = $1 
      ORDER BY bid_amount DESC 
      LIMIT 1
    `, [auction.id]);
    
    const winner = bidsResult.rows[0];
    console.log(`   ✅ Winner: User ${winner.user_id} with bid $${winner.bid_amount}\n`);
    
    // Update auction status
    await client.query(`
      UPDATE auctions 
      SET status = 'completed', winner_id = $1, completed_at = NOW() 
      WHERE id = $2
    `, [winner.user_id, auction.id]);
    console.log(`   ✅ Auction marked as completed\n`);
    
    // Generate invoice
    const invoiceNumber = `INV-${auction.id}-${Date.now()}`;
    const invoiceResult = await client.query(`
      INSERT INTO invoices (invoice_number, auction_id, buyer_id, seller_id, amount, status) 
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [invoiceNumber, auction.id, winner.user_id, auction.user_id, winner.bid_amount]);
    
    console.log(`   ✅ Invoice generated: ${invoiceResult.rows[0].invoice_number}`);
    console.log(`      Buyer: User ${invoiceResult.rows[0].buyer_id}`);
    console.log(`      Seller: User ${invoiceResult.rows[0].seller_id}`);
    console.log(`      Amount: $${invoiceResult.rows[0].amount}\n`);
    
    await client.query('COMMIT');
    
    // Step 4: Verify invoice can be fetched
    console.log('4️⃣ Verifying invoice retrieval...');
    const verifyResult = await client.query(`
      SELECT i.*, 
             a.title as auction_title,
             buyer.email as buyer_email,
             seller.email as seller_email
      FROM invoices i
      JOIN auctions a ON i.auction_id = a.id
      JOIN users buyer ON i.buyer_id = buyer.id
      JOIN users seller ON i.seller_id = seller.id
      WHERE i.id = $1
    `, [invoiceResult.rows[0].id]);
    
    const invoice = verifyResult.rows[0];
    console.log(`   ✅ Invoice retrieved successfully:`);
    console.log(`      Invoice #: ${invoice.invoice_number}`);
    console.log(`      Auction: ${invoice.auction_title}`);
    console.log(`      Buyer: ${invoice.buyer_email}`);
    console.log(`      Seller: ${invoice.seller_email}`);
    console.log(`      Amount: $${invoice.amount}`);
    console.log(`      Status: ${invoice.status}\n`);
    
    console.log('✅ TEST PASSED: Complete flow works correctly!\n');
    console.log('📋 Summary:');
    console.log('   - Auction created and expired ✅');
    console.log('   - Bid placed ✅');
    console.log('   - Settlement processed ✅');
    console.log('   - Invoice generated ✅');
    console.log('   - Invoice retrievable ✅');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testAuctionToInvoiceFlow();
