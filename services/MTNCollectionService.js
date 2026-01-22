const { getServiceConfig } = require('../config/paymentConfig');
const MTNUser = require('../models/MTNUser');

class MTNCollectionService {
  constructor() {
    this.mtnConfig = getServiceConfig('mtn');
    this.baseURL = this.mtnConfig.baseURL;
    // Use exact same logic as testTokenOnly.js
    this.subscriptionKey = process.env.MTN_COLLECTION_WIDGET_KEY || this.mtnConfig.subscriptionKeys.collections;
  }

  async getToken(xReferenceId, apiKey, subscriptionKey = null) {
    try {
      // EXACT same implementation as testTokenOnly.js
      const baseURL = this.baseURL;
      const keyToUse = subscriptionKey || this.subscriptionKey;
      
      // Use provided API User and API Key (exact same as testTokenOnly.js)
      const ApiUser = xReferenceId;
      const apiKeyValue = apiKey;
      
      const url = `${baseURL}/collection/token/`;
      const auth = Buffer.from(`${ApiUser}:${apiKeyValue}`).toString('base64');
      
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': keyToUse
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: headers
      });

      const body = await response.json();

      if (response.status === 200) {
        return body;
      } else if (response.status === 401) {
        console.error('❌ UNAUTHORIZED: Check your credentials or subscription key');
        console.error('Error:', body.error || body.message);
        console.error('\nPossible issues:');
        console.error('1. Invalid API User ID or API Key');
        console.error('2. Invalid Subscription Key (MTN_COLLECTIONS_KEY)');
        console.error('3. Subscription key not active for this API user');
        throw new Error(`Failed to get token: ${response.status} ${JSON.stringify(body)}`);
      } else {
        console.error('❌ FAILED:', response.status);
        console.error('Response:', body);
        throw new Error(`Failed to get token: ${response.status} ${JSON.stringify(body)}`);
      }
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

      return body;
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error.message}`);
    }
  }

  async requestToPay(referenceId, requestData, targetEnvironment = 'mtnrwanda', callbackUrl = null) {
    try {
      const token = await this.getValidToken();
      
      const url = `${this.baseURL}/collection/v1_0/requesttopay`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Reference-Id': referenceId,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey
      };

      // Add callback URL if provided
      if (callbackUrl) {
        headers['X-Callback-Url'] = callbackUrl;
      } else if (process.env.MTN_CALLBACK_URL) {
        headers['X-Callback-Url'] = process.env.MTN_CALLBACK_URL;
      }

      const body = {
        amount: String(requestData.amount),
        currency: requestData.currency,
        externalId: requestData.externalId,
        payer: requestData.payer,
        payerMessage: requestData.payerMessage || '',
        payeeNote: requestData.payeeNote || ''
      };

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

      if (response.status === 202) {
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
        // Get subscription keys from config (exact same as testTokenOnly.js)
        const subscriptionKeys = {
          collectionWidget: process.env.MTN_COLLECTION_WIDGET_KEY || this.mtnConfig.subscriptionKeys.collectionWidget,
          collections: process.env.MTN_COLLECTION_WIDGET_KEY || this.mtnConfig.subscriptionKeys.collections,
          disbursements: process.env.MTN_DISBURSEMENTS_KEY || this.mtnConfig.subscriptionKeys.disbursements,
          remittances: process.env.MTN_REMITTANCES_KEY || this.mtnConfig.subscriptionKeys.remittances
        };
        
        // Create MTN user (no token saved, will generate on each request)
        mtnUser = new MTNUser({
          xReferenceId,
          apiKey,
          providerCallbackHost,
          subscriptionKeys,
          isActive: true
        });
        
        await mtnUser.save();
      } else {
        throw new Error('MTN user not found. Please initialize MTN user first or set MTN_API_USER and MTN_API_KEY environment variables.');
      }
    }
    
    return mtnUser;
  }

  async getValidToken() {
    try {
      // EXACT same implementation as testTokenOnly.js
      const mtnConfig = getServiceConfig('mtn');
      const baseURL = mtnConfig.baseURL;
      
      // Trim subscription key to remove any whitespace or quotes
      let subscriptionKey = (process.env.MTN_COLLECTION_WIDGET_KEY || mtnConfig.subscriptionKeys.collections || '').trim().replace(/^['"]|['"]$/g, '');
      
      // Use provided API User and API Key (exact same as testTokenOnly.js)
      let ApiUser = (process.env.MTN_API_USER ).trim().replace(/^['"]|['"]$/g, '');
      let apiKey = (process.env.MTN_API_KEY).trim().replace(/^['"]|['"]$/g, '');
      
      // Debug: Log exact values being used
      console.error('=== Token Generation Debug ===');
      console.error('API User:', ApiUser);
      console.error('API Key:', apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET');
      console.error('Subscription Key:', subscriptionKey ? `${subscriptionKey.substring(0, 4)}...${subscriptionKey.substring(subscriptionKey.length - 4)}` : 'NOT SET');
      console.error('Full Subscription Key:', subscriptionKey);
      console.error('Subscription Key Length:', subscriptionKey.length);
      console.error('============================');
      
      if (!ApiUser || !apiKey) {
        throw new Error('MTN_API_USER or MTN_API_KEY not set');
      }
      
      if (!subscriptionKey) {
        throw new Error('MTN_COLLECTION_WIDGET_KEY not set');
      }

      const url = `${baseURL}/collection/token/`;
      const auth = Buffer.from(`${ApiUser}:${apiKey}`).toString('base64');
      
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscriptionKey
      };

      // Debug: Log exact request details
      console.error('=== Token Request Details ===');
      console.error('URL:', url);
      console.error('Method: POST');
      console.error('Headers:', JSON.stringify({
        'Authorization': `Basic ${auth.substring(0, 20)}...`,
        'Content-Type': headers['Content-Type'],
        'Ocp-Apim-Subscription-Key': subscriptionKey
      }, null, 2));
      console.error('Auth String (before base64):', `${ApiUser}:${apiKey}`);
      console.error('Base64 Auth:', auth);
      console.error('============================');

      const response = await fetch(url, {
        method: 'POST',
        headers: headers
      });

      const responseText = await response.text();
      let body;
      try {
        body = JSON.parse(responseText);
      } catch (e) {
        body = { raw: responseText };
      }
      
      // Debug: Log response details
      console.error('=== Token Response Details ===');
      console.error('Status:', response.status, response.statusText);
      console.error('Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
      console.error('Response Body:', JSON.stringify(body, null, 2));
      console.error('=============================');

      if (response.status === 200) {
        return body.access_token;
      } else if (response.status === 401) {
        throw new Error(`Failed to get token: ${response.status} ${JSON.stringify(body)}`);
      } else {
        throw new Error(`Failed to get token: ${response.status} ${JSON.stringify(body)}`);
      }
    } catch (error) {
      throw new Error(`Failed to get valid token: ${error.message}`);
    }
  }
}

module.exports = MTNCollectionService;
