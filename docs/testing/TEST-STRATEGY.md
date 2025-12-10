# Job-Seeker-AI-Assistant: Comprehensive Test Suite Strategy

**Date:** 2025-12-10
**Status:** Design Complete - Ready for Implementation
**Version:** 1.0

---

## Executive Summary

This document outlines the comprehensive test strategy for the Job-Seeker-AI-Assistant project. The goal is to achieve **80% overall code coverage** with a **stratified approach** that prioritizes critical business logic while maintaining pragmatic coverage for utilities and supporting code.

**Current State:**
- ~20% overall test coverage
- 6 test files covering primarily integration scenarios
- Heavy reliance on smoke tests and manual validation
- Critical business logic (matching, scoring) largely untested at unit level

**Target State:**
- 80% overall coverage with stratified targets
- 5-layer test pyramid (Unit → Integration → UI → AI Infrastructure → AI Evaluation)
- 200-250 unit tests + 50-70 integration tests + 20-30 UI tests
- Comprehensive AI model evaluation framework

---

## 1. Five-Layer Test Architecture

### Overview Pyramid

```
                    ▲ Slow, Expensive, Manual
                   ╱ ╲
                  ╱ 5 ╲  Layer 5: AI Model Evaluation
                 ╱─────╲  Purpose: Validate AI output accuracy & quality
                ╱   4   ╲  Execution: On-demand, CI weekly
               ╱─────────╲
              ╱     3     ╲ Layer 4: AI Infrastructure Tests
             ╱─────────────╲ Purpose: LLM reliability (retries, fallback, parsing)
            ╱       2       ╲ Execution: CI on every commit
           ╱─────────────────╲
          ╱         1         ╲ Layer 3: UI Tests (Chrome Extension)
         ╱───────────────────────╲ Purpose: Extension functionality
        ╱            0            ╲ Execution: CI on extension changes
       ╱─────────────────────────────╲
      ╱              2               ╲ Layer 2: Integration Tests
     ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲ Purpose: Component communication
    ╱              UNIT               ╲ Execution: CI on every commit
   ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
  ▼ Fast, Cheap, Automated            Layer 1: Unit Tests (Foundation)
                                       Purpose: Pure logic validation
                                       Execution: CI on every commit
```

---

## 2. Layer 1: Unit Tests (Foundation)

### 2.1 Coverage Strategy (Stratified Approach)

| Component Category | Target Coverage | Rationale |
|-------------------|-----------------|-----------|
| **Critical Business Logic** | 95%+ | Matching, scoring, auth - errors have high impact |
| **Standard Business Logic** | 80%+ | Extraction chains, services - core functionality |
| **Utilities & Helpers** | 60%+ | Validators, formatters - lower risk |
| **Overall Average** | **80%** | Balanced quality vs. effort |

### 2.2 Priority Components for Unit Testing

#### Tier 1: Critical (MUST have 95%+ coverage)

**File** | **LOC** | **Current** | **Target Tests** | **Priority**
---|---|---|---|---
`src/matching/core/hybridScoring.engine.ts` | 495 | 0% | 50 | P0
`src/matching/core/semanticSimilarity.engine.ts` | 441 | 0% | 40 | P0
`src/matching/core/featureExtraction.service.ts` | 734 | 0% | 35 | P0
`src/llm/clients.ts` | 250+ | 0% | 30 | P0
`src/core/AbstractChain.ts` | 323 | 0% | 25 | P0
`src/middleware/auth.ts` | 81 | 40% | 20 | P0

**Focus Areas:**
- **Scoring Logic**: Weight calculations, gate enforcement, edge cases (zero years, missing fields)
- **Semantic Engine**: Model loading/caching, similarity calculations, cache TTL/eviction
- **Feature Extraction**: Parallel execution, error handling, feature normalization
- **LLM Retry**: 3 attempts with fallback, timeout handling, JSON parsing
- **Auth Middleware**: JWT validation, expiration, malformed tokens

#### Tier 2: High Priority (80%+ coverage)

