const axios = require('axios');
const crypto = require('crypto');
const MTNUser = require('../models/MTNUser');
const { getServiceConfig } = require('../config/paymentConfig');

/**
 * MTN MoMo Authentication Service
 * Handles all MTN API authentication, token management, and user operations
 */
class MTNAuthService {
  constructor() {
    // Load MTN configuration
    this.mtnConfig = getServiceConfig('mtn');
    this.baseURL = this.mtnConfig.baseURL;
    this.subscriptionKeys = this.mtnConfig.subscriptionKeys;
    this.retryConfig = this.mtnConfig.retry;
    this.providerCallbackHost = this.mtnConfig.providerCallbackHost;
  }

  /**
   * Initialize or get existing MTN user
   * Creates new user if none exists, or refreshes tokens if needed
   */
  async initializeMTNUser() {
    try {
      // Check if user already exists
      let mtnUser = await MTNUser.findOne({ isActive: true });
      
      if (!mtnUser) {
        console.log('Creating new MTN user...');
        mtnUser = await this.createNewMTNUser();
      } else {
        console.log('Refreshing MTN user tokens...');
        await this.refreshTokensIfNeeded(mtnUser);
        // Reload user to get updated tokens
        mtnUser = await MTNUser.findById(mtnUser._id);
      }
      
      return mtnUser;
    } catch (error) {
      throw new Error(`Failed to initialize MTN user: ${error.message}`);
    }
  }

  /**
   * Create a new MTN user with API user, key, and tokens
   */
  async createNewMTNUser() {
    try {
      const xReferenceId = crypto.randomUUID();
      console.log(`Generated X-Reference-Id: ${xReferenceId}`);
      
      // Step 1: Create API User
      console.log('Step 1: Creating API User...');
      await this.createAPIUser(xReferenceId);
      await this.delay(500);
      
      // Step 2: Create API Key
      console.log('Step 2: Creating API Key...');
      const apiKey = await this.createAPIKey(xReferenceId);
      await this.delay(500);
      
      // Step 3: Create Collection Token
      console.log('Step 3: Creating Collection Token...');
      const collectionToken = await this.createCollectionToken(xReferenceId, apiKey);
      await this.delay(500);
      
      // Step 4: Create Disbursement Token
      console.log('Step 4: Creating Disbursement Token...');
      const disbursementToken = await this.createDisbursementToken(xReferenceId, apiKey);
      
      // Step 5: Save to database
      console.log('Saving MTN user to database...');
      const mtnUser = new MTNUser({
        xReferenceId,
        apiKey,
        providerCallbackHost: this.providerCallbackHost,
        collectionToken: collectionToken.access_token,
        disbursementToken: disbursementToken.access_token,
        collectionTokenExpiresAt: new Date(Date.now() + (collectionToken.expires_in * 1000)),
        disbursementTokenExpiresAt: new Date(Date.now() + (disbursementToken.expires_in * 1000)),
        subscriptionKeys: this.subscriptionKeys
      });
      
      await mtnUser.save();
      console.log('MTN user created successfully');
      return mtnUser;
    } catch (error) {
      throw new Error(`Failed to create new MTN user: ${error.message}`);
    }
  }

