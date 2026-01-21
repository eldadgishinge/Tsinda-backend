const express = require('express');
const MTNPaymentController = require('../controllers/MTNPaymentController');

const router = express.Router();
const paymentController = new MTNPaymentController();

router.post('/payment', (req, res) => paymentController.requestPayment(req, res));
router.get('/payment/:referenceId/status', (req, res) => paymentController.getPaymentStatus(req, res));
router.get('/balance', (req, res) => paymentController.getAccountBalance(req, res));

module.exports = router;
