const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const AirtelPaymentService = require('./AirtelPaymentService');
const PaymentService = require('./PaymentService');

/**
 * Subscription Service
 * Handles subscription payment processing using Airtel Money
 */
class SubscriptionService {
  constructor() {
    this.airtelPaymentService = new AirtelPaymentService();
    this.mtnPaymentService = new PaymentService();
  }

  /**
   * Create and process subscription payment
   * @param {object} subscriptionData - Subscription payment data
   * @param {string} subscriptionData.userId - User UUID
   * @param {number} subscriptionData.amount - Amount to pay
   * @param {number} subscriptionData.numberOfMonths - Number of months for subscription
   * @param {string} subscriptionData.msisdn - MSISDN without country code (from API request)
   * @param {string} subscriptionData.paymentChannel - Payment channel: "MTN" or "AIRTEL"
   * @param {string} subscriptionData.country - Country code (default: 'RW')
   * @param {string} subscriptionData.currency - Currency code (default: 'RWF')
   * @returns {Promise<object>} Subscription payment response
   */
  async createSubscriptionPayment(subscriptionData) {
    try {
      // Validate required fields
      if (!subscriptionData.userId || !subscriptionData.amount || !subscriptionData.numberOfMonths || !subscriptionData.msisdn || !subscriptionData.paymentChannel) {
        throw new Error('Missing required fields: userId, amount, numberOfMonths, msisdn, paymentChannel');
      }

      // Validate payment channel
      if (!['MTN', 'AIRTEL'].includes(subscriptionData.paymentChannel.toUpperCase())) {
        throw new Error('Invalid payment channel. Must be "MTN" or "AIRTEL"');
      }

      const paymentChannel = subscriptionData.paymentChannel.toUpperCase();

      // Validate data types
      if (typeof subscriptionData.amount !== 'number' || subscriptionData.amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      if (typeof subscriptionData.numberOfMonths !== 'number' || subscriptionData.numberOfMonths < 1) {
        throw new Error('Number of months must be at least 1');
      }

      // Validate userId format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(subscriptionData.userId)) {
        throw new Error('Invalid userId format. Must be a valid UUID');
      }

      const country = subscriptionData.country || 'RW';
      const currency = subscriptionData.currency || 'RWF';

      // Generate unique transaction ID
      const transactionId = `SUB-${crypto.randomUUID()}`;

      // Create subscription record
      const subscription = new Subscription({
        userId: subscriptionData.userId,
        amount: subscriptionData.amount,
        currency: currency,
        numberOfMonths: subscriptionData.numberOfMonths,
        paymentChannel: paymentChannel,
        msisdn: subscriptionData.msisdn,
        transactionId: transactionId,
        status: 'PENDING'
      });

      await subscription.save();

      try {
        let paymentResponse;
        
        if (paymentChannel === 'AIRTEL') {
          // Prepare Airtel payment request
          const paymentData = {
            reference: `Subscription payment for ${subscriptionData.numberOfMonths} month(s)`,
            subscriber: {
              country: country,
              currency: currency,
              msisdn: subscriptionData.msisdn // Use msisdn from API request, not from .env
            },
            transaction: {
              amount: subscriptionData.amount,
              id: transactionId
            }
          };

          // Add optional transaction country and currency for cross-border payments
          if (subscriptionData.transactionCountry) {
            paymentData.transaction.country = subscriptionData.transactionCountry;
          }
          if (subscriptionData.transactionCurrency) {
            paymentData.transaction.currency = subscriptionData.transactionCurrency;
          }

          // Initiate Airtel USSD Push payment
          paymentResponse = await this.airtelPaymentService.ussdPushPayment(
            paymentData,
            country,
            currency
          );

          // Update subscription with Airtel response
          subscription.airtelResponse = paymentResponse;
          
          // Check transaction status from response
          if (paymentResponse.data && paymentResponse.data.transaction) {
            const transactionStatus = paymentResponse.data.transaction.status;
            subscription.airtelStatus = transactionStatus;
            
            if (paymentResponse.data.transaction.airtel_money_id) {
              subscription.airtelMoneyId = paymentResponse.data.transaction.airtel_money_id;
            }
            
            if (transactionStatus === 'TS') {
              subscription.status = 'SUCCESSFUL';
              subscription.startDate = new Date();
              subscription.processedAt = new Date();
              await subscription.calculateEndDate();
            } else if (transactionStatus === 'TF') {
              subscription.status = 'FAILED';
              subscription.completedAt = new Date();
            } else {
              // TIP, TA, etc. - still pending
              subscription.status = 'PENDING';
            }
          }
        } else if (paymentChannel === 'MTN') {
          // Prepare MTN payment request
          const paymentData = {
            amount: subscriptionData.amount,
            currency: currency,
            externalId: transactionId,
            payer: {
              partyIdType: 'MSISDN',
              partyId: subscriptionData.msisdn
            },
            payerMessage: `Subscription payment for ${subscriptionData.numberOfMonths} month(s)`,
            payeeNote: `Tsinda subscription - ${subscriptionData.numberOfMonths} month(s)`
          };

          // Initiate MTN Request to Pay
          paymentResponse = await this.mtnPaymentService.requestToPay(paymentData);

          // Update subscription with MTN response
          subscription.mtnResponse = paymentResponse;
          
          // Check transaction status from response
          if (paymentResponse.xReferenceId) {
            subscription.mtnReferenceId = paymentResponse.xReferenceId;
          }
          
          if (paymentResponse.status) {
            subscription.mtnStatus = paymentResponse.status;
            
            if (paymentResponse.status === 'SUCCESSFUL') {
              subscription.status = 'SUCCESSFUL';
              subscription.startDate = new Date();
              subscription.processedAt = new Date();
              await subscription.calculateEndDate();
            } else if (paymentResponse.status === 'FAILED') {
              subscription.status = 'FAILED';
              subscription.completedAt = new Date();
            } else {
              // PENDING, etc.
              subscription.status = 'PENDING';
            }
          }
        }

        await subscription.save();

        return subscription.toSubscriptionDTO();
      } catch (error) {
        // Update subscription with error
        subscription.status = 'FAILED';
        if (paymentChannel === 'AIRTEL') {
          subscription.airtelError = { message: error.message };
        } else if (paymentChannel === 'MTN') {
          subscription.mtnError = { message: error.message };
        }
        subscription.completedAt = new Date();
        await subscription.save();

        throw error;
      }
    } catch (error) {
      throw new Error(`Subscription payment failed: ${error.message}`);
    }
  }

