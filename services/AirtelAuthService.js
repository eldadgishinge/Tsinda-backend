const axios = require('axios');
const crypto = require('crypto');
const AirtelUser = require('../models/AirtelUser');
const { getServiceConfig } = require('../config/paymentConfig');
const AirtelEncryption = require('../utils/airtelEncryption');

/**
 * Airtel Money Authentication Service
 * Handles all Airtel API authentication, token management, and user operations
 */
class AirtelAuthService {
  constructor() {
    // Load Airtel configuration
    this.airtelConfig = getServiceConfig('airtel');
    this.baseURL = this.airtelConfig.baseURL;
    this.clientId = this.airtelConfig.clientId;
    this.clientSecret = this.airtelConfig.clientSecret;
    this.retryConfig = this.airtelConfig.retry;
  }

  /**
   * Get OAuth2 access token using client credentials
   * This is the main authentication method for Airtel APIs
   */
  async getAccessToken() {
    try {
      // Validate that client credentials are available
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Airtel client credentials (AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET) are not configured');
      }

      // Ensure baseURL doesn't have trailing slash
      const baseURL = this.baseURL.replace(/\/$/, '');
      const url = `${baseURL}/auth/oauth2/token`;
      
      console.log('Requesting Airtel token from:', url);
      console.log('Client ID:', this.clientId ? `${this.clientId.substring(0, 8)}...` : 'NOT SET');
      
      // Prepare request body exactly as per Airtel documentation
      // All values must be strings (in quotes when JSON stringified)
      const requestBody = {
        client_id: String(this.clientId),
        client_secret: String(this.clientSecret),
        grant_type: 'client_credentials'
      };
      
      // Headers as per documentation
      const headers = {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      };
      
      // Request configuration
      let request = {
        method: 'POST',
        url: url,
        headers: headers,
        data: requestBody
      };

      // Log the request being sent (matching fetch example format)
      console.log('Airtel Token Request:', {
        method: 'POST',
        url: request.url,
        headers: headers,
        body: JSON.stringify(requestBody, null, 2),
        bodyObject: {
          client_id: this.clientId ? `${this.clientId.substring(0, 8)}...` : 'NOT SET',
          client_secret: this.clientSecret ? `${this.clientSecret.substring(0, 8)}...` : 'NOT SET',
          grant_type: requestBody.grant_type
        },
        timeout: this.retryConfig.timeout
      });

      try {
        const response = await axios.post(request.url, request.data, {
          headers: request.headers,
          timeout: this.retryConfig.timeout
        });

        console.log('Airtel access token retrieved successfully');
        
        // Log response matching the expected format
        const tokenResponse = {
          access_token: response.data.access_token || null,
          expires_in: response.data.expires_in || null,
          token_type: response.data.token_type || null
        };
        
        console.log('Token Response:', {
          access_token: tokenResponse.access_token ? `${tokenResponse.access_token.substring(0, 20)}...` : 'N/A',
          expires_in: tokenResponse.expires_in,
          token_type: tokenResponse.token_type,
          fullResponse: response.data
        });
        
        return response.data;
      } catch (jsonError) {
        // Always use JSON format - don't fallback to form-urlencoded
        // If JSON fails, throw the error with better context
        throw jsonError;
      }
    } catch (error) {
      // Enhanced error handling to show actual API response
      let errorMessage = `Failed to get Airtel access token: ${error.message}`;
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const status = error.response.status;
        const statusText = error.response.statusText;
        const responseData = error.response.data;
        
        errorMessage = `Failed to get Airtel access token: Request failed with status code ${status} (${statusText})`;
        
        if (responseData) {
          if (typeof responseData === 'object') {
            errorMessage += `. Response: ${JSON.stringify(responseData)}`;
          } else {
            errorMessage += `. Response: ${responseData}`;
          }
        }
        
        console.error('Airtel OAuth2 Error Details:', {
          status,
          statusText,
          data: responseData,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          requestData: error.config?.data
        });
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = `Failed to get Airtel access token: No response received from server. ${error.message}`;
        console.error('Airtel OAuth2 Request Error:', {
          url: error.config?.url,
          message: error.message
        });
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Failed to get Airtel access token: ${error.message}`;
        console.error('Airtel OAuth2 Setup Error:', error.message);
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Initialize or get existing Airtel user
   * Creates new user if none exists, or refreshes tokens if needed
   */
  async initializeAirtelUser() {
    try {
      // Check if user already exists
      let airtelUser = await AirtelUser.findOne({ isActive: true });
      
      if (!airtelUser) {
        console.log('Creating new Airtel user...');
        airtelUser = await this.createNewAirtelUser();
      } else {
        console.log('Refreshing Airtel user tokens...');
        await this.refreshTokensIfNeeded(airtelUser);
        // Reload user to get updated tokens
        airtelUser = await AirtelUser.findById(airtelUser._id);
      }
      
      return airtelUser;
    } catch (error) {
      throw new Error(`Failed to initialize Airtel user: ${error.message}`);
    }
  }

  /**
   * Create a new Airtel user with access token
   */
  async createNewAirtelUser() {
    try {
      // Get access token
      console.log('Getting Airtel access token...');
      const tokenResponse = await this.getAccessToken();
      
      // Save to database
      console.log('Saving Airtel user to database...');
      const airtelUser = new AirtelUser({
        clientId: this.clientId,
        accessToken: tokenResponse.access_token,
        tokenExpiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000)),
        tokenType: tokenResponse.token_type || 'Bearer',
        scope: tokenResponse.scope
      });
      
      await airtelUser.save();
      console.log('Airtel user created successfully');
      return airtelUser;
    } catch (error) {
      throw new Error(`Failed to create new Airtel user: ${error.message}`);
    }
  }

  /**
   * Refresh tokens if they are expired or about to expire
   */
  async refreshTokensIfNeeded(airtelUser) {
    const now = new Date();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
    
    try {
      // Check if token is expired or about to expire
      if (!airtelUser.tokenValid || 
          (airtelUser.tokenExpiresAt && 
           new Date(airtelUser.tokenExpiresAt.getTime() - refreshThreshold) <= now)) {
        console.log('Refreshing Airtel access token...');
        const tokenResponse = await this.getAccessToken();
        await airtelUser.updateToken(
          tokenResponse.access_token, 
          tokenResponse.expires_in,
          tokenResponse.token_type,
          tokenResponse.scope
        );
      }
    } catch (error) {
      console.error('Failed to refresh tokens:', error.message);
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  /**
   * Get valid access token (wrapper method)
   */
  async getValidAccessToken() {
    const airtelUser = await this.initializeAirtelUser();
    return airtelUser.accessToken;
  }

  /**
   * Get Airtel user with valid tokens
   */
  async getAirtelUser() {
    return await this.initializeAirtelUser();
  }

  /**
   * Update user usage statistics
   */
  async updateUsageStats(success = true) {
    try {
      const airtelUser = await AirtelUser.findOne({ isActive: true });
      if (airtelUser) {
        await airtelUser.incrementUsage(success);
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
      const airtelUser = await AirtelUser.findOne({ isActive: true });
      if (airtelUser) {
        return airtelUser.usageStats;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user stats:', error.message);
      return null;
    }
  }

  /**
   * Reset Airtel user (for testing purposes)
   */
  async resetAirtelUser() {
    try {
      await AirtelUser.deleteMany({});
      console.log('Airtel user reset successfully');
      return true;
    } catch (error) {
      throw new Error(`Failed to reset Airtel user: ${error.message}`);
    }
  }

  /**
   * Get Airtel user status
   */
  async getAirtelUserStatus() {
    try {
      const airtelUser = await AirtelUser.findOne({ isActive: true });
      if (!airtelUser) {
        return {
          exists: false,
          message: 'No Airtel user found'
        };
      }

      return {
        exists: true,
        clientId: airtelUser.clientId,
        isActive: airtelUser.isActive,
        hasAccessToken: !!airtelUser.accessToken,
        tokenValid: airtelUser.tokenValid,
        tokenExpiresAt: airtelUser.tokenExpiresAt,
        tokenType: airtelUser.tokenType,
        usageStats: airtelUser.usageStats,
        createdAt: airtelUser.createdAt,
        updatedAt: airtelUser.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to get Airtel user status: ${error.message}`);
    }
  }

  /**
   * Test Airtel API connectivity
   */
  async testConnectivity() {
    try {
      const airtelUser = await this.getAirtelUser();
      
      // Test token validity by making a simple API call
      // This would depend on available Airtel API endpoints
      const testResult = await this.testToken(airtelUser.accessToken);
      
      return {
        success: true,
        token: testResult,
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
  async testToken(token) {
    try {
      // This is a placeholder - replace with actual Airtel API endpoint for testing
      // For now, we'll just verify the token exists and is not expired
      const airtelUser = await AirtelUser.findOne({ isActive: true });
      
      if (!airtelUser || !airtelUser.tokenValid) {
        return {
          success: false,
          error: 'Token is invalid or expired'
        };
      }

      return {
        success: true,
        message: 'Token is valid',
        expiresAt: airtelUser.tokenExpiresAt
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get RSA Encryption Keys
   * GET /v1/rsa/encryption-keys
   * Requires: Authorization token, X-Country, X-Currency headers
   */
  async getEncryptionKeys(country = 'RW', currency = 'RWF') {
    try {
      const airtelUser = await this.getAirtelUser();
      
      const request = {
        method: 'GET',
        url: `${this.baseURL}/v1/rsa/encryption-keys`,
        headers: {
          'Authorization': `Bearer ${airtelUser.accessToken}`,
          'X-Country': country,
          'X-Currency': currency,
          'Accept': '*/*'
        }
      };

      const response = await axios.get(request.url, {
        headers: request.headers,
        timeout: this.retryConfig.timeout
      });

      console.log('Airtel encryption keys retrieved successfully');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Airtel encryption keys: ${error.message}`);
    }
  }

  /**
   * Encrypt PIN using encryption keys
   * @param {string} pin - The PIN to encrypt
   * @param {string} country - Country code (default: RW)
   * @param {string} currency - Currency code (default: RWF)
   * @returns {object} Encrypted PIN with key_id
   */
  async encryptPIN(pin, country = 'RW', currency = 'RWF') {
    try {
      // First, get the encryption keys
      const encryptionKeys = await this.getEncryptionKeys(country, currency);
      
      // Check if key is valid
      if (!AirtelEncryption.isKeyValid(encryptionKeys)) {
        throw new Error('Encryption key has expired');
      }

      // Encrypt the PIN
      const encryptedData = AirtelEncryption.encryptPINWithKey(pin, encryptionKeys);
      
      return encryptedData;
    } catch (error) {
      throw new Error(`PIN encryption failed: ${error.message}`);
    }
  }

  /**
   * Utility method for delays
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AirtelAuthService;

