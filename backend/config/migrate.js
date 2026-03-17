import pool from '../config/database.js'

const runMigrations = async () => {
  try {
    // Add credits column if it doesn't exist
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS credits DECIMAL(10, 2) DEFAULT 0
    `)
    console.log('✅ Migration: Added credits column to users table')

    // Ensure credit_transactions table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('add', 'deduct', 'refund'))
      )
    `)
    console.log('✅ Migration: Ensured credit_transactions table exists')

    // Create index if it doesn't exist
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id)
    `)
    console.log('✅ Migration: Created index on credit_transactions')

  } catch (error) {
    console.error('Migration error:', error)
    throw error
  }
}

export default runMigrations
