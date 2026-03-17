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

// GET - Get user's current credits
router.get('/balance', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email

    const result = await pool.query(
      'SELECT credits FROM users WHERE email = $1',
      [userEmail]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ credits: parseFloat(result.rows[0].credits) })
  } catch (error) {
    console.error('Error fetching credits:', error)
    res.status(500).json({ error: 'Failed to fetch credits' })
  }
})

// GET - Get credit transaction history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email

    const result = await pool.query(
      `SELECT ct.id, ct.amount, ct.transaction_type, ct.description, ct.created_at
       FROM credit_transactions ct
       JOIN users u ON ct.user_id = u.id
       WHERE u.email = $1
       ORDER BY ct.created_at DESC`,
      [userEmail]
    )

    res.json({ transactions: result.rows })
  } catch (error) {
    console.error('Error fetching transaction history:', error)
    res.status(500).json({ error: 'Failed to fetch transaction history' })
  }
})

// POST - Admin: Add credits to user
router.post('/add', verifyToken, checkAdmin, async (req, res) => {
  const client = await pool.connect()

  try {
    const { userEmail, amount, description } = req.body

    if (!userEmail || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid user email or amount' })
    }

    await client.query('BEGIN')

    // Get user
    const userResult = await client.query(
      'SELECT id, credits FROM users WHERE email = $1',
      [userEmail]
    )

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'User not found' })
    }

    const userId = userResult.rows[0].id
    const newCredits = parseFloat(userResult.rows[0].credits) + parseFloat(amount)

    // Update user credits
    await client.query(
      'UPDATE users SET credits = $1 WHERE id = $2',
      [newCredits, userId]
    )

    // Record transaction
    await client.query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
       VALUES ($1, $2, 'add', $3)`,
      [userId, parseFloat(amount), description || 'Admin credit addition']
    )

    await client.query('COMMIT')

    res.json({
      success: true,
      message: 'Credits added successfully',
      newBalance: newCredits,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error adding credits:', error)
    res.status(500).json({ error: 'Failed to add credits' })
  } finally {
    client.release()
  }
})

// POST - Admin: Deduct credits from user
router.post('/deduct', verifyToken, checkAdmin, async (req, res) => {
  const client = await pool.connect()

  try {
    const { userEmail, amount, description } = req.body

    if (!userEmail || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid user email or amount' })
    }

    await client.query('BEGIN')

    // Get user
    const userResult = await client.query(
      'SELECT id, credits FROM users WHERE email = $1',
      [userEmail]
    )

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'User not found' })
    }

    const userId = userResult.rows[0].id
    const currentCredits = parseFloat(userResult.rows[0].credits)
    const deductAmount = parseFloat(amount)

    if (currentCredits < deductAmount) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Insufficient credits' })
    }

    const newCredits = currentCredits - deductAmount

    // Update user credits
    await client.query(
      'UPDATE users SET credits = $1 WHERE id = $2',
      [newCredits, userId]
    )

    // Record transaction
    await client.query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
       VALUES ($1, $2, 'deduct', $3)`,
      [userId, deductAmount, description || 'Admin credit deduction']
    )

    await client.query('COMMIT')

    res.json({
      success: true,
      message: 'Credits deducted successfully',
      newBalance: newCredits,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error deducting credits:', error)
    res.status(500).json({ error: 'Failed to deduct credits' })
  } finally {
    client.release()
  }
})

// GET - Admin: Get all users with their credits
router.get('/users', verifyToken, checkAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, credits, is_admin, is_bidder, created_at
       FROM users
       ORDER BY created_at DESC`
    )

    res.json({ users: result.rows })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

export default router
