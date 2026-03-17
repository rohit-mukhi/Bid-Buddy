import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import pool from '../../config/database.js';
import { uploadImage, deleteImage } from '../../utils/cloudinaryHelper.js';
import { io } from '../../index.js';

const router = express.Router();

// SPECIFIC ROUTES MUST COME BEFORE GENERIC /:id ROUTE

// Get auctions by user
router.get('/my-auctions', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const result = await pool.query(
      `SELECT a.*, 
              (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as bids
       FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE u.email = $1
       ORDER BY a.created_at DESC`,
      [userEmail]
    );

    res.json({ auctions: result.rows });
  } catch (error) {
    console.error('Error fetching auctions:', error);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

// Get user's bids
router.get('/my-bids', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const result = await pool.query(
      `SELECT b.id, b.auction_id, b.bid_amount, b.created_at,
              a.title as auction_title, a.image_url as auction_image_url, 
              a.status as auction_status, a.current_bid as auction_current_bid,
              (b.bid_amount >= a.current_bid) as is_winning
       FROM bids b
       JOIN auctions a ON b.auction_id = a.id
       JOIN users u ON b.user_id = u.id
       WHERE u.email = $1
       ORDER BY b.created_at DESC`,
      [userEmail]
    );

    res.json({ bids: result.rows });
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// Get all active auctions
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, 
              u.email as seller_email,
              (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as bids
       FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE a.status = 'active' AND a.expires_at > NOW()
       ORDER BY a.created_at DESC`
    );

    res.json({ auctions: result.rows });
  } catch (error) {
    console.error('Error fetching auctions:', error);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

// Create auction
router.post('/create', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { title, description, startingBid, category, duration, image } = req.body;
    const userEmail = req.user.email;

    // Get or create user
    let userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );

    let userId;
    if (userResult.rows.length === 0) {
      const insertUser = await client.query(
        'INSERT INTO users (email, is_admin, is_bidder) VALUES ($1, $2, $3) RETURNING id',
        [userEmail, req.user.isAdmin, req.user.isBidder]
      );
      userId = insertUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // Upload image to Cloudinary
    const { url: imageUrl, publicId } = await uploadImage(image);

    // Parse duration - can be integer or decimal (e.g., 24.5 for 24h 30m)
    const durationHours = parseFloat(duration);
    if (isNaN(durationHours) || durationHours <= 0 || durationHours > 720) {
      return res.status(400).json({ error: 'Duration must be between 0 and 720 hours' });
    }

    // Calculate expiry date using decimal hours
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    // Insert auction into database
    const result = await client.query(
      `INSERT INTO auctions 
       (user_id, title, description, starting_bid, current_bid, category, duration_hours, image_url, cloudinary_public_id, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [userId, title, description, parseFloat(startingBid), parseFloat(startingBid), category, durationHours, imageUrl, publicId, expiresAt]
    );

    const newAuction = result.rows[0];

    // Generate RAG chunks for the new auction (async, don't wait)
    import('../services/embeddingService.js').then(({ generateChunksForAuction }) => {
      generateChunksForAuction(newAuction.id).catch(err => {
        console.error(`Failed to generate chunks for auction ${newAuction.id}:`, err);
      });
    });

    res.status(201).json({ 
      success: true, 
      auction: newAuction 
    });
  } catch (error) {
    console.error('Error creating auction:', error);
    res.status(500).json({ error: 'Failed to create auction' });
  } finally {
    client.release();
  }
});

