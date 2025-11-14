const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const MTNUser = require('../models/MTNUser');

/**
 * MTN Authentication Service Test Suite
 * Tests for the separate MTN authentication service
 */
describe('MTN Authentication Service Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tsinda-test');
    }
  });

  afterAll(async () => {
    // Clean up test database
    await MTNUser.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await MTNUser.deleteMany({});
  });

  describe('Health Check', () => {
    test('GET /api/mtn/health should return healthy status', async () => {
      const response = await request(app)
        .get('/api/mtn/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('MTN Authentication Service');
    });
  });

  describe('MTN User Status', () => {
    test('GET /api/mtn/status should return no user when none exists', async () => {
      const response = await request(app)
        .get('/api/mtn/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
      expect(response.body.data.message).toBe('No MTN user found');
    });

    test('GET /api/mtn/status should return user info when user exists', async () => {
      // Create a test MTN user
      const mtnUser = new MTNUser({
        xReferenceId: 'test-reference-id',
        apiKey: 'test-api-key',
        providerCallbackHost: 'https://test.com',
        collectionToken: 'test-collection-token',
        disbursementToken: 'test-disbursement-token',
        collectionTokenExpiresAt: new Date(Date.now() + 3600000),
        disbursementTokenExpiresAt: new Date(Date.now() + 3600000),
        subscriptionKeys: {
          collections: 'test-key',
          disbursements: 'test-key'
        }
      });

      await mtnUser.save();

      const response = await request(app)
        .get('/api/mtn/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
      expect(response.body.data.xReferenceId).toBe('test-reference-id');
    });
  });

  describe('MTN User Initialization', () => {
    test('POST /api/mtn/initialize should create new MTN user', async () => {
      const response = await request(app)
        .post('/api/mtn/initialize')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.xReferenceId).toBeDefined();
      expect(response.body.data.isActive).toBe(true);
    });

    test('POST /api/mtn/initialize should handle existing user', async () => {
      // First initialization
      await request(app)
        .post('/api/mtn/initialize')
        .expect(200);

      // Second initialization should work with existing user
      const response = await request(app)
        .post('/api/mtn/initialize')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Token Management', () => {
    beforeEach(async () => {
      // Initialize MTN user for token tests
      await request(app)
        .post('/api/mtn/initialize')
        .expect(200);
    });

    test('GET /api/mtn/tokens/collection should return collection token', async () => {
      const response = await request(app)
        .get('/api/mtn/tokens/collection')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    test('GET /api/mtn/tokens/disbursement should return disbursement token', async () => {
      const response = await request(app)
        .get('/api/mtn/tokens/disbursement')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });
  });

  describe('User Statistics', () => {
    test('GET /api/mtn/stats should return user statistics', async () => {
      const response = await request(app)
        .get('/api/mtn/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Connectivity Testing', () => {
    test('GET /api/mtn/test should test MTN connectivity', async () => {
      const response = await request(app)
        .get('/api/mtn/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('collection');
      expect(response.body.data).toHaveProperty('disbursement');
    });
  });

  describe('User Reset', () => {
    test('DELETE /api/mtn/reset should reset MTN user', async () => {
      // First create a user
      await request(app)
        .post('/api/mtn/initialize')
        .expect(200);

      // Verify user exists
      let statusResponse = await request(app)
        .get('/api/mtn/status')
        .expect(200);
      expect(statusResponse.body.data.exists).toBe(true);

      // Reset user
      const resetResponse = await request(app)
        .delete('/api/mtn/reset')
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
      expect(resetResponse.body.data.reset).toBe(true);

      // Verify user no longer exists
      statusResponse = await request(app)
        .get('/api/mtn/status')
        .expect(200);
      expect(statusResponse.body.data.exists).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('Should handle MTN API errors gracefully', async () => {
      // This test would require mocking the MTN API calls
      // For now, we'll test the error response format
      const response = await request(app)
        .get('/api/mtn/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});
