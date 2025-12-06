const express = require('express');
const AirtelAuthController = require('../controllers/AirtelAuthController');

const router = express.Router();
const airtelAuthController = new AirtelAuthController();

router.get('/health', (req, res) => airtelAuthController.healthCheck(req, res));
router.get('/status', (req, res) => airtelAuthController.getAirtelUserStatus(req, res));
router.post('/initialize', (req, res) => airtelAuthController.initializeAirtelUser(req, res));
router.delete('/reset', (req, res) => airtelAuthController.resetAirtelUser(req, res));
router.get('/tokens/access', (req, res) => airtelAuthController.getAccessToken(req, res));
router.get('/test', (req, res) => airtelAuthController.testConnectivity(req, res));
router.get('/stats', (req, res) => airtelAuthController.getUserStats(req, res));
router.get('/config-check', (req, res) => airtelAuthController.checkConfig(req, res));

module.exports = router;

