/**
 * Custom error class for chain execution failures
 * Provides better error tracking and debugging information
 */
export class ChainExecutionError extends Error {
  public readonly chainName: string;
  public readonly originalError?: Error;
  public readonly timestamp: Date;
  public readonly retryAttempt?: number;

  constructor(
    chainName: string,
    message: string,
    originalError?: Error,
    retryAttempt?: number
  ) {
    super(message);
    this.name = 'ChainExecutionError';
    this.chainName = chainName;
    this.originalError = originalError;
    this.timestamp = new Date();
    this.retryAttempt = retryAttempt;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ChainExecutionError);
    }
  }

  /**
   * Get detailed error information for logging
   */
  public toJSON() {
    return {
      name: this.name,
      chainName: this.chainName,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      retryAttempt: this.retryAttempt,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack
          }
        : undefined,
      stack: this.stack
    };
  }
}

/**
 * Error for validation failures
 */
export class ChainValidationError extends ChainExecutionError {
  public readonly validationErrors: any;

  constructor(
    chainName: string,
    message: string,
    validationErrors: any,
    originalError?: Error
  ) {
    super(chainName, message, originalError);
    this.name = 'ChainValidationError';
    this.validationErrors = validationErrors;
  }

  public toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    };
  }
}

/**
 * Error for timeout scenarios
 */
export class ChainTimeoutError extends ChainExecutionError {
  public readonly timeoutMs: number;

  constructor(
    chainName: string,
    timeoutMs: number,
    message?: string
  ) {
    super(
      chainName,
      message || `Chain execution timed out after ${timeoutMs}ms`
    );
    this.name = 'ChainTimeoutError';
    this.timeoutMs = timeoutMs;
  }

  public toJSON() {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs
    };
  }
}
