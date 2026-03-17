import pool from './database.js';

const addAuctionCredits = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running auction-specific credits migration...');

    // Create auction_credits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS auction_credits (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_credits DECIMAL(10, 2) NOT NULL DEFAULT 0,
        used_credits DECIMAL(10, 2) NOT NULL DEFAULT 0,
        remaining_credits DECIMAL(10, 2) NOT NULL DEFAULT 0,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(auction_id, user_id)
      )
    `);
    console.log('✅ Created auction_credits table');

    // Add auction_id to credit_transactions
    await client.query(`
      ALTER TABLE credit_transactions 
      ADD COLUMN IF NOT EXISTS auction_id INTEGER REFERENCES auctions(id) ON DELETE SET NULL
    `);
    console.log('✅ Added auction_id to credit_transactions');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auction_credits_auction_id ON auction_credits(auction_id);
      CREATE INDEX IF NOT EXISTS idx_auction_credits_user_id ON auction_credits(user_id);
    `);
    console.log('✅ Created indexes');

    console.log('✅ Auction-specific credits migration completed');
  } catch (error) {
    console.error('❌ Error in auction credits migration:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default addAuctionCredits;
