import pool from './config/database.js';

async function verifyInvoicesAndAPI() {
  const client = await pool.connect();
  
  try {
    console.log('=== INVOICE PERSISTENCE TEST ===\n');
    
    // Check if invoices exist
    const count = await client.query('SELECT COUNT(*) FROM invoices');
    console.log(`Invoices in database: ${count.rows[0].count}`);
    
    if (count.rows[0].count === 0) {
      console.log('\n❌ NO INVOICES FOUND - Regenerating...\n');
      
      // Regenerate invoices
      const auctions = await client.query(`
        SELECT a.id, a.title, a.winner_id, a.user_id as seller_id, a.current_bid
        FROM auctions a
        WHERE a.status = 'completed' AND a.winner_id IS NOT NULL
      `);
      
      for (const auction of auctions.rows) {
        await client.query('BEGIN');
        try {
          const invoiceNumber = `INV-${auction.id}-${Date.now()}`;
          await client.query(
            'INSERT INTO invoices (invoice_number, auction_id, buyer_id, seller_id, amount, status) VALUES ($1, $2, $3, $4, $5, $6)',
            [invoiceNumber, auction.id, auction.winner_id, auction.seller_id, auction.current_bid, 'pending']
          );
          await client.query('COMMIT');
          console.log(`✓ Created: ${invoiceNumber} for ${auction.title}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`✗ Error: ${error.message}`);
        }
      }
    }
    
    // Verify with JOIN query (same as API)
    console.log('\n=== API QUERY TEST ===\n');
    
    const apiQuery = await client.query(`
      SELECT i.*, 
             a.title as auction_title,
             buyer.email as buyer_email,
             seller.email as seller_email
      FROM invoices i
      JOIN auctions a ON i.auction_id = a.id
      JOIN users buyer ON i.buyer_id = buyer.id
      JOIN users seller ON i.seller_id = seller.id
      WHERE buyer.email = $1 OR seller.email = $1
      ORDER BY i.created_at DESC
    `, ['rohitmukhi52@gmail.com']);
    
    console.log(`Query returned: ${apiQuery.rows.length} invoices\n`);
    
    apiQuery.rows.forEach(inv => {
      console.log(`✓ ${inv.invoice_number}`);
      console.log(`  ${inv.auction_title} - $${inv.amount}`);
      console.log(`  Buyer: ${inv.buyer_email}`);
      console.log(`  Seller: ${inv.seller_email}\n`);
    });
    
    if (apiQuery.rows.length === 0) {
      console.log('❌ API query returned no results!');
      console.log('Debugging: Checking individual components...\n');
      
      const invoices = await client.query('SELECT * FROM invoices');
      console.log(`Raw invoices: ${invoices.rows.length}`);
      
      const users = await client.query('SELECT id, email FROM users WHERE email = $1', ['rohitmukhi52@gmail.com']);
      console.log(`User exists: ${users.rows.length > 0}`);
      if (users.rows.length > 0) {
        console.log(`User ID: ${users.rows[0].id}`);
      }
    }
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    client.release();
    process.exit(1);
  }
}

verifyInvoicesAndAPI();
