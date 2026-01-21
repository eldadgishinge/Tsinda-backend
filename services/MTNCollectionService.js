const { getServiceConfig } = require('../config/paymentConfig');
const MTNUser = require('../models/MTNUser');

class MTNCollectionService {
  constructor() {
    this.mtnConfig = getServiceConfig('mtn');
    this.baseURL = this.mtnConfig.baseURL;
    // Use same subscription key logic as test file
    this.subscriptionKey = process.env.MTN_COLLECTION_WIDGET_KEY || this.mtnConfig.subscriptionKeys.collections;
  }

  async getToken(xReferenceId, apiKey) {
    try {
      const url = `${this.baseURL}/collection/token/`;
      const auth = Buffer.from(`${xReferenceId}:${apiKey}`).toString('base64');
      
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: headers
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to get token: ${response.status} ${JSON.stringify(body)}`);
      }

      console.log(body);
      return body;
    } catch (error) {
      throw new Error(`Failed to get collection token: ${error.message}`);
    }
  }

  async getAccountBalance(targetEnvironment = 'mtnrwanda') {
    try {
      const token = await this.getValidToken();
      const url = `${this.baseURL}/collection/v1_0/account/balance`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      };

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to get account balance: ${response.status} ${JSON.stringify(body)}`);
      }

