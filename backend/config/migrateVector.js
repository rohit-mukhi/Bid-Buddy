import pool from './database.js';

async function addVectorSupport() {
  const client = await pool.connect();
  
  try {
    console.log('Adding pgvector extension and embeddings support...');

    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✓ pgvector extension enabled');

    // Create product_chunks table for RAG (stores chunked product facts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_chunks (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        chunk_type VARCHAR(50),
        embedding vector(512),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created product_chunks table');

    // Create index for fast similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS product_chunks_embedding_idx 
      ON product_chunks 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log('✓ Created vector similarity index');

    console.log('Vector support migration completed successfully!');
  } catch (error) {
    console.error('Error adding vector support:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default addVectorSupport;
