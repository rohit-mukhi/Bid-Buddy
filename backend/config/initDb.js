import pool from '../config/database.js';

const createTables = async () => {
  try {
    // Create Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        google_id VARCHAR(255),
        is_admin BOOLEAN DEFAULT false,
        is_bidder BOOLEAN DEFAULT true,
        credits DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Auctions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auctions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        starting_bid DECIMAL(10, 2) NOT NULL,
        current_bid DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        duration_hours DECIMAL(10, 2) NOT NULL,
        image_url TEXT,
        cloudinary_public_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'cancelled'))
      );
    `);

    // Create Bids table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bid_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Bidding Requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bidding_requests (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_request_status CHECK (status IN ('pending', 'approved', 'rejected')),
        UNIQUE(auction_id, user_id)
      );
    `);

    // Create Auction Bidders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auction_bidders (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(auction_id, user_id)
      );
    `);

    // Create Credit Transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('add', 'deduct', 'refund'))
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_auctions_user_id ON auctions(user_id);
      CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
      CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
      CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
      CREATE INDEX IF NOT EXISTS idx_bidding_requests_auction_id ON bidding_requests(auction_id);
      CREATE INDEX IF NOT EXISTS idx_bidding_requests_user_id ON bidding_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_bidding_requests_status ON bidding_requests(status);
      CREATE INDEX IF NOT EXISTS idx_auction_bidders_auction_id ON auction_bidders(auction_id);
      CREATE INDEX IF NOT EXISTS idx_auction_bidders_user_id ON auction_bidders(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

export default createTables;