  /**
   * Get subscription by ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<object>} Subscription data
   */
  async getSubscriptionById(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      return subscription.toSubscriptionDTO();
    } catch (error) {
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  /**
   * Get subscriptions by user ID
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} List of subscriptions
   */
  async getSubscriptionsByUserId(userId) {
    try {
      const subscriptions = await Subscription.find({ userId })
        .sort({ createdAt: -1 });
      return subscriptions.map(sub => sub.toSubscriptionDTO());
    } catch (error) {
      throw new Error(`Failed to get subscriptions: ${error.message}`);
    }
  }

  /**
   * Get all subscriptions with filters
   * @param {object} filters - Filter options
   * @returns {Promise<Array>} List of subscriptions
   */
  async getAllSubscriptions(filters = {}) {
    try {
      const query = {};
      
      if (filters.userId) {
        query.userId = filters.userId;
      }
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.dateFrom && filters.dateTo) {
        query.createdAt = {
          $gte: new Date(filters.dateFrom),
          $lte: new Date(filters.dateTo)
        };
      }

      const limit = filters.limit || 50;
      const skip = filters.skip || 0;

      const subscriptions = await Subscription.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Subscription.countDocuments(query);

      return {
        subscriptions: subscriptions.map(sub => sub.toSubscriptionDTO()),
        total,
        limit,
        skip
      };
    } catch (error) {
      throw new Error(`Failed to get subscriptions: ${error.message}`);
    }
  }
}

module.exports = SubscriptionService;

