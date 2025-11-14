const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const MTNUser = require('../models/MTNUser');

/**
 * Payment Service Test Suite
 * Comprehensive tests for the payment service implementation
 */
describe('Payment Service Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tsinda-test');
    }
  });

  afterAll(async () => {
    // Clean up test database
    await Payment.deleteMany({});
    await MTNUser.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Payment.deleteMany({});
    await MTNUser.deleteMany({});
  });

  describe('Health Check', () => {
    test('GET /api/payments/health should return healthy status', async () => {
      const response = await request(app)
        .get('/api/payments/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('Payment Service');
    });
  });

  describe('Request to Pay', () => {
    test('POST /api/payments/request-to-pay should create a payment request', async () => {
      const paymentData = {
        amount: 100,
        currency: 'EUR',
        externalId: 'test-123',
        payer: {
          partyIdType: 'MSISDN',
          partyId: '46733123454'
        },
        payerMessage: 'Test payment',
        payeeNote: 'Test note'
      };

      const response = await request(app)
        .post('/api/payments/request-to-pay')
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactionType).toBe('collection');
      expect(response.body.data.transactionSubType).toBe('request_to_pay');
      expect(response.body.data.amount).toBe(100);
      expect(response.body.data.currency).toBe('EUR');
    });

    test('POST /api/payments/request-to-pay should validate required fields', async () => {
      const invalidData = {
        amount: -10, // Invalid amount
        currency: 'EUR'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/payments/request-to-pay')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('validation');
    });

    test('POST /api/payments/request-to-pay should validate amount limits', async () => {
      const paymentData = {
        amount: 2000000, // Exceeds limit
        currency: 'EUR',
        externalId: 'test-123',
        payer: {
          partyIdType: 'MSISDN',
          partyId: '46733123454'
        }
      };

      const response = await request(app)
        .post('/api/payments/request-to-pay')
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Amount exceeds maximum limit');
    });
  });

  describe('Transfer', () => {
    test('POST /api/payments/transfer should create a transfer', async () => {
      const transferData = {
        amount: 150,
        currency: 'EUR',
        externalId: 'transfer-123',
        payee: {
          partyIdType: 'MSISDN',
          partyId: '46733123454'
        },
        payerMessage: 'Test transfer',
        payeeNote: 'Transfer note'
      };

      const response = await request(app)
        .post('/api/payments/transfer')
        .send(transferData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactionType).toBe('disbursement');
      expect(response.body.data.transactionSubType).toBe('transfer');
      expect(response.body.data.amount).toBe(150);
    });

    test('POST /api/payments/transfer should validate required fields', async () => {
      const invalidData = {
        amount: 100,
        currency: 'EUR'
        // Missing payee information
      };

      const response = await request(app)
        .post('/api/payments/transfer')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('validation');
    });
  });

  describe('Refund', () => {
    test('POST /api/payments/refund should create a refund', async () => {
      const refundData = {
        amount: 50,
        currency: 'EUR',
        externalId: 'refund-123',
        payerMessage: 'Test refund',
        payeeNote: 'Refund note',
        referenceIdToRefund: 'test-reference-id'
      };

      const response = await request(app)
        .post('/api/payments/refund')
        .send(refundData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactionType).toBe('disbursement');
      expect(response.body.data.transactionSubType).toBe('refund');
      expect(response.body.data.amount).toBe(50);
    });

    test('POST /api/payments/refund should validate reference ID', async () => {
      const refundData = {
        amount: 50,
        currency: 'EUR',
        externalId: 'refund-123'
        // Missing referenceIdToRefund
      };

      const response = await request(app)
        .post('/api/payments/refund')
        .send(refundData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('validation');
    });
  });

  describe('Get Payments', () => {
    beforeEach(async () => {
      // Create test payments
      const payments = [
        {
          xReferenceId: 'test-1',
          apiUserId: 'user-1',
          apiKey: 'key-1',
          transactionType: 'collection',
          transactionSubType: 'request_to_pay',
          amount: 100,
          currency: 'EUR',
          externalId: 'test-1',
          payer: { partyIdType: 'MSISDN', partyId: '46733123454' },
          serviceType: 'collections',
          subscriptionKey: 'test-key'
        },
        {
          xReferenceId: 'test-2',
          apiUserId: 'user-1',
          apiKey: 'key-1',
          transactionType: 'disbursement',
          transactionSubType: 'transfer',
          amount: 200,
          currency: 'EUR',
          externalId: 'test-2',
          payee: { partyIdType: 'MSISDN', partyId: '46733123454' },
          serviceType: 'disbursements',
          subscriptionKey: 'test-key'
        }
      ];

      await Payment.insertMany(payments);
    });

    test('GET /api/payments should return all payments', async () => {
      const response = await request(app)
        .get('/api/payments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('GET /api/payments should filter by transaction type', async () => {
      const response = await request(app)
        .get('/api/payments?transactionType=collection')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].transactionType).toBe('collection');
    });

    test('GET /api/payments should filter by status', async () => {
      const response = await request(app)
        .get('/api/payments?status=PENDING')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('GET /api/payments should support pagination', async () => {
      const response = await request(app)
        .get('/api/payments?limit=1&skip=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('Get Payment by ID', () => {
    let paymentId;

    beforeEach(async () => {
      const payment = new Payment({
        xReferenceId: 'test-payment',
        apiUserId: 'user-1',
        apiKey: 'key-1',
        transactionType: 'collection',
        transactionSubType: 'request_to_pay',
        amount: 100,
        currency: 'EUR',
        externalId: 'test-payment',
        payer: { partyIdType: 'MSISDN', partyId: '46733123454' },
        serviceType: 'collections',
        subscriptionKey: 'test-key'
      });

      const savedPayment = await payment.save();
      paymentId = savedPayment._id;
    });

    test('GET /api/payments/:id should return specific payment', async () => {
      const response = await request(app)
        .get(`/api/payments/${paymentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(paymentId.toString());
      expect(response.body.data.transactionType).toBe('collection');
    });

    test('GET /api/payments/:id should return 404 for non-existent payment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/payments/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Payment not found');
    });

    test('GET /api/payments/:id should validate ID format', async () => {
      const response = await request(app)
        .get('/api/payments/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid payment ID format');
    });
  });

  describe('Get Payment Status', () => {
    let paymentId;

    beforeEach(async () => {
      const payment = new Payment({
        xReferenceId: 'test-status',
        apiUserId: 'user-1',
        apiKey: 'key-1',
        transactionType: 'collection',
        transactionSubType: 'request_to_pay',
        amount: 100,
        currency: 'EUR',
        externalId: 'test-status',
        payer: { partyIdType: 'MSISDN', partyId: '46733123454' },
        serviceType: 'collections',
        subscriptionKey: 'test-key'
      });

      const savedPayment = await payment.save();
      paymentId = savedPayment._id;
    });

    test('GET /api/payments/:id/status should return payment status', async () => {
      const response = await request(app)
        .get(`/api/payments/${paymentId}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(paymentId.toString());
    });
  });

  describe('Get Account Balance', () => {
    test('GET /api/payments/balance should return account balance', async () => {
      const response = await request(app)
        .get('/api/payments/balance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('GET /api/payments/balance should support service type filter', async () => {
      const response = await request(app)
        .get('/api/payments/balance?serviceType=disbursement')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/payments/balance should validate service type', async () => {
      const response = await request(app)
        .get('/api/payments/balance?serviceType=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Service type must be collection or disbursement');
    });
  });

  describe('Service Statistics', () => {
    test('GET /api/payments/stats should return service statistics', async () => {
      const response = await request(app)
        .get('/api/payments/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTransactions');
      expect(response.body.data).toHaveProperty('successfulTransactions');
      expect(response.body.data).toHaveProperty('failedTransactions');
    });
  });

  describe('Error Handling', () => {
    test('Should handle validation errors gracefully', async () => {
      const response = await request(app)
        .post('/api/payments/request-to-pay')
        .send({}) // Empty request
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('Should handle server errors gracefully', async () => {
      // This would test error handling in the service layer
      // For now, we'll test the error response format
      const response = await request(app)
        .get('/api/payments/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});