**File** | **Target Tests** | **Focus**
---|---|---
`src/matching/core/textPreprocessing.utils.ts` | 30 | Section extraction, normalization, entity detection
`src/matching/core/explanationGeneration.engine.ts` | 25 | Explanation quality, edge cases
`src/chains/SkillsExtractionChain.ts` | 15 | Validation logic, error handling
`src/chains/DomainExtractionChain.ts` | 15 | Schema validation, edge cases
`src/chains/YearsExtractionChain.ts` | 15 | Parsing logic, range validation
`src/chains/LevelExtractionChain.ts` | 15 | Hierarchy matching
`src/services/ExtractionService.ts` | 20 | Parallel execution, error aggregation

#### Tier 3: Medium Priority (60%+ coverage)

**File** | **Target Tests** | **Focus**
---|---|---
`src/monitor/ChainPerformanceMonitor.ts` | 25 | CSV formatting, metrics aggregation
`src/monitor/Validator.ts` | 20 | Validator caching, partial matching
`src/schemas/*.ts` | 15 | Zod validation edge cases
`src/matching/validators/*.ts` | 15 | Validation rules

### 2.3 Test Organization Structure

```
test/
├── unit/                           # NEW: Unit tests directory
│   ├── matching/
│   │   ├── hybridScoring.test.ts           # 50 tests
│   │   ├── semanticSimilarity.test.ts      # 40 tests
│   │   ├── featureExtraction.test.ts       # 35 tests
│   │   ├── textPreprocessing.test.ts       # 30 tests
│   │   └── explanationGeneration.test.ts   # 25 tests
│   ├── llm/
│   │   ├── clients.test.ts                 # 30 tests (retry, fallback)
│   │   └── jsonParsing.test.ts             # 15 tests
│   ├── core/
│   │   ├── AbstractChain.test.ts           # 25 tests
│   │   ├── AbstractService.test.ts         # 10 tests
│   │   └── ChainExecutionError.test.ts     # 10 tests
│   ├── chains/
│   │   ├── SkillsExtractionChain.test.ts   # 15 tests
│   │   ├── DomainExtractionChain.test.ts   # 15 tests
│   │   ├── YearsExtractionChain.test.ts    # 15 tests
│   │   └── LevelExtractionChain.test.ts    # 15 tests
│   ├── auth/
│   │   └── authMiddleware.test.ts          # 20 tests
│   ├── monitor/
│   │   ├── performanceMonitor.test.ts      # 25 tests
│   │   └── validator.test.ts               # 20 tests
│   ├── schemas/
│   │   └── schemaValidation.test.ts        # 15 tests
│   └── services/
│       └── extractionService.test.ts       # 20 tests
```

**Total Unit Tests:** ~200-250 tests

---

## 3. Layer 2: Integration Tests (Component Communication)

### 3.1 Scope

Integration tests validate **communication between components** without mocking internal dependencies. Auth tests belong here.

### 3.2 Test Categories

#### A. Authentication & Authorization Integration (EXISTING + ENHANCEMENTS)

**Current Files:**
- `test/auth.test.ts` (138 tests)
- `test/authFlow.test.ts` (278 tests)
- `test/protectedEndpoints.test.ts` (existing)

**Enhancements Needed:**
- Add concurrent token refresh tests (currently missing)
- Add JWKS validation tests
- Add session cleanup tests
- Add token expiration edge cases

**New Tests:** 15-20 additional tests

#### B. API Endpoint Integration (EXISTING + ENHANCEMENTS)

**Current Files:**
- `test/matchingEndpoints.test.ts` (existing)
- `test/feedback.test.ts` (existing)

**Enhancements Needed:**
- Error response validation
- Concurrent request handling
- Rate limiting tests (if implemented)

**New Tests:** 10-15 additional tests

#### C. Database Integration (FUTURE - IN-MEMORY)

**Test Scope:**
- In-memory database setup/teardown
- CRUD operations
- Transaction rollback
- Connection pool management

**Approach:**
- Use SQLite in-memory or similar
- Fresh DB instance per test suite
- Transaction-based isolation

**New File:** `test/integration/database.test.ts` (20-30 tests)

**Status:** Deferred until database implementation

#### D. Chain-to-Chain Integration (NEW)

**Test Scope:**
- ExtractionService → Multiple Chains
- FeatureExtractionService → Chain results
- JobResumeMatchingChain → All sub-engines

