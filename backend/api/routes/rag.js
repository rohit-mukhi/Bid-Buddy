import express from 'express';
import pool from '../../config/database.js';
import { generateEmbedding } from '../../services/embeddingService.js';

const router = express.Router();

// POST /api/rag/search - Semantic search for relevant product chunks
router.post('/search', async (req, res) => {
  try {
    const { query, auctionId, topK = 3 } = req.body;

    if (!query || !auctionId) {
      return res.status(400).json({ error: 'Query and auctionId are required' });
    }

    console.log(`[RAG] Searching for: "${query}" in auction ${auctionId}`);

    // Generate embedding for user query
    const queryEmbedding = await generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Perform vector similarity search using pgvector
    const result = await pool.query(
      `SELECT 
         id,
         chunk_text,
         chunk_type,
         1 - (embedding <=> $1::vector) as similarity
       FROM product_chunks
       WHERE auction_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [embeddingStr, auctionId, topK]
    );

    const chunks = result.rows.map(row => ({
      text: row.chunk_text,
      type: row.chunk_type,
      similarity: parseFloat(row.similarity)
    }));

    console.log(`[RAG] Found ${chunks.length} relevant chunks`);

    res.json({
      success: true,
      chunks,
      query
    });
  } catch (error) {
    console.error('[RAG] Search error:', error);
    res.status(500).json({ error: 'Failed to perform semantic search' });
  }
});

// POST /api/rag/generate-chunks - Generate chunks for an auction
router.post('/generate-chunks/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;

    const { generateChunksForAuction } = await import('../../services/embeddingService.js');
    const chunkCount = await generateChunksForAuction(auctionId);

    res.json({
      success: true,
      message: `Generated ${chunkCount} chunks for auction ${auctionId}`,
      chunkCount
    });
  } catch (error) {
    console.error('[RAG] Chunk generation error:', error);
    res.status(500).json({ error: 'Failed to generate chunks' });
  }
});

export default router;
