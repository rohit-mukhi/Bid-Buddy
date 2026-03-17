import express from 'express'
import { verifyToken } from '../middleware/auth.js'
import pool from '../../config/database.js'

const router = express.Router()

// GET - Check bidding status for user on specific auction (MUST BE BEFORE POST /requests/:auctionId)
router.get('/requests/:auctionId/status', verifyToken, async (req, res) => {
  try {
    const { auctionId } = req.params
    const userEmail = req.user.email

    // Get user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userId = userResult.rows[0].id
    console.log(`[STATUS CHECK] Checking status for user ${userId} on auction ${auctionId}`)

    // Check if request exists FIRST (to catch rejected status)
    const requestResult = await pool.query(
      'SELECT status FROM bidding_requests WHERE auction_id = $1 AND user_id = $2',
      [auctionId, userId]
    )

    console.log(`[STATUS CHECK] bidding_requests query returned ${requestResult.rows.length} rows:`, requestResult.rows)

    if (requestResult.rows.length > 0) {
      // Return the actual request status (pending, approved, or rejected)
      console.log(`[STATUS CHECK] Returning status from bidding_requests: ${requestResult.rows[0].status}`)
      return res.json({ status: requestResult.rows[0].status })
    }

    // If no request exists, check if already approved (legacy check)
    const approvedResult = await pool.query(
      'SELECT id FROM auction_bidders WHERE auction_id = $1 AND user_id = $2',
      [auctionId, userId]
    )

    console.log(`[STATUS CHECK] auction_bidders query returned ${approvedResult.rows.length} rows`)

    if (approvedResult.rows.length > 0) {
      console.log(`[STATUS CHECK] Returning 'approved' from auction_bidders fallback`)
      return res.json({ status: 'approved' })
    }

    // No request and not approved
    console.log(`[STATUS CHECK] No request found, returning 'none'`)
    res.json({ status: 'none' })
  } catch (error) {
    console.error('Error checking bidding status:', error)
    res.status(500).json({ error: 'Failed to check bidding status' })
  }
})