      console.log(body);
      return body;
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error.message}`);
    }
  }

  async requestToPay(referenceId, requestData, targetEnvironment = 'mtnrwanda', callbackUrl = null) {
    try {
      console.log('=== Request to Pay - Getting Token ===');
      const token = await this.getValidToken();
      console.log('Token obtained successfully');
      
      const url = `${this.baseURL}/collection/v1_0/requesttopay`;
      
      // Get callback URL from environment variable
      const finalCallbackUrl = process.env.MTN_CALLBACK_URL;
      
      if (!finalCallbackUrl) {
        throw new Error('MTN_CALLBACK_URL environment variable is not set. Please configure it in your .env file.');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Reference-Id': referenceId,
        'X-Target-Environment': targetEnvironment,
        'X-Callback-Url': finalCallbackUrl.trim(),
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      };

      console.log('=== Callback URL Configuration ===');
      console.log('X-Callback-Url header:', headers['X-Callback-Url']);
      console.log('Callback URL length:', headers['X-Callback-Url'].length);
      console.log('==================================');

      const body = {
        amount: String(requestData.amount),
        currency: requestData.currency,
        externalId: requestData.externalId,
        payer: requestData.payer,
        payerMessage: requestData.payerMessage || '',
        payeeNote: requestData.payeeNote || ''
      };

      console.log('=== Request to Pay API Call ===');
      console.log('URL:', url);
      console.log('Method: POST');
      console.log('Reference ID:', referenceId);
      console.log('Target Environment:', targetEnvironment);
      console.log('Request Body:', JSON.stringify(body, null, 2));
      console.log('Headers:', JSON.stringify({ ...headers, 'Authorization': `Bearer ${token.substring(0, 20)}...` }, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      const responseText = await response.text();
      let errorBody = {};
      try {
        if (responseText) {
          errorBody = JSON.parse(responseText);
        }
      } catch (e) {
        errorBody = { raw: responseText };
      }

      console.log('=== Request to Pay API Response ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Response Body:', JSON.stringify(errorBody, null, 2));
      console.log('===================================');

      if (response.status === 202) {
        console.log('✅ Payment request accepted');
        return { status: response.status, referenceId };
      }

      if (response.status === 400) {
        throw new Error(`Bad Request: ${JSON.stringify(errorBody)}`);
      }
      
      if (response.status === 409) {
        throw new Error(`Conflict - Reference ID already in use: ${JSON.stringify(errorBody)}`);
      }
      
      if (response.status === 500) {
        throw new Error(`Internal Server Error: ${JSON.stringify(errorBody)}`);
      }

      throw new Error(`Failed to request payment: ${response.status} ${JSON.stringify(errorBody)}`);
    } catch (error) {
      console.error('❌ Request to Pay Error:', error.message);
      throw new Error(`Failed to request payment: ${error.message}`);
    }
  }

  async getRequestToPayStatus(referenceId, targetEnvironment = 'mtnrwanda') {
    try {
      const token = await this.getValidToken();
      const url = `${this.baseURL}/collection/v1_0/requesttopay/${referenceId}`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      };

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      const body = await response.json();

      if (response.status === 200) {
        return body;
      }

      if (response.status === 400) {
        throw new Error(`Bad Request: ${JSON.stringify(body)}`);
      }

      if (response.status === 404) {
        throw new Error(`Not Found - Request to pay not found: ${JSON.stringify(body)}`);
      }

      if (response.status === 500) {
        throw new Error(`Internal Server Error: ${JSON.stringify(body)}`);
      }

      throw new Error(`Failed to get payment status: ${response.status} ${JSON.stringify(body)}`);
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  async getMTNUser() {
    let mtnUser = await MTNUser.findOne({ isActive: true });
    
    if (!mtnUser) {
      // Try to create MTN user from environment variables
      const xReferenceId = process.env.MTN_API_USER;
      const apiKey = process.env.MTN_API_KEY;
      const providerCallbackHost = process.env.MTN_PROVIDER_CALLBACK_HOST || 'https://webhook.site/your-unique-id';
      
      if (xReferenceId && apiKey) {
        console.log('MTN user not found. Creating MTN user from environment variables...');
        
        // Get subscription keys from config (same as test file)
        const subscriptionKeys = {
          collectionWidget: process.env.MTN_COLLECTION_WIDGET_KEY || this.mtnConfig.subscriptionKeys.collectionWidget,
          collections: process.env.MTN_COLLECTION_WIDGET_KEY || this.mtnConfig.subscriptionKeys.collections,
          disbursements: process.env.MTN_DISBURSEMENTS_KEY || this.mtnConfig.subscriptionKeys.disbursements,
          remittances: process.env.MTN_REMITTANCES_KEY || this.mtnConfig.subscriptionKeys.remittances
        };
        
        // Generate initial token
        let collectionToken = null;
        let collectionTokenExpiresAt = null;
        
        try {
          const tokenResponse = await this.getToken(xReferenceId, apiKey);
          collectionToken = tokenResponse.access_token;
          const expiresIn = tokenResponse.expires_in || 180;
          collectionTokenExpiresAt = new Date(Date.now() + (expiresIn * 1000));
        } catch (error) {
          console.warn('Failed to generate initial token, will generate on first use:', error.message);
        }
        
        // Create MTN user
        mtnUser = new MTNUser({
          xReferenceId,
          apiKey,
          providerCallbackHost,
          collectionToken,
          collectionTokenExpiresAt,
          subscriptionKeys,
          isActive: true
        });
        
        await mtnUser.save();
        console.log('MTN user created successfully from environment variables');
      } else {
        throw new Error('MTN user not found. Please initialize MTN user first or set MTN_API_USER and MTN_API_KEY environment variables.');
      }
    }
    
    return mtnUser;
  }

  async getValidToken() {
    try {
      console.log('=== Getting Valid Token ===');
      const mtnUser = await this.getMTNUser();
      console.log('MTN User found:', mtnUser.xReferenceId);
      
      const now = new Date();
      const refreshThreshold = 30 * 1000; // 30 seconds before expiry (tokens expire after 3 minutes)

      // Check if token exists and is still valid (with 30 second buffer)
      if (mtnUser.collectionToken && 
          mtnUser.collectionTokenExpiresAt && 
          new Date(mtnUser.collectionTokenExpiresAt.getTime() - refreshThreshold) > now) {
        const timeUntilExpiry = Math.floor((mtnUser.collectionTokenExpiresAt.getTime() - now.getTime()) / 1000);
        console.log(`Using cached collection token (expires in ${timeUntilExpiry} seconds)`);
        return mtnUser.collectionToken;
      }

      // Token expired or doesn't exist, generate new one
      console.log('Generating new collection token (expired or about to expire)...');
      console.log('Using X-Reference-Id:', mtnUser.xReferenceId);
      console.log('Using API Key:', mtnUser.apiKey ? `${mtnUser.apiKey.substring(0, 4)}...` : 'NOT SET');
      console.log('Using Subscription Key:', this.subscriptionKey ? `${this.subscriptionKey.substring(0, 4)}...` : 'NOT SET');
      
      const tokenResponse = await this.getToken(mtnUser.xReferenceId, mtnUser.apiKey);
      console.log('Token response received:', {
        hasAccessToken: !!tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in
      });
      
      // Save token with expiration (MTN tokens typically expire in 3 minutes = 180 seconds)
      const expiresIn = tokenResponse.expires_in || 180;
      await mtnUser.updateCollectionToken(
        tokenResponse.access_token, 
        expiresIn
      );

      console.log(`✅ Collection token refreshed and cached (expires in ${expiresIn} seconds)`);
      return tokenResponse.access_token;
    } catch (error) {
      console.error('❌ Failed to get valid token:', error.message);
      throw new Error(`Failed to get valid token: ${error.message}`);
    }
  }
}

module.exports = MTNCollectionService;
