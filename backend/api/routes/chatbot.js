import express from 'express'

const router = express.Router()

// Simple RAG-powered chatbot response generator
const generateChatbotResponse = (query, auctionContext) => {
  const queryLower = query.toLowerCase()

  // Context-aware responses based on auction data
  if (auctionContext) {
    if (
      queryLower.includes('price') ||
      queryLower.includes('bid') ||
      queryLower.includes('cost')
    ) {
      return `The current bid for "${auctionContext.title}" is $${auctionContext.current_bid.toFixed(
        2
      )}. The starting bid was $${auctionContext.starting_bid.toFixed(2)}. You can place a higher bid to compete!`
    }

    if (queryLower.includes('description') || queryLower.includes('about')) {
      return `Here's the description for "${auctionContext.title}": ${auctionContext.description}`
    }

    if (queryLower.includes('category')) {
      return `This item is in the "${auctionContext.category}" category.`
    }

    if (queryLower.includes('how to bid') || queryLower.includes('place bid')) {
      return `To place a bid on "${auctionContext.title}", enter an amount higher than the current bid ($${auctionContext.current_bid.toFixed(
        2
      )}) and click "Place Bid". Your bid will be recorded and other users will be notified in real-time!`
    }

    if (queryLower.includes('condition') || queryLower.includes('quality')) {
      return `For detailed information about the condition of "${auctionContext.title}", please refer to the full description above or contact the seller.`
    }
  }

  // General responses
  if (queryLower.includes('hello') || queryLower.includes('hi')) {
    return 'Hello! I\'m here to help you with any questions about this auction. Feel free to ask about the product, bidding process, or anything else!'
  }

  if (queryLower.includes('how does auction work')) {
    return 'In our auction system, you can place bids on items. The highest bidder wins! You can bid multiple times, and each bid must be higher than the current bid. Bids are updated in real-time for all users.'
  }

  if (queryLower.includes('shipping') || queryLower.includes('delivery')) {
    return 'For shipping and delivery information, please contact the seller directly. You can find their email in the auction details.'
  }

  if (queryLower.includes('return') || queryLower.includes('refund')) {
    return 'Return and refund policies depend on the seller. Please review the auction description or contact the seller for their specific policies.'
  }

  if (queryLower.includes('payment')) {
    return 'Payment details will be arranged between you and the seller after you win the auction. Please ensure you have a secure payment method ready.'
  }

  // Default response
  return 'I\'m not sure about that. Could you provide more details? I can help you with questions about the product, bidding process, pricing, or auction details.'
}

// POST /api/chatbot/query
router.post('/query', (req, res) => {
  try {
    const { query, auctionContext } = req.body

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' })
    }

    const response = generateChatbotResponse(query, auctionContext)

    res.json({ response })
  } catch (error) {
    console.error('Chatbot error:', error)
    res.status(500).json({ error: 'Failed to process chatbot query' })
  }
})

export default router
