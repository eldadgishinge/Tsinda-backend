const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

/**
 * Payment Service Integration Tests
 * Tests the complete payment flow from API to database
 */
describe('Payment Service Integration Tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tsinda-test');
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Complete Payment Flow', () => {
    test('Should handle complete request-to-pay flow', async () => {
      // 1. Create a payment request
      const paymentData = {
        amount: 100,
        currency: 'EUR',
        externalId: 'integration-test-1',
        payer: {
          partyIdType: 'MSISDN',
          partyId: '46733123454'
        },
        payerMessage: 'Integration test payment',
        payeeNote: 'Test payment note'
      };

      const createResponse = await request(app)
        .post('/api/payments/request-to-pay')
        .send(paymentData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.transactionType).toBe('collection');
      expect(createResponse.body.data.status).toBe('PENDING');

      const paymentId = createResponse.body.data.id;

      // 2. Get payment details
      const getResponse = await request(app)
        .get(`/api/payments/${paymentId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(paymentId);

      // 3. Check payment status
      const statusResponse = await request(app)
        .get(`/api/payments/${paymentId}/status`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.id).toBe(paymentId);
    });

    test('Should handle complete transfer flow', async () => {
      // 1. Create a transfer
      const transferData = {
        amount: 200,
        currency: 'EUR',
        externalId: 'integration-test-2',
        payee: {
          partyIdType: 'MSISDN',
          partyId: '46733123454'
        },
        payerMessage: 'Integration test transfer',
        payeeNote: 'Test transfer note'
      };

      const createResponse = await request(app)
        .post('/api/payments/transfer')
        .send(transferData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.transactionType).toBe('disbursement');
      expect(createResponse.body.data.transactionSubType).toBe('transfer');

      const paymentId = createResponse.body.data.id;

      // 2. Get all payments and verify the transfer is listed
      const allPaymentsResponse = await request(app)
        .get('/api/payments')
        .expect(200);

      expect(allPaymentsResponse.body.success).toBe(true);
      expect(allPaymentsResponse.body.data.length).toBeGreaterThan(0);

      // 3. Filter by transaction type
      const filteredResponse = await request(app)
        .get('/api/payments?transactionType=disbursement')
        .expect(200);

      expect(filteredResponse.body.success).toBe(true);
    });

    test('Should handle complete refund flow', async () => {
      // 1. Create a refund
      const refundData = {
        amount: 50,
        currency: 'EUR',
        externalId: 'integration-test-3',
        payerMessage: 'Integration test refund',
        payeeNote: 'Test refund note',
        referenceIdToRefund: 'test-reference-id'
      };

      const createResponse = await request(app)
        .post('/api/payments/refund')
        .send(refundData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.transactionType).toBe('disbursement');
      expect(createResponse.body.data.transactionSubType).toBe('refund');

      const paymentId = createResponse.body.data.id;

      // 2. Verify refund in payment list
      const allPaymentsResponse = await request(app)
        .get('/api/payments')
        .expect(200);

      expect(allPaymentsResponse.body.success).toBe(true);
    });

    test('Should handle account balance check', async () => {
      // Test collection balance
      const collectionBalanceResponse = await request(app)
        .get('/api/payments/balance?serviceType=collection')
        .expect(200);

      expect(collectionBalanceResponse.body.success).toBe(true);

      // Test disbursement balance
      const disbursementBalanceResponse = await request(app)
        .get('/api/payments/balance?serviceType=disbursement')
        .expect(200);

      expect(disbursementBalanceResponse.body.success).toBe(true);
    });

    test('Should handle service statistics', async () => {
      const statsResponse = await request(app)
        .get('/api/payments/stats')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data).toHaveProperty('totalTransactions');
    });

    test('Should handle health check', async () => {
      const healthResponse = await request(app)
        .get('/api/payments/health')
        .expect(200);

      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.data.status).toBe('healthy');
    });
  });

  describe('Error Handling Integration', () => {
    test('Should handle validation errors consistently', async () => {
      const invalidData = {
        amount: -10, // Invalid amount
        currency: 'INVALID' // Invalid currency
      };

      const response = await request(app)
        .post('/api/payments/request-to-pay')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    test('Should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/payments/request-to-pay')
        .send({}) // Empty request
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('validation');
    });

    test('Should handle invalid payment ID format', async () => {
      const response = await request(app)
        .get('/api/payments/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid payment ID format');
    });

    test('Should handle non-existent payment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/payments/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Payment not found');
    });
  });

  describe('Query Parameters Integration', () => {
    beforeEach(async () => {
      // Create test payments for filtering
      const payments = [
        {
          xReferenceId: 'filter-test-1',
          apiUserId: 'user-1',
          apiKey: 'key-1',
          transactionType: 'collection',
          transactionSubType: 'request_to_pay',
          amount: 100,
          currency: 'EUR',
          externalId: 'filter-test-1',
          payer: { partyIdType: 'MSISDN', partyId: '46733123454' },
          serviceType: 'collections',
          subscriptionKey: 'test-key',
          status: 'SUCCESSFUL'
        },
        {
          xReferenceId: 'filter-test-2',
          apiUserId: 'user-1',
          apiKey: 'key-1',
          transactionType: 'disbursement',
          transactionSubType: 'transfer',
          amount: 200,
          currency: 'EUR',
          externalId: 'filter-test-2',
          payee: { partyIdType: 'MSISDN', partyId: '46733123454' },
          serviceType: 'disbursements',
          subscriptionKey: 'test-key',
          status: 'PENDING'
        }
      ];

      const Payment = require('../models/Payment');
      await Payment.insertMany(payments);
    });

    test('Should filter by transaction type', async () => {
      const response = await request(app)
        .get('/api/payments?transactionType=collection')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(payment => payment.transactionType === 'collection')).toBe(true);
    });

    test('Should filter by status', async () => {
      const response = await request(app)
        .get('/api/payments?status=SUCCESSFUL')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(payment => payment.status === 'SUCCESSFUL')).toBe(true);
    });

    test('Should handle pagination', async () => {
      const response = await request(app)
        .get('/api/payments?limit=1&skip=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    test('Should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/payments?limit=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Limit must be between 1 and 100');
    });
  });
});