  /**
   * Create API User
   */
  async createAPIUser(xReferenceId) {
    const request = {
      method: 'POST',
      url: `${this.baseURL}/v1_0/apiuser`,
      headers: {
        'X-Reference-Id': xReferenceId,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.subscriptionKeys.collections
      },
      data: {
        providerCallbackHost: this.providerCallbackHost
      }
    };

    try {
      const response = await axios.post(request.url, request.data, { 
        headers: request.headers,
        timeout: this.retryConfig.timeout
      });
      console.log('API User created successfully');
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('API User already exists, continuing...');
        return { message: 'User already exists' };
      }
      throw new Error(`Failed to create API user: ${error.message}`);
    }
  }

  /**
   * Create API Key
   */
  async createAPIKey(xReferenceId) {
    const request = {
      method: 'POST',
      url: `${this.baseURL}/v1_0/apiuser/${xReferenceId}/apikey`,
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.subscriptionKeys.collections
      },
      data: {}
    };

    try {
      const response = await axios.post(request.url, request.data, { 
        headers: request.headers,
        timeout: this.retryConfig.timeout
      });
      console.log('API Key created successfully');
      return response.data.apiKey;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('API Key already exists, continuing...');
        // In this case, we need to get the existing key somehow
        // For now, we'll throw an error as we can't retrieve existing keys
        throw new Error('API key already exists but cannot be retrieved');
      }
      throw new Error(`Failed to create API key: ${error.message}`);
    }
  }

  /**
   * Create Collection Token
   */
  async createCollectionToken(xReferenceId, apiKey) {
    const request = {
      method: 'POST',
      url: `${this.baseURL}/collection/token/`,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${xReferenceId}:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.subscriptionKeys.collections
      },
      data: {}
    };

    try {
      const response = await axios.post(request.url, request.data, { 
        headers: request.headers,
        timeout: this.retryConfig.timeout
      });
      console.log('Collection token created successfully');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create collection token: ${error.message}`);
    }
  }

  /**
   * Create Disbursement Token
   */
  async createDisbursementToken(xReferenceId, apiKey) {
    const request = {
      method: 'POST',
      url: `${this.baseURL}/disbursement/token/`,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${xReferenceId}:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.subscriptionKeys.disbursements
      },
      data: {}
    };

    try {
      const response = await axios.post(request.url, request.data, { 
        headers: request.headers,
        timeout: this.retryConfig.timeout
      });
      console.log('Disbursement token created successfully');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create disbursement token: ${error.message}`);
    }
  }

  /**
   * Refresh tokens if they are expired or about to expire
   */
  async refreshTokensIfNeeded(mtnUser) {
    const now = new Date();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
    
    try {
      // Check collection token
      if (!mtnUser.collectionTokenValid || 
          (mtnUser.collectionTokenExpiresAt && 
           new Date(mtnUser.collectionTokenExpiresAt.getTime() - refreshThreshold) <= now)) {
        console.log('Refreshing collection token...');
        const collectionToken = await this.createCollectionToken(mtnUser.xReferenceId, mtnUser.apiKey);
        await mtnUser.updateCollectionToken(collectionToken.access_token, collectionToken.expires_in);
      }
      
      // Check disbursement token
      if (!mtnUser.disbursementTokenValid || 
          (mtnUser.disbursementTokenExpiresAt && 
           new Date(mtnUser.disbursementTokenExpiresAt.getTime() - refreshThreshold) <= now)) {
        console.log('Refreshing disbursement token...');
        const disbursementToken = await this.createDisbursementToken(mtnUser.xReferenceId, mtnUser.apiKey);
        await mtnUser.updateDisbursementToken(disbursementToken.access_token, disbursementToken.expires_in);
      }
    } catch (error) {
      console.error('Failed to refresh tokens:', error.message);
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  /**
   * Get valid collection token
   */
  async getCollectionToken() {
    const mtnUser = await this.initializeMTNUser();
    return mtnUser.collectionToken;
  }

  /**
   * Get valid disbursement token
   */
  async getDisbursementToken() {
    const mtnUser = await this.initializeMTNUser();
    return mtnUser.disbursementToken;
  }

  /**
   * Get MTN user with valid tokens
   */
  async getMTNUser() {
    return await this.initializeMTNUser();
  }

  /**
   * Update user usage statistics
   */
  async updateUsageStats(success = true) {
    try {
      const mtnUser = await MTNUser.findOne({ isActive: true });
      if (mtnUser) {
        await mtnUser.incrementUsage(success);
      }
    } catch (error) {
      console.error('Failed to update usage stats:', error.message);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const mtnUser = await MTNUser.findOne({ isActive: true });
      if (mtnUser) {
        return mtnUser.usageStats;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user stats:', error.message);
      return null;
    }
  }

  /**
   * Reset MTN user (for testing purposes)
   */
  async resetMTNUser() {
    try {
      await MTNUser.deleteMany({});
      console.log('MTN user reset successfully');
      return true;
    } catch (error) {
      throw new Error(`Failed to reset MTN user: ${error.message}`);
    }
  }

  /**
   * Get MTN user status
   */
  async getMTNUserStatus() {
    try {
      const mtnUser = await MTNUser.findOne({ isActive: true });
      if (!mtnUser) {
        return {
          exists: false,
          message: 'No MTN user found'
        };
      }

      return {
        exists: true,
        xReferenceId: mtnUser.xReferenceId,
        isActive: mtnUser.isActive,
        hasCollectionToken: !!mtnUser.collectionToken,
        hasDisbursementToken: !!mtnUser.disbursementToken,
        collectionTokenValid: mtnUser.collectionTokenValid,
        disbursementTokenValid: mtnUser.disbursementTokenValid,
        collectionTokenExpiresAt: mtnUser.collectionTokenExpiresAt,
        disbursementTokenExpiresAt: mtnUser.disbursementTokenExpiresAt,
        usageStats: mtnUser.usageStats,
        createdAt: mtnUser.createdAt,
        updatedAt: mtnUser.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to get MTN user status: ${error.message}`);
    }
  }

  /**
   * Test MTN API connectivity
   */
  async testConnectivity() {
    try {
      const mtnUser = await this.getMTNUser();
      
      // Test collection token
      const collectionTest = await this.testToken('collection', mtnUser.collectionToken);
      
      // Test disbursement token
      const disbursementTest = await this.testToken('disbursement', mtnUser.disbursementToken);
      
      return {
        success: true,
        collection: collectionTest,
        disbursement: disbursementTest,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test individual token
   */
  async testToken(serviceType, token) {
    try {
      let testUrl;
      let subscriptionKey;
      
      if (serviceType === 'collection') {
        testUrl = `${this.baseURL}/collection/v1_0/account/balance`;
        subscriptionKey = this.subscriptionKeys.collections;
      } else if (serviceType === 'disbursement') {
        testUrl = `${this.baseURL}/disbursement/v1_0/account/balance`;
        subscriptionKey = this.subscriptionKeys.disbursements;
      }

      const response = await axios.get(testUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': subscriptionKey
        },
        timeout: this.retryConfig.timeout
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status,
        error: error.message
      };
    }
  }

  /**
   * Utility method for delays
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MTNAuthService;
