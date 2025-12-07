import request from 'supertest';

type AnyObject = Record<string, any>;

const analyzeMatchMock = jest.fn();
const analyzeBatchMatchesMock = jest.fn();
const getQuickScoresMock = jest.fn();
const updateScoringConfigMock = jest.fn();
const getScoringConfigMock = jest.fn();
const clearCacheMock = jest.fn();
const getStatsMock = jest.fn();

const jobResumeMatchingChainMock = {
  analyzeMatch: (...args: AnyObject[]) => analyzeMatchMock(...args),
  analyzeBatchMatches: (...args: AnyObject[]) => analyzeBatchMatchesMock(...args),
  getQuickScores: (...args: AnyObject[]) => getQuickScoresMock(...args),
  updateScoringConfig: (...args: AnyObject[]) => updateScoringConfigMock(...args),
  getScoringConfig: (...args: AnyObject[]) => getScoringConfigMock(...args),
  clearCache: (...args: AnyObject[]) => clearCacheMock(...args),
  getStats: (...args: AnyObject[]) => getStatsMock(...args)
};

jest.mock('../src/matching/core/jobResumeMatching.chain', () => ({
  jobResumeMatchingChain: jobResumeMatchingChainMock,
  JobResumeMatchingChain: jest.fn(),
  makeJobResumeMatchingChain: jest.fn(),
  createJobResumeMatchingChain: jest.fn()
}));

const app = require('../server').default;

const encodeSegment = (input: AnyObject) =>
  Buffer.from(JSON.stringify(input)).toString('base64');

const buildIdToken = () => {
  const header = encodeSegment({ alg: 'RS256', typ: 'JWT' });
  const payload = encodeSegment({
    sub: 'test-user',
    aud: 'extension',
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: 'openid email profile'
  });
  return `${header}.${payload}.signature`;
};

const mockMatchResult = {
  finalScore: 84,
  confidence: 'medium',
  semanticAnalysis: {
    requirementsMatch: 0.78,
    responsibilitiesMatch: 0.74,
    qualificationsMatch: 0.8,
    overallSemantic: 0.77,
    confidence: 'medium'
  },
  skillsMatch: {
    coverage: 0.7,
    matchedSkills: ['TypeScript', 'Node.js'],
    missingRequired: ['GraphQL'],
    missingPreferred: [],
    additionalSkills: ['AWS'],
    overlapScore: 0.6
  },
  experienceMatch: {
    score: 0.8,
    requiredYears: 5,
    candidateYears: 6,
    yearsGap: 0,
    gapSeverity: 'none'
  },
  domainMatch: {
    score: 0.7,
    matchedDomains: ['SaaS'],
    jobDomains: ['SaaS'],
    candidateDomains: ['SaaS', 'Fintech']
  },
  levelMatch: {
    score: 0.75,
    requiredLevel: 'Senior',
    candidateLevel: 'Senior',
    levelGap: 0,
    isPromotable: true
  },
  educationMatch: {
    score: 0.9,
    required: 'Bachelors',
    candidate: 'Masters',
    meetsRequirement: true
  },
  locationMatch: {
    score: 1,
    workAuthRequired: true,
    candidateStatus: true,
    meetsRequirement: true
  },
  scoringBreakdown: {
    semantic: 30,
    skillsCoverage: 25,
    experience: 15,
    domain: 10,
    education: 2,
    location: 2,
    penalties: 0,
    bonuses: 0
  },
  gateResults: {
    skillsGate: { passed: true, value: 0.7, threshold: 0.3 },
    experienceGate: { passed: true, value: 0, threshold: 5 },
    locationGate: { passed: true, value: true, required: true },
    educationGate: { passed: true, value: 'Masters', required: 'Bachelors' },
    overallGatesPassed: true
  },
  qualityIndicators: {
    semanticConfidence: 'medium',
    dataCompleteness: 0.9,
    consistencyScore: 0.8
  },
  explanation: {
    strengths: ['Solid semantic alignment', 'Good experience coverage'],
    concerns: ['Missing GraphQL experience'],
    summary: 'Candidate meets most requirements with a few areas to explore.',
    recommendations: ['Probe GraphQL exposure'],
    keyInsights: {
      strongestMatch: 'Experience depth',
      biggestGap: 'GraphQL knowledge',
      improvementPotential: 'Upskill in GraphQL'
    }
  },
  metadata: {
    processingTimeMs: 1200,
    modelVersions: {
      embedding: 'test',
      skillsExtraction: 'test',
      domainExtraction: 'test'
    },
    dataQuality: {
      jobTextLength: 600,
      resumeTextLength: 450,
      sectionsExtracted: 7
    }
  }
};

const mockQuickScores = [
  { score: 82, confidence: 'high', reason: 'Strong overall alignment', gap: 'Deep GraphQL expertise' }
];

