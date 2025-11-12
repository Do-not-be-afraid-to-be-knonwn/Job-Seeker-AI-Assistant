# Architecture Documentation

## System Overview

The Job-Seeker-AI-Assistant is a comprehensive AI-powered platform designed to revolutionize the job matching process. It consists of two major subsystems:

1. **Feature Extraction System** - Extracts structured information from job postings
2. **Job-Resume Matching System** - Intelligently matches candidates with job opportunities

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Feature Extraction System](#feature-extraction-system)
- [Job-Resume Matching System](#job-resume-matching-system)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Server (Express)                    │
│  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │  Authentication  │  │  Feature Extraction Endpoints    │  │
│  │  (Google OAuth)  │  │  - POST /extract-all            │  │
│  └──────────────────┘  │  - POST /feedback               │  │
│                        └─────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │       Job-Resume Matching Endpoints                   │  │
│  │  - POST /match-resume (single)                        │  │
│  │  - POST /match-batch (batch processing)               │  │
│  │  - POST /match-quick (fast scoring)                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
┌───────▼────────┐                    ┌───────────▼──────────┐
│   Extraction   │                    │   Matching System    │
│     Chains     │                    │                      │
│  - Skills      │                    │  ┌────────────────┐  │
│  - Domain      │                    │  │  Text          │  │
│  - Level       │                    │  │  Preprocessing │  │
│  - Years       │                    │  └────────────────┘  │
└────────────────┘                    │  ┌────────────────┐  │
                                      │  │  Feature       │  │
                                      │  │  Extraction    │  │
                                      │  └────────────────┘  │
                                      │  ┌────────────────┐  │
                                      │  │  Semantic      │  │
                                      │  │  Similarity    │  │
                                      │  └────────────────┘  │
                                      │  ┌────────────────┐  │
                                      │  │  Hybrid        │  │
                                      │  │  Scoring       │  │
                                      │  └────────────────┘  │
                                      │  ┌────────────────┐  │
                                      │  │  Explanation   │  │
                                      │  │  Generation    │  │
                                      │  └────────────────┘  │
                                      └─────────────────────┘
```

## Feature Extraction System

### Overview

The feature extraction system analyzes job postings to extract structured information using LLM-powered chains. Each chain is specialized for a specific type of information.

### Chain Architecture

```
Input Text → Prompt Template → LLM (Primary) → JSON Parse → Validation → Result
                                    │
                                    ▼ (on failure)
                               LLM (Fallback) → JSON Parse → Validation → Result
                                    │
                                    ▼
                          Performance Monitoring
```

### Extraction Chains

#### 1. Skills Extraction Chain
- **Location**: [src/chains/extractSkills.chain.ts](src/chains/extractSkills.chain.ts)
- **Schema**: [src/schemas/skills.schema.ts](src/schemas/skills.schema.ts)
- **Output**: `{ skills: string[] }`
- **Purpose**: Extracts technical skills, programming languages, frameworks, tools, and technologies

#### 2. Domain Classification Chain
- **Location**: [src/chains/extractDomain.chain.ts](src/chains/extractDomain.chain.ts)
- **Schema**: [src/schemas/domain.schema.ts](src/schemas/domain.schema.ts)
- **Output**: `{ domains: string[] }`
- **Categories**: Backend, Frontend, Full Stack, Mobile, DevOps, Data Science, QA, Product, Design, etc.

#### 3. Level Detection Chain
- **Location**: [src/chains/smartExtractLevel.chain.ts](src/chains/smartExtractLevel.chain.ts)
- **Schema**: [src/schemas/level.schema.ts](src/schemas/level.schema.ts)
- **Output**: `{ level: string }`
- **Levels**: Intern, Entry, Junior, Mid, Senior, Lead, Principal, Manager, Director, VP, Executive

#### 4. Years of Experience Chain
- **Location**: [src/chains/extractYearsFewShot.chain.ts](src/chains/extractYearsFewShot.chain.ts)
- **Schema**: [src/schemas/years.schema.ts](src/schemas/years.schema.ts)
- **Output**: `{ requestYears: number }`

### LLM Client System

**Location**: [src/llm/clients.ts](src/llm/clients.ts)

#### Dual LLM Architecture
- **Primary Model**: `gemini-2.5-flash-lite` (fast, cost-effective)
- **Fallback Model**: `gemini-2.5-flash` (more powerful, used when primary fails)

#### Features
- **Automatic Retry**: 3 attempts with primary model before falling back
- **JSON Extraction**: Handles markdown-wrapped JSON responses
- **Schema Validation**: Zod-based validation for type safety
- **Performance Monitoring**: Integrated metrics tracking

#### Configuration

```typescript
// Environment variables
GEMINI_PRIMARY_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_api_key
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_RETRIES=3
```

### Prompt Engineering

**Location**: [src/prompts/](src/prompts/)

All prompts use **few-shot learning** with carefully crafted examples to maximize accuracy:

- Clear instructions for JSON output format
- Domain-specific examples for each extraction type
- Explicit handling of edge cases
- Consistent formatting expectations

## Job-Resume Matching System

### Overview

The matching system implements a **hybrid approach** combining semantic similarity analysis with structured feature matching to provide accurate, explainable job-resume compatibility scores.

### Architecture Layers

```
Layer 1: Text Preprocessing
         ↓
Layer 2: Parallel Processing
         ├─→ Semantic Similarity (Transformer Embeddings)
         └─→ Feature Extraction (LLM Chains)
         ↓
Layer 3: Feature Matching Analysis
         ↓
Layer 4: Hybrid Scoring Engine
         ├─→ Weighted Combination
         ├─→ Hard Gates Evaluation
         ├─→ Bonuses/Penalties
         └─→ Quality Assessment
         ↓
Layer 5: Explanation Generation
         ↓
Final Result: JobResumeMatchingResult
```

### Core Components

#### 1. Text Preprocessing
**Location**: [src/matching/core/textPreprocessing.utils.ts](src/matching/core/textPreprocessing.utils.ts)

Parses and structures job descriptions and resumes into meaningful sections:

**Job Sections**:
- Requirements (must-have qualifications)
- Responsibilities (role duties)
- Qualifications (additional criteria)
- Summary (overview)
- Raw text (full posting)

**Resume Sections**:
- Experience (work history)
- Skills (technical/professional skills)
- Education (academic background)
- Summary (professional summary)
- Raw text (full resume)

#### 2. Feature Extraction Service
**Location**: [src/matching/core/featureExtraction.service.ts](src/matching/core/featureExtraction.service.ts)

Extracts structured features from both job postings and resumes using the extraction chains.

**Job Features**:
- Required/preferred skills categorization
- Domain requirements
- Years of experience required
- Level required
- Education requirements
- Work authorization requirements

**Resume Features**:
- Candidate skills
- Expertise domains
- Years of experience
- Current level
- Education level
- Work authorization status

**Feature Matching Analysis**:
- **Skills Match**: Coverage, matched/missing skills, overlap score (Jaccard similarity)
- **Domain Match**: Alignment with required domains
- **Experience Match**: Years gap analysis with severity classification
- **Level Match**: Career level alignment with promotability assessment
- **Education Match**: Degree requirement satisfaction
- **Location Match**: Work authorization compliance

#### 3. Semantic Similarity Engine
**Location**: [src/matching/core/semanticSimilarity.engine.ts](src/matching/core/semanticSimilarity.engine.ts)

Uses transformer-based embeddings for deep semantic understanding.

**Model**: `Xenova/all-MiniLM-L6-v2` (lightweight, multilingual)

**Features**:
- **Caching**: 1-hour TTL, 1000 entry maximum
- **Batch Processing**: Handles multiple comparisons efficiently
- **Section-wise Similarity**: Matches specific job sections with resume sections
- **Confidence Assessment**: Based on text quality and similarity consistency

**Similarity Calculation**:
```
Requirements Match: Job requirements ↔ Resume experience/skills (50% weight)
Responsibilities Match: Job duties ↔ Resume experience (30% weight)
Qualifications Match: Job quals ↔ Resume profile (20% weight)
Overall Semantic Score: Weighted combination
```

#### 4. Hybrid Scoring Engine
**Location**: [src/matching/core/hybridScoring.engine.ts](src/matching/core/hybridScoring.engine.ts)

Combines semantic and structured signals into a final 0-100 match score.

**Default Weights**:
- Semantic Similarity: 40%
- Skills Coverage: 30%
- Experience/Level: 15%
- Domain Match: 10%
- Education: 3%
- Location/Authorization: 2%

**Hard Gates** (Deal-breakers):
- Minimum Skills Coverage: 30%
- Maximum Years Gap: 5 years
- Work Authorization: Required (configurable)
- Education Requirement: Soft gate (configurable)

**Adjustments**:
- **Bonuses**: High semantic similarity, exceeding experience, perfect skills match
- **Penalties**: Low semantic despite good structural match, keyword stuffing, inconsistent signals

**Quality Indicators**:
- Data completeness score
- Signal consistency score
- Confidence level (low/medium/high)

#### 5. Explanation Generation Engine
**Location**: [src/matching/core/explanationGeneration.engine.ts](src/matching/core/explanationGeneration.engine.ts)

Generates human-readable explanations for match scores.

**Output Components**:
- **Strengths**: What makes this a good match
- **Concerns**: Potential issues or gaps
- **Summary**: One-sentence match assessment
- **Recommendations**: Actionable suggestions for both candidate and recruiter
- **Key Insights**: Strongest match, biggest gap, improvement potential

#### 6. Main Matching Chain
**Location**: [src/matching/core/jobResumeMatching.chain.ts](src/matching/core/jobResumeMatching.chain.ts)

Orchestrates all matching components.

**Methods**:
- `analyzeMatch(input)`: Single job-resume match with full analysis
- `analyzeBatchMatches(pairs)`: Process multiple matches with rate limiting
- `getQuickScores(pairs)`: Fast scoring without full explanation (for bulk screening)

**Processing Flow**:
1. Input validation
2. Text preprocessing (job & resume)
3. Parallel execution:
   - Semantic similarity calculation
   - Feature extraction (job & resume)
4. Feature match analysis
5. Hybrid score calculation
6. Explanation generation (optional)
7. Result validation and metadata collection

### Pre-extracted Features Support

The matching system supports two modes:

**Mode 1: Full Extraction (from raw text)**
```javascript
{
  jobDescription: "...",
  resumeContent: "...",
  options: { includeExplanation: true }
}
```

**Mode 2: Pre-extracted Features (faster)**
```javascript
{
  jobDescription: "...",
  resumeFeatures: {
    skills: [...],
    domains: [...],
    yearsOfExperience: 5,
    currentLevel: "Senior",
    // ... other features
  }
}
```

Pre-extraction allows frontend applications to cache resume features and reuse them across multiple job matches, significantly improving performance.

## Core Components

### Performance Monitoring

**Location**: [src/monitor/ChainPerformanceMonitor.ts](src/monitor/ChainPerformanceMonitor.ts)

Singleton class that tracks:
- Response times
- Token usage
- Success/failure rates
- Test validation results
- Model usage (primary vs fallback)

**Export**: Metrics exported to [chain-performance.csv](chain-performance.csv)

### Validation System

**Location**: [src/monitor/Validator.ts](src/monitor/Validator.ts)

Flexible validation framework for testing:
- **SkillsValidator**: Set-based lookup with partial matching
- **DomainValidator**: Exact domain matching
- **LevelValidator**: Level hierarchy matching
- **YearsValidator**: Numeric range validation

**Features**:
- Cached validators for performance
- Partial string matching for skills
- Detailed validation reports

### Authentication

**Location**: [src/auth/googleAuth.ts](src/auth/googleAuth.ts), [src/middleware/auth.ts](src/middleware/auth.ts)

OAuth 2.0 authentication with Google:
- Login/logout endpoints
- JWT-based session management
- Protected route middleware

## Data Flow

### Feature Extraction Flow

```
1. Client Request → POST /extract-all
   ├─ Input: { text: "job description..." }
   └─ Headers: { Authorization: "Bearer <token>" }

2. Authentication Middleware
   ├─ Validate JWT token
   └─ Attach user to request

3. Parallel Chain Execution
   ├─ Skills Chain → { skills: [...] }
   ├─ Domain Chain → { domains: [...] }
   ├─ Level Chain → { level: "..." }
   └─ Years Chain → { requestYears: N }

4. Performance Monitoring
   ├─ Record response times
   ├─ Track token usage
   └─ Log success/failures

5. Response Assembly
   └─ JSON: { skills, domain, years, level }
```

### Job-Resume Matching Flow

```
1. Client Request → POST /match-resume
   ├─ Input: { jobDescription, resumeContent or resumeFeatures }
   └─ Headers: { Authorization: "Bearer <token>" }

2. JobResumeMatchingChain.analyzeMatch()
   ├─ Text Preprocessing
   │  ├─ Parse job sections
   │  └─ Parse resume sections (if raw text provided)
   │
   ├─ Parallel Processing
   │  ├─ Semantic Similarity
   │  │  ├─ Generate embeddings (with caching)
   │  │  ├─ Calculate cosine similarity
   │  │  └─ Return similarity scores
   │  │
   │  └─ Feature Extraction
   │     ├─ Extract job features (if needed)
   │     └─ Extract resume features (if needed)
   │
   ├─ Feature Matching Analysis
   │  ├─ Skills match (coverage, gaps)
   │  ├─ Domain match
   │  ├─ Experience match
   │  ├─ Level match
   │  ├─ Education match
   │  └─ Location/auth match
   │
   ├─ Hybrid Scoring
   │  ├─ Component scores (0-100)
   │  ├─ Apply weights
   │  ├─ Check hard gates
   │  ├─ Apply bonuses/penalties
   │  └─ Calculate confidence
   │
   └─ Explanation Generation
      ├─ Identify strengths
      ├─ Identify concerns
      ├─ Generate recommendations
      └─ Create summary

3. Result Validation (Zod schema)

4. Performance Tracking

5. Response
   └─ JobResumeMatchingResult (200+ fields)
```

## Technology Stack

### Core Technologies
- **Runtime**: Node.js (TypeScript)
- **Web Framework**: Express.js 5.x
- **Language**: TypeScript 5.8.x
- **LLM Framework**: LangChain 0.3.x

### AI/ML Components
- **LLM Provider**: Google Gemini API
  - Primary: gemini-2.5-flash-lite
  - Fallback: gemini-2.5-flash
- **Embedding Model**: Xenova/all-MiniLM-L6-v2 (Transformers.js)
- **Vector Operations**: Custom cosine similarity implementation
- **Text Processing**: Natural.js, Stopword.js

### Data & Validation
- **Schema Validation**: Zod
- **Testing**: Jest 29.x
- **Test Runner**: ts-jest
- **E2E Testing**: Supertest

### Authentication & Security
- **OAuth Provider**: Google OAuth 2.0
- **Session Management**: JWT tokens
- **CORS**: Enabled with configurable origins

### Development Tools
- **Package Manager**: npm
- **TypeScript Compiler**: tsc (5.8.3)
- **Runtime Executor**: ts-node
- **Process Manager**: PM2 (deployment)

### Monitoring & Metrics
- **Performance Tracking**: Custom ChainPerformanceMonitor
- **Metrics Export**: CSV (chain-performance.csv)
- **Logging**: Console with structured output

## Performance Characteristics

### Feature Extraction
- **Skills Chain**: ~2-4 seconds per request
- **Domain Chain**: ~2-3 seconds per request
- **Level Chain**: ~2-3 seconds per request
- **Years Chain**: ~2-3 seconds per request
- **Parallel Extraction**: ~4-5 seconds total (all chains)

### Job-Resume Matching
- **Full Match (with explanation)**: ~5-8 seconds
- **Quick Match (score only)**: ~3-5 seconds
- **Semantic Similarity**: ~1-2 seconds (cached: <100ms)
- **Feature Extraction**: ~4-5 seconds (pre-extracted: 0ms)
- **Batch Processing**: 3 pairs per batch (rate limited)

### Caching Impact
- **Semantic Similarity Cache**: 80-90% hit rate in production
- **Validator Cache**: 100% reuse within session
- **Cache TTL**: 1 hour (semantic), unlimited (validator)

## Scalability Considerations

### Current Limitations
- Sequential batch processing (3 items at a time)
- In-memory caching (lost on restart)
- Single-server deployment
- Synchronous LLM calls

### Future Improvements
- Redis for distributed caching
- Message queue for async processing
- Horizontal scaling with load balancer
- Database for persistent storage
- WebSocket for real-time updates
- CDN for static assets

## Error Handling

### Extraction Chains
- **Primary Failure**: Automatic retry (3 attempts)
- **Primary Exhausted**: Fallback to secondary model
- **Both Failed**: Return error object with details

### Matching System
- **Extraction Failure**: Use fallback features
- **Semantic Failure**: Return low confidence with structural-only score
- **Total Failure**: Return `JobResumeMatchingError` with fallback score of 10

### API Layer
- **Authentication Failure**: 401 Unauthorized
- **Validation Failure**: 400 Bad Request
- **Processing Failure**: 500 Internal Server Error with error details
- **All Errors**: Logged to console with timestamp

## Security

### Authentication
- OAuth 2.0 with Google
- JWT tokens for session management
- Protected endpoints require valid token

### Data Privacy
- No persistent storage of job/resume content
- Temporary caching only (1 hour TTL)
- Feedback stored in append-only JSONL file

### API Security
- CORS enabled with configurable origins
- Request body size limits
- Input validation with Zod schemas

## Testing Strategy

### Test Coverage
- **Unit Tests**: Chain-specific logic
- **Integration Tests**: API endpoints
- **Smoke Tests**: Real job posting data
- **Validation Tests**: Match quality assessment

### Test Data
- [test/smoke/smoke.json](test/smoke/smoke.json): Real job postings
- [test/matching/validationDataset.json](test/matching/validationDataset.json): Matching test cases
- Multiple test configurations for different scenarios

### Validation Metrics
- Skills extraction accuracy
- Domain classification precision
- Level detection accuracy
- Match score calibration
- Explanation quality

## Configuration

### Environment Variables

```env
# Gemini Configuration
GEMINI_PRIMARY_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_api_key_here
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_RETRIES=3

# Server Configuration
PORT=3000
NODE_ENV=development

# LangSmith (Optional)
LANGSMITH_API_KEY=your_langsmith_key
LANGSMITH_PROJECT=job-seeker-ai-assistant

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
SESSION_SECRET=your_session_secret
```

### Scoring Configuration

Scoring weights and gates can be customized per request or globally:

```typescript
const customConfig = {
  weights: {
    semantic: 0.5,      // Increase semantic importance
    skillsCoverage: 0.25,
    experience: 0.15,
    domain: 0.07,
    education: 0.02,
    location: 0.01
  },
  gates: {
    minSkillsCoverage: 0.5,  // Stricter skills requirement
    maxYearsGap: 3,          // Tighter experience range
    requireWorkAuth: false,  // Relax work auth requirement
    requireEducation: true   // Enforce education requirement
  },
  strictMode: true           // Enforce gates more strictly
};
```

## Deployment

### Development
```bash
npm install
npm start  # or npm run dev for watch mode
```

### Testing
```bash
npm test                    # Run all tests
npm run smoke              # Real job posting tests
npm run validate:matching  # Matching validation tests
```

### Production
```bash
# Build (if needed)
npx tsc

# Run with PM2
pm2 start ecosystem.config.cjs

# Monitor
pm2 logs
pm2 monit
```

## Monitoring & Observability

### Metrics Collected
- Chain execution times
- Token usage per chain
- Success/failure rates
- Model usage distribution (primary vs fallback)
- Cache hit rates
- Validation accuracy

### Metric Export
```bash
npm run export-metrics
```

Exports to [chain-performance.csv](chain-performance.csv) with columns:
- chainName
- timestamp
- inputPreview
- responseTimeMs
- tokensUsed
- model
- success
- testRun
- validationMatch

### Logging
- Structured console logging
- Request/response logging
- Error stack traces
- Performance timing logs

## Future Architecture Enhancements

### Planned Features
1. **Resume Parsing Service**: Extract structured data from PDF/DOCX resumes
2. **Job Scraping Pipeline**: Automated job posting collection from multiple sources
3. **Recommendation Engine**: Personalized job recommendations
4. **Chrome Extension**: Real-time job analysis on LinkedIn/Indeed
5. **Web Dashboard**: User interface for job seekers and recruiters
6. **Analytics Platform**: Match insights and trend analysis

### Infrastructure Improvements
1. **Database Layer**: PostgreSQL for persistent storage
2. **Caching Layer**: Redis for distributed caching
3. **Queue System**: Bull/RabbitMQ for async processing
4. **API Gateway**: Rate limiting and request routing
5. **Microservices**: Split extraction and matching into separate services
6. **Container Orchestration**: Docker + Kubernetes deployment

### ML Improvements
1. **Fine-tuned Models**: Custom models for domain-specific extraction
2. **Ensemble Methods**: Combine multiple models for better accuracy
3. **Active Learning**: Improve models based on user feedback
4. **Semantic Search**: Vector database for similarity search at scale
5. **Explainable AI**: Enhanced explanation generation with attention visualization
