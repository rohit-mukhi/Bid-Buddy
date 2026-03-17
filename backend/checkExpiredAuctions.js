import pool from './config/database.js';

const checkExpiredAuctions = async () => {
  try {
    console.log('🔄 Checking expired auctions...\n');

    // Check active but expired auctions
    const { rows: expiredActive } = await pool.query(`
      SELECT id, title, status, expires_at, winner_id, 
             (SELECT COUNT(*) FROM bids WHERE auction_id = auctions.id) as bid_count,
             (SELECT MAX(bid_amount) FROM bids WHERE auction_id = auctions.id) as highest_bid
      FROM auctions 
      WHERE status = 'active' AND expires_at <= NOW()
      ORDER BY expires_at DESC
    `);

    if (expiredActive.length > 0) {
      console.log(`⚠️  Found ${expiredActive.length} expired auctions still marked as 'active':`);
      expiredActive.forEach(a => {
        console.log(`   - Auction ${a.id}: "${a.title}"`);
        console.log(`     Expired: ${a.expires_at}`);
        console.log(`     Bids: ${a.bid_count}, Highest: $${a.highest_bid || 0}`);
        console.log(`     Winner ID: ${a.winner_id || 'Not set'}\n`);
      });
    } else {
      console.log('✅ No expired auctions waiting to be processed\n');
    }

    // Check completed auctions without invoices
    const { rows: completedNoInvoice } = await pool.query(`
      SELECT a.id, a.title, a.winner_id, a.completed_at,
             (SELECT COUNT(*) FROM invoices WHERE auction_id = a.id) as invoice_count
      FROM auctions a
      WHERE a.status = 'completed' AND a.winner_id IS NOT NULL
      ORDER BY a.completed_at DESC
    `);

    if (completedNoInvoice.length > 0) {
      console.log(`📋 Completed auctions with winners:`);
      completedNoInvoice.forEach(a => {
        console.log(`   - Auction ${a.id}: "${a.title}"`);
        console.log(`     Winner ID: ${a.winner_id}`);
        console.log(`     Invoices: ${a.invoice_count}\n`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkExpiredAuctions();
