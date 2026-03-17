import * as qna from '@tensorflow-models/qna';
import { getApiUrl } from '../lib/api'
import '@tensorflow/tfjs';

class AIConcierge {
  private qnaModel: any = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;

  async initialize() {
    if (this.isReady) return;
    if (this.isLoading) {
      await new Promise<void>(resolve => {
        const checkReady = setInterval(() => {
          if (this.isReady) {
            clearInterval(checkReady);
            resolve();
          }
        }, 100);
      });
      return;
    }

    this.isLoading = true;
    console.log('[AI Concierge] Loading Q&A model...');

    try {
      this.qnaModel = await qna.load();
      console.log('[AI Concierge] ✓ Q&A model loaded');

      this.isReady = true;
      this.isLoading = false;
      console.log('[AI Concierge] Ready!');
    } catch (error) {
      console.error('[AI Concierge] Failed to load model:', error);
      this.isLoading = false;
      throw error;
    }
  }

  async retrieveRelevantChunks(query: string, auctionId: number) {
    try {
      const response = await fetch(getApiUrl('/api/rag/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          auctionId,
          topK: 3
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve chunks');
      }

      const data = await response.json();
      return data.chunks || [];
    } catch (error) {
      console.error('[RAG] Retrieval error:', error);
      return [];
    }
  }

  async answerQuestion(question: string, auctionData: any) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      console.log('[RAG] Step 1: Retrieving relevant chunks...');
      
      const retrievedChunks = await this.retrieveRelevantChunks(question, auctionData.id);
      
      if (retrievedChunks.length === 0) {
        console.log('[RAG] No chunks found, using fallback');
        return this.generateFallbackResponse(question, auctionData);
      }

      console.log(`[RAG] Step 2: Retrieved ${retrievedChunks.length} chunks`);
      retrievedChunks.forEach((chunk: any, idx: number) => {
        console.log(`  Chunk ${idx + 1} (${(chunk.similarity * 100).toFixed(1)}%): ${chunk.text.substring(0, 50)}...`);
      });

      const retrievedContext = retrievedChunks
        .map((chunk: any) => chunk.text)
        .join(' ');

      const fullContext = `
Product: ${auctionData.title}
Category: ${auctionData.category}

Relevant Information:
${retrievedContext}
      `;

      console.log('[RAG] Step 3: Generating answer with SLM...');

      const answers = await this.qnaModel.findAnswers(question, fullContext);

      if (answers && answers.length > 0 && answers[0].score > 0.1) {
        console.log(`[RAG] Answer generated with ${(answers[0].score * 100).toFixed(1)}% confidence`);
        return {
          answer: answers[0].text,
          confidence: answers[0].score,
          source: 'rag_model',
          retrievedChunks: retrievedChunks.length
        };
      }

      return this.generateAnswerFromChunks(question, retrievedChunks, auctionData);
    } catch (error) {
      console.error('[RAG] Error in RAG pipeline:', error);
      return this.generateFallbackResponse(question, auctionData);
    }
  }

  generateAnswerFromChunks(question: string, chunks: any[], auctionData: any) {
    const queryLower = question.toLowerCase();

    if (queryLower.includes('price') || queryLower.includes('bid') || queryLower.includes('cost')) {
      const pricingChunk = chunks.find((c: any) => c.type === 'pricing');
      if (pricingChunk) {
        return {
          answer: pricingChunk.text,
          confidence: 0.9,
          source: 'rag_chunks',
          retrievedChunks: chunks.length
        };
      }
    }

    if (chunks.length > 0) {
      return {
        answer: chunks[0].text,
        confidence: chunks[0].similarity,
        source: 'rag_chunks',
        retrievedChunks: chunks.length
      };
    }

    return this.generateFallbackResponse(question, auctionData);
  }

  generateFallbackResponse(question: string, auctionData: any) {
    const queryLower = question.toLowerCase();

    if (queryLower.includes('price') || queryLower.includes('bid') || queryLower.includes('cost')) {
      return {
        answer: `Current bid: $${auctionData.current_bid.toFixed(2)}`,
        confidence: 0.9,
        source: 'rule_based',
        retrievedChunks: 0
      };
    }

    if (queryLower.includes('description') || queryLower.includes('about') || queryLower.includes('what is')) {
      return {
        answer: auctionData.description,
        confidence: 0.9,
        source: 'rule_based',
        retrievedChunks: 0
      };
    }

    if (queryLower.includes('category')) {
      return {
        answer: `Category: ${auctionData.category}`,
        confidence: 0.9,
        source: 'rule_based',
        retrievedChunks: 0
      };
    }

    return {
      answer: `Ask me about the price, description, or category.`,
      confidence: 0.5,
      source: 'fallback',
      retrievedChunks: 0
    };
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading
    };
  }
}

const aiConcierge = new AIConcierge();

export default aiConcierge;
