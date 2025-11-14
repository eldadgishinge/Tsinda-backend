const express = require('express');
const PaymentController = require('../controllers/PaymentController');
const { validateRequestToPay, validateTransfer, validateRefund } = require('../middleware/paymentValidators');

const router = express.Router();
const paymentController = new PaymentController();

/**
 * Payment Routes
 * Professional API endpoints for MTN MoMo payment operations
 */

// Health check endpoint
router.get('/health', (req, res) => paymentController.healthCheck(req, res));

// Service statistics
router.get('/stats', (req, res) => paymentController.getServiceStats(req, res));

// Account balance
router.get('/balance', (req, res) => paymentController.getAccountBalance(req, res));

// Get all payments with optional filters
router.get('/', (req, res) => paymentController.getAllPayments(req, res));

// Get payment by ID
router.get('/:id', (req, res) => paymentController.getPaymentById(req, res));

// Get payment status
router.get('/:id/status', (req, res) => paymentController.getPaymentStatus(req, res));

// Request to Pay (Collection)
router.post('/request-to-pay', validateRequestToPay, (req, res) => paymentController.requestToPay(req, res));

// Transfer (Disbursement)
router.post('/transfer', validateTransfer, (req, res) => paymentController.transfer(req, res));

// Refund
router.post('/refund', validateRefund, (req, res) => paymentController.refund(req, res));

module.exports = router;
