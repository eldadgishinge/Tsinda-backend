const mongoose = require('mongoose');

/**
 * MTN User Model
 * Represents an MTN MoMo API user in the system
 */
const mtnUserSchema = new mongoose.Schema({
  // MTN MoMo API user details
  xReferenceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  apiKey: {
    type: String,
    required: true
  },
  providerCallbackHost: {
    type: String,
    required: true
  },
  
  // Service-specific tokens
  collectionToken: {
    type: String
  },
  disbursementToken: {
    type: String
  },
  
  // Token expiration
  collectionTokenExpiresAt: {
    type: Date
  },
  disbursementTokenExpiresAt: {
    type: Date
  },
  
  // Service subscription keys
  subscriptionKeys: {
    collectionWidget: String,
    collections: String,
    disbursements: String,
    remittances: String
  },
  
  // User status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Usage statistics
  usageStats: {
    totalTransactions: {
      type: Number,
      default: 0
    },
    successfulTransactions: {
      type: Number,
      default: 0
    },
    failedTransactions: {
      type: Number,
      default: 0
    },
    lastUsedAt: {
      type: Date
    }
  },
  
  // Configuration
  config: {
    defaultCurrency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'XAF', 'XOF']
    },
    retryAttempts: {
      type: Number,
      default: 3
    },
    timeout: {
      type: Number,
      default: 10000
    }
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
mtnUserSchema.index({ xReferenceId: 1 });
mtnUserSchema.index({ isActive: 1 });
mtnUserSchema.index({ createdAt: -1 });

// Virtual for token status
mtnUserSchema.virtual('collectionTokenValid').get(function() {
  return this.collectionToken && 
         this.collectionTokenExpiresAt && 
         this.collectionTokenExpiresAt > new Date();
});

mtnUserSchema.virtual('disbursementTokenValid').get(function() {
  return this.disbursementToken && 
         this.disbursementTokenExpiresAt && 
         this.disbursementTokenExpiresAt > new Date();
});

// Methods
mtnUserSchema.methods.updateCollectionToken = function(token, expiresIn = 3600) {
  this.collectionToken = token;
  this.collectionTokenExpiresAt = new Date(Date.now() + (expiresIn * 1000));
  return this.save();
};

mtnUserSchema.methods.updateDisbursementToken = function(token, expiresIn = 3600) {
  this.disbursementToken = token;
  this.disbursementTokenExpiresAt = new Date(Date.now() + (expiresIn * 1000));
  return this.save();
};

mtnUserSchema.methods.incrementUsage = function(success = true) {
  this.usageStats.totalTransactions += 1;
  if (success) {
    this.usageStats.successfulTransactions += 1;
  } else {
    this.usageStats.failedTransactions += 1;
  }
  this.usageStats.lastUsedAt = new Date();
  return this.save();
};

mtnUserSchema.methods.toUserDTO = function() {
  return {
    id: this._id,
    xReferenceId: this.xReferenceId,
    isActive: this.isActive,
    hasCollectionToken: !!this.collectionToken,
    hasDisbursementToken: !!this.disbursementToken,
    collectionTokenValid: this.collectionTokenValid,
    disbursementTokenValid: this.disbursementTokenValid,
    usageStats: this.usageStats,
    config: this.config,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('MTNUser', mtnUserSchema);
