const express = require('express');
const MTNAuthController = require('../controllers/MTNAuthController');

const router = express.Router();
const mtnAuthController = new MTNAuthController();

/**
 * MTN Authentication Routes
 * Professional API endpoints for MTN authentication management
 */

// Health check endpoint
router.get('/health', (req, res) => mtnAuthController.healthCheck(req, res));

// MTN user management
router.get('/status', (req, res) => mtnAuthController.getMTNUserStatus(req, res));
router.post('/initialize', (req, res) => mtnAuthController.initializeMTNUser(req, res));
router.delete('/reset', (req, res) => mtnAuthController.resetMTNUser(req, res));

// Token management
router.get('/tokens/collection', (req, res) => mtnAuthController.getCollectionToken(req, res));
router.get('/tokens/disbursement', (req, res) => mtnAuthController.getDisbursementToken(req, res));

// Testing and monitoring
router.get('/test', (req, res) => mtnAuthController.testConnectivity(req, res));
router.get('/stats', (req, res) => mtnAuthController.getUserStats(req, res));

module.exports = router;