describe('Matching endpoints', () => {
  let validJwt: string;

  beforeAll(async () => {
    const startResponse = await request(app)
      .post('/auth/google/start')
      .send({ redirectUri: 'http://localhost:3000/callback' });

    const authUrl = new URL(startResponse.body.authUrl);
    const state = authUrl.searchParams.get('state');

    const mockFetch = jest.mocked(require('node-fetch'));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'mock_access',
        refresh_token: 'mock_refresh_token',
        id_token: buildIdToken(),
        scope: 'openid email profile'
      })
    } as any);

    const exchangeResponse = await request(app)
      .post('/auth/exchange')
      .send({
        code: 'mock_authorization_code',
        state,
        redirectUri: 'http://localhost:3000/callback'
      });

    validJwt = exchangeResponse.body.jwt;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    analyzeMatchMock.mockResolvedValue(mockMatchResult);
    analyzeBatchMatchesMock.mockResolvedValue([mockMatchResult]);
    getQuickScoresMock.mockResolvedValue(mockQuickScores);
  });

  describe('POST /match-resume', () => {
    const validRequestBody = {
      jobDescription: 'A'.repeat(120),
      resumeContent: 'B'.repeat(80)
    };

    it('rejects requests without authentication', async () => {
      const response = await request(app)
        .post('/match-resume')
        .send(validRequestBody);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Missing authorization header');
    });

    it('validates presence of jobDescription and resumeContent', async () => {
      const response = await request(app)
        .post('/match-resume')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ jobDescription: '', resumeContent: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Both jobDescription and resumeContent are required');
    });

    it('returns matching analysis result', async () => {
      const response = await request(app)
        .post('/match-resume')
        .set('Authorization', `Bearer ${validJwt}`)
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockMatchResult);
      expect(analyzeMatchMock).toHaveBeenCalledWith({
        ...validRequestBody,
        options: expect.objectContaining({
          includeExplanation: true,
          strictMode: false
        })
      });
    });

    it('passes through structured error responses from the chain', async () => {
      const chainError = {
        error: 'Processing timeout',
        errorType: 'timeout',
        fallbackScore: 10,
        timestamp: new Date().toISOString()
      };

      analyzeMatchMock.mockResolvedValueOnce(chainError);

      const response = await request(app)
        .post('/match-resume')
        .set('Authorization', `Bearer ${validJwt}`)
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(chainError);
    });

    it('returns 500 when the chain throws', async () => {
      analyzeMatchMock.mockRejectedValueOnce(new Error('analysis failure'));

      const response = await request(app)
        .post('/match-resume')
        .set('Authorization', `Bearer ${validJwt}`)
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('analysis failure');
    });
  });

  describe('POST /match-batch', () => {
    const basePairs = [
      {
        jobDescription: 'Senior frontend engineer with React and TypeScript expertise.'.padEnd(120, '!'),
        resumeContent: 'Developer with 6 years of React experience delivering production features.'.padEnd(80, '!'),
        options: { strictMode: true }
      },
      {
        jobDescription: 'Backend engineer focusing on Node.js APIs and distributed systems.'.padEnd(120, '!'),
        resumeContent: 'Engineer experienced with Node.js, AWS, and event-driven architectures.'.padEnd(80, '!'),
        options: { includeExplanation: true }
      }
    ];

    it('requires authentication', async () => {
      const response = await request(app)
        .post('/match-batch')
        .send({ pairs: basePairs });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Missing authorization header');
    });

    it('validates that pairs array is provided', async () => {
      const response = await request(app)
        .post('/match-batch')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ options: { strictMode: true } });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('pairs array is required');
    });

    it('processes batch requests and returns combined results', async () => {
      analyzeBatchMatchesMock.mockResolvedValueOnce([mockMatchResult, mockMatchResult]);

      const response = await request(app)
        .post('/match-batch')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ pairs: basePairs, options: { includeExplanation: true } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toEqual([mockMatchResult, mockMatchResult]);

      expect(analyzeBatchMatchesMock).toHaveBeenCalledWith([
        {
          jobDescription: basePairs[0].jobDescription,
          resumeContent: basePairs[0].resumeContent,
          options: {
            includeExplanation: true,
            strictMode: true
          }
        },
        {
          jobDescription: basePairs[1].jobDescription,
          resumeContent: basePairs[1].resumeContent,
          options: {
            includeExplanation: true,
            strictMode: false
          }
        }
      ]);
    });

    it('returns 500 when the chain throws during batch processing', async () => {
      analyzeBatchMatchesMock.mockRejectedValueOnce(new Error('batch failure'));

      const response = await request(app)
        .post('/match-batch')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ pairs: basePairs });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('batch failure');
    });
  });

  describe('POST /match-quick', () => {
    const quickPairs = [
      {
        jobDescription: 'DevOps engineer role maintaining CI/CD and cloud infrastructure.'.padEnd(120, '!'),
        resumeContent: 'Engineer with Kubernetes and Terraform experience leading automation projects.'.padEnd(80, '!')
      }
    ];

    it('requires authentication', async () => {
      const response = await request(app)
        .post('/match-quick')
        .send({ pairs: quickPairs });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Missing authorization header');
    });

    it('validates that pairs array is provided', async () => {
      const response = await request(app)
        .post('/match-quick')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('pairs array is required');
    });

    it('returns quick score summaries', async () => {
      const response = await request(app)
        .post('/match-quick')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ pairs: quickPairs });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toEqual(mockQuickScores);
      expect(getQuickScoresMock).toHaveBeenCalledWith(quickPairs);
    });

    it('returns 500 if quick scoring fails', async () => {
      getQuickScoresMock.mockRejectedValueOnce(new Error('quick failure'));

      const response = await request(app)
        .post('/match-quick')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ pairs: quickPairs });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('quick failure');
    });
  });
});