// POST - Submit bidding request (MUST BE BEFORE GET /requests/:auctionId)
router.post('/requests/:auctionId', verifyToken, async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { auctionId } = req.params
    const userEmail = req.user.email

    // Get user
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userId = userResult.rows[0].id

    // Check if auction exists
    const auctionResult = await client.query(
      'SELECT * FROM auctions WHERE id = $1',
      [auctionId]
    )

    if (auctionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' })
    }

    const auction = auctionResult.rows[0]

    // Check if user is the seller
    if (auction.user_id === userId) {
      return res.status(400).json({ error: 'You cannot request to bid on your own auction' })
    }

    // Check if already approved
    const approvedResult = await client.query(
      'SELECT id FROM auction_bidders WHERE auction_id = $1 AND user_id = $2',
      [auctionId, userId]
    )

    if (approvedResult.rows.length > 0) {
      return res.status(400).json({ error: 'You are already approved for this auction' })
    }

    // Check if request already exists
    const existingResult = await client.query(
      'SELECT id, status FROM bidding_requests WHERE auction_id = $1 AND user_id = $2',
      [auctionId, userId]
    )

    if (existingResult.rows.length > 0) {
      const request = existingResult.rows[0]
      if (request.status === 'pending') {
        return res.status(400).json({ error: 'You already have a pending request for this auction' })
      }
      if (request.status === 'rejected') {
        // Allow re-requesting by updating the existing rejected request to pending
        await client.query(
          `UPDATE bidding_requests 
           SET status = 'pending', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [request.id]
        )
        
        res.status(201).json({
          success: true,
          message: 'Bidding request resubmitted successfully',
          request: { ...request, status: 'pending' },
        })
        return
      }
    }

    // Create bidding request
    const insertResult = await client.query(
      `INSERT INTO bidding_requests (auction_id, user_id, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING *`,
      [auctionId, userId]
    )

    res.status(201).json({
      success: true,
      message: 'Bidding request submitted successfully',
      request: insertResult.rows[0],
    })
  } catch (error) {
    console.error('Error submitting bidding request:', error)
    res.status(500).json({ error: 'Failed to submit bidding request' })
  } finally {
    client.release()
  }
})

// GET - Get bidding requests for an auction (admin only) - MUST BE AFTER POST
router.get('/requests/:auctionId', verifyToken, async (req, res) => {
  try {
    const { auctionId } = req.params
    const userEmail = req.user.email

    // Check if user is admin of this auction
    const auctionResult = await pool.query(
      `SELECT a.* FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1 AND u.email = $2`,
      [auctionId, userEmail]
    )

    if (auctionResult.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to view these requests' })
    }

    // Get all requests for this auction
    const result = await pool.query(
      `SELECT br.id, br.auction_id, br.user_id, br.status, br.created_at, u.email as bidder_email
       FROM bidding_requests br
       JOIN users u ON br.user_id = u.id
       WHERE br.auction_id = $1
       ORDER BY br.created_at DESC`,
      [auctionId]
    )

    res.json({ requests: result.rows })
  } catch (error) {
    console.error('Error fetching bidding requests:', error)
    res.status(500).json({ error: 'Failed to fetch bidding requests' })
  }
})

// POST - Approve bidding request (admin only)
router.post('/request/:requestId/approve', verifyToken, async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { requestId } = req.params
    const userEmail = req.user.email

    // Get the request
    const requestResult = await client.query(
      'SELECT * FROM bidding_requests WHERE id = $1',
      [requestId]
    )

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const request = requestResult.rows[0]

    // Check if user is admin of this auction
    const auctionResult = await client.query(
      `SELECT a.* FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1 AND u.email = $2`,
      [request.auction_id, userEmail]
    )

    if (auctionResult.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to approve this request' })
    }

    await client.query('BEGIN')

    // Update request status
    await client.query(
      'UPDATE bidding_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['approved', requestId]
    )

    // Add bidder to auction_bidders table
    await client.query(
      `INSERT INTO auction_bidders (auction_id, user_id) 
       VALUES ($1, $2)
       ON CONFLICT (auction_id, user_id) DO NOTHING`,
      [request.auction_id, request.user_id]
    )

    await client.query('COMMIT')

    res.json({
      success: true,
      message: 'Bidding request approved successfully',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error approving bidding request:', error)
    res.status(500).json({ error: 'Failed to approve bidding request' })
  } finally {
    client.release()
  }
})

// POST - Reject bidding request (admin only)
router.post('/request/:requestId/reject', verifyToken, async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { requestId } = req.params
    const userEmail = req.user.email

    // Get the request
    const requestResult = await client.query(
      'SELECT * FROM bidding_requests WHERE id = $1',
      [requestId]
    )

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const request = requestResult.rows[0]

    // Check if user is admin of this auction
    const auctionResult = await client.query(
      `SELECT a.* FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1 AND u.email = $2`,
      [request.auction_id, userEmail]
    )

    if (auctionResult.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to reject this request' })
    }

    // Update request status
    await client.query(
      'UPDATE bidding_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['rejected', requestId]
    )

    res.json({
      success: true,
      message: 'Bidding request rejected successfully',
    })
  } catch (error) {
    console.error('Error rejecting bidding request:', error)
    res.status(500).json({ error: 'Failed to reject bidding request' })
  } finally {
    client.release()
  }
})

// GET - Get approved bidders for an auction
router.get('/auction/:auctionId/bidders', verifyToken, async (req, res) => {
  try {
    const { auctionId } = req.params
    const userEmail = req.user.email

    // Check if user is admin of this auction
    const auctionResult = await pool.query(
      `SELECT a.* FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1 AND u.email = $2`,
      [auctionId, userEmail]
    )

    if (auctionResult.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to view these bidders' })
    }

    // Get all approved bidders
    const result = await pool.query(
      `SELECT ab.id, ab.user_id, ab.approved_at, u.email as bidder_email, u.credits as credits_assigned
       FROM auction_bidders ab
       JOIN users u ON ab.user_id = u.id
       WHERE ab.auction_id = $1
       ORDER BY ab.approved_at DESC`,
      [auctionId]
    )

    res.json({ bidders: result.rows })
  } catch (error) {
    console.error('Error fetching approved bidders:', error)
    res.status(500).json({ error: 'Failed to fetch approved bidders' })
  }
})

// DELETE - Remove approved bidder from auction
router.delete('/auction/:auctionId/bidder/:bidderId', verifyToken, async (req, res) => {
  console.log(`[DELETE ENDPOINT] Called with auctionId: ${req.params.auctionId}, bidderId: ${req.params.bidderId}`)
  const client = await pool.connect()
  
  try {
    const { auctionId, bidderId } = req.params
    const userEmail = req.user.email

    // Check if user is admin of this auction
    const auctionResult = await client.query(
      `SELECT a.* FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1 AND u.email = $2`,
      [auctionId, userEmail]
    )

    if (auctionResult.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to remove bidders' })
    }

    await client.query('BEGIN')

    // Get the user_id from auction_bidders before deleting
    const bidderResult = await client.query(
      'SELECT user_id FROM auction_bidders WHERE id = $1 AND auction_id = $2',
      [bidderId, auctionId]
    )

    if (bidderResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Bidder not found' })
    }

    const userId = bidderResult.rows[0].user_id
    console.log(`[DELETE] Removing bidder ${bidderId} (userId: ${userId}) from auction ${auctionId}`)

    // Remove bidder from auction_bidders
    const deleteResult = await client.query(
      'DELETE FROM auction_bidders WHERE id = $1 AND auction_id = $2',
      [bidderId, auctionId]
    )
    console.log(`[DELETE] Deleted ${deleteResult.rowCount} rows from auction_bidders`)

    // Update or delete the bidding request status to 'rejected'
    const updateResult = await client.query(
      `UPDATE bidding_requests 
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
       WHERE auction_id = $1 AND user_id = $2`,
      [auctionId, userId]
    )
    console.log(`[DELETE] Updated ${updateResult.rowCount} rows in bidding_requests to 'rejected'`)

    await client.query('COMMIT')
    console.log(`[DELETE] Transaction committed successfully`)

    res.json({
      success: true,
      message: 'Bidder removed successfully',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error removing bidder:', error)
    res.status(500).json({ error: 'Failed to remove bidder' })
  } finally {
    client.release()
  }
})

export default router
