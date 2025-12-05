const AirtelAuthService = require('../services/AirtelAuthService');
const { ErrorResponseDTO, SuccessResponseDTO } = require('../dto/PaymentDTO');

/**
 * Airtel Authentication Controller
 * Handles Airtel authentication and user management endpoints
 */
class AirtelAuthController {
  constructor() {
    this.airtelAuth = new AirtelAuthService();
  }

  /**
   * Get Airtel user status
   * GET /api/airtel/status
   */
  async getAirtelUserStatus(req, res) {
    try {
      const status = await this.airtelAuth.getAirtelUserStatus();
      const response = SuccessResponseDTO.fromData(status, 'Airtel user status retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get Airtel user status error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get Airtel user status');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Initialize Airtel user
   * POST /api/airtel/initialize
   */
  async initializeAirtelUser(req, res) {
    try {
      const airtelUser = await this.airtelAuth.initializeAirtelUser();
      const response = SuccessResponseDTO.fromData(airtelUser.toUserDTO(), 'Airtel user initialized successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Initialize Airtel user error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to initialize Airtel user');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Test Airtel connectivity
   * GET /api/airtel/test
   */
  async testConnectivity(req, res) {
    try {
      const result = await this.airtelAuth.testConnectivity();
      const response = SuccessResponseDTO.fromData(result, 'Airtel connectivity test completed');
      res.status(200).json(response);
    } catch (error) {
      console.error('Test Airtel connectivity error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to test Airtel connectivity');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get user statistics
   * GET /api/airtel/stats
   */
  async getUserStats(req, res) {
    try {
      const stats = await this.airtelAuth.getUserStats();
      const response = SuccessResponseDTO.fromData(stats, 'User statistics retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get user stats error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get user statistics');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Reset Airtel user (for testing)
   * DELETE /api/airtel/reset
   */
  async resetAirtelUser(req, res) {
    try {
      const result = await this.airtelAuth.resetAirtelUser();
      const response = SuccessResponseDTO.fromData({ reset: result }, 'Airtel user reset successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Reset Airtel user error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to reset Airtel user');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get access token
   * GET /api/airtel/tokens/access
   * This endpoint gets a fresh token directly from Airtel API
   */
  async getAccessToken(req, res) {
    try {
      // Get a fresh token directly from Airtel API
      const tokenResponse = await this.airtelAuth.getAccessToken();
      
      // Log token response for debugging
      console.log('Token Response in Controller:', {
        hasAccessToken: !!tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in,
        scope: tokenResponse.scope,
        fullResponse: tokenResponse
      });
      
      // Return the full token response including expires_in, token_type, etc.
      const response = SuccessResponseDTO.fromData({
        access_token: tokenResponse.access_token,
        token_type: tokenResponse.token_type || 'Bearer',
        expires_in: tokenResponse.expires_in,
        scope: tokenResponse.scope,
        expires_at: tokenResponse.expires_in 
          ? new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString()
          : null
      }, 'Access token retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get access token error:', error);
      
      // Provide more detailed error information
      let errorMessage = error.message || 'Failed to get access token';
      let statusCode = 500;
      
      // Check if it's a configuration error
      if (errorMessage.includes('not configured')) {
        statusCode = 400;
        errorMessage = 'Airtel credentials are not configured. Please set AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in your .env file.';
      }
      
      const errorResponse = ErrorResponseDTO.fromError(
        new Error(errorMessage),
        'Failed to get access token'
      );
      res.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Get Encryption Keys
   * GET /api/airtel/encryption-keys
   */
  async getEncryptionKeys(req, res) {
    try {
      const country = req.headers['x-country'] || req.query.country || 'RW';
      const currency = req.headers['x-currency'] || req.query.currency || 'RWF';
      
      const result = await this.airtelAuth.getEncryptionKeys(country, currency);
      const response = SuccessResponseDTO.fromData(result, 'Encryption keys retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get encryption keys error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get encryption keys');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Encrypt PIN
   * POST /api/airtel/encrypt-pin
   */
  async encryptPIN(req, res) {
    try {
      const { pin } = req.body;
      
      if (!pin) {
        const errorResponse = ErrorResponseDTO.fromError(
          new Error('PIN is required'),
          'PIN is required for encryption'
        );
        return res.status(400).json(errorResponse);
      }

      const country = req.headers['x-country'] || req.query.country || 'RW';
      const currency = req.headers['x-currency'] || req.query.currency || 'RWF';
      
      const result = await this.airtelAuth.encryptPIN(pin, country, currency);
      const response = SuccessResponseDTO.fromData(result, 'PIN encrypted successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Encrypt PIN error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to encrypt PIN');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Health check for Airtel service
   * GET /api/airtel/health
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Airtel Authentication Service',
        version: '1.0.0'
      };
      const response = SuccessResponseDTO.fromData(health, 'Airtel authentication service is healthy');
      res.status(200).json(response);
    } catch (error) {
      console.error('Airtel health check error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Airtel authentication service is unhealthy');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Check Airtel configuration (without exposing secrets)
   * GET /api/airtel/config-check
   */
  async checkConfig(req, res) {
    try {
      const { validateAirtelConfig } = require('../utils/validateAirtelConfig');
      const { getServiceConfig } = require('../config/paymentConfig');
      const airtelConfig = getServiceConfig('airtel');
      
      // Run validation
      const validation = validateAirtelConfig();
      
      const configStatus = {
        baseURL: airtelConfig.baseURL,
        tokenEndpoint: `${airtelConfig.baseURL}/auth/oauth2/token`,
        hasClientId: !!airtelConfig.clientId,
        hasClientSecret: !!airtelConfig.clientSecret,
        clientIdLength: airtelConfig.clientId ? airtelConfig.clientId.length : 0,
        clientSecretLength: airtelConfig.clientSecret ? airtelConfig.clientSecret.length : 0,
        hasMsisdn: !!airtelConfig.msisdn,
        retryConfig: airtelConfig.retry,
        timestamp: new Date().toISOString(),
        validation: {
          isValid: validation.isValid,
          issues: validation.issues,
          summary: validation.summary
        }
      };

      const response = SuccessResponseDTO.fromData(
        configStatus,
        validation.isValid ? 'Configuration is valid' : 'Configuration issues found'
      );
      
      res.status(validation.isValid ? 200 : 400).json(response);
    } catch (error) {
      console.error('Airtel config check error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to check Airtel configuration');
      res.status(500).json(errorResponse);
    }
  }
}

module.exports = AirtelAuthController;

