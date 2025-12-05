const AirtelPaymentService = require('../services/AirtelPaymentService');
const { ErrorResponseDTO, SuccessResponseDTO } = require('../dto/PaymentDTO');
const AirtelCallback = require('../models/AirtelCallback');

/**
 * Airtel Payment Controller
 * Handles Airtel payment-related HTTP requests
 * Completely separate from MTN Payment Controller
 */
class AirtelPaymentController {
  constructor() {
    this.airtelPaymentService = new AirtelPaymentService();
  }

  /**
   * USSD Push Payment
   * POST /api/airtel-payments/ussd-push
   */
  async ussdPushPayment(req, res) {
    try {
      const country = req.headers['x-country'] || req.query.country || 'RW';
      const currency = req.headers['x-currency'] || req.query.currency || 'RWF';

      const result = await this.airtelPaymentService.ussdPushPayment(req.body, country, currency);
      const response = SuccessResponseDTO.fromData(result, 'USSD Push payment initiated successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('USSD Push payment error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to initiate USSD Push payment');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Refund Payment
   * POST /api/airtel-payments/refund
   */
  async refund(req, res) {
    try {
      const country = req.headers['x-country'] || req.query.country || 'RW';
      const currency = req.headers['x-currency'] || req.query.currency || 'RWF';

      // Extract airtel_money_id from request body
      const refundData = {
        airtel_money_id: req.body.airtel_money_id || req.body.transaction?.airtel_money_id
      };

      if (!refundData.airtel_money_id) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('airtel_money_id is required'),
          'airtel_money_id is required for refund'
        );
        return res.status(400).json(errorResponse);
      }

      const result = await this.airtelPaymentService.refund(refundData, country, currency);
      const response = SuccessResponseDTO.fromData(result, 'Refund processed successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Refund error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to process refund');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Transaction Enquiry
   * GET /api/airtel-payments/transaction/:id
   */
  async transactionEnquiry(req, res) {
    try {
      const { id } = req.params;
      const country = req.headers['x-country'] || req.query.country || 'RW';
      const currency = req.headers['x-currency'] || req.query.currency || 'RWF';

      if (!id) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Transaction ID is required'),
          'Transaction ID is required for enquiry'
        );
        return res.status(400).json(errorResponse);
      }

      const result = await this.airtelPaymentService.transactionEnquiry(id, country, currency);
      const response = SuccessResponseDTO.fromData(result, 'Transaction enquiry completed successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Transaction enquiry error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get transaction status');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Balance Enquiry
   * GET /api/airtel-payments/balance
   */
  async getBalance(req, res) {
    try {
      const type = req.query.type || req.params.type || 'COLL';
      const country = req.headers['x-country'] || req.query.country || 'RW';
      const currency = req.headers['x-currency'] || req.query.currency || 'RWF';

      const result = await this.airtelPaymentService.getBalance(type, country, currency);
      const response = SuccessResponseDTO.fromData(result, 'Balance enquiry completed successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Balance enquiry error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get balance');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Airtel Callback Webhook
   * POST /api/airtel-payments/callback
   * Receives transaction status updates from Airtel
   * This endpoint does NOT require authentication (as per Airtel docs)
   */
  async callback(req, res) {
    try {
      const callbackData = req.body;

      // Validate callback data
      if (!callbackData || !callbackData.transaction) {
        console.error('Invalid callback data received:', callbackData);
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid callback data' 
        });
      }

      const transaction = callbackData.transaction;

      // Validate required fields
      if (!transaction.id || !transaction.status_code || !transaction.airtel_money_id) {
        console.error('Missing required callback fields:', transaction);
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required transaction fields' 
        });
      }

      // Extract request metadata
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'Unknown';

      // Save callback to database
      const callback = new AirtelCallback({
        transactionId: transaction.id,
        airtelMoneyId: transaction.airtel_money_id,
        statusCode: transaction.status_code,
        message: transaction.message || '',
        callbackData: callbackData,
        ipAddress: ipAddress,
        userAgent: userAgent
      });

      await callback.save();

      // Log the callback for debugging
      console.log('Airtel callback received and saved:', {
        callbackId: callback._id,
        transactionId: transaction.id,
        airtelMoneyId: transaction.airtel_money_id,
        status: transaction.status_code,
        message: transaction.message,
        timestamp: new Date().toISOString()
      });

      // Process the callback
      // TODO: Update transaction status in database if you have an AirtelPayment model
      // Example:
      // const payment = await AirtelPayment.findOne({ transactionId: transaction.id });
      // if (payment) {
      //   payment.status = transaction.status_code === 'TS' ? 'SUCCESSFUL' : 'FAILED';
      //   payment.airtel_money_id = transaction.airtel_money_id;
      //   payment.airtelResponse = callbackData;
      //   await payment.save();
      // }

      // Mark callback as processed
      await callback.markAsProcessed();

      // Return success response to Airtel
      // Airtel expects a 200 status code
      res.status(200).json({
        success: true,
        message: 'Callback received and processed',
        transactionId: transaction.id,
        callbackId: callback._id
      });
    } catch (error) {
      console.error('Airtel callback error:', error);
      
      // Try to save the failed callback if we have the transaction data
      try {
        if (req.body && req.body.transaction) {
          const failedCallback = new AirtelCallback({
            transactionId: req.body.transaction.id || 'unknown',
            airtelMoneyId: req.body.transaction.airtel_money_id || 'unknown',
            statusCode: req.body.transaction.status_code || 'TF',
            message: req.body.transaction.message || 'Processing failed',
            callbackData: req.body,
            processed: false,
            processingError: error.message,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent') || 'Unknown'
          });
          await failedCallback.save();
        }
      } catch (saveError) {
        console.error('Failed to save callback error:', saveError);
      }

      // Still return 200 to Airtel to prevent retries
      // Log the error for internal tracking
      res.status(200).json({
        success: false,
        message: 'Callback received but processing failed',
        error: error.message
      });
    }
  }

  /**
   * Get All Callbacks
   * GET /api/airtel-payments/callbacks
   */
  async getAllCallbacks(req, res) {
    try {
      const filters = {
        transactionId: req.query.transactionId,
        airtelMoneyId: req.query.airtelMoneyId,
        statusCode: req.query.statusCode,
        processed: req.query.processed !== undefined ? req.query.processed === 'true' : undefined,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      const query = {};
      
      if (filters.transactionId) {
        query.transactionId = filters.transactionId;
      }
      
      if (filters.airtelMoneyId) {
        query.airtelMoneyId = filters.airtelMoneyId;
      }
      
      if (filters.statusCode) {
        query.statusCode = filters.statusCode;
      }
      
      if (filters.processed !== undefined) {
        query.processed = filters.processed;
      }
      
      if (filters.dateFrom && filters.dateTo) {
        query.createdAt = {
          $gte: new Date(filters.dateFrom),
          $lte: new Date(filters.dateTo)
        };
      }

      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;

      const callbacks = await AirtelCallback.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await AirtelCallback.countDocuments(query);

      const result = {
        callbacks: callbacks.map(cb => cb.toCallbackDTO()),
        total,
        limit,
        skip
      };

      const response = SuccessResponseDTO.fromData(result, 'Callbacks retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get all callbacks error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get callbacks');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get Callback by ID
   * GET /api/airtel-payments/callbacks/:id
   */
  async getCallbackById(req, res) {
    try {
      const { id } = req.params;
      const callback = await AirtelCallback.findById(id);

      if (!callback) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Callback not found'),
          'Callback not found'
        );
        return res.status(404).json(errorResponse);
      }

      const response = SuccessResponseDTO.fromData(
        callback.toCallbackDTO(),
        'Callback retrieved successfully'
      );
      res.status(200).json(response);
    } catch (error) {
      console.error('Get callback by ID error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get callback');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get Callbacks by Transaction ID
   * GET /api/airtel-payments/callbacks/transaction/:transactionId
   */
  async getCallbacksByTransactionId(req, res) {
    try {
      const { transactionId } = req.params;
      const callbacks = await AirtelCallback.find({ transactionId })
        .sort({ createdAt: -1 });

      const response = SuccessResponseDTO.fromData(
        callbacks.map(cb => cb.toCallbackDTO()),
        'Callbacks retrieved successfully'
      );
      res.status(200).json(response);
    } catch (error) {
      console.error('Get callbacks by transaction ID error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get callbacks');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Health check for Airtel payment service
   * GET /api/airtel-payments/health
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Airtel Payment Service',
        version: '1.0.0'
      };
      const response = SuccessResponseDTO.fromData(health, 'Airtel payment service is healthy');
      res.status(200).json(response);
    } catch (error) {
      console.error('Airtel payment health check error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Airtel payment service is unhealthy');
      res.status(500).json(errorResponse);
    }
  }
}

module.exports = AirtelPaymentController;

