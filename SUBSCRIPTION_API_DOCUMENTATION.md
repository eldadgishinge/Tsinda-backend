# Subscription Payment API Documentation

## Overview

This API allows you to create subscription payments for users using either MTN Mobile Money or Airtel Money. The API accepts user information, payment amount, subscription duration, and payment channel, then processes the payment through the selected provider's payment system.

**Base URL:** `https://www.tsinda.com/api/subscriptions`

---

## Create Subscription Payment

Create a new subscription payment for a user.

### Endpoint

```
POST /api/subscriptions/payment
```

### Authentication

This endpoint requires authentication. Include your JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string (UUID) | Yes | The unique identifier of the user (must be a valid UUID format) |
| `amount` | number | Yes | The amount to pay (must be a positive number) |
| `numberOfMonths` | number | Yes | Number of months for the subscription (minimum: 1) |
| `msisdn` | string | Yes | MSISDN without country code (e.g., "731000929"). This will be used for payment, not the one from .env |
| `paymentChannel` | string | Yes | Payment channel: "MTN" or "AIRTEL" (case-insensitive) |
| `country` | string | No | Country code (default: "RW") |
| `currency` | string | No | Currency code (default: "RWF") |

### Request Example

```bash
# Using Airtel payment
curl -X POST https://www.tsinda.com/api/subscriptions/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 3500,
    "numberOfMonths": 3,
    "msisdn": "731000929",
    "paymentChannel": "AIRTEL",
    "country": "RW",
    "currency": "RWF"
  }'

# Using MTN payment
curl -X POST https://www.tsinda.com/api/subscriptions/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 3500,
    "numberOfMonths": 3,
    "msisdn": "731000929",
    "paymentChannel": "MTN",
    "country": "RW",
    "currency": "RWF"
  }'
```

