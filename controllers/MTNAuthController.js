const MTNAuthService = require('../services/MTNAuthService');
const { ErrorResponseDTO, SuccessResponseDTO } = require('../dto/PaymentDTO');

/**
 * MTN Authentication Controller
 * Handles MTN authentication and user management endpoints
 */
class MTNAuthController {
  constructor() {
    this.mtnAuth = new MTNAuthService();
  }

  /**
   * Get MTN user status
   * GET /api/mtn/status
   */
  async getMTNUserStatus(req, res) {
    try {
      const status = await this.mtnAuth.getMTNUserStatus();
      const response = SuccessResponseDTO.fromData(status, 'MTN user status retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get MTN user status error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get MTN user status');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Initialize MTN user
   * POST /api/mtn/initialize
   */
  async initializeMTNUser(req, res) {
    try {
      const mtnUser = await this.mtnAuth.initializeMTNUser();
      const response = SuccessResponseDTO.fromData(mtnUser.toUserDTO(), 'MTN user initialized successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Initialize MTN user error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to initialize MTN user');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Test MTN connectivity
   * GET /api/mtn/test
   */
  async testConnectivity(req, res) {
    try {
      const result = await this.mtnAuth.testConnectivity();
      const response = SuccessResponseDTO.fromData(result, 'MTN connectivity test completed');
      res.status(200).json(response);
    } catch (error) {
      console.error('Test MTN connectivity error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to test MTN connectivity');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get user statistics
   * GET /api/mtn/stats
   */
  async getUserStats(req, res) {
    try {
      const stats = await this.mtnAuth.getUserStats();
      const response = SuccessResponseDTO.fromData(stats, 'User statistics retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get user stats error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get user statistics');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Reset MTN user (for testing)
   * DELETE /api/mtn/reset
   */
  async resetMTNUser(req, res) {
    try {
      const result = await this.mtnAuth.resetMTNUser();
      const response = SuccessResponseDTO.fromData({ reset: result }, 'MTN user reset successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Reset MTN user error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to reset MTN user');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get collection token
   * GET /api/mtn/tokens/collection
   */
  async getCollectionToken(req, res) {
    try {
      const token = await this.mtnAuth.getCollectionToken();
      const response = SuccessResponseDTO.fromData({ token }, 'Collection token retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get collection token error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get collection token');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get disbursement token
   * GET /api/mtn/tokens/disbursement
   */
  async getDisbursementToken(req, res) {
    try {
      const token = await this.mtnAuth.getDisbursementToken();
      const response = SuccessResponseDTO.fromData({ token }, 'Disbursement token retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('Get disbursement token error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'Failed to get disbursement token');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Health check for MTN service
   * GET /api/mtn/health
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'MTN Authentication Service',
        version: '1.0.0'
      };
      const response = SuccessResponseDTO.fromData(health, 'MTN authentication service is healthy');
      res.status(200).json(response);
    } catch (error) {
      console.error('MTN health check error:', error);
      const errorResponse = ErrorResponseDTO.fromError(error, 'MTN authentication service is unhealthy');
      res.status(500).json(errorResponse);
    }
  }
}

module.exports = MTNAuthController;
