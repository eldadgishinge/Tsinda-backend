const { RequestToPayDTO, TransferDTO, RefundDTO, ErrorResponseDTO } = require('../dto/PaymentDTO');

// Get configuration from environment variables
const MAX_AMOUNT = parseInt(process.env.PAYMENT_MAX_AMOUNT) || 1000000;

/**
 * Payment Validation Middleware
 * Professional validation for payment requests
 */

/**
 * Validate Request to Pay
 */
const validateRequestToPay = (req, res, next) => {
  try {
    const dto = new RequestToPayDTO(req.body);
    const validationErrors = dto.validate();
    
    if (validationErrors.length > 0) {
      const errorResponse = ErrorResponseDTO.fromError(
        { code: 'VALIDATION_ERROR', message: validationErrors.join(', ') },
        'Request validation failed'
      );
      return res.status(400).json(errorResponse);
    }
    
    // Additional business logic validation
    if (dto.amount > MAX_AMOUNT) {
      const errorResponse = ErrorResponseDTO.fromError(
        { code: 'AMOUNT_TOO_LARGE', message: `Amount exceeds maximum limit of ${MAX_AMOUNT}` },
        'Amount validation failed'
      );
      return res.status(400).json(errorResponse);
    }
    
    // Store validated data for controller
    req.validatedData = dto;
    next();
  } catch (error) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'VALIDATION_ERROR', message: error.message },
      'Request validation failed'
    );
    return res.status(400).json(errorResponse);
  }
};

/**
 * Validate Transfer
 */
const validateTransfer = (req, res, next) => {
  try {
    const dto = new TransferDTO(req.body);
    const validationErrors = dto.validate();
    
    if (validationErrors.length > 0) {
      const errorResponse = ErrorResponseDTO.fromError(
        { code: 'VALIDATION_ERROR', message: validationErrors.join(', ') },
        'Request validation failed'
      );
      return res.status(400).json(errorResponse);
    }
    
    // Additional business logic validation
    if (dto.amount > MAX_AMOUNT) {
      const errorResponse = ErrorResponseDTO.fromError(
        { code: 'AMOUNT_TOO_LARGE', message: `Amount exceeds maximum limit of ${MAX_AMOUNT}` },
        'Amount validation failed'
      );
      return res.status(400).json(errorResponse);
    }
    
    // Store validated data for controller
    req.validatedData = dto;
    next();
  } catch (error) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'VALIDATION_ERROR', message: error.message },
      'Request validation failed'
    );
    return res.status(400).json(errorResponse);
  }
};

/**
 * Validate Refund
 */
const validateRefund = (req, res, next) => {
  try {
    const dto = new RefundDTO(req.body);
    const validationErrors = dto.validate();
    
    if (validationErrors.length > 0) {
      const errorResponse = ErrorResponseDTO.fromError(
        { code: 'VALIDATION_ERROR', message: validationErrors.join(', ') },
        'Request validation failed'
      );
      return res.status(400).json(errorResponse);
    }
    
    // Additional business logic validation
    if (dto.amount > MAX_AMOUNT) {
      const errorResponse = ErrorResponseDTO.fromError(
        { code: 'AMOUNT_TOO_LARGE', message: `Amount exceeds maximum limit of ${MAX_AMOUNT}` },
        'Amount validation failed'
      );
      return res.status(400).json(errorResponse);
    }
    
    // Store validated data for controller
    req.validatedData = dto;
    next();
  } catch (error) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'VALIDATION_ERROR', message: error.message },
      'Request validation failed'
    );
    return res.status(400).json(errorResponse);
  }
};

/**
 * Validate Payment ID parameter
 */
const validatePaymentId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'MISSING_PARAMETER', message: 'Payment ID is required' },
      'Parameter validation failed'
    );
    return res.status(400).json(errorResponse);
  }
  
  // Validate MongoDB ObjectId format
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'INVALID_ID_FORMAT', message: 'Invalid payment ID format' },
      'Parameter validation failed'
    );
    return res.status(400).json(errorResponse);
  }
  
  next();
};

/**
 * Validate query parameters for filtering
 */
const validateQueryParams = (req, res, next) => {
  const { limit, skip, transactionType, status, dateFrom, dateTo } = req.query;
  
  // Validate limit
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'INVALID_LIMIT', message: 'Limit must be between 1 and 100' },
      'Query parameter validation failed'
    );
    return res.status(400).json(errorResponse);
  }
  
  // Validate skip
  if (skip && (isNaN(skip) || parseInt(skip) < 0)) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'INVALID_SKIP', message: 'Skip must be a non-negative number' },
      'Query parameter validation failed'
    );
    return res.status(400).json(errorResponse);
  }
  
  // Validate transaction type
  if (transactionType && !['collection', 'disbursement', 'refund'].includes(transactionType)) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'INVALID_TRANSACTION_TYPE', message: 'Invalid transaction type' },
      'Query parameter validation failed'
    );
    return res.status(400).json(errorResponse);
  }
  
  // Validate status
  if (status && !['PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED'].includes(status)) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'INVALID_STATUS', message: 'Invalid status' },
      'Query parameter validation failed'
    );
    return res.status(400).json(errorResponse);
  }
  
  // Validate date format
  if (dateFrom && isNaN(Date.parse(dateFrom))) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'INVALID_DATE_FORMAT', message: 'Invalid dateFrom format' },
      'Query parameter validation failed'
    );
    return res.status(400).json(errorResponse);
  }
  
  if (dateTo && isNaN(Date.parse(dateTo))) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'INVALID_DATE_FORMAT', message: 'Invalid dateTo format' },
      'Query parameter validation failed'
    );
    return res.status(400).json(errorResponse);
  }
  
  next();
};

/**
 * Validate service type for balance check
 */
const validateServiceType = (req, res, next) => {
  const { serviceType } = req.query;
  
  if (serviceType && !['collection', 'disbursement'].includes(serviceType)) {
    const errorResponse = ErrorResponseDTO.fromError(
      { code: 'INVALID_SERVICE_TYPE', message: 'Service type must be collection or disbursement' },
      'Query parameter validation failed'
    );
    return res.status(400).json(errorResponse);
  }
  
  next();
};

module.exports = {
  validateRequestToPay,
  validateTransfer,
  validateRefund,
  validatePaymentId,
  validateQueryParams,
  validateServiceType
};
