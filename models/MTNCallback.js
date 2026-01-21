const mongoose = require('mongoose');

/**
 * MTN Callback Model
 * Stores callback/webhook data received from MTN MoMo API
 */
const mtnCallbackSchema = new mongoose.Schema({
  // Transaction information from callback
  financialTransactionId: {
    type: String,
    index: true
  },
  externalId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['SUCCESSFUL', 'FAILED', 'PENDING'],
    index: true
  },
  
  // Payee information
  payee: {
    partyIdType: {
      type: String,
      enum: ['MSISDN', 'EMAIL', 'PARTY_CODE']
    },
    partyId: {
      type: String
    }
  },
  
  // Payment notes
  payeeNote: {
    type: String
  },
  payerMessage: {
    type: String
  },
  
  // Full callback payload
  callbackData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Processing status
  processed: {
    type: Boolean,
    default: false
  },
  processedAt: {
    type: Date
  },
  
  // Error tracking
  processingError: {
    type: String
  },
  
  // Request metadata
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better performance
mtnCallbackSchema.index({ externalId: 1 });
mtnCallbackSchema.index({ financialTransactionId: 1 });
mtnCallbackSchema.index({ status: 1 });
mtnCallbackSchema.index({ processed: 1 });
mtnCallbackSchema.index({ createdAt: -1 });

// Methods
mtnCallbackSchema.methods.markAsProcessed = function() {
  this.processed = true;
  this.processedAt = new Date();
  return this.save();
};

mtnCallbackSchema.methods.toCallbackDTO = function() {
  return {
    id: this._id,
    financialTransactionId: this.financialTransactionId,
    externalId: this.externalId,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    payee: this.payee,
    payeeNote: this.payeeNote,
    payerMessage: this.payerMessage,
    processed: this.processed,
    processedAt: this.processedAt,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('MTNCallback', mtnCallbackSchema);
