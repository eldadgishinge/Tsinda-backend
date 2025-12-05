const express = require('express');
const AirtelAuthController = require('../controllers/AirtelAuthController');

const router = express.Router();
const airtelAuthController = new AirtelAuthController();

/**
 * Airtel Authentication Routes
 * Professional API endpoints for Airtel authentication management
 */

// Health check endpoint
router.get('/health', (req, res) => airtelAuthController.healthCheck(req, res));

// Airtel user management
router.get('/status', (req, res) => airtelAuthController.getAirtelUserStatus(req, res));
router.post('/initialize', (req, res) => airtelAuthController.initializeAirtelUser(req, res));
router.delete('/reset', (req, res) => airtelAuthController.resetAirtelUser(req, res));

// Token management
router.get('/tokens/access', (req, res) => airtelAuthController.getAccessToken(req, res));

// Encryption keys
router.get('/encryption-keys', (req, res) => airtelAuthController.getEncryptionKeys(req, res));
router.post('/encrypt-pin', (req, res) => airtelAuthController.encryptPIN(req, res));

// Testing and monitoring
router.get('/test', (req, res) => airtelAuthController.testConnectivity(req, res));
router.get('/stats', (req, res) => airtelAuthController.getUserStats(req, res));

// Configuration check
router.get('/config-check', (req, res) => airtelAuthController.checkConfig(req, res));

module.exports = router;

