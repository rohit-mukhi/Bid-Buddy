import express from 'express';
import cors from 'cors';
import ragRoutes from './api/routes/rag.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/rag', ragRoutes);

const server = app.listen(3001, async () => {
  console.log('✓ Test server started on port 3001\n');
  
  try {
    // Test RAG search endpoint
    console.log('Testing RAG /api/rag/search endpoint...');
    const searchResponse = await fetch('http://localhost:3001/api/rag/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: 'What is the price?', 
        auctionId: 1, 
        topK: 3 
      })
    });
    
    const searchData = await searchResponse.json();
    
    if (searchData.success) {
      console.log('✓ RAG search endpoint working');
      console.log(`  Retrieved ${searchData.chunks.length} chunks for query: "${searchData.query}"`);
      searchData.chunks.forEach((chunk, idx) => {
        console.log(`  [${idx+1}] (${(chunk.similarity * 100).toFixed(1)}% match) [${chunk.type}]:`);
        console.log(`      ${chunk.text.substring(0, 80)}...`);
      });
    } else {
      console.log('✗ RAG search failed:', searchData.error);
    }
    
    console.log('\n✓ All RAG tests passed!');
    server.close();
    process.exit(0);
    
  } catch (error) {
    console.error('✗ RAG test failed:', error.message);
    server.close();
    process.exit(1);
  }
});
