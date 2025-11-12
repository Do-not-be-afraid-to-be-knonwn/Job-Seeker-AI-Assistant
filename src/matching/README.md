# Job-Resume Matching System

## Overview

The matching system analyzes job descriptions against candidate resumes to produce a compatibility score (0-100) with detailed explanations.

## Architecture

### Two Matching Modes

#### 1. **Direct Matching** (Legacy - Less Efficient)
Extract features from resume on every match operation.

```typescript
const result = await chain.analyzeMatch({
  jobDescription: jobText,
  resumeContent: resumeText,  // ❌ Features extracted every time
  options: { includeExplanation: true }
});
```

#### 2. **Pre-Extracted Matching** (Recommended - Highly Efficient) ⭐
Extract resume features ONCE, then reuse for multiple job matches.

```typescript
// Step 1: Extract resume features ONCE when uploaded
const resumeFeatures = await extractResumeForMatching(resumeText);

// Step 2: Match against MULTIPLE jobs using the SAME features
for (const job of jobPostings) {
  const result = await chain.analyzeMatch({
    jobDescription: job.description,
    resumeFeatures: resumeFeatures,  // ✅ Reused pre-extracted features
    options: { includeExplanation: true }
  });
}
```

### Why Pre-Extracted Mode?

**Performance Benefits:**
- **Resume extraction**: ~2-3 seconds (done once)
- **Job matching**: ~500-800ms (per job, using pre-extracted features)
- **Direct matching**: ~2-3 seconds (per job, extracts resume every time)

**For 10 job matches:**
- Pre-extracted: ~2s + (10 × 0.6s) = **~8 seconds total**
- Direct mode: 10 × 2.5s = **~25 seconds total**

**3x faster for multiple matches!** 🚀

## Usage Examples

### Basic: Pre-Extracted Matching (Recommended)

```typescript
import { extractResumeForMatching } from './matching/services/resumeExtraction.service';
import { JobResumeMatchingChain } from './matching/core/jobResumeMatching.chain';

// Extract resume features once
const resumeFeatures = await extractResumeForMatching(resumeText);

// Match against multiple jobs
const chain = new JobResumeMatchingChain();

for (const job of jobPostings) {
  const result = await chain.analyzeMatch({
    jobDescription: job.description,
    resumeFeatures: resumeFeatures,
    options: {
      includeExplanation: true,
      strictMode: false
    }
  });

  console.log(`Score: ${result.finalScore}/100`);
  console.log(`Confidence: ${result.confidence}`);
}
```

### Advanced: Custom Scoring Configuration

```typescript
const result = await chain.analyzeMatch({
  jobDescription: jobText,
  resumeFeatures: preExtractedFeatures,
  options: {
    includeExplanation: true,
    strictMode: true,
    customWeights: {
      semantic: 0.25,
      skillsCoverage: 0.45,
      experience: 0.20,
      domain: 0.10
    },
    customGates: {
      minSkillsCoverage: 0.7,
      maxYearsGap: 3,
      requireWorkAuth: true,
      requireEducation: false
    }
  }
});
```

### Pre-Extracted Resume Features Schema

```typescript
interface PreExtractedResumeFeatures {
  skills: string[];
  domains: string[];
  yearsOfExperience: number | null;
  currentLevel: string | null;
  education: string | null;
  workAuthStatus: boolean | null;
  location: string | null;
  rawSections?: {
    experience?: string;
    skills?: string;
    education?: string;
    summary?: string;
    rawText?: string;
  };
}
```

**Important Notes:**
- Include `rawSections` if you want semantic similarity analysis (recommended)
- Without `rawSections`, only feature-based matching is performed
- `rawSections.rawText` should contain the full resume text for best results

## Result Structure

```typescript
interface JobResumeMatchingResult {
  finalScore: number;              // 0-100 overall compatibility
  confidence: 'low' | 'medium' | 'high';

  // Component scores
  semanticAnalysis: { ... };       // Semantic text similarity
  skillsMatch: { ... };            // Skills coverage and overlap
  experienceMatch: { ... };        // Years of experience alignment
  domainMatch: { ... };            // Technical domain match
  levelMatch: { ... };             // Seniority level alignment
  educationMatch: { ... };         // Education requirement match
  locationMatch: { ... };          // Work authorization match

  // Scoring details
  scoringBreakdown: { ... };       // Component contributions
  gateResults: { ... };            // Hard requirement gates
  qualityIndicators: { ... };      // Data quality metrics

  // Human-readable explanation
  explanation: {
    strengths: string[];           // Top 3 strengths
    concerns: string[];            // Top 3 concerns
    summary: string;               // Overall summary
    recommendations: string[];     // Action recommendations
    keyInsights: { ... };
  };

  metadata: { ... };
}
```

## API Endpoints

### `/extract-resume-features`
Extract and cache resume features for reuse.

**Request:**
```json
{
  "resumeContent": "...",
  "includeRawSections": true
}
```

**Response:**
```json
{
  "features": {
    "skills": ["React", "Node.js", "TypeScript"],
    "domains": ["Frontend", "Full Stack"],
    "yearsOfExperience": 7,
    "currentLevel": "Senior",
    "education": "Bachelors",
    "workAuthStatus": true,
    "location": "United States",
    "rawSections": { ... }
  }
}
```

### `/match-job-resume`
Match job against pre-extracted resume features.

**Request:**
```json
{
  "jobDescription": "...",
  "resumeFeatures": { ... },
  "options": {
    "includeExplanation": true,
    "strictMode": false
  }
}
```

**Response:**
```json
{
  "finalScore": 85,
  "confidence": "high",
  "skillsMatch": { ... },
  "explanation": { ... }
}
```

## Running Examples

```bash
# Run the pre-extracted matching demonstration
npx ts-node src/matching/examples/preExtractedMatchingExample.ts

# Run evaluation test (legacy mode)
npx ts-node test/matching/runEvaluationTest.ts case-18

# Run validation dataset tests
npm run validate:matching
```

## Architecture Files

- `schemas/jobResumeMatching.schema.ts` - TypeScript schemas and validation
- `core/jobResumeMatching.chain.ts` - Main matching orchestrator
- `core/featureExtraction.service.ts` - Feature extraction logic
- `services/resumeExtraction.service.ts` - Resume pre-extraction service
- `core/hybridScoring.engine.ts` - Scoring algorithm
- `core/semanticSimilarity.engine.ts` - Semantic text analysis
- `core/explanationGeneration.engine.ts` - Human-readable explanations

## Performance Optimization Tips

1. **Always use pre-extracted features** for matching against multiple jobs
2. **Include rawSections** in pre-extracted features for semantic analysis
3. **Set includeExplanation: false** for quick scoring (saves ~100-200ms)
4. **Use batch methods** for processing multiple matches
5. **Cache pre-extracted features** in your database/storage

## Future Improvements

- [ ] Separate resume extraction chain optimized for resume language patterns
- [ ] Improve years of experience calculation from multiple job positions
- [ ] Better level/title extraction from resume job positions
- [ ] Support for multiple resume formats (PDF, DOCX, etc.)
