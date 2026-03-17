import pool from './config/database.js';

async function generateMissingInvoices() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding completed auctions without invoices...');
    
    // Find completed auctions with winners that don't have invoices
    const { rows: auctionsNeedingInvoices } = await client.query(`
      SELECT a.id, a.title, a.winner_id, a.user_id as seller_id, b.bid_amount
      FROM auctions a
      LEFT JOIN invoices i ON a.id = i.auction_id
      LEFT JOIN bids b ON a.id = b.auction_id AND a.winner_id = b.user_id
      WHERE a.status = 'completed' 
        AND a.winner_id IS NOT NULL 
        AND i.id IS NULL
      ORDER BY a.id
    `);
    
    console.log(`Found ${auctionsNeedingInvoices.length} auctions needing invoices`);
    
    for (const auction of auctionsNeedingInvoices) {
      const invoiceNumber = `INV-${auction.id}-${Date.now()}`;
      
      await client.query(
        `INSERT INTO invoices (invoice_number, auction_id, buyer_id, seller_id, amount, status) 
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [invoiceNumber, auction.id, auction.winner_id, auction.seller_id, auction.bid_amount]
      );
      
      console.log(`✅ Created invoice ${invoiceNumber} for auction ${auction.id} (${auction.title})`);
    }
    
    console.log('✅ Invoice generation complete!');
    
    // Verify
    const { rows: allInvoices } = await client.query('SELECT * FROM invoices ORDER BY id');
    console.log(`\nTotal invoices now: ${allInvoices.length}`);
    allInvoices.forEach(inv => {
      console.log(`  - ${inv.invoice_number}: Auction ${inv.auction_id}, Amount: $${inv.amount}`);
    });
    
  } catch (error) {
    console.error('❌ Error generating invoices:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

generateMissingInvoices();
