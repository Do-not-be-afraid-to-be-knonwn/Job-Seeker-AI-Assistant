# API Documentation

## Base URL

```
http://localhost:3000
```

## Authentication

All endpoints (except authentication routes) require a valid JWT token obtained through Google OAuth.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Authentication Endpoints

### POST /auth/google

Initiate Google OAuth flow.

**Response**: Redirects to Google OAuth consent screen

### GET /auth/google/callback

OAuth callback endpoint (handled automatically by Google OAuth).

**Response**: Redirects to application with JWT token

### GET /auth/logout

Logout the current user.

**Response**: `200 OK`

---

## Feature Extraction Endpoints

### POST /extract-all

Extract all features from a job description in parallel.

#### Request

```json
{
  "text": "Senior Python Developer with 5+ years experience in Django and AWS..."
}
```

**Alternative field names**: `description`, `title` (system will use first available)

#### Response

```json
{
  "skills": {
    "result": {
      "skills": ["Python", "Django", "AWS", "PostgreSQL", "Docker"]
    }
  },
  "domain": {
    "domains": ["Backend", "DevOps"]
  },
  "years": {
    "result": {
      "requestYears": 5
    }
  },
  "level": {
    "result": {
      "level": "Senior"
    }
  }
}
```

#### Error Response

If a chain fails, the response includes an error object:

```json
{
  "skills": {
    "error": "Failed to parse or validate output"
  },
  "domain": {
    "domains": ["Backend"]
  },
  "years": {
    "result": {
      "requestYears": 5
    }
  },
  "level": {
    "result": {
      "level": "Senior"
    }
  }
}
```

#### Performance

- **Average Response Time**: 4-5 seconds (parallel execution)
- **Rate Limit**: None (consider implementing in production)
- **Caching**: No (chains execute fresh each time)

---

## Job-Resume Matching Endpoints

### POST /match-resume

Analyze compatibility between a single job posting and resume.

#### Request (Mode 1: Full Extraction)

```json
{
  "jobDescription": "We are seeking a Senior Full Stack Engineer with 5+ years...",
  "resumeContent": "Experienced software engineer with expertise in React, Node.js...",
  "options": {
    "includeExplanation": true,
    "strictMode": false,
    "customWeights": {
      "semantic": 0.5,
      "skillsCoverage": 0.25,
      "experience": 0.15,
      "domain": 0.07,
      "education": 0.02,
      "location": 0.01
    },
    "customGates": {
      "minSkillsCoverage": 0.3,
      "maxYearsGap": 5,
      "requireWorkAuth": true,
      "requireEducation": false
    }
  }
}
```

#### Request (Mode 2: Pre-extracted Resume Features)

```json
{
  "jobDescription": "We are seeking a Senior Full Stack Engineer...",
  "resumeFeatures": {
    "skills": ["React", "Node.js", "PostgreSQL", "AWS", "Docker"],
    "domains": ["Frontend", "Backend"],
    "yearsOfExperience": 6,
    "currentLevel": "Senior",
    "education": "Bachelors",
    "workAuthStatus": true,
    "location": "San Francisco, CA",
    "rawSections": {
      "experience": "5 years at Google as Full Stack Engineer...",
      "skills": "React, Node.js, PostgreSQL, AWS, Docker, Kubernetes",
      "education": "BS Computer Science, Stanford University",
      "summary": "Senior Full Stack Engineer with 6 years experience...",
      "rawText": "Full resume text here..."
    }
  },
  "options": {
    "includeExplanation": true
  }
}
```

**Note**: Mode 2 is significantly faster as it skips resume feature extraction.

#### Response

