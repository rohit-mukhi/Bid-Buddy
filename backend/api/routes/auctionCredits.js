import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import pool from '../../config/database.js';

const router = express.Router();

// POST - Assign auction-specific credits
router.post('/assign', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { auctionId, userEmail, amount, description } = req.body;
    const adminEmail = req.user.email;

    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    // Verify admin owns this auction with lock
    const auctionCheck = await client.query(
      `SELECT a.id FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1 AND u.email = $2
       FOR UPDATE`,
      [auctionId, adminEmail]
    );

    if (auctionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get user ID
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;
    const creditAmount = parseFloat(amount);

    // ATOMIC LOCK: Lock existing credit record or insert with lock
    await client.query(
      `INSERT INTO auction_credits (auction_id, user_id, assigned_credits, remaining_credits)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (auction_id, user_id) 
       DO UPDATE SET 
         assigned_credits = auction_credits.assigned_credits + $3,
         remaining_credits = auction_credits.remaining_credits + $3`,
      [auctionId, userId, creditAmount]
    );

    // Record transaction
    await client.query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, auction_id)
       VALUES ($1, $2, 'add', $3, $4)`,
      [userId, creditAmount, description || `Credits assigned for auction ${auctionId}`, auctionId]
    );

    await client.query('COMMIT');

    console.log(`[ATOMIC-LOCK] Credits assigned: $${creditAmount} to ${userEmail} for auction ${auctionId}`);

    res.json({ 
      success: true, 
      message: 'Credits assigned successfully',
      amount: creditAmount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ATOMIC-LOCK] Error assigning auction credits:', error);
    
    // Handle serialization failures
    if (error.code === '40001') {
      return res.status(409).json({ 
        error: 'Credit assignment conflict. Please try again.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to assign credits' });
  } finally {
    client.release();
  }
});

// GET - Get user's credits for specific auction
router.get('/auction/:auctionId', verifyToken, async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userEmail = req.user.email;

    const result = await pool.query(
      `SELECT ac.* FROM auction_credits ac
       JOIN users u ON ac.user_id = u.id
       WHERE ac.auction_id = $1 AND u.email = $2`,
      [auctionId, userEmail]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        assigned_credits: 0,
        used_credits: 0,
        remaining_credits: 0
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching auction credits:', error);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

export default router;
