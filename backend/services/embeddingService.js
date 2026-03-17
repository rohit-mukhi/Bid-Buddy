import pool from '../config/database.js';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import '@tensorflow/tfjs-node';

let model = null;

async function loadModel() {
  if (!model) {
    console.log('Loading Universal Sentence Encoder...');
    model = await use.load();
    console.log('✓ Model loaded successfully');
  }
  return model;
}

// Chunk product description into smaller facts for better retrieval
function chunkProductDescription(auction) {
  const chunks = [];

  // Chunk 1: Title and basic info
  chunks.push({
    text: `Product: ${auction.title}. Category: ${auction.category}.`,
    type: 'title_category'
  });

  // Chunk 2: Pricing information
  chunks.push({
    text: `Starting bid: $${auction.starting_bid}. Current bid: $${auction.current_bid || auction.starting_bid}.`,
    type: 'pricing'
  });

  // Chunk 3-N: Split description into sentences
  const description = auction.description;
  const sentences = description.match(/[^.!?]+[.!?]+/g) || [description];
  
  sentences.forEach((sentence, idx) => {
    if (sentence.trim().length > 10) {
      chunks.push({
        text: sentence.trim(),
        type: `description_${idx + 1}`
      });
    }
  });

  return chunks;
}

async function generateEmbedding(text) {
  const encoder = await loadModel();
  const embeddings = await encoder.embed([text]);
  const embeddingArray = await embeddings.array();
  return embeddingArray[0];
}

async function storeProductChunks(auctionId, chunks) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing chunks for this auction
    await client.query('DELETE FROM product_chunks WHERE auction_id = $1', [auctionId]);

    // Insert new chunks with embeddings
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.text);
      const embeddingStr = `[${embedding.join(',')}]`;
      
      await client.query(
        `INSERT INTO product_chunks (auction_id, chunk_text, chunk_type, embedding) 
         VALUES ($1, $2, $3, $4)`,
        [auctionId, chunk.text, chunk.type, embeddingStr]
      );
    }

    await client.query('COMMIT');
    console.log(`✓ Stored ${chunks.length} chunks for auction ${auctionId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function generateChunksForAuction(auctionId) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, title, description, category, starting_bid, current_bid FROM auctions WHERE id = $1',
      [auctionId]
    );

    if (rows.length === 0) {
      throw new Error('Auction not found');
    }

    const auction = rows[0];
    const chunks = chunkProductDescription(auction);
    await storeProductChunks(auctionId, chunks);

    return chunks.length;
  } finally {
    client.release();
  }
}

async function generateChunksForAllAuctions() {
  const client = await pool.connect();
  try {
    const { rows: auctions } = await client.query(
      'SELECT id, title, description, category, starting_bid, current_bid FROM auctions'
    );

    console.log(`Generating chunks for ${auctions.length} auctions...`);

    for (const auction of auctions) {
      const chunks = chunkProductDescription(auction);
      await storeProductChunks(auction.id, chunks);
    }

    console.log('✓ All chunks generated successfully');
  } finally {
    client.release();
  }
}

export { generateChunksForAllAuctions, generateChunksForAuction, generateEmbedding };
