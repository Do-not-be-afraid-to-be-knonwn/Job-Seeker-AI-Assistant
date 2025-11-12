/**
 * Abstract base class for all services
 *
 * Provides common functionality for service lifecycle management:
 * - Lazy initialization
 * - Health checks
 * - Resource cleanup
 * - Error handling
 *
 * @example
 * ```typescript
 * class DatabaseService extends AbstractService {
 *   private connection: Connection;
 *
 *   protected async initialize(): Promise<void> {
 *     this.connection = await createConnection();
 *   }
 *
 *   async healthCheck(): Promise<boolean> {
 *     return this.connection.isConnected();
 *   }
 *
 *   async dispose(): Promise<void> {
 *     await this.connection.close();
 *   }
 * }
 * ```
 */
export abstract class AbstractService {
  protected initialized: boolean = false;
  protected initializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize service (lazy loading)
   * Called automatically before first use
   *
   * Subclasses should implement this to set up resources like:
   * - Database connections
   * - API clients
   * - Cache connections
   * - Model loading
   */
  protected abstract initialize(): Promise<void>;

  /**
   * Health check to verify service is operational
   * Should return true if service is ready to handle requests
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Clean up resources when service is no longer needed
   * Should close connections, release memory, etc.
   */
  abstract dispose(): Promise<void>;

  /**
   * Ensure service is initialized before use
   * Handles concurrent initialization attempts safely
   */
  protected async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // If already initializing, wait for that to complete
    if (this.initializing && this.initPromise) {
      await this.initPromise;
      return;
    }

    // Start initialization
    this.initializing = true;
    this.initPromise = this.initialize()
      .then(() => {
        this.initialized = true;
        this.initializing = false;
      })
      .catch((error) => {
        this.initializing = false;
        this.initPromise = null;
        throw error;
      });

    await this.initPromise;
  }

  /**
   * Check if service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if service is currently initializing
   */
  public isInitializing(): boolean {
    return this.initializing;
  }

  /**
   * Reset service (useful for testing)
   */
  public async reset(): Promise<void> {
    await this.dispose();
    this.initialized = false;
    this.initializing = false;
    this.initPromise = null;
  }
}

/**
 * Abstract base class for singleton services
 * Ensures only one instance exists
 */
export abstract class AbstractSingletonService extends AbstractService {
  private static instances: Map<string, AbstractSingletonService> = new Map();

  /**
   * Get singleton instance
   * Subclasses should override and provide specific return type
   */
  protected static getInstance<T extends AbstractSingletonService>(
    this: new () => T,
    key?: string
  ): T {
    const instanceKey = key || this.name;

    if (!AbstractSingletonService.instances.has(instanceKey)) {
      AbstractSingletonService.instances.set(instanceKey, new this());
    }

    return AbstractSingletonService.instances.get(instanceKey) as T;
  }

  /**
   * Clear all singleton instances (useful for testing)
   */
  protected static clearInstances(): void {
    AbstractSingletonService.instances.clear();
  }
}
