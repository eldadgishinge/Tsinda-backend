const express = require('express');
const AirtelPaymentController = require('../controllers/AirtelPaymentController');

const router = express.Router();
const airtelPaymentController = new AirtelPaymentController();

/**
 * Airtel Payment Routes
 * Professional API endpoints for Airtel Money payment operations
 * Completely separate from MTN payment routes
 */

// Health check endpoint
router.get('/health', (req, res) => airtelPaymentController.healthCheck(req, res));

// Balance Enquiry
router.get('/balance', (req, res) => airtelPaymentController.getBalance(req, res));

// Transaction Enquiry
router.get('/transaction/:id', (req, res) => airtelPaymentController.transactionEnquiry(req, res));

// USSD Push Payment
router.post('/ussd-push', (req, res) => airtelPaymentController.ussdPushPayment(req, res));

// Refund Payment
router.post('/refund', (req, res) => airtelPaymentController.refund(req, res));

// Airtel Callback Webhook (no authentication required)
router.post('/callback', (req, res) => airtelPaymentController.callback(req, res));

// Callback Management (requires authentication)
router.get('/callbacks', (req, res) => airtelPaymentController.getAllCallbacks(req, res));
router.get('/callbacks/:id', (req, res) => airtelPaymentController.getCallbackById(req, res));
router.get('/callbacks/transaction/:transactionId', (req, res) => airtelPaymentController.getCallbacksByTransactionId(req, res));

module.exports = router;

