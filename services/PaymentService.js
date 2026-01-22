const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const MTNAuthService = require('./MTNAuthService');
const { getServiceConfig } = require('../config/paymentConfig');
const {
  RequestToPayDTO,
  TransferDTO,
  RefundDTO,
  AccountStatusDTO,
  PaymentResponseDTO,
  MTNUserResponseDTO,
  ErrorResponseDTO,
  SuccessResponseDTO
} = require('../dto/PaymentDTO');

/**
 * Professional Payment Service
 * Handles all MTN MoMo payment operations with proper error handling and logging
 */
class PaymentService {
  constructor() {
    // Load configuration
    this.mtnConfig = getServiceConfig('mtn');
    this.paymentConfig = getServiceConfig('payment');
    
    // Initialize MTN authentication service
    this.mtnAuth = new MTNAuthService();
    
    // Set service properties from configuration
    this.baseURL = this.mtnConfig.baseURL;
    this.subscriptionKeys = this.mtnConfig.subscriptionKeys;
    this.retryConfig = this.mtnConfig.retry;
    this.maxAmount = this.paymentConfig.maxAmount;
    this.defaultCurrency = this.paymentConfig.defaultCurrency;
    this.supportedCurrencies = this.paymentConfig.supportedCurrencies;
  }

  /**
   * Initialize or get existing MTN user
   */
  async initializeMTNUser() {
    return await this.mtnAuth.initializeMTNUser();
  }


  /**
   * Request to Pay (Collection)
   */
  async requestToPay(requestData) {
    try {
      // Validate input
      const dto = new RequestToPayDTO(requestData);
      const validationErrors = dto.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Get MTN user
      const mtnUser = await this.mtnAuth.getMTNUser();
      
      // Create payment record
      const payment = new Payment({
        xReferenceId: crypto.randomUUID(),
        transactionType: 'collection',
        transactionSubType: 'request_to_pay',
        amount: dto.amount,
        currency: dto.currency,
        externalId: dto.externalId,
        payer: dto.payer,
        payerMessage: dto.payerMessage,
        payeeNote: dto.payeeNote,
        serviceType: 'collections'
      });

      await payment.save();

      // Make API call
      const request = {
        method: 'POST',
        url: `${this.baseURL}/collection/v1_0/requesttopay`,
        headers: {
          'Authorization': `Bearer ${mtnUser.collectionToken}`,
          'X-Target-Environment': 'sandbox',
          'Content-Type': 'application/json',
          'X-Reference-Id': payment.xReferenceId,
          'Ocp-Apim-Subscription-Key': this.subscriptionKeys.collections
        },
        data: {
          amount: dto.amount.toString(),
          currency: dto.currency,
          externalId: dto.externalId,
          payer: dto.payer,
          payerMessage: dto.payerMessage,
          payeeNote: dto.payeeNote
        }
      };

      const response = await axios.post(request.url, request.data, { headers: request.headers });
      
      // Update payment with response
      payment.mtnResponse = response.data;
      payment.status = 'PENDING';
      await payment.save();

      // Update user stats
      await this.mtnAuth.updateUsageStats(true);

      return PaymentResponseDTO.fromPayment(payment);
    } catch (error) {
      throw new Error(`Request to pay failed: ${error.message}`);
    }
  }

