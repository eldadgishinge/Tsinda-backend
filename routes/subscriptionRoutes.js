const express = require('express');
const SubscriptionController = require('../controllers/SubscriptionController');

const router = express.Router();
const subscriptionController = new SubscriptionController();

/**
 * Subscription Routes
 * API endpoints for subscription payment management
 */

// Create subscription payment
router.post('/payment', (req, res) => subscriptionController.createSubscriptionPayment(req, res));

// Get all subscriptions with filters
router.get('/', (req, res) => subscriptionController.getAllSubscriptions(req, res));

// Get subscription by ID
router.get('/:id', (req, res) => subscriptionController.getSubscriptionById(req, res));

// Get subscriptions by user ID
router.get('/user/:userId', (req, res) => subscriptionController.getSubscriptionsByUserId(req, res));

module.exports = router;

