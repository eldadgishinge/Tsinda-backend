/**
 * Payment Service Configuration
 * Centralized configuration management using environment variables
 */

const config = {
  // MTN MoMo API Configuration
  mtn: {
    baseURL: process.env.MTN_BASE_URL || 'https://proxy.momoapi.mtn.co.rw',
    xReferenceId: process.env.MTN_X_REFERENCE_ID,
    providerCallbackHost: process.env.MTN_PROVIDER_CALLBACK_HOST || 'https://webhook.site/your-unique-id',
    subscriptionKeys: {
      collectionWidget: process.env.MTN_COLLECTION_WIDGET_KEY || '18ecd8220a7d4987986376d398993e91',
      collections: process.env.MTN_COLLECTIONS_KEY || 'a79e8f7a265e740368c761377537fd095',
      disbursements: process.env.MTN_DISBURSEMENTS_KEY || '1ab10f676c994372b198ed461d9687b6',
      remittances: process.env.MTN_REMITTANCES_KEY || 'a01aed515cc143a5a38d3f704ad9de0c'
    },
    retry: {
      maxRetries: parseInt(process.env.MTN_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.MTN_RETRY_DELAY) || 1000,
      timeout: parseInt(process.env.MTN_API_TIMEOUT) || 10000
    }
  },

  // Airtel Money API Configuration
  airtel: {
    baseURL: process.env.AIRTEL_BASE_URL || 'https://openapiuat.airtel.africa',
    clientId: process.env.AIRTEL_CLIENT_ID,
    clientSecret: process.env.AIRTEL_CLIENT_SECRET,
    msisdn: process.env.AIRTEL_MSISDN,
    retry: {
      maxRetries: parseInt(process.env.AIRTEL_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.AIRTEL_RETRY_DELAY) || 1000,
      timeout: parseInt(process.env.AIRTEL_API_TIMEOUT) || 10000
    }
  },

  // Payment Service Configuration
  payment: {
    maxAmount: parseInt(process.env.PAYMENT_MAX_AMOUNT) || 1000000,
    defaultCurrency: process.env.PAYMENT_DEFAULT_CURRENCY || 'EUR',
    supportedCurrencies: (process.env.PAYMENT_SUPPORTED_CURRENCIES || 'EUR,USD,XAF,XOF').split(','),
    maxMessageLength: 160,
    supportedPartyIdTypes: ['MSISDN', 'EMAIL', 'PARTY_CODE'],
    supportedTransactionTypes: ['collection', 'disbursement', 'refund'],
    supportedStatuses: ['PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED']
  },

  // Database Configuration
  database: {
    paymentCollection: 'payments',
    mtnUserCollection: 'mtnusers',
    airtelUserCollection: 'airtelusers'
  },

  // API Configuration
  api: {
    version: '1.0.0',
    serviceName: 'Payment Service',
    healthCheckPath: '/api/payments/health',
    statsPath: '/api/payments/stats'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
    enableResponseLogging: process.env.ENABLE_RESPONSE_LOGGING === 'true'
  },

  // Security Configuration
  security: {
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100, // requests per window
    enableCORS: process.env.ENABLE_CORS === 'true',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000']
  },

  // Monitoring Configuration
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPath: process.env.METRICS_PATH || '/api/payments/metrics',
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS === 'true'
  }
};

/**
 * Validate configuration
 */
function validateConfig() {
  const errors = [];

  // Validate required environment variables
  if (!process.env.MONGODB_URI) {
    errors.push('MONGODB_URI is required');
  }

  // Validate MTN configuration
  if (!config.mtn.subscriptionKeys.collections) {
    errors.push('MTN_COLLECTIONS_KEY is required');
  }

  if (!config.mtn.subscriptionKeys.disbursements) {
    errors.push('MTN_DISBURSEMENTS_KEY is required');
  }

  // Validate Airtel configuration
  if (!config.airtel.clientId) {
    errors.push('AIRTEL_CLIENT_ID is required');
  }

  if (!config.airtel.clientSecret) {
    errors.push('AIRTEL_CLIENT_SECRET is required');
  }

  // Validate payment configuration
  if (config.payment.maxAmount <= 0) {
    errors.push('PAYMENT_MAX_AMOUNT must be greater than 0');
  }

  if (!config.payment.supportedCurrencies.includes(config.payment.defaultCurrency)) {
    errors.push('PAYMENT_DEFAULT_CURRENCY must be in PAYMENT_SUPPORTED_CURRENCIES');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Get configuration for a specific service
 */
function getServiceConfig(serviceName) {
  switch (serviceName) {
    case 'mtn':
      return config.mtn;
    case 'airtel':
      return config.airtel;
    case 'payment':
      return config.payment;
    case 'database':
      return config.database;
    case 'api':
      return config.api;
    case 'logging':
      return config.logging;
    case 'security':
      return config.security;
    case 'monitoring':
      return config.monitoring;
    default:
      return config;
  }
}

/**
 * Get environment-specific configuration
 */
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  return {
    environment: env,
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    isTest: env === 'test',
    debug: process.env.DEBUG === 'true' || env === 'development'
  };
}

module.exports = {
  config,
  validateConfig,
  getServiceConfig,
  getEnvironmentConfig
};