**New Files:**
```
test/integration/
├── extractionPipeline.test.ts      # 15 tests
├── matchingPipeline.test.ts        # 20 tests
└── errorPropagation.test.ts        # 10 tests
```

**Total New Integration Tests:** 50-70 tests

---

## 4. Layer 3: UI Tests (Chrome Extension)

### 4.1 Testing Strategy

**Decision:** Start with **Component Tests + Mocked Endpoints** (Option B), add E2E later

**Rationale:**
- Faster feedback loop
- Easier to maintain
- Can add real E2E tests when CI/CD matures

### 4.2 Test Structure

#### A. Component Tests (Mocked Endpoints)

**Current:**
- `test/background.test.js` (existing)
- `test/backgroundQueue.test.js` (existing)
- `src/chrome-extension-template/contentScript.test.js` (existing)

**New Tests Needed:**
```
test/extension/
├── unit/
│   ├── contentScript.test.js       # DOM manipulation, data extraction
│   ├── background.test.js          # Enhanced with more scenarios
│   ├── popup.test.js               # NEW: Popup UI logic
│   └── storage.test.js             # Chrome storage API mocking
├── integration/
│   ├── endToEnd.mock.test.js       # Full flow with mocked API
│   └── authFlow.test.js            # JWT handling in extension
└── fixtures/
    └── mockApiResponses.js         # Shared mock data
```

**Tools:**
- Jest + jsdom (already configured)
- @testing-library/dom (already installed)
- Chrome API mocks (existing in `chromeExtensionTestKit.js`)

**Total Extension Tests:** 20-30 tests

#### B. E2E Smoke Tests (Optional - Future)

**Approach:**
- Use Puppeteer or Playwright
- Run against local server
- Test critical user flows only (login, extract, view results)

**Status:** Deferred to Phase 2

---

## 5. Layer 4: AI Infrastructure Tests

### 5.1 Scope (Clarified from Discussion)

**Definition:** Tests for AI infrastructure reliability, NOT output accuracy

**Focus Areas:**
1. **LLM Client Configuration & Switching**
   - Primary model → Fallback model transition
   - API key validation
   - Model selection logic

2. **Retry & Fallback Mechanisms**
   - 3 retry attempts with exponential backoff
   - Timeout handling (30s default)
   - Graceful degradation

3. **Output Parsing & Validation**
   - JSON extraction from markdown code blocks
   - Malformed response handling
   - Schema validation failures

4. **Performance Monitoring**
   - Token usage tracking
   - Response time logging
   - CSV export formatting

5. **Rate Limiting & Throttling**
   - API rate limit handling
   - Queue management (if implemented)
   - Backpressure handling

### 5.2 Test Files

```
test/ai-infrastructure/
├── llmClient.test.ts               # 20 tests - retry, fallback, timeout
├── responseParser.test.ts          # 15 tests - JSON extraction, error handling
├── rateLimiting.test.ts            # 10 tests - API limits, throttling
├── performanceTracking.test.ts     # 10 tests - monitoring, logging
└── modelSwitching.test.ts          # 10 tests - primary/fallback switching
```

**Mocking Strategy:**
- Mock Gemini API responses
- Simulate network failures, timeouts, rate limits
- Use Jest fake timers for retry delays

**Total AI Infrastructure Tests:** 15-20 test files, ~65 tests

---

## 6. Layer 5: AI Model Evaluation

### 6.1 Scope (Clarified from Discussion)

**Definition:** Validate that AI models correctly complete assigned tasks

**Distinction from Layer 4:**
- Layer 4 = Infrastructure reliability (can we call the API?)
- Layer 5 = Output accuracy (did the AI extract the right skills?)

### 6.2 Evaluation Categories

#### A. Extraction Accuracy (EXISTING - ENHANCE)

**Current:**
- `test/smoke/smokeTestLocal.ts` (20 job postings)
- `test/smoke/smokeTest.ts` (LangSmith integration)

**Metrics:**
- Skills extraction accuracy: X%
- Domain classification accuracy: X%
- Level detection accuracy: X%
- Years extraction accuracy: X%

