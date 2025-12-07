import * as crypto from 'crypto';

/**
 * Standard success response structure
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  metadata?: ApiMetadata;
}

/**
 * Standard error response structure
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string; // Only in development
  };
  metadata?: ApiMetadata;
}

/**
 * Metadata included in all responses
 */
export interface ApiMetadata {
  timestamp: string;
  requestId: string;
  processingTime?: number;
  version?: string;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Common error codes used across the application
 */
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CHAIN_EXECUTION_ERROR = 'CHAIN_EXECUTION_ERROR',
  LLM_API_ERROR = 'LLM_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Timeout errors (504)
  TIMEOUT = 'TIMEOUT',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
}

/**
 * Utility class for building standardized API responses
 */
export class ResponseBuilder {
  /**
   * Create a success response
   */
  static success<T>(
    data: T,
    metadata?: Partial<ApiMetadata>
  ): ApiSuccess<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        version: process.env.API_VERSION || '1.0.0',
        ...metadata
      }
    };
  }

  /**
   * Create an error response
   */
  static error(
    code: ErrorCode | string,
    message: string,
    details?: any,
    metadata?: Partial<ApiMetadata>,
    error?: Error
  ): ApiError {
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      success: false,
      error: {
        code,
        message,
        details,
        stack: isDevelopment && error?.stack ? error.stack : undefined
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        version: process.env.API_VERSION || '1.0.0',
        ...metadata
      }
    };
  }

  /**
   * Create validation error response
   */
  static validationError(
    message: string,
    validationErrors: any,
    metadata?: Partial<ApiMetadata>
  ): ApiError {
    return this.error(
      ErrorCode.VALIDATION_ERROR,
      message,
      { validationErrors },
      metadata
    );
  }

  /**
   * Create unauthorized error response
   */
  static unauthorized(
    message: string = 'Authentication required',
    metadata?: Partial<ApiMetadata>
  ): ApiError {
    return this.error(ErrorCode.UNAUTHORIZED, message, undefined, metadata);
  }

  /**
   * Create forbidden error response
   */
  static forbidden(
    message: string = 'Insufficient permissions',
    metadata?: Partial<ApiMetadata>
  ): ApiError {
    return this.error(ErrorCode.FORBIDDEN, message, undefined, metadata);
  }

  /**
   * Create not found error response
   */
  static notFound(
    resource: string,
    metadata?: Partial<ApiMetadata>
  ): ApiError {
    return this.error(
      ErrorCode.NOT_FOUND,
      `${resource} not found`,
      undefined,
      metadata
    );
  }

  /**
   * Create rate limit error response
   */
  static rateLimitExceeded(
    retryAfter?: number,
    metadata?: Partial<ApiMetadata>
  ): ApiError {
    return this.error(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { retryAfter },
      metadata
    );
  }

  /**
   * Create internal server error response
   */
  static internalError(
    message: string = 'Internal server error',
    error?: Error,
    metadata?: Partial<ApiMetadata>
  ): ApiError {
    return this.error(
      ErrorCode.INTERNAL_ERROR,
      message,
      undefined,
      metadata,
      error
    );
  }

  /**
   * Create timeout error response
   */
  static timeout(
    message: string = 'Request timeout',
    metadata?: Partial<ApiMetadata>
  ): ApiError {
    return this.error(ErrorCode.TIMEOUT, message, undefined, metadata);
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return crypto.randomUUID();
  }
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccess<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ApiError {
  return response.success === false;
}
