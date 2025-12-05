const SubscriptionService = require('../services/SubscriptionService');
const { ErrorResponseDTO, SuccessResponseDTO } = require('../dto/PaymentDTO');

/**
 * Subscription Controller
 * Handles subscription payment requests
 */
class SubscriptionController {
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Create Subscription Payment
   * POST /api/subscriptions/payment
   */
  async createSubscriptionPayment(req, res) {
    try {
      const { userId, amount, numberOfMonths, msisdn, paymentChannel, country, currency } = req.body;

      // Validate required fields
      if (!userId || !amount || !numberOfMonths || !msisdn || !paymentChannel) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Missing required fields: userId, amount, numberOfMonths, msisdn, paymentChannel'),
          'Missing required fields'
        );
        return res.status(400).json(errorResponse);
      }

      // Validate payment channel
      if (!['MTN', 'AIRTEL'].includes(paymentChannel.toUpperCase())) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('Invalid payment channel. Must be "MTN" or "AIRTEL"'),
          'Invalid payment channel'
        );
        return res.status(400).json(errorResponse);
      }

      const subscriptionData = {
        userId,
        amount: parseFloat(amount),
        numberOfMonths: parseInt(numberOfMonths),
        msisdn, // Use msisdn from API request, not from .env
        paymentChannel: paymentChannel.toUpperCase(),
        country: country || 'RW',
        currency: currency || 'RWF'
      };

      const result = await this.subscriptionService.createSubscriptionPayment(subscriptionData);
      const response = SuccessResponseDTO.fromData(result, 'Subscription payment initiated successfully');
      res.status(201).json(response);
    } catch (error) {
      console.error('Create subscription payment error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to create subscription payment');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Get Subscription by ID
   * GET /api/subscriptions/:id
   */
  async getSubscriptionById(req, res) {
    try {
      const { id } = req.params;
      const result = await this.subscriptionService.getSubscriptionById(id);
      const response = SuccessResponseDTO.fromData(result, 'Subscription retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get subscription by ID error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get subscription');
      res.status(404).json(errorResponse);
    }
  }

  /**
   * Get Subscriptions by User ID
   * GET /api/subscriptions/user/:userId
   */
  async getSubscriptionsByUserId(req, res) {
    try {
      const { userId } = req.params;
      const result = await this.subscriptionService.getSubscriptionsByUserId(userId);
      const response = SuccessResponseDTO.fromData(result, 'Subscriptions retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get subscriptions by user ID error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get subscriptions');
      res.status(400).json(errorResponse);
    }
  }

  /**
   * Get All Subscriptions
   * GET /api/subscriptions
   */
  async getAllSubscriptions(req, res) {
    try {
      const filters = {
        userId: req.query.userId,
        status: req.query.status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0
      };

      const result = await this.subscriptionService.getAllSubscriptions(filters);
      const response = SuccessResponseDTO.fromData(result, 'Subscriptions retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get all subscriptions error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get subscriptions');
      res.status(400).json(errorResponse);
    }
  }
}

module.exports = SubscriptionController;