**Enhancements:**
1. Expand test dataset from 20 to 50+ jobs
2. Add edge case job descriptions (remote-only, no experience listed, etc.)
3. Add performance baselines (response time, token usage)
4. Track accuracy trends over time

**New File:** `test/evaluation/extraction-accuracy.dataset.json` (50+ cases)

#### B. Matching Quality Evaluation (EXISTING - ENHANCE)

**Current:**
- `test/matching/matchingValidation.dataset.json` (20 test cases)
- `test/matching/runValidationDataset.ts`

**Metrics:**
- Match score within expected range: X%
- Confidence level accuracy: X%
- Gate decisions correct: X%
- Explanation quality: X%

**Enhancements:**
1. Expand dataset to 40+ comprehensive cases
2. Add confusion matrix (false positives/negatives)
3. Add semantic similarity validation
4. Track calibration (high confidence = high accuracy?)

**New File:** `test/evaluation/matching-quality.dataset.json` (40+ cases)

#### C. Quality Metrics (NEW)

**File:** `test/evaluation/qualityMetrics.ts`

**Tracked Metrics:**
```typescript
interface EvaluationMetrics {
  // Accuracy
  extractionAccuracy: {
    skills: number;      // % correct
    domain: number;
    level: number;
    years: number;
  };
  matchingAccuracy: {
    scoreWithinRange: number;  // % of scores in expected range
    confidenceCalibration: number;  // correlation between confidence and accuracy
    gateDecisions: number;  // % of gate decisions correct
  };

  // Performance (NEW)
  performance: {
    avgResponseTime: {
      extraction: number;  // ms
      matching: number;
    };
    tokenUsage: {
      avgPerExtraction: number;
      avgPerMatch: number;
      costEstimate: number;  // $ per 1000 requests
    };
    modelUsage: {
      primarySuccessRate: number;  // % using primary model
      fallbackRate: number;        // % falling back
    };
  };

  // Quality Indicators (NEW - DEFERRED)
  quality?: {
    confidenceCalibration?: number;  // how well confidence predicts accuracy
    errorPatterns?: ErrorPattern[];  // what types of jobs/resumes fail
    regressionDetection?: boolean;   // has accuracy decreased
  };
}
```

**Decision:** Start with **Accuracy + Performance** (Option B), add Quality later

#### D. Test Execution Strategy

**Local Smoke Tests:**
```bash
npm run smoke:local          # Quick validation (20 jobs, ~2min)
npm run validate:matching    # Matching validation (20 cases, ~3min)
```

**Full Evaluation (CI Weekly):**
```bash
npm run eval:full            # NEW: All datasets (50+ jobs, 40+ matches, ~15min)
npm run eval:report          # NEW: Generate markdown report
```

**Continuous Tracking:**
- Store results in `test/evaluation/results/YYYY-MM-DD-results.json`
- Track trends over time
- Alert on accuracy regression (>5% drop)

---

## 7. Test Infrastructure & Tooling

### 7.1 Current Tools (Keep)

**Framework:**
- Jest 29.7.0
- ts-jest 29.1.1
- Supertest 6.3.4 (HTTP assertions)

**Existing Mocks:**
- `test/setup.ts` - Global mocks for node-fetch, @xenova/transformers
- `test/chromeExtensionTestKit.js` - Chrome API mocks

### 7.2 New Tools Needed

**Coverage Tracking:**
```bash
npm install --save-dev @jest/coverage
```

**Update jest.config.js:**
```javascript
module.exports = {
  // ... existing config
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/scripts/**',  // Exclude CLI scripts
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    },
    // Stratified thresholds
    './src/matching/core/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/chains/*.ts': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
```

**Mock Factories (NEW):**
```
test/fixtures/
├── mockLLMResponses.ts     # Pre-defined LLM responses for testing
├── mockJobDescriptions.ts  # Test job postings
├── mockResumes.ts          # Test resume data
├── mockMatchResults.ts     # Expected match outputs
└── factories/
    ├── jobFactory.ts       # Generate test jobs
    └── resumeFactory.ts    # Generate test resumes
```

### 7.3 Database Testing (Future)

**Tool:** `sql.js` or `better-sqlite3` for in-memory SQLite

