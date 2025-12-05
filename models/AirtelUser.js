const mongoose = require('mongoose');

/**
 * Airtel User Model
 * Represents an Airtel Money API user in the system
 */
const airtelUserSchema = new mongoose.Schema({
  // Airtel API user details
  clientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // OAuth2 access token
  accessToken: {
    type: String,
    required: true
  },
  
  // Token expiration
  tokenExpiresAt: {
    type: Date,
    required: true
  },
  
  // Token type (usually 'Bearer')
  tokenType: {
    type: String,
    default: 'Bearer'
  },
  
  // Token scope
  scope: {
    type: String
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
      enum: ['EUR', 'USD', 'XAF', 'XOF', 'UGX', 'KES', 'TZS', 'RWF']
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
airtelUserSchema.index({ clientId: 1 });
airtelUserSchema.index({ isActive: 1 });
airtelUserSchema.index({ createdAt: -1 });

// Virtual for token status
airtelUserSchema.virtual('tokenValid').get(function() {
  return this.accessToken && 
         this.tokenExpiresAt && 
         this.tokenExpiresAt > new Date();
});

// Methods
airtelUserSchema.methods.updateToken = function(token, expiresIn = 3600, tokenType = 'Bearer', scope = null) {
  this.accessToken = token;
  this.tokenExpiresAt = new Date(Date.now() + (expiresIn * 1000));
  this.tokenType = tokenType;
  if (scope) {
    this.scope = scope;
  }
  return this.save();
};

airtelUserSchema.methods.incrementUsage = function(success = true) {
  this.usageStats.totalTransactions += 1;
  if (success) {
    this.usageStats.successfulTransactions += 1;
  } else {
    this.usageStats.failedTransactions += 1;
  }
  this.usageStats.lastUsedAt = new Date();
  return this.save();
};

airtelUserSchema.methods.toUserDTO = function() {
  return {
    id: this._id,
    clientId: this.clientId,
    isActive: this.isActive,
    hasAccessToken: !!this.accessToken,
    tokenValid: this.tokenValid,
    tokenType: this.tokenType,
    tokenExpiresAt: this.tokenExpiresAt,
    usageStats: this.usageStats,
    config: this.config,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('AirtelUser', airtelUserSchema);

