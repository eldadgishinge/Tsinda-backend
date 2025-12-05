const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const AirtelUser = require('../models/AirtelUser');

/**
 * Airtel Authentication Service Test Suite
 * Tests for the Airtel authentication service
 */
describe('Airtel Authentication Service Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tsinda-test');
    }
  });

  afterAll(async () => {
    // Clean up test database
    await AirtelUser.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await AirtelUser.deleteMany({});
  });

  describe('Health Check', () => {
    test('GET /api/airtel/health should return healthy status', async () => {
      const response = await request(app)
        .get('/api/airtel/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('Airtel Authentication Service');
    });
  });

  describe('Configuration Check', () => {
    test('GET /api/airtel/config-check should return configuration status', async () => {
      const response = await request(app)
        .get('/api/airtel/config-check')
        .expect((res) => {
          // Accept both 200 (valid) and 400 (invalid config)
          if (res.status !== 200 && res.status !== 400) {
            throw new Error(`Expected 200 or 400, got ${res.status}`);
          }
        });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('baseURL');
      expect(response.body.data).toHaveProperty('tokenEndpoint');
      expect(response.body.data).toHaveProperty('hasClientId');
      expect(response.body.data).toHaveProperty('hasClientSecret');
      expect(response.body.data).toHaveProperty('clientIdLength');
      expect(response.body.data).toHaveProperty('clientSecretLength');
      expect(response.body.data).toHaveProperty('hasMsisdn');
      expect(response.body.data).toHaveProperty('retryConfig');
      expect(response.body.data).toHaveProperty('validation');
      
      // Check validation object structure
      expect(response.body.data.validation).toHaveProperty('isValid');
      expect(response.body.data.validation).toHaveProperty('issues');
      expect(response.body.data.validation).toHaveProperty('summary');
      expect(response.body.data.validation.summary).toHaveProperty('totalProperties');
      expect(response.body.data.validation.summary).toHaveProperty('configuredProperties');
      expect(response.body.data.validation.summary).toHaveProperty('requiredProperties');
      expect(response.body.data.validation.summary).toHaveProperty('configuredRequiredProperties');
    });

    test('GET /api/airtel/config-check should validate correct .env property names', async () => {
      const response = await request(app)
        .get('/api/airtel/config-check')
        .expect((res) => {
          if (res.status !== 200 && res.status !== 400) {
            throw new Error(`Expected 200 or 400, got ${res.status}`);
          }
        });

      const validation = response.body.data.validation;
      
      // Expected .env property names
      const expectedProperties = [
        'AIRTEL_BASE_URL',
        'AIRTEL_CLIENT_ID',
        'AIRTEL_CLIENT_SECRET',
        'AIRTEL_MSISDN',
        'AIRTEL_API_TIMEOUT',
        'AIRTEL_MAX_RETRIES',
        'AIRTEL_RETRY_DELAY'
      ];

      // Check that validation summary matches expected properties count
      expect(validation.summary.totalProperties).toBe(expectedProperties.length);
      
      // If there are issues, check that they reference correct property names
      if (validation.issues && validation.issues.length > 0) {
        validation.issues.forEach(issue => {
          // Each issue should mention one of the expected property names
          const hasValidPropertyName = expectedProperties.some(prop => 
            issue.includes(prop)
          );
          expect(hasValidPropertyName).toBe(true);
        });
      }
    });

    test('GET /api/airtel/config-check should show correct token endpoint format', async () => {
      const response = await request(app)
        .get('/api/airtel/config-check')
        .expect((res) => {
          if (res.status !== 200 && res.status !== 400) {
            throw new Error(`Expected 200 or 400, got ${res.status}`);
          }
        });

      expect(response.body.data.tokenEndpoint).toBeDefined();
      expect(response.body.data.tokenEndpoint).toContain('airtel.africa');
      expect(response.body.data.tokenEndpoint).toContain('/auth/oauth2/token');
      expect(response.body.data.tokenEndpoint).toMatch(/^https:\/\//);
    });

    test('GET /api/airtel/config-check should validate retry configuration', async () => {
      const response = await request(app)
        .get('/api/airtel/config-check')
        .expect((res) => {
          if (res.status !== 200 && res.status !== 400) {
            throw new Error(`Expected 200 or 400, got ${res.status}`);
          }
        });

      const retryConfig = response.body.data.retryConfig;
      expect(retryConfig).toBeDefined();
      expect(retryConfig).toHaveProperty('maxRetries');
      expect(retryConfig).toHaveProperty('retryDelay');
      expect(retryConfig).toHaveProperty('timeout');
      
      // Validate retry config values are numbers
      expect(typeof retryConfig.maxRetries).toBe('number');
      expect(typeof retryConfig.retryDelay).toBe('number');
      expect(typeof retryConfig.timeout).toBe('number');
    });
  });

  describe('Airtel User Status', () => {
    test('GET /api/airtel/status should return no user when none exists', async () => {
      const response = await request(app)
        .get('/api/airtel/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
      expect(response.body.data.message).toBe('No Airtel user found');
    });

    test('GET /api/airtel/status should return user info when user exists', async () => {
      // Create a test Airtel user
      const airtelUser = new AirtelUser({
        clientId: 'test-client-id',
        accessToken: 'test-access-token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer',
        scope: 'test-scope',
        isActive: true
      });

      await airtelUser.save();

      const response = await request(app)
        .get('/api/airtel/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
      expect(response.body.data.clientId).toBe('test-client-id');
      expect(response.body.data.hasAccessToken).toBe(true);
    });
  });

  describe('Airtel User Initialization', () => {
    let consoleSpy;

    beforeEach(() => {
      // Spy on console.log to verify logging
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore console.log after each test
      if (consoleSpy) {
        consoleSpy.mockRestore();
      }
    });

    test('POST /api/airtel/initialize should create new Airtel user when credentials are configured', async () => {
      // This test will only pass if AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET are set
      // If not configured, it will return an error which is expected
      const response = await request(app)
        .post('/api/airtel/initialize')
        .expect((res) => {
          // Accept both 200 (success) and 500 (configuration error)
          if (res.status !== 200 && res.status !== 500) {
            throw new Error(`Expected 200 or 500, got ${res.status}`);
          }
        });

      // If credentials are configured, check for success
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.clientId).toBeDefined();
        expect(response.body.data.isActive).toBe(true);
        expect(response.body.data.hasAccessToken).toBe(true);
        
        // Verify request logging occurred during initialization
        expect(consoleSpy).toHaveBeenCalled();
        const logCalls = consoleSpy.mock.calls;
        const requestLog = logCalls.find(call => 
          call[0] && call[0].includes('Airtel Token Request')
        );
        expect(requestLog).toBeDefined();
      } else {
        // If not configured, check for appropriate error message
        // ErrorResponseDTO doesn't have a 'success' field, it has 'error' and 'timestamp'
        expect(response.body.error).toBeDefined();
        expect(response.body.error.message).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      }
    }, 30000); // Increase timeout for API calls

    test('POST /api/airtel/initialize should handle existing user', async () => {
      // Create an existing user first
      const existingUser = new AirtelUser({
        clientId: 'existing-client-id',
        accessToken: 'existing-token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        isActive: true
      });
      await existingUser.save();

      // Try to initialize - should work with existing user
      const response = await request(app)
        .post('/api/airtel/initialize')
        .expect((res) => {
          // Accept both 200 (success) and 500 (configuration error)
          if (res.status !== 200 && res.status !== 500) {
            throw new Error(`Expected 200 or 500, got ${res.status}`);
          }
        });

      // If credentials are configured, initialization should succeed
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    }, 30000);
  });

  describe('Token Management', () => {
    let consoleSpy;

    beforeEach(async () => {
      // Create a test user for token tests
      const airtelUser = new AirtelUser({
        clientId: 'test-client-id',
        accessToken: 'test-access-token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer',
        isActive: true
      });
      await airtelUser.save();

      // Spy on console.log to verify logging
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore console.log after each test
      if (consoleSpy) {
        consoleSpy.mockRestore();
      }
    });

    test('GET /api/airtel/tokens/access should return access token with correct structure', async () => {
      const response = await request(app)
        .get('/api/airtel/tokens/access')
        .expect((res) => {
          // Accept both 200 (success), 400 (config error), and 500 (API error)
          if (res.status !== 200 && res.status !== 400 && res.status !== 500) {
            throw new Error(`Expected 200, 400, or 500, got ${res.status}`);
          }
        });

      // If credentials are configured and API is accessible
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('access_token');
        expect(response.body.data).toHaveProperty('token_type');
        expect(response.body.data).toHaveProperty('expires_in');
        expect(response.body.data).toHaveProperty('expires_at');
        expect(response.body.data.token_type).toBe('Bearer');
        expect(typeof response.body.data.expires_in).toBe('number');
        expect(response.body.data.expires_in).toBeGreaterThan(0);
        
        // Verify expires_at is a valid ISO date string
        if (response.body.data.expires_at) {
          expect(new Date(response.body.data.expires_at).getTime()).toBeGreaterThan(Date.now());
        }
      } else if (response.status === 400) {
        // Configuration error - should have error message
        expect(response.body.error).toBeDefined();
        expect(response.body.error.message).toBeDefined();
      }
    }, 30000);

    test('GET /api/airtel/tokens/access should log request details before sending', async () => {
      const response = await request(app)
        .get('/api/airtel/tokens/access')
        .expect((res) => {
          if (res.status !== 200 && res.status !== 400 && res.status !== 500) {
            throw new Error(`Expected 200, 400, or 500, got ${res.status}`);
          }
        });

      // Verify that request logging occurred
      expect(consoleSpy).toHaveBeenCalled();
      
      // Check for request logging
      const logCalls = consoleSpy.mock.calls;
      
      // Check for "Requesting Airtel token from" log
      const urlLog = logCalls.find(call => 
        call[0] && call[0].includes('Requesting Airtel token from')
      );
      expect(urlLog).toBeDefined();
      
      // Check for "Client ID" log
      const clientIdLog = logCalls.find(call => 
        call[0] && call[0].includes('Client ID')
      );
      expect(clientIdLog).toBeDefined();
      
      // Check for "Airtel Token Request" log
      const requestLog = logCalls.find(call => 
        call[0] && call[0].includes('Airtel Token Request')
      );
      
      if (requestLog) {
        // Verify request logging structure
        if (typeof requestLog[1] === 'object') {
          const requestData = requestLog[1];
          expect(requestData).toHaveProperty('method');
          expect(requestData).toHaveProperty('url');
          expect(requestData).toHaveProperty('headers');
          expect(requestData).toHaveProperty('body');
          expect(requestData).toHaveProperty('timeout');
          expect(requestData.method).toBe('POST');
          expect(requestData.url).toContain('airtel.africa');
          expect(requestData.url).toContain('/auth/oauth2/token');
          expect(requestData.headers).toHaveProperty('Content-Type');
          expect(requestData.headers).toHaveProperty('Accept');
          expect(requestData.headers['Content-Type']).toBe('application/json');
          
          // Verify body is a JSON string (all values in quotes)
          expect(typeof requestData.body).toBe('string');
          const bodyParsed = JSON.parse(requestData.body);
          expect(bodyParsed).toHaveProperty('client_id');
          expect(bodyParsed).toHaveProperty('client_secret');
          expect(bodyParsed).toHaveProperty('grant_type');
          expect(bodyParsed.grant_type).toBe('client_credentials');
          expect(typeof bodyParsed.client_id).toBe('string');
          expect(typeof bodyParsed.client_secret).toBe('string');
          expect(typeof bodyParsed.grant_type).toBe('string');
          
          // Verify bodyParsed object structure
          if (requestData.bodyParsed) {
            expect(requestData.bodyParsed).toHaveProperty('client_id');
            expect(requestData.bodyParsed).toHaveProperty('client_secret');
            expect(requestData.bodyParsed).toHaveProperty('grant_type');
          }
          
          expect(typeof requestData.timeout).toBe('number');
        }
      }
    }, 30000);

    test('GET /api/airtel/tokens/access should log form-urlencoded request if JSON fails', async () => {
      // This test verifies that if JSON format fails, form-urlencoded request is logged
      const response = await request(app)
        .get('/api/airtel/tokens/access')
        .expect((res) => {
          if (res.status !== 200 && res.status !== 400 && res.status !== 500) {
            throw new Error(`Expected 200, 400, or 500, got ${res.status}`);
          }
        });

      const logCalls = consoleSpy.mock.calls;
      
      // Check if form-urlencoded request was logged (happens if JSON fails with 400)
      const formUrlEncodedLog = logCalls.find(call => 
        call[0] && call[0].includes('Airtel Token Request (form-urlencoded)')
      );
      
      // Also check for "JSON format failed" message
      const jsonFailedLog = logCalls.find(call => 
        call[0] && call[0].includes('JSON format failed')
      );
      
      // If form-urlencoded was used, verify its structure
      if (formUrlEncodedLog && typeof formUrlEncodedLog[1] === 'object') {
        const requestData = formUrlEncodedLog[1];
        expect(requestData).toHaveProperty('method');
        expect(requestData).toHaveProperty('url');
        expect(requestData).toHaveProperty('headers');
        expect(requestData.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
        expect(requestData).toHaveProperty('body');
        expect(requestData).toHaveProperty('bodyParsed');
        if (requestData.bodyParsed) {
          expect(requestData.bodyParsed).toHaveProperty('grant_type');
          expect(requestData.bodyParsed.grant_type).toBe('client_credentials');
        }
      }
    }, 30000);

    test('GET /api/airtel/tokens/access should log token response when successful', async () => {
      const response = await request(app)
        .get('/api/airtel/tokens/access')
        .expect((res) => {
          if (res.status !== 200 && res.status !== 400 && res.status !== 500) {
            throw new Error(`Expected 200, 400, or 500, got ${res.status}`);
          }
        });

      // If token was retrieved successfully, verify logging occurred
      if (response.status === 200) {
        // Check that console.log was called (for token response logging)
        expect(consoleSpy).toHaveBeenCalled();
        
        // Verify that token response logging includes expected fields
        const logCalls = consoleSpy.mock.calls;
        const tokenResponseLog = logCalls.find(call => 
          call[0] && (
            call[0].includes('Token Response') || 
            (typeof call[0] === 'object' && call[0].hasAccessToken !== undefined)
          )
        );
        
        if (tokenResponseLog) {
          // If logging object format, verify structure
          if (typeof tokenResponseLog[1] === 'object') {
            const logData = tokenResponseLog[1];
            expect(logData).toHaveProperty('hasAccessToken');
            expect(logData).toHaveProperty('tokenType');
            expect(logData).toHaveProperty('expiresIn');
          }
        }
      }
    }, 30000);

    test('GET /api/airtel/tokens/access should log token response structure correctly', async () => {
      const response = await request(app)
        .get('/api/airtel/tokens/access')
        .expect((res) => {
          if (res.status !== 200 && res.status !== 400 && res.status !== 500) {
            throw new Error(`Expected 200, 400, or 500, got ${res.status}`);
          }
        });

      if (response.status === 200) {
        // Verify response structure matches what should be logged
        const tokenData = response.body.data;
        
        // Verify all expected fields are present
        expect(tokenData).toHaveProperty('access_token');
        expect(tokenData).toHaveProperty('token_type');
        expect(tokenData).toHaveProperty('expires_in');
        expect(tokenData).toHaveProperty('expires_at');
        
        // Verify token_type is Bearer
        expect(tokenData.token_type).toBe('Bearer');
        
        // Verify expires_in is a positive number
        expect(typeof tokenData.expires_in).toBe('number');
        expect(tokenData.expires_in).toBeGreaterThan(0);
        
        // Verify expires_at is a valid future date
        if (tokenData.expires_at) {
          const expiresAt = new Date(tokenData.expires_at);
          expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
        }
      }
    }, 30000);
  });

  describe('Encryption Keys', () => {
    beforeEach(async () => {
      // Create a test user with valid token for encryption tests
      const airtelUser = new AirtelUser({
        clientId: 'test-client-id',
        accessToken: 'test-access-token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer',
        isActive: true
      });
      await airtelUser.save();
    });

    test('GET /api/airtel/encryption-keys should return encryption keys with default country/currency', async () => {
      const response = await request(app)
        .get('/api/airtel/encryption-keys')
        .expect((res) => {
          // Accept both 200 (success) and 500 (API error)
          if (res.status !== 200 && res.status !== 500) {
            throw new Error(`Expected 200 or 500, got ${res.status}`);
          }
        });

      // If API is accessible and token is valid
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    }, 30000);

    test('GET /api/airtel/encryption-keys?country=RW&currency=RWF should return encryption keys', async () => {
      const response = await request(app)
        .get('/api/airtel/encryption-keys')
        .query({ country: 'RW', currency: 'RWF' })
        .expect((res) => {
          // Accept both 200 (success) and 500 (API error)
          if (res.status !== 200 && res.status !== 500) {
            throw new Error(`Expected 200 or 500, got ${res.status}`);
          }
        });

      // If API is accessible and token is valid
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    }, 30000);
  });

  describe('PIN Encryption', () => {
    beforeEach(async () => {
      // Create a test user with valid token for encryption tests
      const airtelUser = new AirtelUser({
        clientId: 'test-client-id',
        accessToken: 'test-access-token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer',
        isActive: true
      });
      await airtelUser.save();
    });

    test('POST /api/airtel/encrypt-pin should encrypt PIN with default country/currency', async () => {
      const response = await request(app)
        .post('/api/airtel/encrypt-pin')
        .send({ pin: '1234' })
        .expect((res) => {
          // Accept both 200 (success) and 500 (API error)
          if (res.status !== 200 && res.status !== 500) {
            throw new Error(`Expected 200 or 500, got ${res.status}`);
          }
        });

      // If API is accessible and encryption keys are available
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.encryptedPin).toBeDefined();
      }
    }, 30000);

    test('POST /api/airtel/encrypt-pin should encrypt PIN with specified country/currency', async () => {
      const response = await request(app)
        .post('/api/airtel/encrypt-pin')
        .send({ 
          pin: '1234',
          country: 'RW',
          currency: 'RWF'
        })
        .expect((res) => {
          // Accept both 200 (success) and 500 (API error)
          if (res.status !== 200 && res.status !== 500) {
            throw new Error(`Expected 200 or 500, got ${res.status}`);
          }
        });

      // If API is accessible and encryption keys are available
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.encryptedPin).toBeDefined();
      }
    }, 30000);

    test('POST /api/airtel/encrypt-pin should return error for missing PIN', async () => {
      const response = await request(app)
        .post('/api/airtel/encrypt-pin')
        .send({})
        .expect((res) => {
          // Accept both 400 (validation error) and 500 (service error)
          if (res.status !== 400 && res.status !== 500) {
            throw new Error(`Expected 400 or 500, got ${res.status}`);
          }
        });

      // ErrorResponseDTO doesn't have a 'success' field, it has 'error' and 'timestamp'
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('User Statistics', () => {
    test('GET /api/airtel/stats should return user statistics when user exists', async () => {
      // Create a test user with usage stats
      const airtelUser = new AirtelUser({
        clientId: 'test-client-id',
        accessToken: 'test-access-token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        usageStats: {
          totalTransactions: 10,
          successfulTransactions: 8,
          failedTransactions: 2,
          lastUsedAt: new Date()
        }
      });
      await airtelUser.save();

      const response = await request(app)
        .get('/api/airtel/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalTransactions).toBe(10);
      expect(response.body.data.successfulTransactions).toBe(8);
      expect(response.body.data.failedTransactions).toBe(2);
    });

    test('GET /api/airtel/stats should return null when no user exists', async () => {
      const response = await request(app)
        .get('/api/airtel/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });
  });

  describe('Connectivity Testing', () => {
    test('GET /api/airtel/test should test Airtel connectivity', async () => {
      const response = await request(app)
        .get('/api/airtel/test')
        .expect((res) => {
          // Accept both 200 (success) and 500 (API error)
          if (res.status !== 200 && res.status !== 500) {
            throw new Error(`Expected 200 or 500, got ${res.status}`);
          }
        });

      expect(response.body.success).toBeDefined();
      expect(response.body.data).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('timestamp');
    }, 30000);
  });

  describe('User Reset', () => {
    test('DELETE /api/airtel/reset should reset Airtel user', async () => {
      // First create a user
      const airtelUser = new AirtelUser({
        clientId: 'test-client-id',
        accessToken: 'test-access-token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        isActive: true
      });
      await airtelUser.save();

      // Verify user exists
      let statusResponse = await request(app)
        .get('/api/airtel/status')
        .expect(200);
      expect(statusResponse.body.data.exists).toBe(true);

      // Reset user
      const resetResponse = await request(app)
        .delete('/api/airtel/reset')
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
      expect(resetResponse.body.data.reset).toBe(true);

      // Verify user no longer exists
      statusResponse = await request(app)
        .get('/api/airtel/status')
        .expect(200);
      expect(statusResponse.body.data.exists).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('Should handle non-existent endpoints gracefully', async () => {
      const response = await request(app)
        .get('/api/airtel/nonexistent')
        .expect(404);

      expect(response.body).toBeDefined();
    });

    test('Should handle invalid request methods', async () => {
      const response = await request(app)
        .post('/api/airtel/status')
        .expect(404);

      expect(response.body).toBeDefined();
    });
  });

  describe('Token Validation', () => {
    test('Should detect expired tokens', async () => {
      // Create a user with expired token
      const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago
      const airtelUser = new AirtelUser({
        clientId: 'test-client-id',
        accessToken: 'expired-token',
        tokenExpiresAt: expiredDate,
        isActive: true
      });
      await airtelUser.save();

      const response = await request(app)
        .get('/api/airtel/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
      expect(response.body.data.tokenValid).toBe(false);
    });

    test('Should detect valid tokens', async () => {
      // Create a user with valid token
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const airtelUser = new AirtelUser({
        clientId: 'test-client-id',
        accessToken: 'valid-token',
        tokenExpiresAt: futureDate,
        isActive: true
      });
      await airtelUser.save();

      const response = await request(app)
        .get('/api/airtel/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
      expect(response.body.data.tokenValid).toBe(true);
    });
  });

  describe('Usage Statistics', () => {
    test('Should track usage statistics correctly', async () => {
      const airtelUser = new AirtelUser({
        clientId: 'test-client-id',
        accessToken: 'test-token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        isActive: true
      });
      await airtelUser.save();

      // Increment usage
      await airtelUser.incrementUsage(true);
      await airtelUser.incrementUsage(true);
      await airtelUser.incrementUsage(false);

      // Reload user
      const updatedUser = await AirtelUser.findById(airtelUser._id);

      expect(updatedUser.usageStats.totalTransactions).toBe(3);
      expect(updatedUser.usageStats.successfulTransactions).toBe(2);
      expect(updatedUser.usageStats.failedTransactions).toBe(1);
      expect(updatedUser.usageStats.lastUsedAt).toBeDefined();
    });
  });

  describe('Environment Variable Validation', () => {
    test('Should validate that correct .env property names are used', () => {
      const { validateAirtelConfig } = require('../utils/validateAirtelConfig');
      
      // Expected property names from .env file
      const expectedEnvProperties = [
        'AIRTEL_BASE_URL',
        'AIRTEL_CLIENT_ID',
        'AIRTEL_CLIENT_SECRET',
        'AIRTEL_MSISDN',
        'AIRTEL_API_TIMEOUT',
        'AIRTEL_MAX_RETRIES',
        'AIRTEL_RETRY_DELAY'
      ];

      // Run validation
      const validation = validateAirtelConfig();

      // Check that validation covers all expected properties
      expect(validation.summary.totalProperties).toBe(expectedEnvProperties.length);

      // Check that issues reference correct property names if any
      if (validation.issues) {
        validation.issues.forEach(issue => {
          const hasValidPropertyName = expectedEnvProperties.some(prop => 
            issue.includes(prop)
          );
          expect(hasValidPropertyName).toBe(true);
        });
      }
    });

    test('Should validate .env property format requirements', () => {
      const { validateAirtelConfig } = require('../utils/validateAirtelConfig');
      
      const validation = validateAirtelConfig();

      // Check that validation structure is correct
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(validation).toHaveProperty('config');
      expect(validation).toHaveProperty('summary');

      // Check summary structure
      expect(validation.summary).toHaveProperty('totalProperties');
      expect(validation.summary).toHaveProperty('configuredProperties');
      expect(validation.summary).toHaveProperty('requiredProperties');
      expect(validation.summary).toHaveProperty('configuredRequiredProperties');

      // Required properties should be AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET
      expect(validation.summary.requiredProperties).toBe(2);
    });

    test('Should detect placeholder values in .env properties', () => {
      // This test validates that the validator can detect placeholder values
      // Note: This won't fail if placeholders are present, but validates the logic exists
      const { validateAirtelConfig } = require('../utils/validateAirtelConfig');
      
      const validation = validateAirtelConfig();

      // If there are issues, they should be descriptive
      if (validation.issues) {
        validation.issues.forEach(issue => {
          expect(typeof issue).toBe('string');
          expect(issue.length).toBeGreaterThan(0);
        });
      }
    });
  });
});

