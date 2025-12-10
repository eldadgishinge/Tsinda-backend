const AirtelUser = require('../models/AirtelUser');
const { getServiceConfig } = require('../config/paymentConfig');

class AirtelAuthService {
  constructor() {
    this.airtelConfig = getServiceConfig('airtel');
    this.baseURL = this.airtelConfig.baseURL;
    this.clientId = this.airtelConfig.clientId;
    this.clientSecret = this.airtelConfig.clientSecret;
    this.retryConfig = this.airtelConfig.retry;
  }

  async getAccessToken() {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Airtel client credentials (AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET) are not configured');
      }

      const baseURL = this.baseURL.replace(/\/$/, '');
      const url = `${baseURL}/auth/oauth2/token`;
      
      const inputBody = {
        client_id: String(this.clientId),
        client_secret: String(this.clientSecret),
        grant_type: 'client_credentials'
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Connection': 'close',
        'Cookie': 'visid_incap_2967769=OuF6ejqtT/mBvA/Oxh+1LKzE52gAAAAAQUIPAAAAAAAm07DTETctcaDQz8F8Rq0B'
      };

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(inputBody),
        headers: headers
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to get Airtel access token: ${response.status} ${response.statusText}. ${JSON.stringify(body)}`);
      }

      console.log(body);
      return body;
    } catch (error) {
      const errorMessage = `Failed to get Airtel access token: ${error.message}`;
      console.error('Airtel OAuth2 Error:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  async initializeAirtelUser() {
    try {
      let airtelUser = await AirtelUser.findOne({ isActive: true });
      
      if (!airtelUser) {
        console.log('Creating new Airtel user...');
        airtelUser = await this.createNewAirtelUser();
      } else {
        console.log('Refreshing Airtel user tokens...');
        await this.refreshTokensIfNeeded(airtelUser);
        airtelUser = await AirtelUser.findById(airtelUser._id);
      }
      
      return airtelUser;
    } catch (error) {
      throw new Error(`Failed to initialize Airtel user: ${error.message}`);
    }
  }

  async createNewAirtelUser() {
    try {
      console.log('Getting Airtel access token...');
      const tokenResponse = await this.getAccessToken();
      
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

  async refreshTokensIfNeeded(airtelUser) {
    const now = new Date();
    const refreshThreshold = 5 * 60 * 1000;
    
    try {
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

  async getValidAccessToken() {
    const airtelUser = await this.initializeAirtelUser();
    return airtelUser.accessToken;
  }

  async getAirtelUser() {
    return await this.initializeAirtelUser();
  }

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

  async resetAirtelUser() {
    try {
      await AirtelUser.deleteMany({});
      console.log('Airtel user reset successfully');
      return true;
    } catch (error) {
      throw new Error(`Failed to reset Airtel user: ${error.message}`);
    }
  }

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

  async testConnectivity() {
    try {
      const airtelUser = await this.getAirtelUser();
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

  async testToken(token) {
    try {
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

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AirtelAuthService;

