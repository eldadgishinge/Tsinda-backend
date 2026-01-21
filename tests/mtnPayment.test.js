require('dotenv').config();
const MTNPaymentService = require('../services/MTNPaymentService');

describe('MTN Payment Service Tests', () => {
  let paymentService;
  let paymentReferenceId;
  const testUserId = process.env.TEST_USER_ID || '3456';
  const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '250785300458';
  const testAmount = 100;

  beforeAll(() => {
    paymentService = new MTNPaymentService();
  });

  test('requestPayment should create payment with userId, phoneNumber and amount', async () => {
    console.log('=== Request Payment Test ===');
    console.log('UserId:', testUserId);
    console.log('PhoneNumber:', testPhoneNumber);
    console.log('Amount:', testAmount);
    console.log('===========================');

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
    expect(result.userId).toBe(testUserId);
    expect(result.phoneNumber).toBe(testPhoneNumber);
    expect(result.amount).toBe(testAmount);
    expect(result.status).toBe(202);

    paymentReferenceId = result.referenceId;
  }, 30000);

  test('getPaymentStatus should return payment status after delay', async () => {
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
  }, 120000);

  test('getAccountBalance should return account balance', async () => {
    console.log('=== Get Account Balance Test ===');
    console.log('=================================');

    const balance = await paymentService.getAccountBalance();

    const balanceObject = {
      balance: balance
    };

    console.log('=== Account Balance Result ===');
    console.log(JSON.stringify(balanceObject, null, 2));
    console.log('==============================');

    expect(balance).toBeDefined();
  }, 30000);
});
