/**
 * Payment Data Transfer Objects (DTOs)
 * Used for API request/response validation and transformation
 */

// Get configuration from environment variables
const MAX_AMOUNT = parseInt(process.env.PAYMENT_MAX_AMOUNT) || 1000000;
const DEFAULT_CURRENCY = process.env.PAYMENT_DEFAULT_CURRENCY || 'EUR';
const SUPPORTED_CURRENCIES = (process.env.PAYMENT_SUPPORTED_CURRENCIES || 'EUR,USD,XAF,XOF').split(',');

/**
 * Request to Pay DTO
 */
class RequestToPayDTO {
  constructor(data) {
    this.amount = data.amount;
    this.currency = data.currency || DEFAULT_CURRENCY;
    this.externalId = data.externalId;
    this.payer = {
      partyIdType: data.payer?.partyIdType || 'MSISDN',
      partyId: data.payer?.partyId
    };
    this.payerMessage = data.payerMessage;
    this.payeeNote = data.payeeNote;
  }

  validate() {
    const errors = [];
    
    if (!this.amount || this.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (this.amount > MAX_AMOUNT) {
      errors.push(`Amount must not exceed ${MAX_AMOUNT}`);
    }
    
    if (!SUPPORTED_CURRENCIES.includes(this.currency)) {
      errors.push(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`);
    }
    
    if (!this.externalId) {
      errors.push('External ID is required');
    }
    
    if (!this.payer?.partyId) {
      errors.push('Payer party ID is required');
    }
    
    if (!['MSISDN', 'EMAIL', 'PARTY_CODE'].includes(this.payer.partyIdType)) {
      errors.push('Invalid payer party ID type');
    }
    
    if (this.payerMessage && this.payerMessage.length > 160) {
      errors.push('Payer message must be 160 characters or less');
    }
    
    if (this.payeeNote && this.payeeNote.length > 160) {
      errors.push('Payee note must be 160 characters or less');
    }
    
    return errors;
  }
}

/**
 * Transfer DTO
 */
class TransferDTO {
  constructor(data) {
    this.amount = data.amount;
    this.currency = data.currency || DEFAULT_CURRENCY;
    this.externalId = data.externalId;
    this.payee = {
      partyIdType: data.payee?.partyIdType || 'MSISDN',
      partyId: data.payee?.partyId
    };
    this.payerMessage = data.payerMessage;
    this.payeeNote = data.payeeNote;
  }

  validate() {
    const errors = [];
    
    if (!this.amount || this.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (this.amount > MAX_AMOUNT) {
      errors.push(`Amount must not exceed ${MAX_AMOUNT}`);
    }
    
    if (!SUPPORTED_CURRENCIES.includes(this.currency)) {
      errors.push(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`);
    }
    
    if (!this.externalId) {
      errors.push('External ID is required');
    }
    
    if (!this.payee?.partyId) {
      errors.push('Payee party ID is required');
    }
    
    if (!['MSISDN', 'EMAIL', 'PARTY_CODE'].includes(this.payee.partyIdType)) {
      errors.push('Invalid payee party ID type');
    }
    
    if (this.payerMessage && this.payerMessage.length > 160) {
      errors.push('Payer message must be 160 characters or less');
    }
    
    if (this.payeeNote && this.payeeNote.length > 160) {
      errors.push('Payee note must be 160 characters or less');
    }
    
    return errors;
  }
}

/**
 * Refund DTO
 */
class RefundDTO {
  constructor(data) {
    this.amount = data.amount;
    this.currency = data.currency || DEFAULT_CURRENCY;
    this.externalId = data.externalId;
    this.payerMessage = data.payerMessage;
    this.payeeNote = data.payeeNote;
    this.referenceIdToRefund = data.referenceIdToRefund;
  }

  validate() {
    const errors = [];
    
    if (!this.amount || this.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (this.amount > MAX_AMOUNT) {
      errors.push(`Amount must not exceed ${MAX_AMOUNT}`);
    }
    
    if (!SUPPORTED_CURRENCIES.includes(this.currency)) {
      errors.push(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`);
    }
    
    if (!this.externalId) {
      errors.push('External ID is required');
    }
    
    if (!this.referenceIdToRefund) {
      errors.push('Reference ID to refund is required');
    }
    
    if (this.payerMessage && this.payerMessage.length > 160) {
      errors.push('Payer message must be 160 characters or less');
    }
    
    if (this.payeeNote && this.payeeNote.length > 160) {
      errors.push('Payee note must be 160 characters or less');
    }
    
    return errors;
  }
}

/**
 * Account Status Check DTO
 */
class AccountStatusDTO {
  constructor(data) {
    this.accountHolderIdType = data.accountHolderIdType || 'MSISDN';
    this.accountHolderId = data.accountHolderId;
  }

  validate() {
    const errors = [];
    
    if (!this.accountHolderId) {
      errors.push('Account holder ID is required');
    }
    
    if (!['MSISDN', 'EMAIL', 'PARTY_CODE'].includes(this.accountHolderIdType)) {
      errors.push('Invalid account holder ID type');
    }
    
    return errors;
  }
}

/**
 * Payment Response DTO
 */
class PaymentResponseDTO {
  constructor(payment) {
    this.id = payment._id;
    this.xReferenceId = payment.xReferenceId;
    this.transactionType = payment.transactionType;
    this.transactionSubType = payment.transactionSubType;
    this.amount = payment.amount;
    this.currency = payment.currency;
    this.externalId = payment.externalId;
    this.payer = payment.payer;
    this.payee = payment.payee;
    this.payerMessage = payment.payerMessage;
    this.payeeNote = payment.payeeNote;
    this.status = payment.status;
    this.mtnStatus = payment.mtnStatus;
    this.processedAt = payment.processedAt;
    this.completedAt = payment.completedAt;
    this.createdAt = payment.createdAt;
    this.updatedAt = payment.updatedAt;
  }

  static fromPayment(payment) {
    return new PaymentResponseDTO(payment);
  }
}

/**
 * MTN User Response DTO
 */
class MTNUserResponseDTO {
  constructor(mtnUser) {
    this.id = mtnUser._id;
    this.xReferenceId = mtnUser.xReferenceId;
    this.isActive = mtnUser.isActive;
    this.hasCollectionToken = !!mtnUser.collectionToken;
    this.hasDisbursementToken = !!mtnUser.disbursementToken;
    this.collectionTokenValid = mtnUser.collectionTokenValid;
    this.disbursementTokenValid = mtnUser.disbursementTokenValid;
    this.usageStats = mtnUser.usageStats;
    this.config = mtnUser.config;
    this.createdAt = mtnUser.createdAt;
    this.updatedAt = mtnUser.updatedAt;
  }

  static fromMTNUser(mtnUser) {
    return new MTNUserResponseDTO(mtnUser);
  }
}

/**
 * Error Response DTO
 */
class ErrorResponseDTO {
  constructor(error, message = 'An error occurred') {
    this.error = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || message,
      details: error.details || null
    };
    this.timestamp = new Date().toISOString();
  }

  static fromError(error, message) {
    return new ErrorResponseDTO(error, message);
  }
}

/**
 * Success Response DTO
 */
class SuccessResponseDTO {
  constructor(data, message = 'Operation successful') {
    this.success = true;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  static fromData(data, message) {
    return new SuccessResponseDTO(data, message);
  }
}

module.exports = {
  RequestToPayDTO,
  TransferDTO,
  RefundDTO,
  AccountStatusDTO,
  PaymentResponseDTO,
  MTNUserResponseDTO,
  ErrorResponseDTO,
  SuccessResponseDTO
};
