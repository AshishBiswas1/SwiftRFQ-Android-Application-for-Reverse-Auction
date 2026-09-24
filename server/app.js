const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const biddingRouter = require('./routers/biddingRouter');
const userRouter = require('./routers/userRouter');
const contactRouter = require('./routers/contactRouter');

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

// ── 1. Express Middleware ───────────────────────────────────────────────────
app.use(
  cors({
    origin: CLIENT_ORIGIN === '*' ? '*' : CLIENT_ORIGIN.split(','),
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 2. API Routers ──────────────────────────────────────────────────────────
app.use('/api', biddingRouter);
app.use('/api/users', userRouter);
app.use('/api/contacts', contactRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  const io = req.app.get('io');
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    socketClients: io ? io.engine.clientsCount : 0,
  });
});

// API Root info endpoint
app.get('/', (req, res) => {
  const port = process.env.PORT || 5000;
  res.json({
    name: 'SwiftRFQ B2B Reverse Auction Backend Engine',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      bids: '/api/bids/:rfqId',
      rfqs: '/api/rfqs',
      users: '/api/users',
    },
    socketUrl: `http://localhost:${port}`,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
