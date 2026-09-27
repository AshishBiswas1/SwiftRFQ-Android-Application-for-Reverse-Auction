const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const path = require('path');
const fs = require('fs');

const biddingRouter = require('./routers/biddingRouter');
const userRouter = require('./routers/userRouter');
const contactRouter = require('./routers/contactRouter');
const notificationRouter = require('./routers/notificationRouter');

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
app.use('/api/notifications', notificationRouter);

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
    socketUrl: `${req.protocol}://${req.get('host')}`,
  });
});

// ── 3. App Download Endpoints (Single-click APK download & mobile landing) ────
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get(['/download/app.apk', '/download/apk'], (req, res) => {
  if (process.env.APK_DOWNLOAD_URL) {
    return res.redirect(process.env.APK_DOWNLOAD_URL);
  }
  const apkPath = path.join(__dirname, 'public', 'SwiftRFQ.apk');
  if (fs.existsSync(apkPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.download(apkPath, 'SwiftRFQ.apk');
  }
  return res.status(404).json({
    success: false,
    message: 'APK file is currently being updated. Please try again shortly.',
  });
});

app.get('/download', (req, res) => {
  if (req.query.direct === '1') {
    return res.redirect('/download/app.apk');
  }

  const apkDownloadUrl = process.env.APK_DOWNLOAD_URL || '/download/app.apk';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download SwiftRFQ for Android</title>
  <meta http-equiv="refresh" content="2;url=${apkDownloadUrl}">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #17140F; color: #EDE5D8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    .card { background: #241F18; border: 1px solid rgba(198, 151, 73, 0.25); border-radius: 20px; max-width: 440px; width: 100%; padding: 32px 24px; box-shadow: 0 12px 36px rgba(0,0,0,0.4); }
    .logo-badge { width: 68px; height: 68px; border-radius: 18px; background: linear-gradient(135deg, #C69749, #8C6226); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; box-shadow: 0 6px 20px rgba(198,151,73,0.3); }
    .brand-kicker { font-size: 12px; letter-spacing: 2px; color: #C69749; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
    h1 { font-size: 24px; font-weight: 800; color: #FFFFFF; margin-bottom: 12px; line-height: 1.25; }
    p.desc { font-size: 14px; color: #B5A895; line-height: 1.5; margin-bottom: 26px; }
    .btn-download { display: block; width: 100%; padding: 16px 20px; background: #C69749; color: #17140F; font-size: 16px; font-weight: 800; text-decoration: none; border-radius: 14px; transition: transform 0.15s, background-color 0.15s; box-shadow: 0 4px 16px rgba(198,151,73,0.35); }
    .btn-download:active { transform: scale(0.98); background: #B3833B; }
    .filesize { font-size: 12px; font-weight: normal; opacity: 0.85; margin-top: 4px; display: block; }
    .steps { margin-top: 28px; text-align: left; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.06); }
    .steps-title { font-size: 13px; font-weight: 700; color: #C69749; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .step-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #CFC5B6; margin-bottom: 8px; line-height: 1.4; }
    .step-item:last-child { margin-bottom: 0; }
    .step-num { width: 18px; height: 18px; border-radius: 50%; background: #C69749; color: #17140F; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
    .auto-notice { font-size: 12px; color: #8F8474; margin-top: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">⚡</div>
    <div class="brand-kicker">SwiftRFQ Android App</div>
    <h1>You've Been Invited to Join</h1>
    <p class="desc">Download the official SwiftRFQ Android app to participate in live reverse auctions, submit competitive bids, and win supplier purchase orders.</p>
    
    <a href="${apkDownloadUrl}" class="btn-download" id="dlBtn">
      ⬇️ Download SwiftRFQ (.apk)
      <span class="filesize">Official Release · Verified Android APK</span>
    </a>

    <div class="steps">
      <div class="steps-title">Quick Installation Guide</div>
      <div class="step-item">
        <div class="step-num">1</div>
        <div>Tap <strong>Download SwiftRFQ</strong> above.</div>
      </div>
      <div class="step-item">
        <div class="step-num">2</div>
        <div>When download finishes, tap the notification to open and install.</div>
      </div>
      <div class="step-item">
        <div class="step-num">3</div>
        <div>Log in or Sign Up as Supplier to start bidding.</div>
      </div>
    </div>

    <div class="auto-notice">
      Download starting automatically in a moment...<br>
      If it doesn't start, tap the button above.
    </div>
  </div>

  <script>
    setTimeout(function() {
      window.location.href = '${apkDownloadUrl}';
    }, 1500);
  </script>
</body>
</html>`;
  res.send(html);
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