**Setup Pattern:**
```typescript
beforeEach(async () => {
  db = await createInMemoryDB();
  await runMigrations(db);
});

afterEach(async () => {
  await db.close();
});
```

---

## 8. Implementation Plan

### Phase 1: Critical Foundations (Week 1) - 125 tests

**Priority:** P0 - Blocking for production readiness

**Tasks:**
1. Set up coverage tracking in jest.config.js
2. Create test directory structure (test/unit/, test/integration/, test/ai-infrastructure/)
3. Implement mock factories for LLM responses
4. Write unit tests for:
   - HybridScoringEngine (50 tests)
   - LLM Clients (30 tests)
   - AbstractChain (25 tests)
   - Auth Middleware (20 tests)

**Deliverable:** 80%+ coverage on critical matching/auth components

---

### Phase 2: High-Priority Features (Week 2) - 105 tests

**Priority:** P1 - High risk

**Tasks:**
1. Write unit tests for:
   - SemanticSimilarityEngine (40 tests)
   - FeatureExtractionService (35 tests)
   - TextPreprocessing (30 tests)
2. Enhance AI infrastructure tests (15 new tests)

**Deliverable:** 60%+ overall coverage

---

### Phase 3: Supporting Infrastructure (Week 3) - 85 tests

**Priority:** P2 - Standard business logic

**Tasks:**
1. Write unit tests for:
   - Extraction Chains (60 tests total - 15 each)
   - ExtractionService (20 tests)
2. Write integration tests:
   - Chain pipelines (25 tests)
3. Enhance extension tests (20 new tests)

**Deliverable:** 75%+ overall coverage

---

### Phase 4: Monitoring & Validation (Week 4) - 60 tests

**Priority:** P3 - Supporting systems

**Tasks:**
1. Write unit tests for:
   - PerformanceMonitor (25 tests)
   - Validators (20 tests)
   - Schemas (15 tests)
2. Integration tests for error scenarios (40 tests)

**Deliverable:** 80%+ overall coverage achieved

---

### Phase 5: AI Model Evaluation Enhancements (Ongoing)

**Priority:** P2 - Quality assurance

**Tasks:**
1. Expand extraction accuracy dataset to 50+ jobs
2. Expand matching validation dataset to 40+ cases
3. Implement quality metrics tracking
4. Set up weekly CI evaluation runs
5. Create trend analysis reports

**Deliverable:** Comprehensive AI evaluation framework

---

## 9. CI/CD Integration

### 9.1 Test Execution Strategy

**On Every Commit:**
```bash
npm test                      # All unit + integration tests (~5min)
npm run test:coverage         # NEW: Coverage report
```

**Pre-Commit Hook (Husky):**
```bash
npm run type-check            # TypeScript checks
npm run lint                  # ESLint
npm test -- --onlyChanged     # Changed files only
```

**On Pull Request:**
```bash
npm test                      # Full test suite
npm run test:coverage         # Coverage threshold enforcement
npm run smoke:local           # Quick smoke test (20 jobs)
```

**Weekly (Sunday Night):**
```bash
npm run eval:full             # Full AI evaluation (50+ jobs, 40+ matches)
npm run eval:report           # Generate trend report
```

### 9.2 Coverage Enforcement

**GitHub Actions Workflow:**
```yaml
- name: Run Tests with Coverage
  run: npm run test:coverage

- name: Enforce Coverage Thresholds
  run: |
    if ! npm run test:coverage -- --passWithNoTests; then
      echo "❌ Coverage thresholds not met"
      exit 1
    fi

- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v3
```

---

## 10. Success Metrics

### 10.1 Coverage Metrics (Target: 80% overall)

**Component** | **Current** | **Target** | **Deadline**
---|---|---|---
Matching Core | 15% | 95% | Week 1-2
LLM Infrastructure | 0% | 95% | Week 1
Core Abstractions | 0% | 95% | Week 1
Extraction Chains | 10% | 80% | Week 2-3
Auth & Middleware | 40% | 95% | Week 1
Monitoring | 0% | 60% | Week 4
**Overall** | **~20%** | **80%** | **Week 4**

### 10.2 Test Count Metrics

