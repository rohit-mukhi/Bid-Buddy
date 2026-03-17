import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import pool from '../../config/database.js';

const router = express.Router();

// GET - Get all invoices for logged-in user (as buyer or seller)
router.get('/my-invoices', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const result = await pool.query(
      `SELECT i.*, 
              a.title as auction_title,
              buyer.email as buyer_email,
              seller.email as seller_email
       FROM invoices i
       JOIN auctions a ON i.auction_id = a.id
       JOIN users buyer ON i.buyer_id = buyer.id
       JOIN users seller ON i.seller_id = seller.id
       WHERE buyer.email = $1 OR seller.email = $1
       ORDER BY i.created_at DESC`,
      [userEmail]
    );

    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET - Get invoice by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const invoiceId = req.params.id;

    const result = await pool.query(
      `SELECT i.*, 
              a.title as auction_title,
              buyer.email as buyer_email,
              seller.email as seller_email
       FROM invoices i
       JOIN auctions a ON i.auction_id = a.id
       JOIN users buyer ON i.buyer_id = buyer.id
       JOIN users seller ON i.seller_id = seller.id
       WHERE i.id = $1 AND (buyer.email = $2 OR seller.email = $2)`,
      [invoiceId, userEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ invoice: result.rows[0] });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

export default router;
