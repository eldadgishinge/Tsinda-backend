require('dotenv').config();
const { getServiceConfig } = require('../config/paymentConfig');
const MTNUser = require('../models/MTNUser');
const mongoose = require('mongoose');

async function testTokenAPI() {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tsinda-test');
      console.log('Connected to MongoDB');
    }

    const mtnConfig = getServiceConfig('mtn');
    const baseURL = mtnConfig.baseURL;
    const subscriptionKey = process.env.MTN_COLLECTION_WIDGET_KEY || mtnConfig.subscriptionKeys.collections;
    
    // Use provided API User and API Key
    const ApiUser = process.env.MTN_API_USER || 'caa0eb38-33e6-4bf0-acf1-04f18020d379';
    const apiKey = process.env.MTN_API_KEY || 'b4c09a94258a44e89cd8c3345d3cd237';
    
    console.log('Using API User and API Key:');
    console.log('API User (X-Reference-Id):', ApiUser);
    console.log('API Key:', apiKey);

    if (!ApiUser || !apiKey) {
      console.error('MTN_API_USER or MTN_API_KEY not set');
      process.exit(1);
    }

    const url = `${baseURL}/collection/token/`;
    const auth = Buffer.from(`${ApiUser}:${apiKey}`).toString('base64');
    
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': subscriptionKey
    };

    console.log('\n=== Token API Test ===');
    console.log('URL:', url);
    console.log('X-Reference-Id:', ApiUser);
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET');
    console.log('Subscription Key:', subscriptionKey ? `${subscriptionKey.substring(0, 4)}...${subscriptionKey.substring(subscriptionKey.length - 4)}` : 'NOT SET');
    console.log('Full Subscription Key:', subscriptionKey);
    console.log('\nSending request...\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: headers
    });

    const body = await response.json();
    
    console.log('=== Token API Response ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Response Body:', JSON.stringify(body, null, 2));
    console.log('========================\n');

    if (response.status === 200) {
      console.log('✅ SUCCESS: Token retrieved successfully');
      console.log('Access Token:', body.access_token ? `${body.access_token.substring(0, 20)}...` : 'N/A');
      console.log('Token Type:', body.token_type);
      console.log('Expires In:', body.expires_in, 'seconds');
    } else if (response.status === 401) {
      console.error('❌ UNAUTHORIZED: Check your credentials or subscription key');
      console.error('Error:', body.error || body.message);
      console.error('\nPossible issues:');
      console.error('1. Invalid API User ID or API Key');
      console.error('2. Invalid Subscription Key (MTN_COLLECTIONS_KEY)');
      console.error('3. Subscription key not active for this API user');
    } else {
      console.error('❌ FAILED:', response.status);
      console.error('Response:', body);
    }

    await mongoose.disconnect();
    process.exit(response.status === 200 ? 0 : 1);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testTokenAPI();
