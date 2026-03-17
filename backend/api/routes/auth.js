import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Mock user database (replace with actual database)
const users = {
  'admin@example.com': { email: 'admin@example.com', isAdmin: true, isBidder: false },
  'bidder@example.com': { email: 'bidder@example.com', isAdmin: false, isBidder: true },
  'both@example.com': { email: 'both@example.com', isAdmin: true, isBidder: true },
};

// Login endpoint - receives Google user info and returns JWT
router.post('/login', (req, res) => {
  const { email, googleId } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Check if user exists, otherwise create default bidder role
  let user = users[email];
  if (!user) {
    user = { email, isAdmin: false, isBidder: true };
    users[email] = user;
  }

  // Generate JWT with user roles
  const token = jwt.sign(
    {
      email: user.email,
      isAdmin: user.isAdmin,
      isBidder: user.isBidder,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      email: user.email,
      isAdmin: user.isAdmin,
      isBidder: user.isBidder,
    },
  });
});

// Verify token endpoint
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update user role endpoint
router.post('/update-role', (req, res) => {
  const { email, isAdmin, isBidder } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let user = users[email];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update user roles
  user.isAdmin = isAdmin;
  user.isBidder = isBidder;

  // Generate new JWT with updated roles
  const token = jwt.sign(
    {
      email: user.email,
      isAdmin: user.isAdmin,
      isBidder: user.isBidder,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      email: user.email,
      isAdmin: user.isAdmin,
      isBidder: user.isBidder,
    },
  });
});

export default router;
