const mongoose = require('mongoose');

/**
 * Airtel Callback Model
 * Stores callback/webhook data received from Airtel
 */
const airtelCallbackSchema = new mongoose.Schema({
  // Transaction information from callback
  transactionId: {
    type: String,
    required: true,
    index: true
  },
  airtelMoneyId: {
    type: String,
    required: true,
    index: true
  },
  statusCode: {
    type: String,
    required: true,
    enum: ['TS', 'TF', 'TA', 'TIP', 'TE'], // Transaction Success, Failed, Ambiguous, In Progress, Expired
    index: true
  },
  message: {
    type: String,
    required: true
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
airtelCallbackSchema.index({ transactionId: 1 });
airtelCallbackSchema.index({ airtelMoneyId: 1 });
airtelCallbackSchema.index({ statusCode: 1 });
airtelCallbackSchema.index({ processed: 1 });
airtelCallbackSchema.index({ createdAt: -1 });

// Virtual for status description
airtelCallbackSchema.virtual('statusDescription').get(function() {
  const statusMap = {
    'TS': 'Transaction Success',
    'TF': 'Transaction Failed',
    'TA': 'Transaction Ambiguous',
    'TIP': 'Transaction In Progress',
    'TE': 'Transaction Expired'
  };
  return statusMap[this.statusCode] || 'Unknown';
});

// Methods
airtelCallbackSchema.methods.markAsProcessed = function() {
  this.processed = true;
  this.processedAt = new Date();
  return this.save();
};

airtelCallbackSchema.methods.markAsFailed = function(error) {
  this.processed = false;
  this.processingError = error;
  return this.save();
};

airtelCallbackSchema.methods.toCallbackDTO = function() {
  return {
    id: this._id,
    transactionId: this.transactionId,
    airtelMoneyId: this.airtelMoneyId,
    statusCode: this.statusCode,
    statusDescription: this.statusDescription,
    message: this.message,
    processed: this.processed,
    processedAt: this.processedAt,
    processingError: this.processingError,
    callbackData: this.callbackData,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('AirtelCallback', airtelCallbackSchema);