**Layer** | **Current** | **Target** | **Total**
---|---|---|---
Unit Tests | 0 | 200-250 | 250
Integration Tests | ~40 | 90-110 | 110
UI Tests | ~10 | 20-30 | 30
AI Infrastructure | 0 | 15-20 | 20
AI Evaluation | 2 datasets | 5 datasets | 5 datasets
**Total Tests** | **~50** | **325-410** | **410**

### 10.3 Quality Metrics

**Metric** | **Current** | **Target**
---|---|---
Extraction Accuracy | ~70% | >85%
Matching Score Accuracy | ~75% | >90%
Test Execution Time | ~2min | <10min
CI Pass Rate | N/A | >95%
Flaky Test Rate | Unknown | <2%

---

## 11. Risk Mitigation

### 11.1 Identified Risks

**Risk** | **Impact** | **Mitigation**
---|---|---
Test suite too slow (>10min) | Slows development | Parallelize tests, use in-memory DB, optimize mocks
LLM API costs for testing | Budget overrun | Mock all LLM calls in unit/integration tests, limit smoke tests to 20-50 cases
Flaky tests from AI non-determinism | CI instability | Use temperature=0, cache responses, allow score ranges
Coverage targets unrealistic | Team burnout | Start with critical components, iterate
Existing code untestable | Refactoring required | Gradual refactoring, focus on new code first

### 11.2 Mitigation Strategies

1. **Mock LLM Calls Aggressively:** Only smoke tests and AI evaluation should hit real APIs
2. **Use Snapshot Testing:** For complex JSON outputs, use Jest snapshots
3. **Implement Retry Logic in Tests:** Allow 1-2 retries for flaky tests
4. **Parallel Test Execution:** Configure Jest to run tests in parallel (already default)
5. **Cache Test Fixtures:** Pre-compute expensive test data (embeddings, etc.)

---

## 12. Documentation & Training

### 12.1 Test Documentation

**Related Documentation Files:**
```
docs/testing/
├── TEST-STRATEGY.md            # This document
├── UNIT-TEST-GUIDE.md          # How to write unit tests (TODO)
├── INTEGRATION-TEST-GUIDE.md   # Integration testing guide (TODO)
├── AI-EVALUATION-GUIDE.md      # AI evaluation guide (TODO)
└── MOCKING-GUIDE.md            # How to mock LLM responses (TODO)
```

### 12.2 Code Examples

**Include in future guides:**
- How to mock Gemini API responses
- How to write tests for extraction chains
- How to test scoring logic
- How to validate semantic similarity
- How to write Chrome extension tests

---

## 13. Open Questions & Future Decisions

### Deferred Decisions (To Be Made Later)

1. **Chrome Extension E2E Testing:**
   - Tool: Puppeteer vs Playwright vs Cypress?
   - When: Phase 2 or Phase 3?

2. **AI Model Evaluation - Quality Metrics:**
   - Implement confidence calibration tracking?
   - Error pattern analysis?
   - Regression detection alerts?
   - Decision: Start with accuracy + performance, add later

3. **Database Testing:**
   - Tool: SQLite in-memory vs TestContainers?
   - Decision: SQLite in-memory for now (lightweight)

4. **Load/Performance Testing:**
   - Tool: Artillery vs k6?
   - When: After functional tests complete?

5. **Mutation Testing:**
   - Tool: Stryker?
   - When: After 80% coverage achieved?

---

## 14. Appendix: Key Decisions Made

**Decision Log:**

1. ✅ **Coverage Strategy:** Stratified approach (95% critical, 80% business logic, 60% utilities)
2. ✅ **AI Infrastructure Tests:** Focus on reliability (retries, parsing), NOT accuracy
3. ✅ **AI Model Evaluation:** Separate from infrastructure tests, focus on output accuracy
4. ✅ **Database Testing:** In-memory SQLite for now
5. ✅ **Chrome Extension:** Component tests with mocked endpoints first, E2E later
6. ⏳ **Quality Metrics:** Start with accuracy + performance, defer advanced quality metrics
7. ⏳ **E2E Tool Selection:** Deferred to Phase 2

---

**END OF TEST STRATEGY DOCUMENT**
