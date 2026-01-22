require('dotenv').config();
const MTNPaymentService = require('../services/MTNPaymentService');
const MTNCollectionService = require('../services/MTNCollectionService');

describe('MTN Collection API Tests', () => {
  let paymentService;
  let collectionService;
  let paymentReferenceId;
  const testUserId = process.env.TEST_USER_ID || '3456';
  const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '250790885588';
  const testAmount = 100;

  beforeAll(async () => {
    paymentService = new MTNPaymentService();
    collectionService = new MTNCollectionService();
  });

  test('GET /collection/v1_0/account/balance should return account balance', async () => {
    console.log('=== Get Account Balance Test ===');
    
    try {
      const balance = await collectionService.getAccountBalance();
      
      console.log('=== Account Balance Result ===');
      console.log(JSON.stringify(balance, null, 2));
      console.log('==============================');

      expect(balance).toHaveProperty('availableBalance');
      expect(balance).toHaveProperty('currency');
      expect(typeof balance.availableBalance).toBe('string');
      expect(typeof balance.currency).toBe('string');
    } catch (error) {
      console.error('Failed to get balance:', error.message);
      throw error;
    }
  }, 30000);

  test('POST /collection/v1_0/requesttopay should request payment', async () => {
    console.log('=== Request Payment Test ===');
    console.log('UserId:', testUserId);
    console.log('PhoneNumber:', testPhoneNumber);
    console.log('Amount:', testAmount);
    console.log('===========================');

    try {
      const result = await paymentService.requestPayment(testUserId, testPhoneNumber, testAmount);

      console.log('=== Payment Request Result ===');
      console.log(JSON.stringify(result, null, 2));
      console.log('=============================');

      expect(result).toHaveProperty('referenceId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('phoneNumber');
      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('currency');
      expect(result).toHaveProperty('paymentId');
      expect(result.userId).toBe(testUserId);
      expect(result.phoneNumber).toBe(testPhoneNumber);
      expect(result.amount).toBe(testAmount);
      expect(result.status).toBe(202);

      paymentReferenceId = result.referenceId;
      console.log('✅ Payment request accepted with reference:', paymentReferenceId);
    } catch (error) {
      console.error('❌ Failed to request payment:', error.message);
      throw error;
    }
  }, 30000);


  

  test('GET /collection/v1_0/requesttopay/{referenceId} should return payment status', async () => {
    if (!paymentReferenceId) {
      console.warn('Payment reference ID not available, skipping status test');
      return;
    }

    console.log('Waiting 1 minute before checking payment status...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    console.log('1 minute delay completed, checking status now...');

    console.log('=== Get Payment Status Test ===');
    console.log('Reference ID:', paymentReferenceId);
    console.log('================================');

    try {
      const status = await paymentService.getPaymentStatus(paymentReferenceId);

      const statusObject = {
        referenceId: paymentReferenceId,
        status: status
      };

      console.log('=== Payment Status Result ===');
      console.log(JSON.stringify(statusObject, null, 2));
      console.log('=============================');

      expect(status).toHaveProperty('status');
      if (status.amount) expect(typeof status.amount).toBe('string');
      if (status.currency) expect(typeof status.currency).toBe('string');
      if (status.financialTransactionId) expect(typeof status.financialTransactionId).toBe('string');
      if (status.externalId) expect(status.externalId).toBe(testUserId);
      if (status.payer) {
        expect(status.payer).toHaveProperty('partyIdType');
        expect(status.payer).toHaveProperty('partyId');
        expect(status.payer.partyId).toBe(testPhoneNumber);
      }
    } catch (error) {
      console.error('❌ Failed to get payment status:', error.message);
      throw error;
    }
  }, 120000);
});
