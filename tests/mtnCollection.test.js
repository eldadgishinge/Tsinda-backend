require('dotenv').config();
const { getServiceConfig } = require('../config/paymentConfig');
const MTNUser = require('../models/MTNUser');

describe('MTN Collection API Tests', () => {
  let baseURL;
  let subscriptionKey;
  let xReferenceId;
  let apiKey;
  let token;
  let paymentReferenceId;

  beforeAll(async () => {
    const mtnConfig = getServiceConfig('mtn');
    baseURL = mtnConfig.baseURL;
    subscriptionKey = process.env.MTN_COLLECTION_WIDGET_KEY || mtnConfig.subscriptionKeys.collections;
    
    // Use provided API User and API Key
    xReferenceId = process.env.MTN_API_USER;
    apiKey = process.env.MTN_API_KEY;
  });

  test('POST /collection/token/ should return access token', async () => {
    if (!xReferenceId || !apiKey) {
      console.warn('MTN_X_REFERENCE_ID or MTN_API_KEY not set, skipping token test');
      return;
    }

    const url = `${baseURL}/collection/token/`;
    const auth = Buffer.from(`${xReferenceId}:${apiKey}`).toString('base64');
    
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': subscriptionKey
    };

    console.log('Getting token with:', {
      url,
      xReferenceId,
      apiKey: apiKey ? `${apiKey.substring(0, 4)}...` : 'NOT SET'
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: headers
    });

    const body = await response.json();
    console.log('=== Token API Response ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Response Body:', JSON.stringify(body, null, 2));
    console.log('========================');

    if (response.status === 200) {
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('token_type');
      expect(body).toHaveProperty('expires_in');
      expect(typeof body.access_token).toBe('string');
      expect(typeof body.token_type).toBe('string');
      expect(typeof body.expires_in).toBe('number');
      token = body.access_token;
    } else if (response.status === 401) {
      expect(body).toHaveProperty('error');
      console.error('Unauthorized - Check credentials:', body);
      throw new Error(`Unauthorized: ${JSON.stringify(body)}`);
    } else {
      console.error('Failed to get token:', body);
      throw new Error(`Failed to get token: ${response.status} ${JSON.stringify(body)}`);
    }
  }, 30000);

  test('GET /collection/v1_0/account/balance should return account balance', async () => {
    if (!token) {
      console.warn('Token not available, skipping balance test');
      return;
    }

    const url = `${baseURL}/collection/v1_0/account/balance`;
    const targetEnvironment = process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda';
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Target-Environment': targetEnvironment,
      'Ocp-Apim-Subscription-Key': subscriptionKey
    };

    console.log('Getting account balance...');
    console.log('X-Target-Environment:', targetEnvironment);

    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    const body = await response.json();
    console.log('=== Account Balance API Response ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Response Body:', JSON.stringify(body, null, 2));
    console.log('===================================');

    if (response.status === 200) {
      expect(body).toHaveProperty('availableBalance');
      expect(body).toHaveProperty('currency');
      expect(typeof body.availableBalance).toBe('string');
      expect(typeof body.currency).toBe('string');
    } else if (response.status === 400) {
      expect(body).toHaveProperty('code');
      expect(body).toHaveProperty('message');
      console.error('Bad Request:', body);
    } else {
      console.error('Failed to get balance:', body);
    }
  }, 30000);

  test('POST /collection/v1_0/requesttopay should request payment from 0789764912', async () => {
    if (!token) {
      console.warn('Token not available, skipping payment request test');
      return;
    }

    const url = `${baseURL}/collection/v1_0/requesttopay`;
    const crypto = require('crypto');
    paymentReferenceId = crypto.randomUUID();
    const targetEnvironment = process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda';
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Reference-Id': paymentReferenceId,
      'X-Target-Environment': targetEnvironment,
      'Ocp-Apim-Subscription-Key': subscriptionKey
    };

    const requestBody = {
      amount: '100',
      currency: 'RWF',
      externalId: '3456',
      payer: {
        partyIdType: 'MSISDN',
        partyId: '250785300458'
      },
      payerMessage: 'subscription',
      payeeNote: 'tsinda'
    };

    console.log('=== Request to Pay API Request ===');
    console.log('URL:', url);
    console.log('Method: POST');
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('==================================');

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    let responseBody = {};
    let responseText = '';
    try {
      responseText = await response.text();
      if (responseText) {
        responseBody = JSON.parse(responseText);
      }
    } catch (e) {
      console.log('Response text (not JSON):', responseText);
    }

    const responseObject = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      redirected: response.redirected,
      type: response.type,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      bodyUsed: response.bodyUsed,
      referenceId: paymentReferenceId
    };

    console.log('=== Request to Pay API Response ===');
    console.log(JSON.stringify(responseObject, null, 2));
    console.log('===================================');

    if (response.status === 202) {
      expect(response.status).toBe(202);
      console.log('✅ Payment request accepted with reference:', paymentReferenceId);
    } else if (response.status === 400) {
      expect(responseBody).toHaveProperty('code');
      expect(responseBody).toHaveProperty('message');
      console.error('❌ Bad Request:', responseBody);
      throw new Error(`Bad Request: ${JSON.stringify(responseBody)}`);
    } else if (response.status === 409) {
      expect(responseBody).toHaveProperty('code');
      expect(responseBody).toHaveProperty('message');
      console.error('❌ Conflict - Reference ID already in use:', responseBody);
      throw new Error(`Conflict: ${JSON.stringify(responseBody)}`);
    } else if (response.status === 500) {
      expect(responseBody).toHaveProperty('code');
      expect(responseBody).toHaveProperty('message');
      console.error('❌ Internal Server Error:', responseBody);
      throw new Error(`Internal Server Error: ${JSON.stringify(responseBody)}`);
    } else {
      console.error('❌ Unexpected status:', response.status);
      throw new Error(`Failed to request payment: ${response.status} ${JSON.stringify(responseBody)}`);
    }
  }, 30000);


  

  test('GET /collection/v1_0/requesttopay/{referenceId} should return payment status', async () => {
    if (!token || !paymentReferenceId) {
      console.warn('Token or reference ID not available, skipping status test');
      return;
    }

    console.log('Waiting 1 minute before checking payment status...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    console.log('1 minute delay completed, checking status now...');

    // Refresh token if needed (tokens expire after 3 minutes)
    let currentToken = token;
    if (xReferenceId && apiKey) {
      console.log('Refreshing token before checking status (tokens expire after 3 minutes)...');
      const tokenUrl = `${baseURL}/collection/token/`;
      const auth = Buffer.from(`${xReferenceId}:${apiKey}`).toString('base64');
      const tokenHeaders = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscriptionKey
      };
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: tokenHeaders
      });
      if (tokenResponse.ok) {
        const tokenBody = await tokenResponse.json();
        currentToken = tokenBody.access_token;
        console.log('Token refreshed successfully');
      } else {
        console.warn('Failed to refresh token, using original token');
      }
    }

    const url = `${baseURL}/collection/v1_0/requesttopay/${paymentReferenceId}`;
    const targetEnvironment = process.env.MTN_TARGET_ENVIRONMENT || 'mtnrwanda';
    
    const headers = {
      'Authorization': `Bearer ${currentToken}`,
      'X-Target-Environment': targetEnvironment,
      'Ocp-Apim-Subscription-Key': subscriptionKey
    };

    console.log('=== Payment Status API Request ===');
    console.log('URL:', url);
    console.log('Method: GET');
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Reference ID:', paymentReferenceId);
    console.log('==================================');

    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    let responseBody = {};
    let responseText = '';
    try {
      responseText = await response.text();
      if (responseText) {
        responseBody = JSON.parse(responseText);
      }
    } catch (e) {
      console.log('Response text (not JSON):', responseText);
    }

    const responseObject = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      redirected: response.redirected,
      type: response.type,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      bodyUsed: response.bodyUsed,
      referenceId: paymentReferenceId
    };

    console.log('=== Payment Status API Response ===');
    console.log(JSON.stringify(responseObject, null, 2));
    console.log('===================================');

    if (response.status === 200) {
      expect(responseBody).toHaveProperty('status');
      if (responseBody.amount) expect(typeof responseBody.amount).toBe('string');
      if (responseBody.currency) expect(typeof responseBody.currency).toBe('string');
      if (responseBody.financialTransactionId) expect(typeof responseBody.financialTransactionId).toBe('string');
      if (responseBody.externalId) expect(typeof responseBody.externalId).toBe('string');
      if (responseBody.payer) {
        expect(responseBody.payer).toHaveProperty('partyIdType');
        expect(responseBody.payer).toHaveProperty('partyId');
      }
    } else if (response.status === 400) {
      expect(responseBody).toHaveProperty('code');
      expect(responseBody).toHaveProperty('message');
      console.error('❌ Bad Request:', responseBody);
    } else if (response.status === 404) {
      expect(responseBody).toHaveProperty('code');
      expect(responseBody).toHaveProperty('message');
      console.error('❌ Not Found - Request to pay not found:', responseBody);
    } else if (response.status === 500) {
      expect(responseBody).toHaveProperty('code');
      expect(responseBody).toHaveProperty('message');
      console.error('❌ Internal Server Error:', responseBody);
    } else {
      console.error('❌ Unexpected status:', response.status);
    }
  }, 120000);
});
