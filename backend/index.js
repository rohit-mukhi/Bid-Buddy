import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './api/routes/auth.js';
import auctionRoutes from './api/routes/auctions.js';
import chatbotRoutes from './api/routes/chatbot.js';
import adminRoutes from './api/routes/admin.js';
import biddingRoutes from './api/routes/bidding.js';
import creditsRoutes from './api/routes/credits.js';
import auctionCreditsRoutes from './api/routes/auctionCredits.js';
import invoicesRoutes from './api/routes/invoices.js';
import ragRoutes from './api/routes/rag.js';
import createTables from './config/initDb.js';
import runMigrations from './config/migrate.js';
import addAuctionCredits from './config/migrateAuctionCredits.js';
import addSettlementSchema from './config/migrateSettlement.js';
import addVectorSupport from './config/migrateVector.js';
import { logPoolStats } from './config/poolMonitor.js';
import { startSettlementService, stopSettlementService } from './services/auctionSettlement.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bidding', biddingRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/auction-credits', auctionCreditsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/rag', ragRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/pool', (req, res) => {
  const stats = logPoolStats();
  res.json({ status: 'ok', pool: stats });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join auction room
  socket.on('join-auction', (auctionId) => {
    socket.join(`auction-${auctionId}`);
    console.log(`User ${socket.id} joined auction ${auctionId}`);
  });

  // Leave auction room
  socket.on('leave-auction', (auctionId) => {
    socket.leave(`auction-${auctionId}`);
    console.log(`User ${socket.id} left auction ${auctionId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Export io for use in routes
export { io };

// Initialize database tables
createTables()
  .then(() => runMigrations())
  .then(() => addAuctionCredits())
  .then(() => addSettlementSchema())
  .then(() => addVectorSupport())
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready`);
      logPoolStats();
      startSettlementService();
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  stopSettlementService();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  stopSettlementService();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
});
