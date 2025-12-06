require('dotenv').config();

describe('Airtel Token API', () => {
  test('POST https://openapiuat.airtel.africa/auth/oauth2/token should return access token', async () => {
    const inputBody = {
      client_id: '1f07332e-4b1a-436d-938c-3a21685176fe',
      client_secret: 'a5645a3-0d2c-4eb5-bbd0-ccf4abc93315',
      grant_type: 'client_credentials'
    };

    console.log('Credentials:', {
      client_id: inputBody.client_id,
      client_secret: inputBody.client_secret,
      grant_type: inputBody.grant_type
    });

    const headers = {
      'Content-Type': 'application/json',
      'Accept': '*/*'
    };

    const response = await fetch('https://openapiuat.airtel.africa/auth/oauth2/token', {
      method: 'POST',
      body: JSON.stringify(inputBody),
      headers: headers
    });

    const body = await response.json();
    console.log('Response:', body);

    if (response.ok) {
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('token_type');
      expect(body).toHaveProperty('expires_in');
      expect(body.token_type).toBe('Bearer');
      expect(typeof body.expires_in).toBe('number');
      console.log(body);
    } else {
      console.error('Error response:', body);
      throw new Error(`Failed to get token: ${response.status} ${JSON.stringify(body)}`);
    }
  }, 30000);
});

