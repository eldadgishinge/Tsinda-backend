const PaymentService = require('../services/PaymentService');
const {
  RequestToPayDTO,
  TransferDTO,
  RefundDTO,
  AccountStatusDTO,
  ErrorResponseDTO,
  SuccessResponseDTO
} = require('../dto/PaymentDTO');

/**
 * Professional Payment Controller
 * Handles all payment-related HTTP requests with proper error handling
 */
class PaymentController {
  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Request to Pay (Collection)
   * POST /api/payments/request-to-pay
   */
  async requestToPay(req, res) {
    try {
      const result = await this.paymentService.requestToPay(req.body);
      const response = SuccessResponseDTO.fromData(result, 'Request to pay initiated successfully');
      res.status(201).json(response);
    } catch (error) {
      console.error('Request to pay error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to initiate request to pay');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Transfer (Disbursement)
   * POST /api/payments/transfer
   */
  async transfer(req, res) {
    try {
      const result = await this.paymentService.transfer(req.body);
      const response = SuccessResponseDTO.fromData(result, 'Transfer initiated successfully');
      res.status(201).json(response);
    } catch (error) {
      console.error('Transfer error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to initiate transfer');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Refund
   * POST /api/payments/refund
   */
  async refund(req, res) {
    try {
      const result = await this.paymentService.refund(req.body);
      const response = SuccessResponseDTO.fromData(result, 'Refund initiated successfully');
      res.status(201).json(response);
    } catch (error) {
      console.error('Refund error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to initiate refund');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Get Payment Status
   * GET /api/payments/:id/status
   */
  async getPaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const result = await this.paymentService.getPaymentStatus(id);
      const response = SuccessResponseDTO.fromData(result, 'Payment status retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get payment status error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get payment status');
      res.status(404).json(errorResponse);
    }
  }

  /**
   * Get Account Balance
   * GET /api/payments/balance
   */
  async getAccountBalance(req, res) {
    try {
      const { serviceType = 'collection' } = req.query;
      const result = await this.paymentService.getAccountBalance(serviceType);
      const response = SuccessResponseDTO.fromData(result, 'Account balance retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get account balance error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get account balance');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Get All Payments
   * GET /api/payments
   */
  async getAllPayments(req, res) {
    try {
      const filters = {
        transactionType: req.query.transactionType,
        status: req.query.status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0
      };

      const result = await this.paymentService.getAllPayments(filters);
      const response = SuccessResponseDTO.fromData(result, 'Payments retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get all payments error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get payments');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Get Payment by ID
   * GET /api/payments/:id
   */
  async getPaymentById(req, res) {
    try {
      const { id } = req.params;
      const result = await this.paymentService.getPaymentById(id);
      const response = SuccessResponseDTO.fromData(result, 'Payment retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get payment by ID error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get payment');
      res.status(404).json(errorResponse);
    }
  }

  /**
   * Health Check
   * GET /api/payments/health
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Payment Service',
        version: '1.0.0'
      };
      const response = SuccessResponseDTO.fromData(health, 'Payment service is healthy');
      res.status(200).json(response);
    } catch (error) {
      console.error('Health check error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Payment service is unhealthy');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get Service Statistics
   * GET /api/payments/stats
   */
  async getServiceStats(req, res) {
    try {
      // This would typically come from a statistics service
      const stats = {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        pendingTransactions: 0,
        totalAmount: 0,
        averageTransactionTime: 0
      };
      
      const response = SuccessResponseDTO.fromData(stats, 'Service statistics retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get service stats error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get service statistics');
      res.status(400).json(errorResponse);
    }
  }
}

module.exports = PaymentController;
