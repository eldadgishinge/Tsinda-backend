require('dotenv').config();

describe('Airtel Token API', () => {
  afterAll(async () => {
    // Give time for connections to close properly
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('POST https://openapiuat.airtel.africa/auth/oauth2/token should return access token', async () => {
    const inputBody = {
      client_id: process.env.AIRTEL_CLIENT_ID || '3ce996af-eb40-476d-bc5b-dcf385dd9ea0',
      client_secret: process.env.AIRTEL_CLIENT_SECRET || '61f944cb-1216-4f6d-9c80-cda9f1d70f4f',
      grant_type: 'client_credentials'
    };

    console.log('Credentials:', {
      client_id: inputBody.client_id,
      client_secret: inputBody.client_secret,
      grant_type: inputBody.grant_type
    });

    const headers = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Connection': 'close',
      'Cookie': 'visid_incap_2967769=OuF6ejqtT/mBvA/Oxh+1LKzE52gAAAAAQUIPAAAAAAAm07DTETctcaDQz8F8Rq0B'
    };

    const response = await fetch('https://openapiuat.airtel.africa/auth/oauth2/token', {
      method: 'POST',
      body: JSON.stringify(inputBody),
      headers: headers
    });

    const body = await response.json();
    console.log('Response:', body);

    if (response.ok) {
      // Expected response format:
      // {
      //   "token_type": "bearer",
      //   "access_token": "ppRoG9z3JXbwEjZIyLjOrhYa6VWiUv39",
      //   "expires_in": 180
      // }
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('token_type');
      expect(body).toHaveProperty('expires_in');
      expect(body.token_type.toLowerCase()).toBe('bearer');
      expect(typeof body.expires_in).toBe('number');
      expect(typeof body.access_token).toBe('string');
      expect(body.expires_in).toBeGreaterThan(0);
      console.log('Success! Access token received:', body.access_token.substring(0, 10) + '...');
    } else {
      console.error('Error response:', body);
      throw new Error(`Failed to get token: ${response.status} ${JSON.stringify(body)}`);
    }
  }, 30000);
});

