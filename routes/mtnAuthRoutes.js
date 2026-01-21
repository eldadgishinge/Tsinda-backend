const express = require('express');
const MTNCollectionController = require('../controllers/MTNCollectionController');

const router = express.Router();
const collectionController = new MTNCollectionController();

router.post('/collection/token/', (req, res) => collectionController.getToken(req, res));
router.get('/collection/v1_0/account/balance', (req, res) => collectionController.getAccountBalance(req, res));
router.post('/collection/v1_0/requesttopay', (req, res) => collectionController.requestToPay(req, res));
router.get('/collection/v1_0/requesttopay/:referenceId', (req, res) => collectionController.getRequestToPayStatus(req, res));

module.exports = router;
