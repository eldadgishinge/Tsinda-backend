const MTNCollectionService = require('../services/MTNCollectionService');
const { ErrorResponseDTO, SuccessResponseDTO } = require('../dto/PaymentDTO');
const crypto = require('crypto');

class MTNCollectionController {
  constructor() {
    this.collectionService = new MTNCollectionService();
  }

  async getToken(req, res) {
    try {
      const mtnUser = await this.collectionService.getMTNUser();
      const tokenResponse = await this.collectionService.getToken(mtnUser.xReferenceId, mtnUser.apiKey);
      
      const response = SuccessResponseDTO.fromData({
        access_token: tokenResponse.access_token,
        token_type: tokenResponse.token_type || 'Bearer',
        expires_in: tokenResponse.expires_in
      }, 'Collection token retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get collection token error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get collection token');
      res.status(500).json(errorResponse);
    }
  }

  async getAccountBalance(req, res) {
    try {
      const targetEnvironment = req.headers['x-target-environment'] || req.query.targetEnvironment || process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda';
      const balance = await this.collectionService.getAccountBalance(targetEnvironment);
      
      const response = SuccessResponseDTO.fromData(balance, 'Account balance retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get account balance error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get account balance');
      res.status(500).json(errorResponse);
    }
  }

  async requestToPay(req, res) {
    try {
      const { amount, currency, externalId, payer, payerMessage, payeeNote } = req.body;
      
      if (!amount || !currency || !externalId || !payer) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Missing required fields: amount, currency, externalId, payer'),
          'Validation error'
        );
        return res.status(400).json(errorResponse);
      }

      if (!payer.partyIdType || !payer.partyId) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Payer must have partyIdType and partyId'),
          'Validation error'
        );
        return res.status(400).json(errorResponse);
      }

      const referenceId = crypto.randomUUID();
      const targetEnvironment = req.headers['x-target-environment'] || req.query.targetEnvironment || process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda';
      const callbackUrl = req.headers['x-callback-url'] || req.query.callbackUrl || null;
      
      const requestData = {
        amount,
        currency,
        externalId,
        payer,
        payerMessage: payerMessage || '',
        payeeNote: payeeNote || ''
      };

      const result = await this.collectionService.requestToPay(
        referenceId,
        requestData,
        targetEnvironment,
        callbackUrl
      );
      
      const response = SuccessResponseDTO.fromData({
        referenceId: result.referenceId,
        status: result.status
      }, 'Payment request submitted successfully');
      res.status(202).json(response);
    } catch (error) {
      console.error('Request to pay error:', error);
      
      let statusCode = 500;
      if (error.message.includes('Bad Request')) {
        statusCode = 400;
      } else if (error.message.includes('Conflict')) {
        statusCode = 409;
      }
      
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to request payment');
      res.status(statusCode).json(errorResponse);
    }
  }

  async getRequestToPayStatus(req, res) {
    try {
      const { referenceId } = req.params;
      
      if (!referenceId) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Reference ID is required'),
          'Validation error'
        );
        return res.status(400).json(errorResponse);
      }

      const targetEnvironment = req.headers['x-target-environment'] || req.query.targetEnvironment || process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda';
      const status = await this.collectionService.getRequestToPayStatus(
        referenceId,
        targetEnvironment
      );
      
      const response = SuccessResponseDTO.fromData(status, 'Payment status retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get payment status error:', error);
      
      let statusCode = 500;
      if (error.message.includes('Bad Request')) {
        statusCode = 400;
      } else if (error.message.includes('Not Found')) {
        statusCode = 404;
      }
      
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get payment status');
      res.status(statusCode).json(errorResponse);
    }
  }
}

module.exports = MTNCollectionController;
