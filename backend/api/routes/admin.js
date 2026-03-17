import express from 'express'
import { verifyToken } from '../middleware/auth.js'
import pool from '../../config/database.js'

const router = express.Router()

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' })
  }
  next()
}

// GET all users
router.get('/users', verifyToken, checkAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, is_admin, is_bidder, created_at 
       FROM users 
       ORDER BY created_at DESC`
    )

    res.json({ users: result.rows })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// GET user statistics
router.get('/stats', verifyToken, checkAdmin, async (req, res) => {
  try {
    const adminCount = await pool.query('SELECT COUNT(*) FROM users WHERE is_admin = true')
    const bidderCount = await pool.query('SELECT COUNT(*) FROM users WHERE is_bidder = true AND is_admin = false')
    const auctionCount = await pool.query('SELECT COUNT(*) FROM auctions')
    const bidCount = await pool.query('SELECT COUNT(*) FROM bids')

    res.json({
      stats: {
        admins: parseInt(adminCount.rows[0].count),
        bidders: parseInt(bidderCount.rows[0].count),
        auctions: parseInt(auctionCount.rows[0].count),
        bids: parseInt(bidCount.rows[0].count),
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

// GET bidders for a specific auction
router.get('/auction/:auctionId/bidders', verifyToken, checkAdmin, async (req, res) => {
  try {
    const { auctionId } = req.params

    if (!auctionId) {
      return res.status(400).json({ error: 'Auction ID is required' })
    }

    const result = await pool.query(
      `SELECT b.id, b.user_id, b.bid_amount, b.created_at, u.email as bidder_email
       FROM bids b
       JOIN users u ON b.user_id = u.id
       WHERE b.auction_id = $1
       ORDER BY b.bid_amount DESC`,
      [parseInt(auctionId)]
    )

    res.json({ bidders: result.rows || [] })
  } catch (error) {
    console.error('Error fetching bidders:', error)
    res.status(500).json({ error: 'Failed to fetch bidders', details: error.message })
  }
})

// GET all active bids across all auctions (Live Monitoring)
router.get('/live-bids', verifyToken, checkAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         b.id as bid_id,
         b.bid_amount,
         b.created_at as bid_time,
         a.id as auction_id,
         a.title as auction_title,
         a.current_bid,
         a.status as auction_status,
         a.expires_at,
         u.email as bidder_email,
         (b.bid_amount >= a.current_bid) as is_winning
       FROM bids b
       JOIN auctions a ON b.auction_id = a.id
       JOIN users u ON b.user_id = u.id
       WHERE a.status = 'active'
       ORDER BY b.created_at DESC`
    )

    res.json({ bids: result.rows })
  } catch (error) {
    console.error('Error fetching live bids:', error)
    res.status(500).json({ error: 'Failed to fetch live bids' })
  }
})

export default router
