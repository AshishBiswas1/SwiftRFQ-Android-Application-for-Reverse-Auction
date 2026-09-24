const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// ── 1. Environment Configuration ────────────────────────────────────────────
dotenv.config();

const app = require('./app');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// ── 2. External MongoDB Connection Setup ─────────────────────────────────────
if (
  MONGODB_URI &&
  !MONGODB_URI.includes('<username>') &&
  !MONGODB_URI.includes('password@cluster')
) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('[MongoDB] Connected successfully to external MongoDB cluster');
    })
    .catch((err) => {
      console.error('[MongoDB] External MongoDB connection error:', err.message);
      console.log('[MongoDB] Running with in-memory state fallback.');
    });
} else {
  console.log(
    '[MongoDB] Notice: Configure your MONGODB_URI in server/.env to enable live persistence with external MongoDB.'
  );
}

// ── 3. Create HTTP Server & Initialize Socket.io ────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Store io reference on app for controller access (bids, rooms)
app.set('io', io);

// Register Socket.io bidding room handlers
const registerAuctionHandlers = require('./socket/auctionHandler');
registerAuctionHandlers(io);

const User = require('./models/User');

// Background job: Purge unverified accounts past their 12-hour grace period
setInterval(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const result = await User.deleteMany({
        isPhoneVerified: false,
        phoneVerificationDeadline: { $ne: null, $lt: new Date() },
      });
      if (result.deletedCount > 0) {
        console.log(`[Account Cleanup] Purged ${result.deletedCount} unverified account(s) past 12-hour window.`);
      }
    }
  } catch (purgeErr) {
    console.error('[Account Cleanup Error]', purgeErr.message);
  }
}, 60 * 60 * 1000);

// ── 4. Start Server Listening ───────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('──────────────────────────────────────────────────────');
  console.log(`🚀 SwiftRFQ Backend listening on port: ${PORT}`);
  console.log(`📡 Socket.io ready for real-time reverse auction rooms`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('──────────────────────────────────────────────────────');
});
