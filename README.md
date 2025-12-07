# Job-Seeker-AI-Assistant

An enterprise-grade AI-powered platform that revolutionizes job matching through intelligent resume-job compatibility analysis. Combines cutting-edge NLP, transformer-based semantic analysis, and structured feature extraction to provide accurate, explainable match scores.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green)](https://nodejs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.3-purple)](https://langchain.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5-orange)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-ISC-yellow)](LICENSE)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Performance](#performance)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

### Problem Statement

Job seekers and recruiters face significant challenges:

- **Job Seekers**: Hours wasted reading irrelevant job descriptions, difficulty identifying suitable opportunities, unclear understanding of qualification gaps
- **Recruiters**: Manual resume screening is time-consuming, inconsistent candidate evaluation, difficulty ranking large applicant pools
- **Platforms**: Basic keyword matching fails to capture semantic meaning, no explainability in match scores, poor candidate-job alignment

### Solution

Our AI-powered system provides:

- **Intelligent Matching**: Hybrid approach combining semantic similarity (40%) with structured feature analysis (60%)
- **Explainable Results**: Detailed breakdowns of strengths, concerns, and recommendations
- **Fast Processing**: 2-8 seconds per match with caching optimizations
- **Flexible Integration**: RESTful API with support for pre-extracted features
- **High Accuracy**: Validated on real job postings with quality metrics

## Features

### Core Capabilities

#### 1. Feature Extraction System

Extract structured information from job postings:

- **Skills Extraction**: Technical skills, frameworks, tools, programming languages
- **Domain Classification**: Backend, Frontend, Full Stack, Mobile, DevOps, Data Science, QA, Product, Design, etc.
- **Level Detection**: Intern, Entry, Junior, Mid, Senior, Lead, Principal, Manager, Director, VP, Executive
- **Experience Requirements**: Years of experience required (handles ranges and implicit mentions)

**Technology**: Dual LLM architecture (Gemini 2.5 Flash Lite + Flash) with automatic retry and fallback

#### 2. Job-Resume Matching System

Comprehensive compatibility analysis:

- **Semantic Similarity**: Transformer embeddings (all-MiniLM-L6-v2) for deep understanding
- **Skills Matching**: Coverage analysis, gap identification, synonym matching
- **Experience Alignment**: Years and level matching with gap severity assessment
- **Domain Expertise**: Technical domain alignment scoring
- **Education Verification**: Degree requirement validation
- **Work Authorization**: Eligibility checking (configurable)

**Output**: 0-100 match score with confidence (low/medium/high) and detailed explanation

#### 3. Explanation Generation

Human-readable insights:

- **Strengths**: What makes this a good match
- **Concerns**: Potential issues or qualification gaps
- **Recommendations**: Actionable advice for candidates and recruiters
- **Key Insights**: Strongest match area, biggest gap, improvement potential

#### 4. Advanced Features

- **Batch Processing**: Process multiple job-resume pairs efficiently
- **Quick Scoring**: Fast screening mode without full explanation
- **Pre-extracted Features**: Reuse resume features across multiple jobs (10x speedup)
- **Custom Configuration**: Adjust scoring weights and hard gates per request
- **Performance Monitoring**: Track response times, token usage, success rates

### Technical Features

- **Dual LLM Architecture**: Primary + fallback for 99.9% uptime
- **Intelligent Caching**: Semantic embedding cache with 80-90% hit rate
- **Flexible Validation**: Zod-based schemas with comprehensive error handling
- **OAuth Authentication**: Google OAuth 2.0 integration
- **Comprehensive Testing**: Unit, integration, smoke tests with real data
- **Metrics Export**: CSV export of performance data

## Architecture

### High-Level Overview

```
┌──────────────────┐
│   API Server     │
│   (Express.js)   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───────┐
│Extract│  │ Matching │
│Chains │  │  System  │
└───────┘  └──────────┘
```

### Matching System Pipeline

```
Job + Resume
    ↓
1. Text Preprocessing
    ↓
2. Parallel Processing
   ├─→ Semantic Similarity (Embeddings)
   └─→ Feature Extraction (LLM)
    ↓
3. Feature Matching
    ↓
4. Hybrid Scoring
   ├─→ Weighted Components
   ├─→ Hard Gates
   ├─→ Adjustments
   └─→ Confidence
    ↓
5. Explanation Generation
    ↓
Match Result (0-100 score + insights)
```

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- Google Gemini API key

### Installation

```bash
# Clone repository
git clone https://github.com/Do-not-be-afraid-to-be-known/Job-Seeker-AI-Assistant.git
cd Job-Seeker-AI-Assistant

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Environment Setup

Create `.env` file:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_PRIMARY_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-2.5-flash

# Optional
PORT=3000
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_RETRIES=3

# Google OAuth (for production)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
SESSION_SECRET=your_session_secret
```

### Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server runs at `http://localhost:3000`

## Usage

### Feature Extraction

Extract structured information from job postings:

```typescript
import axios from 'axios';

const jobText = `
Senior Full Stack Engineer
5+ years experience required
Skills: React, Node.js, PostgreSQL, AWS
`;

const response = await axios.post('http://localhost:3000/extract-all', {
  text: jobText
}, {
  headers: { Authorization: 'Bearer YOUR_TOKEN' }
});

console.log(response.data);
// {
//   skills: { result: { skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'] } },
//   domain: { domains: ['Frontend', 'Backend'] },
//   years: { result: { requestYears: 5 } },
//   level: { result: { level: 'Senior' } }
// }
```

### Job-Resume Matching

Match a job posting with a resume:

```typescript
const matchResponse = await axios.post('http://localhost:3000/match-resume', {
  jobDescription: `
    We are seeking a Senior Full Stack Engineer with 5+ years experience.
    Required skills: React, Node.js, PostgreSQL, AWS
    Nice to have: GraphQL, Kubernetes
  `,
  resumeContent: `
    Senior Software Engineer with 6 years of experience.
    Expertise in React, Node.js, PostgreSQL, AWS, Docker.
    Built scalable microservices handling 1M+ daily users.
  `,
  options: {
    includeExplanation: true
  }
}, {
  headers: { Authorization: 'Bearer YOUR_TOKEN' }
});

console.log(matchResponse.data.result);
// {
//   finalScore: 87,
//   confidence: 'high',
//   explanation: {
//     strengths: ['Strong skills alignment (85% coverage)', ...],
//     concerns: ['Missing preferred: GraphQL, Kubernetes'],
//     summary: 'Excellent match - strong candidate with aligned experience'
//   },
//   skillsMatch: { coverage: 0.85, ... },
//   experienceMatch: { score: 1.0, ... }
// }
```

### Using Pre-extracted Features (Faster)

```typescript
// Extract resume features once
const resumeFeatures = {
  skills: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
  domains: ['Frontend', 'Backend'],
  yearsOfExperience: 6,
  currentLevel: 'Senior',
  education: 'Bachelors',
  rawSections: {
    experience: '6 years building scalable web applications...',
    skills: 'React, Node.js, PostgreSQL, AWS, Docker',
    // ... other sections
  }
};

// Match against multiple jobs quickly (2-3s vs 6-8s)
const quickMatch = await axios.post('http://localhost:3000/match-resume', {
  jobDescription: jobText,
  resumeFeatures: resumeFeatures,
  options: { includeExplanation: true }
});
```

### Batch Processing

```typescript
const batchResponse = await axios.post('http://localhost:3000/match-batch', {
  pairs: [
    { jobDescription: job1, resumeContent: resume1 },
    { jobDescription: job2, resumeContent: resume2 },
    { jobDescription: job3, resumeContent: resume3 }
  ],
  options: { includeExplanation: false }  // Faster for bulk
});

console.log(batchResponse.data.results);  // Array of match results
```

### Quick Screening

```typescript
// Fast screening for large candidate pools
const quickResults = await axios.post('http://localhost:3000/match-quick', {
  pairs: candidateResumes.map(resume => ({
    jobDescription: jobPosting,
    resumeContent: resume
  }))
});

// Sort by score and filter top candidates
const topCandidates = quickResults.data.results
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);
```

## API Reference

For complete API documentation with request/response schemas, see [API.md](API.md).

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/extract-all` | Extract all features from job description |
| POST | `/match-resume` | Single job-resume match with full analysis |
| POST | `/match-batch` | Batch processing of multiple pairs |
| POST | `/match-quick` | Fast scoring without detailed explanation |
| POST | `/feedback` | Submit user feedback |
| POST | `/auth/google` | Initiate Google OAuth flow |
| GET | `/auth/logout` | Logout current user |

### Authentication

All API endpoints (except auth routes) require JWT token:

```bash
curl -X POST http://localhost:3000/match-resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobDescription": "...", "resumeContent": "..."}'
```

## Testing

### Test Suite

```bash
# Run all tests
npm test

# Run smoke tests with real job data
npm run smoke

# Run local smoke tests only
npm run smoke:local

# Run matching validation tests
npm run validate:matching

# Debug single test case
npm run debug:test
```

### Test Coverage

- **Unit Tests**: Individual chain and component testing
- **Integration Tests**: API endpoint testing
- **Smoke Tests**: Real job posting validation
- **Validation Tests**: Match quality assessment

### Test Data

- [test/smoke/smoke.json](test/smoke/smoke.json): Real job postings for extraction validation
- [test/matching/validationDataset.json](test/matching/validationDataset.json): Job-resume pairs with expected scores

## Performance

### Response Times

| Operation | Mode | Time | Use Case |
|-----------|------|------|----------|
| Feature Extraction | Parallel | 4-5s | Extract all job features |
| Full Match | Raw text | 6-8s | Detailed single match |
| Full Match | Pre-extracted | 2-3s | Reuse resume features |
| Quick Match | Screening | 3-5s | Fast bulk screening |
| Batch Match | 3 pairs | 12-18s | Efficient bulk processing |

### Optimization Strategies

1. **Pre-extract Resume Features**: Extract once, match many times (10x speedup)
2. **Use Batch Endpoint**: Process multiple pairs together
3. **Skip Explanations**: Set `includeExplanation: false` for screening
4. **Quick Match Endpoint**: Use for initial filtering
5. **Enable Caching**: Semantic similarity cache provides 80-90% hit rate

### Scaling

- **Current**: Single server, in-memory caching
- **Recommended**: Redis for caching, message queue for async processing
- **Future**: Microservices architecture, horizontal scaling

## Configuration

### Scoring Weights

Default weights for hybrid scoring:

```typescript
{
  semantic: 0.40,        // 40% - Semantic similarity
  skillsCoverage: 0.30,  // 30% - Required skills coverage
  experience: 0.15,      // 15% - Years/level alignment
  domain: 0.10,          // 10% - Domain expertise
  education: 0.03,       //  3% - Education requirements
  location: 0.02         //  2% - Work authorization
}
```

### Hard Gates

Default hard gates (must pass for good score):

```typescript
{
  minSkillsCoverage: 0.3,    // 30% minimum required skills
  maxYearsGap: 5,            // Maximum 5 years experience gap
  requireWorkAuth: true,     // Work authorization required
  requireEducation: false    // Education is soft requirement
}
```

### Custom Configuration

Override defaults per request:

```typescript
{
  jobDescription: "...",
  resumeContent: "...",
  options: {
    customWeights: {
      semantic: 0.5,
      skillsCoverage: 0.35,
      experience: 0.10,
      domain: 0.05
    },
    customGates: {
      minSkillsCoverage: 0.5,  // Stricter
      maxYearsGap: 3
    },
    strictMode: true
  }
}
```

## Development

### Project Structure

```
Job-Seeker-AI-Assistant/
├── src/
│   ├── chains/              # LLM extraction chains
│   │   ├── extractSkills.chain.ts
│   │   ├── extractDomain.chain.ts
│   │   ├── extractYearsFewShot.chain.ts
│   │   └── smartExtractLevel.chain.ts
│   ├── prompts/             # Prompt templates
│   │   ├── extractSkillsPrompt.ts
│   │   ├── extractDomainPrompt.ts
│   │   ├── extractLevelFewShot.ts
│   │   └── extractYearsFewShot.ts
│   ├── schemas/             # Zod validation schemas
│   │   ├── skills.schema.ts
│   │   ├── domain.schema.ts
│   │   ├── level.schema.ts
│   │   └── years.schema.ts
│   ├── llm/                 # LLM client configuration
│   │   └── clients.ts
│   ├── monitor/             # Performance monitoring
│   │   ├── ChainPerformanceMonitor.ts
│   │   └── Validator.ts
│   ├── matching/            # Job-resume matching system
│   │   ├── core/
│   │   │   ├── jobResumeMatching.chain.ts
│   │   │   ├── featureExtraction.service.ts
│   │   │   ├── semanticSimilarity.engine.ts
│   │   │   ├── hybridScoring.engine.ts
│   │   │   ├── explanationGeneration.engine.ts
│   │   │   └── textPreprocessing.utils.ts
│   │   ├── schemas/
│   │   │   └── jobResumeMatching.schema.ts
│   │   └── validators/
│   │       └── JobResumeMatchingValidator.ts
│   ├── auth/                # Authentication
│   │   └── googleAuth.ts
│   ├── middleware/          # Express middleware
│   │   └── auth.ts
│   └── scripts/             # Utility scripts
│       ├── runExtractSkills.ts
│       └── exportMetrics.ts
├── test/                    # Test suites
│   ├── smoke/
│   │   ├── smoke.json
│   │   └── smokeTest.ts
│   └── matching/
│       ├── validationDataset.json
│       └── runValidationDataset.ts
├── server.ts               # Express server
├── package.json
├── tsconfig.json
├── README.md               # This file
├── ARCHITECTURE.md         # Detailed architecture docs
├── API.md                  # Complete API reference
└── CLAUDE.md              # Development guidelines
```

### Available Scripts

```bash
# Development
npm start                   # Run skills extraction script
npm run dev                # Watch mode for development
npm run test-setup         # Test LLM configuration

# Testing
npm test                   # Run Jest test suite
npm run smoke              # Smoke tests with real data
npm run smoke:local        # Local smoke tests only
npm run validate:matching  # Matching validation tests
npm run debug:test         # Debug single test case

# Utilities
npm run export-metrics     # Export performance metrics
```

### Adding New Extraction Chains

1. Create prompt template in `src/prompts/`
2. Define Zod schema in `src/schemas/`
3. Implement chain in `src/chains/` following existing pattern
4. Add script in `src/scripts/` for standalone testing
5. Update server.ts `/extract-all` endpoint
6. Add tests in `test/`

Example:

```typescript
// src/prompts/extractSalary.ts
export async function makeExtractSalaryPrompt() {
  return PromptTemplate.fromTemplate(`
    Extract salary information from the following job posting.
    Return ONLY a JSON object with this structure:
    {{"salaryMin": number, "salaryMax": number, "currency": string}}

    Job posting: {text}
  `);
}

// src/schemas/salary.schema.ts
export const SalarySchema = z.object({
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  currency: z.string()
});

// src/chains/extractSalary.chain.ts
export async function makeExtractSalaryChain() {
  const prompt = await makeExtractSalaryPrompt();
  return makeChain(prompt, SalarySchema, "extractSalary");
}
```

## Deployment

### Development

```bash
npm install
npm start
```

### Production with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start with ecosystem config
pm2 start ecosystem.config.cjs

# Monitor
pm2 logs
pm2 monit

# Manage
pm2 restart all
pm2 stop all
pm2 delete all
```

### Docker (Future)

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000

# Gemini Configuration
GEMINI_API_KEY=your_production_key
GEMINI_PRIMARY_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-2.5-flash

# Google OAuth
GOOGLE_CLIENT_ID=your_prod_client_id
GOOGLE_CLIENT_SECRET=your_prod_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
SESSION_SECRET=your_secure_random_secret

# Security
CORS_ORIGIN=https://yourdomain.com
```

## Roadmap

### Phase 1: Core Features ✅ (Current)
- [x] Feature extraction chains (skills, domain, level, years)
- [x] Job-resume matching with hybrid scoring
- [x] Semantic similarity engine
- [x] Explanation generation
- [x] REST API with authentication
- [x] Performance monitoring

### Phase 2: Data & Integration (Next)
- [ ] Resume parsing (PDF/DOCX support)
- [ ] Job scraping pipeline (LinkedIn, Indeed, Glassdoor)
- [ ] Database layer (PostgreSQL)
- [ ] Redis caching
- [ ] Async processing with Bull queue

### Phase 3: Advanced Features
- [ ] Chrome extension for real-time job analysis
- [ ] Web dashboard for job seekers
- [ ] Recruiter portal
- [ ] Advanced analytics
- [ ] Recommendation engine
- [ ] Email notifications

### Phase 4: ML Improvements
- [ ] Fine-tuned domain-specific models
- [ ] Active learning from user feedback
- [ ] Ensemble methods for better accuracy
- [ ] Semantic search at scale
- [ ] Explainable AI enhancements

### Phase 5: Scale & Optimize
- [ ] Microservices architecture
- [ ] Kubernetes deployment
- [ ] GraphQL API
- [ ] WebSocket real-time updates
- [ ] Multi-tenant support
- [ ] Enterprise features

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run tests**: `npm test`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style (TypeScript, ESLint)
- Add comprehensive tests for new features
- Update documentation (README, ARCHITECTURE, API docs)
- Ensure all tests pass before submitting PR
- Write clear commit messages
- Reference related issues in PR description

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Author

**Matthew Hou**
- GitHub: [@Do-not-be-afraid-to-be-known](https://github.com/Do-not-be-afraid-to-be-known)
- Project: [Job-Seeker-AI-Assistant](https://github.com/Do-not-be-afraid-to-be-known/Job-Seeker-AI-Assistant)

## Acknowledgments

- **Google Gemini**: LLM API for feature extraction
- **Xenova/Transformers.js**: Browser-compatible transformer models
- **LangChain**: LLM application framework
- **Natural.js**: Natural language processing utilities
- **Zod**: Schema validation

## Support

- **Documentation**: See [ARCHITECTURE.md](ARCHITECTURE.md) and [API.md](API.md)
- **Issues**: [GitHub Issues](https://github.com/Do-not-be-afraid-to-be-known/Job-Seeker-AI-Assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Do-not-be-afraid-to-be-known/Job-Seeker-AI-Assistant/discussions)

## Citation

If you use this project in your research or application, please cite:

```bibtex
@software{job_seeker_ai_assistant,
  author = {Hou, Matthew},
  title = {Job-Seeker-AI-Assistant: AI-Powered Job Matching Platform},
  year = {2025},
  url = {https://github.com/Do-not-be-afraid-to-be-known/Job-Seeker-AI-Assistant}
}
```

---

**Built with ❤️ using LangChain, Gemini, and TypeScript**

*Empowering job seekers and recruiters with intelligent matching technology*
