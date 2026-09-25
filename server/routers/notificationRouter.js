const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

// GET /api/notifications?userId=...
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const notifications = await notificationService.getUserNotifications(userId);
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const updated = await notificationService.markAsRead(id, userId);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
