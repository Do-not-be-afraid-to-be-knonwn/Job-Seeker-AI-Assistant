# Core Abstractions

This directory contains base classes and utilities that enforce consistent patterns across the codebase.

## Files

### `AbstractChain.ts`
Base class for all extraction chains.

**Features**:
- Consistent `.run()` method interface
- Automatic retry logic with exponential backoff
- Built-in timeout protection
- Performance monitoring integration
- Standardized error handling
- Input/output validation

**Usage**:
```typescript
import { AbstractChain, ChainInput, ChainConfig } from './core';

class MyChain extends AbstractChain<ChainInput, MyOutput> {
  constructor() {
    super({ name: 'myChain', retries: 3, timeout: 30000 });
  }

  protected async execute(input: ChainInput): Promise<MyOutput> {
    // Your implementation
  }

  protected validateInput(input: ChainInput): void {
    if (!input.text) throw new Error('Text required');
  }

  protected validateOutput(output: any): MyOutput {
    return MyOutputSchema.parse(output);
  }
}

// Usage
const chain = new MyChain();
const result = await chain.run({ text: 'input' });
console.log(result.result); // Validated output
```

### `ChainExecutionError.ts`
Custom error types for chain execution.

**Error Types**:
- `ChainExecutionError`: General execution failures
- `ChainValidationError`: Input/output validation failures
- `ChainTimeoutError`: Timeout exceeded

**Usage**:
```typescript
import { ChainExecutionError, isChainTimeoutError } from './core';

try {
  await chain.run(input);
} catch (error) {
  if (isChainTimeoutError(error)) {
    console.log(`Timed out after ${error.timeoutMs}ms`);
  }
}
```

### `AbstractService.ts`
Base class for services with lifecycle management.

**Features**:
- Lazy initialization
- Thread-safe initialization
- Health checks
- Resource cleanup
- Singleton pattern support

**Usage**:
```typescript
import { AbstractService, AbstractSingletonService } from './core';

class DatabaseService extends AbstractSingletonService {
  private connection: Connection;

  protected async initialize(): Promise<void> {
    this.connection = await createConnection();
  }

  async healthCheck(): Promise<boolean> {
    return this.connection.isConnected();
  }

  async dispose(): Promise<void> {
    await this.connection.close();
  }

  async query(sql: string) {
    await this.ensureInitialized();
    return this.connection.query(sql);
  }
}

// Usage
const db = DatabaseService.getInstance();
await db.query('SELECT * FROM users');
```

### `ApiResponse.ts`
Standardized API response structures.

**Features**:
- Consistent success/error response format
- Request tracking with UUIDs
- Metadata (timestamp, processing time, version)
- Pre-defined error codes
- Type-safe response builders

**Usage**:
```typescript
import { ResponseBuilder, ErrorCode, ApiResponse } from './core';

// Success response
app.get('/api/data', async (req, res) => {
  const data = await getData();
  res.json(ResponseBuilder.success(data, {
    processingTime: Date.now() - startTime
  }));
});

// Error response
app.get('/api/data', async (req, res) => {
  try {
    const data = await getData();
    res.json(ResponseBuilder.success(data));
  } catch (error) {
    res.status(500).json(ResponseBuilder.internalError(
      'Failed to fetch data',
      error
    ));
  }
});

// Validation error
if (!req.body.text) {
  return res.status(400).json(ResponseBuilder.validationError(
    'Invalid input',
    { text: 'Text field is required' }
  ));
}
```

## Design Principles

### 1. Single Responsibility
Each class has one clear purpose:
- `AbstractChain`: Execution logic with retry/timeout
- `AbstractService`: Lifecycle management
- Error classes: Error information and formatting
- Response builders: API response standardization

### 2. Open/Closed Principle
- Open for extension (subclass and override methods)
- Closed for modification (don't change base classes)

### 3. Dependency Inversion
- Depend on abstractions (interfaces/base classes)
- Not on concrete implementations

### 4. Consistent Interfaces
All chains have the same interface:
```typescript
await chain.run(input) → ChainOutput<T>
```

All services have the same lifecycle:
```typescript
initialize() → healthCheck() → dispose()
```

## Migration Guide

### Before (Inconsistent Patterns)
```typescript
// Pattern A
const chain1 = await makeChain1();
const result1 = await chain1({ text: 'input' });

// Pattern B
const chain2 = await makeChain2();
const result2 = await chain2.call({ text: 'input' });

// Pattern C
const result3 = await service.doSomething(input);
```

### After (Consistent Pattern)
```typescript
// All chains use .run()
const chain1 = new Chain1();
const result1 = await chain1.run({ text: 'input' });

const chain2 = new Chain2();
const result2 = await chain2.run({ text: 'input' });

const chain3 = new Chain3();
const result3 = await chain3.run({ text: 'input' });
```

## Testing

All abstractions are designed to be testable:

```typescript
import { AbstractChain } from './core';

class TestChain extends AbstractChain<ChainInput, string> {
  protected async execute(input: ChainInput): Promise<string> {
    return `Processed: ${input.text}`;
  }

  protected validateInput(input: ChainInput): void {
    if (!input.text) throw new Error('Text required');
  }

  protected validateOutput(output: any): string {
    return String(output);
  }
}

describe('TestChain', () => {
  it('should process input correctly', async () => {
    const chain = new TestChain({ name: 'test', retries: 1 });
    const result = await chain.run({ text: 'hello' });

    expect(result.result).toBe('Processed: hello');
    expect(result.metadata.processingTime).toBeGreaterThan(0);
  });

  it('should retry on failure', async () => {
    const chain = new TestChain({ name: 'test', retries: 3 });
    let attempts = 0;

    chain['execute'] = async () => {
      attempts++;
      if (attempts < 2) throw new Error('Temporary failure');
      return 'success';
    };

    const result = await chain.run({ text: 'test' });
    expect(result.result).toBe('success');
    expect(attempts).toBe(2);
  });
});
```

## Benefits

1. **Consistency**: All chains work the same way
2. **Reliability**: Built-in retry and timeout logic
3. **Observability**: Automatic monitoring integration
4. **Type Safety**: Full TypeScript support
5. **Testability**: Easy to mock and test
6. **Maintainability**: Clear contracts and expectations
7. **Extensibility**: Easy to add new chains/services

## Next Steps

1. Refactor existing chains to use `AbstractChain`
2. Refactor existing services to use `AbstractService`
3. Update API endpoints to use `ResponseBuilder`
4. Add tests for new abstractions
5. Update documentation

## References

- [PROJECT_ANALYSIS.md](../../PROJECT_ANALYSIS.md) - Full refactoring plan
- [TEST_BASELINE_REPORT.md](../../TEST_BASELINE_REPORT.md) - Current test status
