const MTNPaymentService = require('../services/MTNPaymentService');
const { ErrorResponseDTO, SuccessResponseDTO } = require('../dto/PaymentDTO');
const MTNCallback = require('../models/MTNCallback');
const Payment = require('../models/Payment');

class MTNPaymentController {
  constructor() {
    this.paymentService = new MTNPaymentService();
  }

  async callback(req, res) {
    try {
      const callbackData = req.body;

      // Validate callback data
      if (!callbackData) {
        console.error('Invalid callback data received: empty body');
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid callback data' 
        });
      }

      // Validate required fields based on MTN callback format
      if (!callbackData.externalId || !callbackData.status || !callbackData.amount || !callbackData.currency) {
        console.error('Missing required callback fields:', callbackData);
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: externalId, status, amount, currency' 
        });
      }

      // Extract request metadata
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      const userAgent = req.get('user-agent') || 'Unknown';

      // Save callback to database
      const callback = new MTNCallback({
        financialTransactionId: callbackData.financialTransactionId || null,
        externalId: callbackData.externalId,
        amount: callbackData.amount,
        currency: callbackData.currency,
        status: callbackData.status,
        payee: callbackData.payee || null,
        payeeNote: callbackData.payeeNote || null,
        payerMessage: callbackData.payerMessage || null,
        callbackData: callbackData,
        ipAddress: ipAddress,
        userAgent: userAgent
      });

      await callback.save();

      // Update payment transaction based on externalId (userId)
      // Find payment by externalId - can be PENDING, SUCCESSFUL, or FAILED (to handle status updates)
      const payment = await Payment.findOne({ 
        externalId: callbackData.externalId
      }).sort({ createdAt: -1 }); // Get the most recent payment for this user

      if (payment) {
        // Always update mtnResponse with latest callback data
        payment.mtnResponse = callbackData;
        
        // Handle different status updates
        if (callbackData.status === 'PENDING') {
          // Update to PENDING status (initial callback or status update)
          payment.status = 'PENDING';
          payment.mtnStatus = 'PENDING';
          // Don't set completedAt or failedAt for PENDING
          
          if (callbackData.financialTransactionId) {
            payment.metadata = payment.metadata || {};
            payment.metadata.financialTransactionId = callbackData.financialTransactionId;
          }
          
          await payment.save();
          
        } else if (callbackData.status === 'SUCCESSFUL') {
          // Update to SUCCESSFUL status - payment completed at user end
          payment.status = 'SUCCESSFUL';
          payment.mtnStatus = 'SUCCESSFUL';
          payment.completedAt = new Date();
          payment.failedAt = null;
          
          if (callbackData.financialTransactionId) {
            payment.metadata = payment.metadata || {};
            payment.metadata.financialTransactionId = callbackData.financialTransactionId;
          }
          
          await payment.save();
          
        } else if (callbackData.status === 'FAILED') {
          // Update to FAILED status - payment failed at user end
          payment.status = 'FAILED';
          payment.mtnStatus = 'FAILED';
          payment.failedAt = new Date();
          payment.completedAt = null;
          
          if (callbackData.financialTransactionId) {
            payment.metadata = payment.metadata || {};
            payment.metadata.financialTransactionId = callbackData.financialTransactionId;
          }
          
          await payment.save();
        }
      }

      // Mark callback as processed
      await callback.markAsProcessed();

      // Return success response to MTN
      // MTN expects a 200 status code
      res.status(200).json({
        success: true,
        message: 'Callback received and processed',
        callbackId: callback._id
      });
    } catch (error) {
      console.error('MTN callback error:', error);
      
      // Try to save the failed callback if we have the data
      try {
        if (req.body && req.body.externalId) {
          const failedCallback = new MTNCallback({
            externalId: req.body.externalId,
            callbackData: req.body,
            processingError: error.message,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent') || 'Unknown'
          });
          await failedCallback.save();
        }
      } catch (saveError) {
        console.error('Failed to save callback error:', saveError);
      }

      // Still return 200 to MTN to prevent retries
      res.status(200).json({
        success: false,
        message: 'Callback received but processing failed',
        error: error.message
      });
    }
  }

  async requestPayment(req, res) {
    try {
      const { userId, phoneNumber, amount } = req.body;
      
      if (!userId || !phoneNumber || !amount) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Missing required fields: userId, phoneNumber, amount'),
          'Validation error'
        );
        return res.status(400).json(errorResponse);
      }

      if (typeof amount !== 'number' || amount <= 0) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Amount must be a positive number'),
          'Validation error'
        );
        return res.status(400).json(errorResponse);
      }

      const options = {
        targetEnvironment: req.headers['x-target-environment'] || req.query.targetEnvironment || process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda',
        callbackUrl: req.headers['x-callback-url'] || req.query.callbackUrl || null
      };

      const result = await this.paymentService.requestPayment(userId, phoneNumber, amount, options);
      
      const response = SuccessResponseDTO.fromData(result, 'Payment request submitted successfully');
      res.status(202).json(response);
    } catch (error) {
      console.error('Request payment error:', error);
      
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

  async getPaymentStatus(req, res) {
    try {
      const { referenceId } = req.params;
      
      if (!referenceId) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Reference ID is required'),
          'Validation error'
        );
        return res.status(400).json(errorResponse);
      }

      const options = {
        targetEnvironment: req.headers['x-target-environment'] || req.query.targetEnvironment || process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda'
      };

      const status = await this.paymentService.getPaymentStatus(referenceId, options);
      
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

  async getAccountBalance(req, res) {
    try {
      const options = {
        targetEnvironment: req.headers['x-target-environment'] || req.query.targetEnvironment || process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda'
      };

      const balance = await this.paymentService.getAccountBalance(options);
      
      const response = SuccessResponseDTO.fromData(balance, 'Account balance retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get account balance error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get account balance');
      res.status(500).json(errorResponse);
    }
  }
}

module.exports = MTNPaymentController;
