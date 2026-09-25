const express = require('express');
const router = express.Router();
const biddingController = require('../controllers/biddingController');

// Bidding endpoints
router.get('/bids/:rfqId', biddingController.getBidsByRfq);
router.get('/bids/:rfqId/lowest', biddingController.getLowestBid);
router.post('/bids', biddingController.submitBid);

// RFQ room endpoints
router.get('/rfqs', biddingController.getAllRfqs);
router.get('/rfqs/:rfqId', biddingController.getRfqById);
router.post('/rfqs', biddingController.createRfq);
router.post('/rfqs/:rfqId/close', biddingController.closeRfq);
router.delete('/rfqs/:rfqId', biddingController.deleteRfq);

module.exports = router;