  /**
   * Transfer (Disbursement)
   */
  async transfer(requestData) {
    try {
      // Validate input
      const dto = new TransferDTO(requestData);
      const validationErrors = dto.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Get MTN user
      const mtnUser = await this.mtnAuth.getMTNUser();
      
      // Create payment record
      const payment = new Payment({
        xReferenceId: crypto.randomUUID(),
        transactionType: 'disbursement',
        transactionSubType: 'transfer',
        amount: dto.amount,
        currency: dto.currency,
        externalId: dto.externalId,
        payee: dto.payee,
        payerMessage: dto.payerMessage,
        payeeNote: dto.payeeNote,
        serviceType: 'disbursements'
      });

      await payment.save();

      // Make API call
      const request = {
        method: 'POST',
        url: `${this.baseURL}/disbursement/v1_0/transfer`,
        headers: {
          'Authorization': `Bearer ${mtnUser.disbursementToken}`,
          'X-Target-Environment': 'sandbox',
          'Content-Type': 'application/json',
          'X-Reference-Id': payment.xReferenceId,
          'Ocp-Apim-Subscription-Key': this.subscriptionKeys.disbursements
        },
        data: {
          amount: dto.amount.toString(),
          currency: dto.currency,
          externalId: dto.externalId,
          payee: dto.payee,
          payerMessage: dto.payerMessage,
          payeeNote: dto.payeeNote
        }
      };

      const response = await axios.post(request.url, request.data, { headers: request.headers });
      
      // Update payment with response
      payment.mtnResponse = response.data;
      payment.status = 'PENDING';
      await payment.save();

      // Update user stats
      await this.mtnAuth.updateUsageStats(true);

      return PaymentResponseDTO.fromPayment(payment);
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Refund
   */
  async refund(requestData) {
    try {
      // Validate input
      const dto = new RefundDTO(requestData);
      const validationErrors = dto.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Get MTN user
      const mtnUser = await this.mtnAuth.getMTNUser();
      
      // Create payment record
      const payment = new Payment({
        xReferenceId: crypto.randomUUID(),
        transactionType: 'disbursement',
        transactionSubType: 'refund',
        amount: dto.amount,
        currency: dto.currency,
        externalId: dto.externalId,
        payerMessage: dto.payerMessage,
        payeeNote: dto.payeeNote,
        referenceIdToRefund: dto.referenceIdToRefund,
        serviceType: 'disbursements'
      });

      await payment.save();

      // Make API call
      const request = {
        method: 'POST',
        url: `${this.baseURL}/disbursement/v1_0/refund`,
        headers: {
          'Authorization': `Bearer ${mtnUser.disbursementToken}`,
          'X-Target-Environment': 'sandbox',
          'Content-Type': 'application/json',
          'X-Reference-Id': payment.xReferenceId,
          'Ocp-Apim-Subscription-Key': this.subscriptionKeys.disbursements
        },
        data: {
          amount: dto.amount.toString(),
          currency: dto.currency,
          externalId: dto.externalId,
          payerMessage: dto.payerMessage,
          payeeNote: dto.payeeNote,
          referenceIdToRefund: dto.referenceIdToRefund
        }
      };

      const response = await axios.post(request.url, request.data, { headers: request.headers });
      
      // Update payment with response
      payment.mtnResponse = response.data;
      payment.status = 'PENDING';
      await payment.save();

      // Update user stats
      await this.mtnAuth.updateUsageStats(true);

      return PaymentResponseDTO.fromPayment(payment);
    } catch (error) {
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Get Payment Status
   */
  async getPaymentStatus(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Get MTN user
      const mtnUser = await this.mtnAuth.getMTNUser();
      if (!mtnUser) {
        throw new Error('MTN user not found');
      }

      let statusUrl;
      let token;
      let subscriptionKey;

      if (payment.transactionType === 'collection') {
        statusUrl = `${this.baseURL}/collection/v1_0/requesttopay/${payment.xReferenceId}`;
        token = mtnUser.collectionToken;
        subscriptionKey = this.subscriptionKeys.collections;
      } else if (payment.transactionType === 'disbursement') {
        if (payment.transactionSubType === 'transfer') {
          statusUrl = `${this.baseURL}/disbursement/v1_0/transfer/${payment.xReferenceId}`;
        } else if (payment.transactionSubType === 'refund') {
          statusUrl = `${this.baseURL}/disbursement/v1_0/refund/${payment.xReferenceId}`;
        }
        token = mtnUser.disbursementToken;
        subscriptionKey = this.subscriptionKeys.disbursements;
      }

      const request = {
        method: 'GET',
        url: statusUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': subscriptionKey
        }
      };

      const response = await axios.get(request.url, { headers: request.headers });
      
      // Update payment status
      const mtnStatus = response.data.status;
      payment.mtnStatus = mtnStatus;
      payment.mtnResponse = response.data;
      
      if (mtnStatus === 'SUCCESSFUL') {
        payment.status = 'SUCCESSFUL';
        payment.completedAt = new Date();
      } else if (mtnStatus === 'FAILED') {
        payment.status = 'FAILED';
        payment.completedAt = new Date();
      }
      
      await payment.save();

      return PaymentResponseDTO.fromPayment(payment);
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Get Account Balance
   */
  async getAccountBalance(serviceType = 'collection') {
    try {
      const mtnUser = await this.mtnAuth.getMTNUser();
      
      let balanceUrl;
      let token;
      let subscriptionKey;

      if (serviceType === 'collection') {
        balanceUrl = `${this.baseURL}/collection/v1_0/account/balance`;
        token = mtnUser.collectionToken;
        subscriptionKey = this.subscriptionKeys.collections;
      } else if (serviceType === 'disbursement') {
        balanceUrl = `${this.baseURL}/disbursement/v1_0/account/balance`;
        token = mtnUser.disbursementToken;
        subscriptionKey = this.subscriptionKeys.disbursements;
      }

      const request = {
        method: 'GET',
        url: balanceUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': subscriptionKey
        }
      };

      const response = await axios.get(request.url, { headers: request.headers });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error.message}`);
    }
  }

  /**
   * Get All Payments
   */
  async getAllPayments(filters = {}) {
    try {
      const query = {};
      
      if (filters.transactionType) {
        query.transactionType = filters.transactionType;
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

      const payments = await Payment.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      return payments.map(payment => PaymentResponseDTO.fromPayment(payment));
    } catch (error) {
      throw new Error(`Failed to get payments: ${error.message}`);
    }
  }

  /**
   * Get Payment by ID
   */
  async getPaymentById(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      return PaymentResponseDTO.fromPayment(payment);
    } catch (error) {
      throw new Error(`Failed to get payment: ${error.message}`);
    }
  }

  /**
   * Utility method for delays
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = PaymentService;
