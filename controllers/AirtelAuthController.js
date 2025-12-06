const AirtelAuthService = require('../services/AirtelAuthService');
const { ErrorResponseDTO, SuccessResponseDTO } = require('../dto/PaymentDTO');

class AirtelAuthController {
  constructor() {
    this.airtelAuth = new AirtelAuthService();
  }

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

  async getAccessToken(req, res) {
    try {
      const tokenResponse = await this.airtelAuth.getAccessToken();
      
      console.log('Token Response in Controller:', {
        hasAccessToken: !!tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in,
        scope: tokenResponse.scope,
        fullResponse: tokenResponse
      });
      
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
      
      let errorMessage = error.message || 'Failed to get access token';
      let statusCode = 500;
      
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

  async checkConfig(req, res) {
    try {
      const { validateAirtelConfig } = require('../utils/validateAirtelConfig');
      const { getServiceConfig } = require('../config/paymentConfig');
      const airtelConfig = getServiceConfig('airtel');
      
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