### Response

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Subscription payment initiated successfully",
  "data": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 3500,
    "currency": "RWF",
    "numberOfMonths": 3,
    "paymentChannel": "AIRTEL",
    "msisdn": "731000929",
    "transactionId": "SUB-abc123-def456-ghi789",
    "airtelMoneyId": null,
    "mtnReferenceId": null,
    "status": "PENDING",
    "airtelStatus": null,
    "mtnStatus": null,
    "startDate": null,
    "endDate": null,
    "createdAt": "2025-01-17T10:30:00.000Z",
    "updatedAt": "2025-01-17T10:30:00.000Z"
  }
}
```

#### Error Response (400 Bad Request)

**Missing Required Fields:**
```json
{
  "success": false,
  "message": "Missing required fields",
  "error": "Missing required fields: userId, amount, numberOfMonths, msisdn, paymentChannel"
}
```

**Invalid Payment Channel:**
```json
{
  "success": false,
  "message": "Invalid payment channel",
  "error": "Invalid payment channel. Must be \"MTN\" or \"AIRTEL\""
}
```

**Invalid userId Format:**
```json
{
  "success": false,
  "message": "Failed to create subscription payment",
  "error": "Subscription payment failed: Invalid userId format. Must be a valid UUID"
}
```

**Invalid Amount:**
```json
{
  "success": false,
  "message": "Failed to create subscription payment",
  "error": "Subscription payment failed: Amount must be a positive number"
}
```

**Invalid Number of Months:**
```json
{
  "success": false,
  "message": "Failed to create subscription payment",
  "error": "Subscription payment failed: Number of months must be at least 1"
}
```

**Airtel Payment Error:**
```json
{
  "success": false,
  "message": "Failed to create subscription payment",
  "error": "Subscription payment failed: Not enough balance - User wallet does not have enough money to cover the payable amount."
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Subscription record ID |
| `userId` | string (UUID) | User identifier |
| `amount` | number | Payment amount |
| `currency` | string | Currency code |
| `numberOfMonths` | number | Subscription duration in months |
| `paymentChannel` | string | Payment channel used: "MTN" or "AIRTEL" |
| `msisdn` | string | Phone number used for payment |
| `transactionId` | string | Unique transaction ID (format: SUB-{uuid}) |
| `airtelMoneyId` | string | Airtel Money transaction ID (available after Airtel payment) |
| `mtnReferenceId` | string | MTN transaction reference ID (available after MTN payment) |
| `status` | string | Payment status: PENDING, SUCCESSFUL, FAILED, CANCELLED |
| `airtelStatus` | string | Airtel transaction status: TS, TF, TA, TIP, TE (only for Airtel payments) |
| `mtnStatus` | string | MTN transaction status: PENDING, SUCCESSFUL, FAILED, CANCELLED (only for MTN payments) |
| `startDate` | date | Subscription start date (set when payment is successful) |
| `endDate` | date | Subscription end date (calculated automatically) |
| `createdAt` | date | Record creation timestamp |
| `updatedAt` | date | Record last update timestamp |

### Status Values

**Payment Status:**
- `PENDING` - Payment initiated, waiting for user confirmation
- `SUCCESSFUL` - Payment completed successfully
- `FAILED` - Payment failed
- `CANCELLED` - Payment was cancelled

**Airtel Status:**
- `TS` - Transaction Success
- `TF` - Transaction Failed
- `TA` - Transaction Ambiguous
- `TIP` - Transaction In Progress
- `TE` - Transaction Expired

---

## Get Subscription by ID

Retrieve a specific subscription by its ID.

### Endpoint

```
GET /api/subscriptions/:id
```

### Authentication

Required

### Request Example

```bash
curl -X GET https://www.tsinda.com/api/subscriptions/65a1b2c3d4e5f6g7h8i9j0k1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Subscription retrieved successfully",
  "data": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 3500,
    "currency": "RWF",
    "numberOfMonths": 3,
    "msisdn": "731000929",
    "transactionId": "SUB-abc123-def456-ghi789",
    "airtelMoneyId": "MP210603.1234.L06941",
    "status": "SUCCESSFUL",
    "airtelStatus": "TS",
    "startDate": "2025-01-17T10:30:00.000Z",
    "endDate": "2025-04-17T10:30:00.000Z",
    "createdAt": "2025-01-17T10:30:00.000Z",
    "updatedAt": "2025-01-17T10:35:00.000Z"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "message": "Failed to get subscription",
  "error": "Subscription not found"
}
```

---

## Get Subscriptions by User ID

Retrieve all subscriptions for a specific user.

### Endpoint

```
GET /api/subscriptions/user/:userId
```

### Authentication

Required

### Request Example

```bash
curl -X GET https://www.tsinda.com/api/subscriptions/user/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Subscriptions retrieved successfully",
  "data": [
    {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "amount": 3500,
      "currency": "RWF",
      "numberOfMonths": 3,
      "msisdn": "731000929",
      "transactionId": "SUB-abc123-def456-ghi789",
      "status": "SUCCESSFUL",
      "startDate": "2025-01-17T10:30:00.000Z",
      "endDate": "2025-04-17T10:30:00.000Z",
      "createdAt": "2025-01-17T10:30:00.000Z",
      "updatedAt": "2025-01-17T10:35:00.000Z"
    }
  ]
}
```

---

## Get All Subscriptions

Retrieve all subscriptions with optional filters.

### Endpoint

```
GET /api/subscriptions
```

### Authentication

Required

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | No | Filter by user ID |
| `status` | string | No | Filter by status (PENDING, SUCCESSFUL, FAILED, CANCELLED) |
| `dateFrom` | string (ISO date) | No | Filter from date |
| `dateTo` | string (ISO date) | No | Filter to date |
| `limit` | number | No | Results per page (default: 50) |
| `skip` | number | No | Pagination offset (default: 0) |

### Request Example

```bash
# Get all subscriptions
curl -X GET "https://www.tsinda.com/api/subscriptions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get subscriptions with filters
curl -X GET "https://www.tsinda.com/api/subscriptions?status=SUCCESSFUL&limit=10&skip=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get subscriptions for a user
curl -X GET "https://www.tsinda.com/api/subscriptions?userId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Subscriptions retrieved successfully",
  "data": {
    "subscriptions": [
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "amount": 3500,
        "currency": "RWF",
        "numberOfMonths": 3,
        "msisdn": "731000929",
        "transactionId": "SUB-abc123-def456-ghi789",
        "status": "SUCCESSFUL",
        "startDate": "2025-01-17T10:30:00.000Z",
        "endDate": "2025-04-17T10:30:00.000Z",
        "createdAt": "2025-01-17T10:30:00.000Z",
        "updatedAt": "2025-01-17T10:35:00.000Z"
      }
    ],
    "total": 100,
    "limit": 50,
    "skip": 0
  }
}
```

---

## Payment Flow

1. **Client sends request** with userId, amount, numberOfMonths, msisdn, and paymentChannel
2. **API validates** all required fields and data types
3. **Subscription record created** in database with PENDING status
4. **Payment is initiated** based on paymentChannel:
   - **AIRTEL**: Airtel USSD Push payment is initiated using the provided msisdn
   - **MTN**: MTN Request to Pay is initiated using the provided msisdn
5. **User receives payment prompt** on their phone to authorize payment
6. **Payment status updated** based on payment provider response:
   - If successful: status = SUCCESSFUL, startDate and endDate are set
   - If failed: status = FAILED
   - If pending: status = PENDING (waiting for user action)
7. **Callback webhook** may update status later if payment completes asynchronously

---

## Important Notes

1. **Payment Channel**: You must specify either "MTN" or "AIRTEL" as the payment channel
2. **MSISDN Usage**: The `msisdn` provided in the API request is used for payment, NOT the one from `.env` file
3. **UUID Format**: The `userId` must be a valid UUID format (e.g., `550e8400-e29b-41d4-a716-446655440000`)
4. **Amount**: Must be a positive number
5. **Number of Months**: Must be at least 1
6. **Payment Status**: Initial status is PENDING. It will be updated when:
   - Payment is confirmed (SUCCESSFUL)
   - Payment fails (FAILED)
   - Callback webhook updates the status
7. **End Date Calculation**: Automatically calculated when payment is successful (startDate + numberOfMonths)
8. **Payment Provider**: The payment channel determines which payment provider API is used:
   - **AIRTEL**: Uses Airtel USSD Push payment API
   - **MTN**: Uses MTN Request to Pay API

---

## Error Codes

The API may return Airtel-specific error codes through the payment service:

- `DP00800001000` - Ambiguous (transaction still processing)
- `DP00800001001` - Success
- `DP00800001002` - Incorrect Pin
- `DP00800001003` - Exceeds withdrawal amount limit
- `DP00800001004` - Invalid Amount
- `DP00800001005` - Transaction ID is invalid
- `DP00800001006` - In process
- `DP00800001007` - Not enough balance
- `DP00800001008` - Refused
- `DP00800001010` - Transaction not permitted to Payee
- `DP00800001024` - Transaction Timed Out
- `DP00800001025` - Transaction Not Found
- `DP00800001026` - Forbidden (X-signature mismatch)
- `DP00800001029` - Transaction Expired

---

## Example Integration

### JavaScript/TypeScript

```javascript
async function createSubscription(userId, amount, months, msisdn, paymentChannel) {
  try {
    const response = await fetch('https://www.tsinda.com/api/subscriptions/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourJwtToken}`
      },
      body: JSON.stringify({
        userId: userId,
        amount: amount,
        numberOfMonths: months,
        msisdn: msisdn,
        paymentChannel: paymentChannel, // "MTN" or "AIRTEL"
        country: 'RW',
        currency: 'RWF'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Subscription created:', data.data);
      return data.data;
    } else {
      console.error('Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Subscription payment failed:', error);
    throw error;
  }
}

// Usage with Airtel
createSubscription(
  '550e8400-e29b-41d4-a716-446655440000',
  3500,
  3,
  '731000929',
  'AIRTEL'
);

// Usage with MTN
createSubscription(
  '550e8400-e29b-41d4-a716-446655440000',
  3500,
  3,
  '731000929',
  'MTN'
);
```

### cURL

```bash
# Airtel Payment
curl -X POST https://www.tsinda.com/api/subscriptions/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 3500,
    "numberOfMonths": 3,
    "msisdn": "731000929",
    "paymentChannel": "AIRTEL"
  }'

# MTN Payment
curl -X POST https://www.tsinda.com/api/subscriptions/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 3500,
    "numberOfMonths": 3,
    "msisdn": "731000929",
    "paymentChannel": "MTN"
  }'
```

---

## Support

For issues or questions, please contact the support team or check the error messages returned by the API.

