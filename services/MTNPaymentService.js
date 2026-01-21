const crypto = require('crypto');
const MTNCollectionService = require('./MTNCollectionService');
const Payment = require('../models/Payment');
const { getServiceConfig } = require('../config/paymentConfig');

class MTNPaymentService {
  constructor() {
    this.collectionService = new MTNCollectionService();
    this.mtnConfig = getServiceConfig('mtn');
  }

  async requestPayment(userId, phoneNumber, amount, options = {}) {
    try {
      const referenceId = crypto.randomUUID();
      const targetEnvironment = options.targetEnvironment || process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda';
      // Set callback URL - use provided, env variable, or default to DigitalOcean URL
      const callbackUrl = options.callbackUrl || process.env.MTN_CALLBACK_URL || 
        (process.env.BASE_URL ? `${process.env.BASE_URL}/api/mtn-payment/callback` : 
        'https://oyster-app-lag65.ondigitalocean.app/api/mtn-payment/callback');
      
      const currency = 'RWF';
      const payerMessage = 'subscription';
      const payeeNote = 'tsinda';

      const requestData = {
        amount: String(amount),
        currency: currency,
        externalId: userId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber
        },
        payerMessage: payerMessage,
        payeeNote: payeeNote
      };

      // Get MTN user for API credentials
      const mtnUser = await this.collectionService.getMTNUser();

      // Save payment transaction with PENDING status
      const payment = new Payment({
        xReferenceId: referenceId,
        apiUserId: mtnUser.xReferenceId,
        apiKey: mtnUser.apiKey,
        transactionType: 'collection',
        transactionSubType: 'request_to_pay',
        amount: amount,
        currency: currency,
        externalId: userId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber
        },
        payerMessage: payerMessage,
        payeeNote: payeeNote,
        status: 'PENDING',
        mtnStatus: 'PENDING',
        serviceType: 'collections',
        subscriptionKey: this.mtnConfig.subscriptionKeys.collections
      });

      await payment.save();
      console.log(`Payment transaction saved with status PENDING - Reference ID: ${referenceId}, External ID: ${userId}`);

      // Make payment request to MTN
      const result = await this.collectionService.requestToPay(
        referenceId,
        requestData,
        targetEnvironment,
        callbackUrl
      );

      // Update payment with MTN response
      payment.mtnResponse = { status: result.status, referenceId: result.referenceId };
      await payment.save();

      return {
        referenceId: result.referenceId,
        status: result.status,
        userId: userId,
        phoneNumber: phoneNumber,
        amount: amount,
        currency: currency,
        paymentId: payment._id
      };
    } catch (error) {
      console.error('Failed to request payment:', error);
      throw new Error(`Failed to request payment: ${error.message}`);
    }
  }

  async getPaymentStatus(referenceId, options = {}) {
    try {
      const targetEnvironment = options.targetEnvironment || process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda';
      
      const status = await this.collectionService.getRequestToPayStatus(
        referenceId,
        targetEnvironment
      );

      return status;
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  async getAccountBalance(options = {}) {
    try {
      const targetEnvironment = options.targetEnvironment || process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda';
      
      const balance = await this.collectionService.getAccountBalance(targetEnvironment);

      return balance;
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error.message}`);
    }
  }
}

module.exports = MTNPaymentService;