```json
{
  "success": true,
  "result": {
    "finalScore": 87,
    "confidence": "high",

    "semanticAnalysis": {
      "requirementsMatch": 0.842,
      "responsibilitiesMatch": 0.891,
      "qualificationsMatch": 0.823,
      "overallSemantic": 0.856,
      "confidence": "high"
    },

    "skillsMatch": {
      "coverage": 0.85,
      "matchedSkills": ["React", "Node.js", "PostgreSQL", "AWS"],
      "missingRequired": ["GraphQL"],
      "missingPreferred": ["Kubernetes"],
      "additionalSkills": ["Docker", "Redis"],
      "overlapScore": 0.72
    },

    "experienceMatch": {
      "score": 1.0,
      "requiredYears": 5,
      "candidateYears": 6,
      "yearsGap": 0,
      "gapSeverity": "none"
    },

    "domainMatch": {
      "score": 1.0,
      "matchedDomains": ["Frontend", "Backend"],
      "jobDomains": ["Frontend", "Backend"],
      "candidateDomains": ["Frontend", "Backend"]
    },

    "levelMatch": {
      "score": 1.0,
      "requiredLevel": "Senior",
      "candidateLevel": "Senior",
      "levelGap": 0,
      "isPromotable": true
    },

    "educationMatch": {
      "score": 1.0,
      "required": "Bachelors",
      "candidate": "Bachelors",
      "meetsRequirement": true
    },

    "locationMatch": {
      "score": 1.0,
      "workAuthRequired": true,
      "candidateStatus": true,
      "meetsRequirement": true
    },

    "scoringBreakdown": {
      "semantic": 34.24,
      "skillsCoverage": 25.5,
      "experience": 15.0,
      "domain": 10.0,
      "education": 3.0,
      "location": 2.0,
      "penalties": 0,
      "bonuses": 5
    },

    "gateResults": {
      "skillsGate": {
        "passed": true,
        "value": 0.85,
        "threshold": 0.3
      },
      "experienceGate": {
        "passed": true,
        "value": 0,
        "threshold": 5
      },
      "locationGate": {
        "passed": true,
        "value": true,
        "required": true
      },
      "educationGate": {
        "passed": true,
        "value": "Bachelors",
        "required": "Bachelors"
      },
      "overallGatesPassed": true
    },

    "qualityIndicators": {
      "semanticConfidence": "high",
      "dataCompleteness": 0.95,
      "consistencyScore": 0.88
    },

    "explanation": {
      "strengths": [
        "Strong technical skills alignment with 85% coverage of required skills",
        "Excellent semantic match (86%) between job requirements and candidate experience",
        "Candidate exceeds experience requirement with 6 years vs 5 required",
        "Perfect domain alignment in Full Stack development"
      ],
      "concerns": [
        "Missing preferred skill: GraphQL",
        "Missing preferred skill: Kubernetes"
      ],
      "summary": "Excellent match (87/100) - Strong candidate with aligned skills, experience, and background",
      "recommendations": [
        "Candidate: Consider gaining experience with GraphQL for preferred skills",
        "Recruiter: Strong candidate for interview - all hard requirements met",
        "Both: Discuss Kubernetes experience during interview as it's a preferred skill"
      ],
      "keyInsights": {
        "strongestMatch": "Domain expertise - Perfect alignment in Full Stack development",
        "biggestGap": "Preferred skills - Missing GraphQL and Kubernetes",
        "improvementPotential": "Adding GraphQL experience could push score to 92+"
      }
    },

    "metadata": {
      "processingTimeMs": 5432,
      "modelVersions": {
        "embedding": "Xenova/all-MiniLM-L6-v2",
        "skillsExtraction": "gemini-2.5-flash-lite",
        "domainExtraction": "gemini-2.5-flash-lite"
      },
      "dataQuality": {
        "jobTextLength": 2456,
        "resumeTextLength": 3421,
        "sectionsExtracted": 8
      }
    }
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Both jobDescription and resumeContent are required"
}
```

Or for processing errors:

```json
{
  "success": false,
  "error": "Error message details",
  "errorType": "processing",
  "details": {
    "processingTimeMs": 1234,
    "inputLengths": {
      "job": 2456,
      "resume": 3421
    }
  },
  "timestamp": "2025-11-11T12:34:56.789Z",
  "fallbackScore": 10
}
```

#### Options

- `includeExplanation` (boolean, default: `true`): Generate detailed explanation
- `strictMode` (boolean, default: `false`): Enforce hard gates more strictly
- `customWeights` (object, optional): Override default scoring weights
- `customGates` (object, optional): Override default hard gates

#### Performance

- **Mode 1 (Full Extraction)**: 6-8 seconds
- **Mode 2 (Pre-extracted)**: 2-3 seconds
- **Without Explanation**: -2 seconds

---

### POST /match-batch

Analyze multiple job-resume pairs in batch.

#### Request

```json
{
  "pairs": [
    {
      "jobDescription": "Job 1 description...",
      "resumeContent": "Resume 1 content...",
      "options": {
        "includeExplanation": false
      }
    },
    {
      "jobDescription": "Job 2 description...",
      "resumeContent": "Resume 2 content..."
    }
  ],
  "options": {
    "includeExplanation": false,
    "strictMode": false
  }
}
```

**Note**: Pair-specific options override global options.

#### Response

