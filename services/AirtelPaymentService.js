const axios = require('axios');
const crypto = require('crypto');
const AirtelAuthService = require('./AirtelAuthService');
const { getServiceConfig } = require('../config/paymentConfig');
const AirtelEncryption = require('../utils/airtelEncryption');

/**
 * Airtel Payment Service
 * Handles Airtel Money payment operations
 * Completely separate from MTN Payment Service
 */
class AirtelPaymentService {
  constructor() {
    // Load Airtel configuration
    this.airtelConfig = getServiceConfig('airtel');
    this.baseURL = this.airtelConfig.baseURL;
    this.retryConfig = this.airtelConfig.retry;
    this.defaultMsisdn = this.airtelConfig.msisdn;
    
    // Initialize Airtel authentication service
    this.airtelAuth = new AirtelAuthService();
  }

  /**
   * USSD Push Payment
   * POST /merchant/v2/payments/
   * Request a payment from a consumer (Payer)
   * 
   * @param {object} paymentData - Payment request data
   * @param {string} paymentData.reference - Reference for service/goods purchased
   * @param {object} paymentData.subscriber - Subscriber information
   * @param {string} paymentData.subscriber.country - Country code (e.g., 'RW')
   * @param {string} paymentData.subscriber.currency - Currency code (e.g., 'RWF')
   * @param {string} paymentData.subscriber.msisdn - MSISDN without country code
   * @param {object} paymentData.transaction - Transaction details
   * @param {number} paymentData.transaction.amount - Transaction amount
   * @param {string} paymentData.transaction.country - Transaction country (optional for same country)
   * @param {string} paymentData.transaction.currency - Transaction currency (optional for same country)
   * @param {string} paymentData.transaction.id - Partner unique transaction ID
   * @param {string} country - Country code for headers (default: 'RW')
   * @param {string} currency - Currency code for headers (default: 'RWF')
   * @returns {Promise<object>} Payment response
   */
  async ussdPushPayment(paymentData, country = 'RW', currency = 'RWF') {
    try {
      // Validate required fields
      if (!paymentData.reference || !paymentData.subscriber || !paymentData.transaction) {
        throw new Error('Missing required fields: reference, subscriber, transaction');
      }

      if (!paymentData.subscriber.country) {
        throw new Error('Missing required subscriber field: country');
      }

      // Use msisdn from payload or fallback to environment variable
      const msisdn = paymentData.subscriber.msisdn || this.defaultMsisdn;
      if (!msisdn) {
        throw new Error('Missing required subscriber field: msisdn (provide in payload or set AIRTEL_MSISDN in .env)');
      }

      if (!paymentData.transaction.amount || !paymentData.transaction.id) {
        throw new Error('Missing required transaction fields: amount, id');
      }

      // Get Airtel user with valid token
      const airtelUser = await this.airtelAuth.getAirtelUser();

      // Prepare request body
      const requestBody = {
        reference: paymentData.reference,
        subscriber: {
          country: paymentData.subscriber.country,
          currency: paymentData.subscriber.currency || currency,
          msisdn: msisdn
        },
        transaction: {
          amount: paymentData.transaction.amount,
          id: paymentData.transaction.id
        }
      };

      // Add optional transaction country and currency for cross-border payments
      if (paymentData.transaction.country) {
        requestBody.transaction.country = paymentData.transaction.country;
      }
      if (paymentData.transaction.currency) {
        requestBody.transaction.currency = paymentData.transaction.currency;
      }

      // Get encryption keys for x-signature and x-key headers
      // Note: The exact encryption method for x-signature and x-key may need to be
      // clarified from Airtel documentation. This is a placeholder implementation.
      let xSignature = '';
      let xKey = '';

      try {
        const encryptionKeys = await this.airtelAuth.getEncryptionKeys(country, currency);
        
        // Generate x-signature and x-key
        // TODO: Implement proper encryption based on Airtel's specifications
        // This may involve encrypting the request body with AES and then encrypting
        // the AES key with RSA using the public key from encryption keys API
        xSignature = this.generateSignature(requestBody, encryptionKeys);
        xKey = this.generateKey(encryptionKeys);
      } catch (error) {
        console.warn('Encryption keys retrieval failed, proceeding without encryption:', error.message);
        // Some implementations may not require encryption in sandbox/test mode
      }

      // Make API call
      const request = {
        method: 'POST',
        url: `${this.baseURL}/merchant/v2/payments/`,
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'X-Country': country,
          'X-Currency': currency,
          'Authorization': `Bearer ${airtelUser.accessToken}`
        },
        data: requestBody
      };

      // Add encryption headers if available
      if (xSignature) {
        request.headers['x-signature'] = xSignature;
      }
      if (xKey) {
        request.headers['x-key'] = xKey;
      }

      const response = await axios.post(request.url, request.data, {
        headers: request.headers,
        timeout: this.retryConfig.timeout
      });

      // Check for Airtel-specific error codes in response
      const responseData = response.data;
      if (responseData.status) {
        const responseCode = responseData.status.response_code;
        
        // Handle Collection API error codes
        if (responseCode && responseCode !== 'DP00800001001') {
          // Not success, check for specific error codes
          const errorMessage = this.getCollectionErrorMessage(responseCode, responseData.status.message);
          if (errorMessage) {
            throw new Error(errorMessage);
          }
        }
      }

      console.log('Airtel USSD Push payment initiated successfully');
      return responseData;
    } catch (error) {
      if (error.response) {
        const responseData = error.response.data;
        if (responseData && responseData.status) {
          const responseCode = responseData.status.response_code;
          const errorMessage = this.getCollectionErrorMessage(responseCode, responseData.status.message);
          if (errorMessage) {
            throw new Error(errorMessage);
          }
        }
        throw new Error(`USSD Push payment failed: ${error.response.data?.status?.message || error.message}`);
      }
      throw new Error(`USSD Push payment failed: ${error.message}`);
    }
  }

  /**
   * Get user-friendly error message from Collection API error code
   * @param {string} responseCode - Airtel response code
   * @param {string} defaultMessage - Default error message
   * @returns {string} User-friendly error message
   */
  getCollectionErrorMessage(responseCode, defaultMessage = '') {
    const errorCodeMap = {
      'DP00800001000': 'Ambiguous - The transaction is still processing. Please check transaction status.',
      'DP00800001001': 'Success - Transaction is successful.',
      'DP00800001002': 'Incorrect Pin - Incorrect pin has been entered.',
      'DP00800001003': 'Exceeds withdrawal amount limit - The User has exceeded their wallet allowed transaction limit.',
      'DP00800001004': 'Invalid Amount - The amount User is trying to transfer is less than the minimum amount allowed.',
      'DP00800001005': 'Transaction ID is invalid - User didn\'t enter the pin.',
      'DP00800001006': 'In process - Transaction in pending state. Please check after sometime.',
      'DP00800001007': 'Not enough balance - User wallet does not have enough money to cover the payable amount.',
      'DP00800001008': 'Refused - The transaction was refused.',
      'DP00800001010': 'Transaction not permitted to Payee - Payee is already initiated for churn or barred or not registered on Airtel Money platform.',
      'DP00800001024': 'Transaction Timed Out - The transaction was timed out.',
      'DP00800001025': 'Transaction Not Found - The transaction was not found.',
      'DP00800001026': 'Forbidden - X-signature and payload did not match.',
      'DP00800001029': 'Transaction Expired - Transaction has been expired.'
    };

    return errorCodeMap[responseCode] || defaultMessage || 'Transaction failed';
  }

  /**
   * Generate x-signature header
   * TODO: Implement based on Airtel's encryption specifications
   * This is a placeholder - actual implementation may require:
   * - Encrypting the request body with AES
   * - Signing with RSA using the public key
   */
  generateSignature(requestBody, encryptionKeys) {
    try {
      // Placeholder: Return base64 encoded hash
      // Actual implementation should follow Airtel's encryption specifications
      const bodyString = JSON.stringify(requestBody);
      const hash = crypto.createHash('sha256').update(bodyString).digest();
      return hash.toString('base64');
    } catch (error) {
      console.warn('Signature generation failed:', error.message);
      return '';
    }
  }

  /**
   * Generate x-key header
   * TODO: Implement based on Airtel's encryption specifications
   * This is a placeholder - actual implementation may require:
   * - Generating AES key and IV
   * - Encrypting AES key with RSA public key
   */
  generateKey(encryptionKeys) {
    try {
      // Placeholder: Return base64 encoded random key
      // Actual implementation should follow Airtel's encryption specifications
      const randomKey = crypto.randomBytes(32);
      return randomKey.toString('base64');
    } catch (error) {
      console.warn('Key generation failed:', error.message);
      return '';
    }
  }

  /**
   * Refund Payment
   * POST /standard/v2/payments/refund
   * Make full refunds to Partners
   * 
   * @param {object} refundData - Refund request data
   * @param {string} refundData.airtel_money_id - Airtel unique transaction id to identify the transaction
   * @param {string} country - Country code for headers (default: 'RW')
   * @param {string} currency - Currency code for headers (default: 'RWF')
   * @returns {Promise<object>} Refund response
   */
  async refund(refundData, country = 'RW', currency = 'RWF') {
    try {
      // Validate required fields
      if (!refundData || !refundData.airtel_money_id) {
        throw new Error('Missing required field: airtel_money_id');
      }

      // Get Airtel user with valid token
      const airtelUser = await this.airtelAuth.getAirtelUser();

      // Prepare request body
      const requestBody = {
        transaction: {
          airtel_money_id: refundData.airtel_money_id
        }
      };

      // Get encryption keys for x-signature and x-key headers
      let xSignature = '';
      let xKey = '';

      try {
        const encryptionKeys = await this.airtelAuth.getEncryptionKeys(country, currency);
        
        // Generate x-signature and x-key
        // TODO: Implement proper encryption based on Airtel's specifications
        xSignature = this.generateSignature(requestBody, encryptionKeys);
        xKey = this.generateKey(encryptionKeys);
      } catch (error) {
        console.warn('Encryption keys retrieval failed, proceeding without encryption:', error.message);
        // Some implementations may not require encryption in sandbox/test mode
      }

      // Make API call
      const request = {
        method: 'POST',
        url: `${this.baseURL}/standard/v2/payments/refund`,
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'X-Country': country,
          'X-Currency': currency,
          'Authorization': `Bearer ${airtelUser.accessToken}`
        },
        data: requestBody
      };

      // Add encryption headers if available
      if (xSignature) {
        request.headers['x-signature'] = xSignature;
      }
      if (xKey) {
        request.headers['x-key'] = xKey;
      }

      const response = await axios.post(request.url, request.data, {
        headers: request.headers,
        timeout: this.retryConfig.timeout
      });

      // Check for Airtel-specific error codes in response
      const responseData = response.data;
      if (responseData.status) {
        const responseCode = responseData.status.response_code;
        
        // Handle error codes (refund may use similar codes)
        if (responseCode && !responseData.status.success) {
          const errorMessage = this.getCollectionErrorMessage(responseCode, responseData.status.message);
          if (errorMessage && !errorMessage.includes('Success')) {
            throw new Error(errorMessage);
          }
        }
      }

      console.log('Airtel refund processed successfully');
      return responseData;
    } catch (error) {
      if (error.response) {
        const responseData = error.response.data;
        if (responseData && responseData.status) {
          const responseCode = responseData.status.response_code;
          const errorMessage = this.getCollectionErrorMessage(responseCode, responseData.status.message);
          if (errorMessage && !errorMessage.includes('Success')) {
            throw new Error(errorMessage);
          }
        }
        throw new Error(`Refund failed: ${error.response.data?.status?.message || error.message}`);
      }
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Transaction Enquiry
   * GET /standard/v1/payments/{id}
   * Get transaction status and details by transaction ID
   * 
   * @param {string} transactionId - Transaction ID to enquire about
   * @param {string} country - Country code for headers (default: 'RW')
   * @param {string} currency - Currency code for headers (default: 'RWF')
   * @returns {Promise<object>} Transaction enquiry response
   */
  async transactionEnquiry(transactionId, country = 'RW', currency = 'RWF') {
    try {
      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      // Get Airtel user with valid token
      const airtelUser = await this.airtelAuth.getAirtelUser();

      // Make API call
      const request = {
        method: 'GET',
        url: `${this.baseURL}/standard/v1/payments/${transactionId}`,
        headers: {
          'Accept': '*/*',
          'X-Country': country,
          'X-Currency': currency,
          'Authorization': `Bearer ${airtelUser.accessToken}`
        }
      };

      const response = await axios.get(request.url, {
        headers: request.headers,
        timeout: this.retryConfig.timeout
      });

      console.log('Airtel transaction enquiry completed successfully');
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Transaction enquiry failed: ${error.response.data?.status?.message || error.message}`);
      }
      throw new Error(`Transaction enquiry failed: ${error.message}`);
    }
  }

  /**
   * Balance Enquiry
   * GET /standard/v2/users/balance
   * Get balance for a specific wallet type
   * 
   * @param {string} type - Type of wallet: "DISB", "COLL", "CASHIN", or "CASHOUT"
   * @param {string} country - Country code for headers (default: 'RW')
   * @param {string} currency - Currency code for headers (default: 'RWF')
   * @returns {Promise<object>} Balance enquiry response
   */
  async getBalance(type = 'COLL', country = 'RW', currency = 'RWF') {
    try {
      // Validate wallet type
      const validTypes = ['DISB', 'COLL', 'CASHIN', 'CASHOUT'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid wallet type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Get Airtel user with valid token
      const airtelUser = await this.airtelAuth.getAirtelUser();

      // Make API call
      // Note: The type parameter might be a query parameter or path parameter
      // Based on the example, implementing as query parameter
      const request = {
        method: 'GET',
        url: `${this.baseURL}/standard/v2/users/balance`,
        headers: {
          'Accept': '*/*',
          'X-Country': country,
          'X-Currency': currency,
          'Authorization': `Bearer ${airtelUser.accessToken}`
        },
        params: {
          type: type
        }
      };

      const response = await axios.get(request.url, {
        headers: request.headers,
        params: request.params,
        timeout: this.retryConfig.timeout
      });

      // Check for Airtel-specific error codes
      const responseData = response.data;
      if (responseData.status) {
        const responseCode = responseData.status.response_code;
        
        // Handle specific error codes
        if (responseCode === 'DP02100000000') {
          throw new Error('Balance enquiry failed');
        } else if (responseCode === 'DP02100000002') {
          throw new Error('User Not Found - Invalid MSISDN provided as input');
        } else if (responseCode === 'DP02100000001') {
          // Success - continue normally
          console.log('Airtel balance enquiry completed successfully');
        } else if (!responseData.status.success) {
          // Other error codes
          const errorMessage = responseData.status.message || 'Balance enquiry failed';
          throw new Error(errorMessage);
        }
      }

      return responseData;
    } catch (error) {
      if (error.response) {
        const responseData = error.response.data;
        if (responseData && responseData.status) {
          const responseCode = responseData.status.response_code;
          
          // Map error codes to user-friendly messages
          if (responseCode === 'DP02100000000') {
            throw new Error('Balance enquiry failed');
          } else if (responseCode === 'DP02100000002') {
            throw new Error('User Not Found - Invalid MSISDN provided as input');
          } else {
            throw new Error(responseData.status.message || 'Balance enquiry failed');
          }
        }
        throw new Error(`Balance enquiry failed: ${error.response.data?.status?.message || error.message}`);
      }
      throw new Error(`Balance enquiry failed: ${error.message}`);
    }
  }
}

module.exports = AirtelPaymentService;

