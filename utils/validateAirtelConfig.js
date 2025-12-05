/**
 * Airtel Configuration Validator
 * Helps validate that Airtel environment variables are correctly configured
 */

/**
 * Validate Airtel configuration
 * @returns {object} Validation result with status and issues
 */
function validateAirtelConfig() {
  const issues = [];
  const config = {};

  // Required properties
  const requiredProps = {
    'AIRTEL_BASE_URL': {
      name: 'AIRTEL_BASE_URL',
      value: process.env.AIRTEL_BASE_URL,
      required: false, // Has default value in config
      validator: (val) => {
        if (val) {
          if (!val.startsWith('http://') && !val.startsWith('https://')) {
            return 'must start with http:// or https://';
          }
          if (!val.includes('airtel.africa')) {
            return 'should contain airtel.africa domain';
          }
        }
        return null;
      }
    },
    'AIRTEL_CLIENT_ID': {
      name: 'AIRTEL_CLIENT_ID',
      value: process.env.AIRTEL_CLIENT_ID,
      required: true,
      validator: (val) => {
        if (!val) return 'is missing';
        if (val.trim().length === 0) return 'is empty';
        if (val.includes('your_') || val.includes('example')) {
          return 'contains placeholder value';
        }
        return null;
      }
    },
    'AIRTEL_CLIENT_SECRET': {
      name: 'AIRTEL_CLIENT_SECRET',
      value: process.env.AIRTEL_CLIENT_SECRET,
      required: true,
      validator: (val) => {
        if (!val) return 'is missing';
        if (val.trim().length === 0) return 'is empty';
        if (val.includes('your_') || val.includes('example')) {
          return 'contains placeholder value';
        }
        return null;
      }
    },
    'AIRTEL_MSISDN': {
      name: 'AIRTEL_MSISDN',
      value: process.env.AIRTEL_MSISDN,
      required: false,
      validator: (val) => {
        if (val && val.includes('your_')) {
          return 'contains placeholder value';
        }
        return null;
      }
    },
    'AIRTEL_API_TIMEOUT': {
      name: 'AIRTEL_API_TIMEOUT',
      value: process.env.AIRTEL_API_TIMEOUT,
      required: false,
      validator: (val) => {
        if (val && isNaN(parseInt(val))) {
          return 'must be a number';
        }
        return null;
      }
    },
    'AIRTEL_MAX_RETRIES': {
      name: 'AIRTEL_MAX_RETRIES',
      value: process.env.AIRTEL_MAX_RETRIES,
      required: false,
      validator: (val) => {
        if (val && isNaN(parseInt(val))) {
          return 'must be a number';
        }
        return null;
      }
    },
    'AIRTEL_RETRY_DELAY': {
      name: 'AIRTEL_RETRY_DELAY',
      value: process.env.AIRTEL_RETRY_DELAY,
      required: false,
      validator: (val) => {
        if (val && isNaN(parseInt(val))) {
          return 'must be a number';
        }
        return null;
      }
    }
  };

  // Validate each property
  for (const [key, prop] of Object.entries(requiredProps)) {
    const value = prop.value;
    config[key] = value ? (key.includes('SECRET') ? '***' : value) : null;

    // Check if required property is missing
    if (prop.required && !value) {
      issues.push(`${prop.name} is required but not set`);
      continue;
    }

    // Run validator if value exists
    if (value && prop.validator) {
      const error = prop.validator(value);
      if (error) {
        issues.push(`${prop.name} ${error}`);
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues: issues.length > 0 ? issues : null,
    config: config,
    summary: {
      totalProperties: Object.keys(requiredProps).length,
      configuredProperties: Object.values(requiredProps).filter(p => p.value).length,
      requiredProperties: Object.values(requiredProps).filter(p => p.required).length,
      configuredRequiredProperties: Object.values(requiredProps).filter(p => p.required && p.value).length
    }
  };
}

/**
 * Get expected .env format for Airtel
 */
function getExpectedEnvFormat() {
  return `
# Airtel Money API Configuration
AIRTEL_BASE_URL=https://openapiuat.airtel.africa
AIRTEL_CLIENT_ID=your_actual_client_id_here
AIRTEL_CLIENT_SECRET=your_actual_client_secret_here

# Airtel Money API Settings
AIRTEL_API_TIMEOUT=10000
AIRTEL_MAX_RETRIES=3
AIRTEL_RETRY_DELAY=1000
AIRTEL_MSISDN=your_msisdn_without_country_code
`.trim();
}

module.exports = {
  validateAirtelConfig,
  getExpectedEnvFormat
};

