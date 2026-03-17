import pool from './config/database.js'

const runMigration = async () => {
  const client = await pool.connect()
  
  try {
    console.log('Starting migration...')
    
    // Add credits column if it doesn't exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS credits DECIMAL(10, 2) DEFAULT 0
    `)
    console.log('✅ Added credits column to users table')

    // Update existing users to have 0 credits if NULL
    await client.query(`
      UPDATE users SET credits = 0 WHERE credits IS NULL
    `)
    console.log('✅ Updated existing users with default credits')

    // Ensure credit_transactions table exists
    await client.query(`
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
    console.log('✅ Ensured credit_transactions table exists')

    // Create index if it doesn't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id)
    `)
    console.log('✅ Created index on credit_transactions')

    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