```json
{
  "success": true,
  "results": [
    {
      "finalScore": 87,
      "confidence": "high",
      // ... full result for pair 1
    },
    {
      "finalScore": 65,
      "confidence": "medium",
      // ... full result for pair 2
    }
  ]
}
```

#### Batch Processing

- **Batch Size**: 3 pairs processed in parallel
- **Rate Limiting**: 1 second delay between batches
- **Recommended Use**: Pre-extracted resume features for faster processing

#### Performance

- **Per Pair (Full Extraction)**: 6-8 seconds
- **Per Pair (Pre-extracted)**: 2-3 seconds
- **Total Time**: `(pairs / 3) * average_time + delays`

---

### POST /match-quick

Get quick match scores without full explanation (optimized for bulk screening).

#### Request

```json
{
  "pairs": [
    {
      "jobDescription": "Job 1 description...",
      "resumeContent": "Resume 1 content..."
    },
    {
      "jobDescription": "Job 2 description...",
      "resumeContent": "Resume 2 content..."
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "results": [
    {
      "score": 87,
      "confidence": "high",
      "reason": "Strong skills match (85%) with aligned experience and domain",
      "gap": "Missing preferred: GraphQL, Kubernetes"
    },
    {
      "score": 65,
      "confidence": "medium",
      "reason": "Good skills match (70%) but experience gap of 2 years",
      "gap": "2 years below required experience"
    }
  ]
}
```

#### Performance

- **Per Pair**: 3-5 seconds
- **No Explanation**: Significantly faster than full match
- **Recommended For**: Initial screening, bulk filtering

---

### POST /feedback

Submit user feedback on extraction or matching results.

#### Request

```json
{
  "endpoint": "/match-resume",
  "feedback": "positive",
  "comment": "Very accurate matching result",
  "data": {
    "jobId": "job-123",
    "candidateId": "candidate-456",
    "score": 87
  }
}
```

#### Response

```json
{
  "success": true
}
```

#### Feedback Storage

- **File**: `feedback.jsonl` (JSON Lines format)
- **Format**: One JSON object per line with timestamp

```jsonl
{"timestamp":"2025-11-11T12:34:56.789Z","endpoint":"/match-resume","feedback":"positive","comment":"Very accurate matching result","data":{"jobId":"job-123","candidateId":"candidate-456","score":87}}
```

---

## Error Codes

### 400 Bad Request
- Invalid request body
- Missing required fields
- Schema validation failure

```json
{
  "success": false,
  "error": "Both jobDescription and resumeContent are required"
}
```

### 401 Unauthorized
- Missing or invalid JWT token
- Token expired

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### 500 Internal Server Error
- LLM API failure
- Processing error
- Unexpected exception

```json
{
  "success": false,
  "error": "Error message",
  "errorType": "processing"
}
```

---

## Rate Limiting

**Current Implementation**: None

**Recommended for Production**:
- 100 requests per hour per user (extraction endpoints)
- 50 requests per hour per user (matching endpoints)
- 10 requests per minute (burst protection)

---

## Scoring Configuration

### Default Weights

```typescript
{
  semantic: 0.40,        // 40% - Semantic similarity
  skillsCoverage: 0.30,  // 30% - Required skills coverage
  experience: 0.15,      // 15% - Years/level alignment
  domain: 0.10,          // 10% - Domain expertise match
  education: 0.03,       //  3% - Education requirement
  location: 0.02         //  2% - Work authorization
}
```

### Default Gates

```typescript
{
  minSkillsCoverage: 0.3,    // 30% minimum required skills
  maxYearsGap: 5,            // Maximum 5 years experience gap
  requireWorkAuth: true,     // Work authorization required (disabled in scoring)
  requireEducation: false    // Education is soft requirement
}
```

### Custom Configuration Example

```json
{
  "jobDescription": "...",
  "resumeContent": "...",
  "options": {
    "customWeights": {
      "semantic": 0.50,
      "skillsCoverage": 0.35,
      "experience": 0.10,
      "domain": 0.05,
      "education": 0.0,
      "location": 0.0
    },
    "customGates": {
      "minSkillsCoverage": 0.5,
      "maxYearsGap": 3,
      "requireWorkAuth": false,
      "requireEducation": true
    },
    "strictMode": true
  }
}
```

---

## Response Time Optimization

### Strategies

1. **Pre-extract Resume Features**: Extract once, match many times
2. **Skip Explanation**: Set `includeExplanation: false` for bulk operations
3. **Use Quick Match**: For initial screening before full analysis
4. **Batch Processing**: Process multiple pairs in single request
5. **Cache Results**: Client-side caching of match results

### Performance Comparison

