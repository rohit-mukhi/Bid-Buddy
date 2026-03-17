import pool from './database.js';

const addSettlementSchema = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running settlement schema migration...');

    // Add winner_id to auctions table
    await client.query(`
      ALTER TABLE auctions 
      ADD COLUMN IF NOT EXISTS winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('✅ Added winner_id to auctions table');

    // Add completed_at to auctions table
    await client.query(`
      ALTER TABLE auctions 
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
    `);
    console.log('✅ Added completed_at to auctions table');

    // Drop invoices table if it exists (to recreate cleanly)
    await client.query(`DROP TABLE IF EXISTS invoices CASCADE`);
    
    // Create invoices table
    await client.query(`
      CREATE TABLE invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_invoice_status CHECK (status IN ('pending', 'paid', 'cancelled'))
      )
    `);
    console.log('✅ Created invoices table');

    // Add amount column to bids table (keep bid_amount for backward compatibility)
    await client.query(`
      ALTER TABLE bids 
      ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2)
    `);
    console.log('✅ Added amount column to bids table');

    // Copy bid_amount to amount for existing records
    await client.query(`
      UPDATE bids SET amount = bid_amount WHERE amount IS NULL
    `);
    console.log('✅ Copied bid_amount to amount column');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auctions_winner_id ON auctions(winner_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_auction_id ON invoices(auction_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_buyer_id ON invoices(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_seller_id ON invoices(seller_id)
    `);
    console.log('✅ Created indexes');

    console.log('✅ Settlement schema migration completed');
  } catch (error) {
    console.error('❌ Error in settlement schema migration:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default addSettlementSchema;
