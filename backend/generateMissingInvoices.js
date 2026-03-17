import pool from './config/database.js';

const generateMissingInvoices = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Checking for completed auctions without invoices...');

    // Find completed auctions with winners but no invoices
    const { rows: completedAuctions } = await client.query(`
      SELECT a.id, a.title, a.winner_id, a.user_id as seller_id, a.current_bid
      FROM auctions a
      WHERE a.status = 'completed' 
        AND a.winner_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM invoices i WHERE i.auction_id = a.id
        )
    `);

    if (completedAuctions.length === 0) {
      console.log('✅ No missing invoices found');
      return;
    }

    console.log(`📝 Found ${completedAuctions.length} completed auctions without invoices`);

    for (const auction of completedAuctions) {
      await client.query('BEGIN');
      
      try {
        const invoiceNumber = `INV-${auction.id}-${Date.now()}`;
        
        await client.query(
          `INSERT INTO invoices (invoice_number, auction_id, buyer_id, seller_id, amount, status) 
           VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [invoiceNumber, auction.id, auction.winner_id, auction.seller_id, auction.current_bid]
        );

        await client.query('COMMIT');
        console.log(`✅ Created invoice ${invoiceNumber} for auction ${auction.id}: ${auction.title}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error creating invoice for auction ${auction.id}:`, error);
      }
    }

    console.log('✅ Missing invoices generation completed');
  } catch (error) {
    console.error('❌ Error in missing invoices generation:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

generateMissingInvoices()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
