const mongoose = require('mongoose');

/**
 * Payment Model
 * Represents a payment transaction in the system
 */
const paymentSchema = new mongoose.Schema({
  // MTN MoMo specific fields
  xReferenceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  apiUserId: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  
  // Transaction details
  transactionType: {
    type: String,
    enum: ['collection', 'disbursement', 'refund'],
    required: true
  },
  transactionSubType: {
    type: String,
    enum: ['request_to_pay', 'transfer', 'refund', 'status_check', 'balance_check', 'account_status', 'basic_user_info'],
    required: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'EUR',
    enum: ['EUR', 'USD', 'XAF', 'XOF']
  },
  externalId: {
    type: String,
    required: true
  },
  
  // Party information
  payer: {
    partyIdType: {
      type: String,
      enum: ['MSISDN', 'EMAIL', 'PARTY_CODE'],
      required: true
    },
    partyId: {
      type: String,
      required: true
    }
  },
  payee: {
    partyIdType: {
      type: String,
      enum: ['MSISDN', 'EMAIL', 'PARTY_CODE']
    },
    partyId: {
      type: String
    }
  },
  
  // Messages
  payerMessage: {
    type: String,
    maxlength: 160
  },
  payeeNote: {
    type: String,
    maxlength: 160
  },
  
  // Reference IDs for refunds
  referenceIdToRefund: {
    type: String
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  mtnStatus: {
    type: String,
    enum: ['PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED']
  },
  
  // API response data
  mtnResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  mtnError: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Timestamps
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Service information
  serviceType: {
    type: String,
    enum: ['collection_widget', 'collections', 'disbursements', 'remittances'],
    required: true
  },
  subscriptionKey: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ xReferenceId: 1 });
paymentSchema.index({ externalId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionType: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `${this.amount} ${this.currency}`;
});

// Virtual for transaction summary
paymentSchema.virtual('transactionSummary').get(function() {
  return {
    id: this._id,
    xReferenceId: this.xReferenceId,
    type: this.transactionType,
    amount: this.formattedAmount,
    status: this.status,
    createdAt: this.createdAt
  };
});

// Methods
paymentSchema.methods.updateStatus = function(newStatus, mtnResponse = null) {
  this.status = newStatus;
  if (mtnResponse) {
    this.mtnResponse = mtnResponse;
  }
  
  if (newStatus === 'SUCCESSFUL' || newStatus === 'FAILED') {
    this.completedAt = new Date();
  }
  
  return this.save();
};

paymentSchema.methods.toPaymentDTO = function() {
  return {
    id: this._id,
    xReferenceId: this.xReferenceId,
    transactionType: this.transactionType,
    transactionSubType: this.transactionSubType,
    amount: this.amount,
    currency: this.currency,
    externalId: this.externalId,
    payer: this.payer,
    payee: this.payee,
    payerMessage: this.payerMessage,
    payeeNote: this.payeeNote,
    status: this.status,
    mtnStatus: this.mtnStatus,
    processedAt: this.processedAt,
    completedAt: this.completedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Payment', paymentSchema);
