/**
 * Core abstractions and base classes
 * Central export point for all core functionality
 */

// Chain abstractions
export {
  AbstractChain,
  type ChainConfig,
  type ChainInput,
  type ChainOutput,
  type ValidationResult,
  isChainExecutionError,
  isChainValidationError,
  isChainTimeoutError
} from './AbstractChain';

// Error types
export {
  ChainExecutionError,
  ChainValidationError,
  ChainTimeoutError
} from './ChainExecutionError';

// Service abstractions
export {
  AbstractService,
  AbstractSingletonService
} from './AbstractService';

// API response types
export {
  type ApiResponse,
  type ApiSuccess,
  type ApiError,
  type ApiMetadata,
  ErrorCode,
  ResponseBuilder,
  isSuccessResponse,
  isErrorResponse
} from './ApiResponse';