// Get top 3 bids for an auction
router.get('/:id/top-bids', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.bid_amount, b.created_at, u.email as bidder_email
       FROM bids b
       JOIN users u ON b.user_id = u.id
       WHERE b.auction_id = $1
       ORDER BY b.bid_amount DESC, b.created_at ASC
       LIMIT 3`,
      [req.params.id]
    );

    res.json({ topBids: result.rows });
  } catch (error) {
    console.error('Error fetching top bids:', error);
    res.status(500).json({ error: 'Failed to fetch top bids' });
  }
});

// Get single auction
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, 
              u.email as seller_email,
              (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as bids
       FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.json({ auction: result.rows[0] });
  } catch (error) {
    console.error('Error fetching auction:', error);
    res.status(500).json({ error: 'Failed to fetch auction' });
  }
});

// Place bid on auction
router.post('/:id/bid', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { bidAmount } = req.body;
    const auctionId = req.params.id;
    const userEmail = req.user.email;

    // Start transaction with SERIALIZABLE isolation level for maximum safety
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    // Get or create user
    let userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );

    let userId;
    if (userResult.rows.length === 0) {
      const insertUser = await client.query(
        'INSERT INTO users (email, is_admin, is_bidder, credits) VALUES ($1, $2, $3, $4) RETURNING id',
        [userEmail, req.user.isAdmin, req.user.isBidder, 0]
      );
      userId = insertUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // ATOMIC LOCK: Acquire row-level lock on auction to prevent concurrent modifications
    const auctionResult = await client.query(
      'SELECT * FROM auctions WHERE id = $1 FOR UPDATE',
      [auctionId]
    );

    if (auctionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Auction not found' });
    }

    const auction = auctionResult.rows[0];

    // Check if user is trying to bid on their own auction
    if (auction.user_id === userId) {
      return res.status(403).json({ error: 'You cannot bid on your own auction' });
    }

    // Check if bidder is approved for this auction
    const approvedResult = await client.query(
      'SELECT id FROM auction_bidders WHERE auction_id = $1 AND user_id = $2',
      [auctionId, userId]
    );

    if (approvedResult.rows.length === 0) {
      return res.status(403).json({ error: 'You are not approved to bid on this auction. Please submit a bidding request.' });
    }

    // Check if auction is still active
    if (auction.status !== 'active' || new Date(auction.expires_at) <= new Date()) {
      return res.status(400).json({ error: 'Auction is no longer active' });
    }

    // Check if bid is higher than current bid
    const bidAmountNum = parseFloat(bidAmount);
    if (bidAmountNum <= parseFloat(auction.current_bid)) {
      return res.status(400).json({ 
        error: `Bid must be higher than current bid of $${auction.current_bid}` 
      });
    }

    // ATOMIC LOCK: Acquire row-level lock on user's auction credits to prevent double-spend
    const auctionCreditsResult = await client.query(
      'SELECT remaining_credits FROM auction_credits WHERE auction_id = $1 AND user_id = $2 FOR UPDATE',
      [auctionId, userId]
    );

    if (auctionCreditsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'No credits assigned for this auction. Please contact the auction admin.' 
      });
    }

    const remainingCredits = parseFloat(auctionCreditsResult.rows[0].remaining_credits);

    if (remainingCredits < bidAmountNum) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Insufficient credits for this auction. You have $${remainingCredits.toFixed(2)} but need $${bidAmountNum.toFixed(2)}` 
      });
    }

    // Insert bid (all locks are held, safe to proceed)
    await client.query(
      'INSERT INTO bids (auction_id, user_id, bid_amount) VALUES ($1, $2, $3)',
      [auctionId, userId, bidAmountNum]
    );

    // Deduct from auction-specific credits (atomic update with lock held)
    await client.query(
      `UPDATE auction_credits 
       SET used_credits = used_credits + $1,
           remaining_credits = remaining_credits - $1
       WHERE auction_id = $2 AND user_id = $3`,
      [bidAmountNum, auctionId, userId]
    );

    // Record credit transaction
    await client.query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, auction_id)
       VALUES ($1, $2, 'deduct', $3, $4)`,
      [userId, bidAmountNum, `Bid placed on auction ${auctionId}`, auctionId]
    );

    // Update auction current bid (atomic update with lock held)
    await client.query(
      'UPDATE auctions SET current_bid = $1 WHERE id = $2',
      [bidAmountNum, auctionId]
    );

    // SNIPER-SHIELD ENGINE: Dynamic Clock Recovery
    const now = new Date();
    const expiryTime = new Date(auction.expires_at);
    const timeUntilExpiry = expiryTime - now;
    const sniperThresholdMs = 2 * 60 * 1000; // 2 minutes
    const extensionTimeMs = 2 * 60 * 1000; // Extend by 2 minutes

    let newExpiryTime = expiryTime;
    let timeExtended = false;

    if (timeUntilExpiry <= sniperThresholdMs && timeUntilExpiry > 0) {
      // Extend auction to prevent sniping
      newExpiryTime = new Date(expiryTime.getTime() + extensionTimeMs);
      await client.query(
        'UPDATE auctions SET expires_at = $1 WHERE id = $2',
        [newExpiryTime, auctionId]
      );
      timeExtended = true;
      console.log(`[SNIPER-SHIELD] Auction ${auctionId} extended by 2 minutes. New expiry: ${newExpiryTime}`);
    }

    // Commit transaction - releases all locks
    await client.query('COMMIT');

    // Emit bid update to all users in the auction room (after commit)
    io.to(`auction-${auctionId}`).emit('bid-placed', {
      auctionId: parseInt(auctionId),
      bidAmount: bidAmountNum,
      bidderEmail: userEmail,
      timestamp: new Date().toISOString(),
      expiresAt: newExpiryTime.toISOString(),
      timeExtended,
      extensionSeconds: timeExtended ? extensionTimeMs / 1000 : 0,
    });

    console.log(`[ATOMIC-LOCK] Bid placed successfully for auction ${auctionId} by ${userEmail}. Amount: $${bidAmountNum}`);

    res.json({ 
      success: true, 
      message: 'Bid placed successfully',
      newBid: bidAmountNum,
      remainingCredits: remainingCredits - bidAmountNum
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ATOMIC-LOCK] Error placing bid:', error);
    
    // Handle serialization failures (concurrent transaction conflicts)
    if (error.code === '40001') {
      return res.status(409).json({ 
        error: 'Bid conflict detected. Please try again.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to place bid' });
  } finally {
    client.release();
  }
});

// Delete auction
router.delete('/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userEmail = req.user.email;

    await client.query('BEGIN');

    // Get auction with user check
    const auctionResult = await client.query(
      `SELECT a.*, u.email 
       FROM auctions a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (auctionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Auction not found' });
    }

    const auction = auctionResult.rows[0];

    if (auction.email !== userEmail && !req.user.isAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized to delete this auction' });
    }

    // Check if auction has invoices (prevent deletion to preserve financial records)
    const invoiceCheck = await client.query(
      'SELECT COUNT(*) FROM invoices WHERE auction_id = $1',
      [req.params.id]
    );

    if (parseInt(invoiceCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot delete auction with existing invoices. Invoices must be preserved for financial records.' 
      });
    }

    // Refund all auction-specific credits
    const { rows: usersWithCredits } = await client.query(
      `SELECT user_id, remaining_credits FROM auction_credits WHERE auction_id = $1 AND remaining_credits > 0`,
      [req.params.id]
    );

    for (const userCredit of usersWithCredits) {
      // Record refund transaction
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, auction_id) 
         VALUES ($1, $2, 'refund', $3, $4)`,
        [userCredit.user_id, userCredit.remaining_credits, `Refund - Auction deleted: ${auction.title}`, req.params.id]
      );

      // Set remaining credits to 0
      await client.query(
        `UPDATE auction_credits SET remaining_credits = 0 WHERE auction_id = $1 AND user_id = $2`,
        [req.params.id, userCredit.user_id]
      );
    }

    // Delete image from Cloudinary
    if (auction.cloudinary_public_id) {
      await deleteImage(auction.cloudinary_public_id);
    }

    // Delete auction from database (cascades to bids)
    await client.query('DELETE FROM auctions WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');

    res.json({ success: true, message: 'Auction deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting auction:', error);
    res.status(500).json({ error: 'Failed to delete auction' });
  } finally {
    client.release();
  }
});

export default router;
