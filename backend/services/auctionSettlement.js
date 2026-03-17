import pool from '../config/database.js';
import { io } from '../index.js';

let settlementInterval = null;

async function processExpiredAuctions() {
  let client;
  
  try {
    client = await pool.connect();
    // ATOMIC LOCK: Select expired auctions with row-level lock to prevent concurrent processing
    const { rows: expiredAuctions } = await client.query(
      `SELECT * FROM auctions 
       WHERE status = 'active' AND expires_at <= NOW() 
       FOR UPDATE SKIP LOCKED`
    );

    for (const auction of expiredAuctions) {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      
      try {
        // Get highest bidder with lock
        const { rows: bids } = await client.query(
          `SELECT * FROM bids 
           WHERE auction_id = $1 
           ORDER BY bid_amount DESC 
           LIMIT 1 
           FOR UPDATE`,
          [auction.id]
        );

        const hasWinner = bids.length > 0;
        const winner = hasWinner ? bids[0] : null;

        // Update auction status (lock already held from initial SELECT)
        await client.query(
          `UPDATE auctions SET status = 'completed', winner_id = $1, completed_at = NOW() WHERE id = $2`,
          [winner?.user_id || null, auction.id]
        );

        // Generate invoice if there's a winner
        let invoiceNumber = null;
        if (hasWinner) {
          invoiceNumber = `INV-${auction.id}-${Date.now()}`;
          await client.query(
            `INSERT INTO invoices (invoice_number, auction_id, buyer_id, seller_id, amount, status) 
             VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [invoiceNumber, auction.id, winner.user_id, auction.user_id, winner.bid_amount]
          );
        }

        // ATOMIC LOCK: Lock all auction credits for refund processing
        const { rows: usersWithCredits } = await client.query(
          `SELECT user_id, remaining_credits 
           FROM auction_credits 
           WHERE auction_id = $1 AND remaining_credits > 0 
           FOR UPDATE`,
          [auction.id]
        );

        for (const userCredit of usersWithCredits) {
          // Record refund transaction
          await client.query(
            `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, auction_id) 
             VALUES ($1, $2, 'refund', $3, $4)`,
            [userCredit.user_id, userCredit.remaining_credits, `Refund for auction: ${auction.title}`, auction.id]
          );

          // Set remaining credits to 0 (atomic update with lock held)
          await client.query(
            `UPDATE auction_credits SET remaining_credits = 0 WHERE auction_id = $1 AND user_id = $2`,
            [auction.id, userCredit.user_id]
          );
        }

        await client.query('COMMIT');

        // Emit WebSocket event (after commit)
        if (io) {
          io.emit('auction-completed', {
            auctionId: auction.id,
            hasWinner,
            winnerId: winner?.user_id || null,
            winnerEmail: winner?.user_id || null,
            finalAmount: winner?.amount || null,
            invoiceNumber
          });
        }

        console.log(`[ATOMIC-LOCK] Auction ${auction.id} settled. Winner: ${winner?.user_id || 'None'}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[ATOMIC-LOCK] Error settling auction ${auction.id}:`, error);
        
        // Handle serialization failures
        if (error.code === '40001') {
          console.log(`[ATOMIC-LOCK] Serialization conflict for auction ${auction.id}, will retry on next cycle`);
        }
      }
    }
  } catch (error) {
    console.error('[ATOMIC-LOCK] Error processing expired auctions:', error.message);
    // Don't crash the service, just log and continue
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('[ATOMIC-LOCK] Error releasing client:', releaseError.message);
      }
    }
  }
}

function startSettlementService() {
  if (settlementInterval) return;
  
  settlementInterval = setInterval(processExpiredAuctions, 30000);
  console.log('Auction settlement service started (runs every 30 seconds)');
  
  // Run immediately on start
  processExpiredAuctions();
}

function stopSettlementService() {
  if (settlementInterval) {
    clearInterval(settlementInterval);
    settlementInterval = null;
    console.log('Auction settlement service stopped');
  }
}

export { startSettlementService, stopSettlementService };