| Scenario | Time | Use Case |
|----------|------|----------|
| Full match with explanation | 6-8s | Detailed single match |
| Full match without explanation | 4-6s | Batch processing |
| Pre-extracted with explanation | 2-3s | Re-matching with same resume |
| Pre-extracted without explanation | 1-2s | Bulk screening |
| Quick match | 3-5s | Fast filtering |

---

## Best Practices

### For Feature Extraction

1. **Combine Fields**: Send complete job description in `text` field
2. **Handle Errors**: Check for `error` field in each chain result
3. **Retry Logic**: Implement exponential backoff for failed requests
4. **Cache Results**: Store extracted features for reuse

### For Job-Resume Matching

1. **Pre-extract Resumes**: Extract resume features once, store in database
2. **Use Batch Endpoint**: For multiple matches with same job
3. **Appropriate Explanations**: Skip explanations for bulk screening
4. **Monitor Performance**: Track processing times and adjust batch sizes
5. **Custom Configuration**: Tune weights/gates based on your use case

### For Production Deployment

1. **Implement Rate Limiting**: Prevent API abuse
2. **Add Caching Layer**: Redis for frequently matched pairs
3. **Queue System**: Async processing for large batches
4. **Monitor Metrics**: Track success rates, response times, token usage
5. **Error Handling**: Graceful degradation on LLM failures

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Get JWT token (after OAuth flow)
const token = 'your_jwt_token';

// Extract features from job description
async function extractFeatures(jobText) {
  const response = await axios.post(
    'http://localhost:3000/extract-all',
    { text: jobText },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

// Match job and resume
async function matchJobResume(jobDescription, resumeContent) {
  const response = await axios.post(
    'http://localhost:3000/match-resume',
    {
      jobDescription,
      resumeContent,
      options: { includeExplanation: true }
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.result;
}

// Quick screening
async function quickScreen(jobDescription, resumes) {
  const pairs = resumes.map(resume => ({
    jobDescription,
    resumeContent: resume
  }));

  const response = await axios.post(
    'http://localhost:3000/match-quick',
    { pairs },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data.results;
}
```

### Python

```python
import requests

token = 'your_jwt_token'
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Extract features
def extract_features(job_text):
    response = requests.post(
        'http://localhost:3000/extract-all',
        json={'text': job_text},
        headers=headers
    )
    return response.json()

# Match job and resume
def match_job_resume(job_description, resume_content):
    response = requests.post(
        'http://localhost:3000/match-resume',
        json={
            'jobDescription': job_description,
            'resumeContent': resume_content,
            'options': {'includeExplanation': True}
        },
        headers=headers
    )
    return response.json()['result']

# Batch processing with pre-extracted features
def batch_match(job_description, resume_features_list):
    pairs = [{
        'jobDescription': job_description,
        'resumeFeatures': features,
        'options': {'includeExplanation': False}
    } for features in resume_features_list]

    response = requests.post(
        'http://localhost:3000/match-batch',
        json={'pairs': pairs},
        headers=headers
    )
    return response.json()['results']
```

### cURL

```bash
# Extract features
curl -X POST http://localhost:3000/extract-all \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Senior Python Developer with 5+ years experience..."
  }'

# Match job and resume
curl -X POST http://localhost:3000/match-resume \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "We are seeking a Senior Engineer...",
    "resumeContent": "Experienced developer with...",
    "options": {
      "includeExplanation": true
    }
  }'

# Quick screening
curl -X POST http://localhost:3000/match-quick \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pairs": [
      {
        "jobDescription": "Job 1...",
        "resumeContent": "Resume 1..."
      },
      {
        "jobDescription": "Job 2...",
        "resumeContent": "Resume 2..."
      }
    ]
  }'
```

---

## Webhooks (Future)

*Not currently implemented*

Future webhook support for async processing:

```json
{
  "jobDescription": "...",
  "resumeContent": "...",
  "webhookUrl": "https://your-app.com/webhook",
  "webhookSecret": "your_secret"
}
```

---

## GraphQL API (Future)

*Not currently implemented*

Planned GraphQL API for more flexible querying:

```graphql
query {
  matchResume(
    jobDescription: "..."
    resumeContent: "..."
    options: { includeExplanation: true }
  ) {
    finalScore
    confidence
    explanation {
      strengths
      concerns
      summary
    }
  }
}
```

---

## Support

For API issues or questions:
- GitHub Issues: https://github.com/Do-not-be-afraid-to-be-known/Job-Seeker-AI-Assistant/issues
- Documentation: See [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md)
