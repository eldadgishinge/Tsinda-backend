const mongoose = require('mongoose');

/**
 * Subscription Model
 * Represents a user subscription payment in the system
 */
const subscriptionSchema = new mongoose.Schema({
  // User information
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'RWF',
    enum: ['RWF', 'UGX', 'KES', 'TZS', 'EUR', 'USD', 'XAF', 'XOF']
  },
  numberOfMonths: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Payment channel
  paymentChannel: {
    type: String,
    required: true,
    enum: ['MTN', 'AIRTEL'],
    index: true
  },
  
  // Payment details
  msisdn: {
    type: String,
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  airtelMoneyId: {
    type: String,
    index: true
  },
  mtnReferenceId: {
    type: String,
    index: true
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  airtelStatus: {
    type: String,
    enum: ['TS', 'TF', 'TA', 'TIP', 'TE']
  },
  mtnStatus: {
    type: String,
    enum: ['PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED']
  },
  
  // Subscription period
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  
  // Payment API response
  airtelResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  airtelError: {
    type: mongoose.Schema.Types.Mixed
  },
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
  }
}, {
  timestamps: true
});

// Indexes for better performance
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ transactionId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ createdAt: -1 });

// Virtual for subscription duration
subscriptionSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24 * 30)); // months
  }
  return this.numberOfMonths;
});

// Methods
subscriptionSchema.methods.updateStatus = function(newStatus, airtelResponse = null) {
  this.status = newStatus;
  if (airtelResponse) {
    this.airtelResponse = airtelResponse;
  }
  
  if (newStatus === 'SUCCESSFUL' || newStatus === 'FAILED') {
    this.completedAt = new Date();
  }
  
  return this.save();
};

subscriptionSchema.methods.calculateEndDate = function() {
  if (this.status === 'SUCCESSFUL' && this.startDate) {
    const endDate = new Date(this.startDate);
    endDate.setMonth(endDate.getMonth() + this.numberOfMonths);
    this.endDate = endDate;
    return this.save();
  }
  return Promise.resolve(this);
};

subscriptionSchema.methods.toSubscriptionDTO = function() {
  return {
    id: this._id,
    userId: this.userId,
    amount: this.amount,
    currency: this.currency,
    numberOfMonths: this.numberOfMonths,
    paymentChannel: this.paymentChannel,
    msisdn: this.msisdn,
    transactionId: this.transactionId,
    airtelMoneyId: this.airtelMoneyId,
    mtnReferenceId: this.mtnReferenceId,
    status: this.status,
    airtelStatus: this.airtelStatus,
    mtnStatus: this.mtnStatus,
    startDate: this.startDate,
    endDate: this.endDate,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Subscription', subscriptionSchema);

