import { z } from 'zod';
import { ChainPerformanceMonitor } from '../monitor/ChainPerformanceMonitor';
import { ChainExecutionError, ChainValidationError, ChainTimeoutError } from './ChainExecutionError';

/**
 * Configuration options for chain execution
 */
export interface ChainConfig {
  /** Name of the chain for logging and monitoring */
  name: string;
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Enable exponential backoff for retries */
  exponentialBackoff?: boolean;
}

/**
 * Standard input interface for all chains
 */
export interface ChainInput {
  text: string;
  [key: string]: any;
}

/**
 * Standard output wrapper for all chains
 */
export interface ChainOutput<T = any> {
  /** The actual result data */
  result: T;
  /** Metadata about the execution */
  metadata?: {
    processingTime: number;
    modelUsed: string;
    tokensUsed?: number;
    retryAttempt?: number;
    cacheHit?: boolean;
  };
}

/**
 * Validation result from tests
 */
export interface ValidationResult {
  match: boolean;
  expected: any;
  actual: any;
  details?: string;
}

/**
 * Abstract base class for all extraction chains
 *
 * Enforces consistent interface and behavior across all chains:
 * - Single .run() method for execution
 * - Automatic retry logic with exponential backoff
 * - Built-in monitoring and performance tracking
 * - Standardized error handling
 * - Input/output validation
 *
 * @example
 * ```typescript
 * class SkillsChain extends AbstractChain<ChainInput, Skills> {
 *   protected async execute(input: ChainInput): Promise<Skills> {
 *     // Implementation
 *   }
 *   protected validateInput(input: ChainInput): void {
 *     if (!input.text) throw new Error('Text required');
 *   }
 *   protected validateOutput(output: any): Skills {
 *     return SkillsSchema.parse(output);
 *   }
 * }
 * ```
 */
export abstract class AbstractChain<TInput extends ChainInput, TOutput> {
  protected monitor: ChainPerformanceMonitor;
  protected config: ChainConfig;

  constructor(config: ChainConfig) {
    this.config = {
      enableMonitoring: true,
      timeout: 30000, // 30 seconds default
      retries: 3,
      exponentialBackoff: true,
      ...config
    };
    this.monitor = ChainPerformanceMonitor.getInstance();
  }

  /**
   * Main execution method - implemented by subclasses
   * This method should contain the core logic of the chain
   */
  protected abstract execute(input: TInput): Promise<TOutput>;

  /**
   * Validate input before processing
   * Throw an error if input is invalid
   */
  protected abstract validateInput(input: TInput): void;

  /**
   * Validate and parse output after processing
   * Should use Zod schema for validation
   */
  protected abstract validateOutput(output: any): TOutput;

  /**
   * Public API - all chains use this method
   * Handles retries, monitoring, timeouts, and validation
   *
   * @param input - The input data for the chain
   * @param testExpected - Optional expected value for test validation
   * @returns Chain output with result and metadata
   */
  async run(
    input: TInput,
    testExpected?: any
  ): Promise<ChainOutput<TOutput> & { validation?: ValidationResult }> {
    const startTime = Date.now();
    const isFromTest = testExpected !== undefined;

    try {
      // Validate input
      this.validateInput(input);

      // Start monitoring
      if (this.config.enableMonitoring) {
        this.monitor.startCall(
          this.config.name,
          JSON.stringify(input),
          isFromTest
        );
      }

      // Execute with retry logic and timeout
      const result = await this.executeWithRetryAndTimeout(input);

      // Validate output
      const validatedResult = this.validateOutput(result);

      const processingTime = Date.now() - startTime;

      // Handle test validation
      let validation: ValidationResult | undefined;
      if (isFromTest) {
        validation = this.performTestValidation(
          validatedResult,
          testExpected
        );
      }

      // End monitoring
      if (this.config.enableMonitoring) {
        this.monitor.endCall(
          this.config.name,
          validatedResult,
          undefined,
          isFromTest ? testExpected : undefined,
          isFromTest ? validatedResult : undefined,
          validation?.match
        );
      }

      const output: ChainOutput<TOutput> & { validation?: ValidationResult } = {
        result: validatedResult,
        metadata: {
          processingTime,
          modelUsed: 'gemini-2.5-flash-lite' // Default, override in subclass if needed
        }
      };

      if (validation) {
        output.validation = validation;
      }

      return output;

    } catch (error) {
      // End monitoring with error
      if (this.config.enableMonitoring) {
        this.monitor.endCall(this.config.name, null, error as Error);
      }

      // Wrap in ChainExecutionError if not already
      if (error instanceof ChainExecutionError) {
        throw error;
      }

      throw new ChainExecutionError(
        this.config.name,
        `Chain ${this.config.name} failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Execute with automatic retry logic and timeout
   */
  private async executeWithRetryAndTimeout(input: TInput): Promise<TOutput> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.retries!; attempt++) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(input, this.config.timeout!);
        return result;

      } catch (error) {
        lastError = error as Error;

        // Don't retry on validation errors
        if (error instanceof ChainValidationError) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt < this.config.retries!) {
          const delay = this.config.exponentialBackoff
            ? Math.pow(2, attempt) * 1000 // 2s, 4s, 8s...
            : 1000; // 1s constant

          console.log(
            `Chain ${this.config.name} attempt ${attempt} failed, retrying in ${delay}ms...`
          );

          await this.delay(delay);
        }
      }
    }

    // All retries exhausted
    throw new ChainExecutionError(
      this.config.name,
      `Chain failed after ${this.config.retries} attempts`,
      lastError,
      this.config.retries
    );
  }

  /**
   * Execute with timeout protection
   */
  private async executeWithTimeout(
    input: TInput,
    timeoutMs: number
  ): Promise<TOutput> {
    return Promise.race([
      this.execute(input),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new ChainTimeoutError(this.config.name, timeoutMs)),
          timeoutMs
        )
      )
    ]);
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Perform test validation (can be overridden by subclasses)
   */
  protected performTestValidation(
    actual: TOutput,
    expected: any
  ): ValidationResult {
    // Default implementation - subclasses can override
    const match = JSON.stringify(actual) === JSON.stringify(expected);
    return {
      match,
      expected,
      actual,
      details: match ? 'Exact match' : 'Values differ'
    };
  }

  /**
   * Get chain configuration
   */
  public getConfig(): Readonly<ChainConfig> {
    return { ...this.config };
  }

  /**
   * Update chain configuration
   */
  public updateConfig(updates: Partial<ChainConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Type guard for ChainExecutionError
 */
export function isChainExecutionError(error: any): error is ChainExecutionError {
  return error instanceof ChainExecutionError;
}

/**
 * Type guard for ChainValidationError
 */
export function isChainValidationError(error: any): error is ChainValidationError {
  return error instanceof ChainValidationError;
}

/**
 * Type guard for ChainTimeoutError
 */
export function isChainTimeoutError(error: any): error is ChainTimeoutError {
  return error instanceof ChainTimeoutError;
}
