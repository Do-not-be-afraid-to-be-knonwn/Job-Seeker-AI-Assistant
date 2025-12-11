import type { JobResumeMatchingInput } from '../../src/matching/schemas/jobResumeMatching.schema';

type AnyObject = Record<string, any>;

const jobSectionsMock = {
  requirements: 'Must be comfortable with TypeScript, Node.js, and AWS services.',
  responsibilities: 'Own the end-to-end development lifecycle for core platform services.',
  qualifications: '7+ years building scalable backend systems with cloud experience.',
  summary: 'High growth team searching for a senior platform engineer.',
  rawText: 'Full job description text'
};

const resumeSectionsMock = {
  experience: 'Led Node.js microservices initiatives and implemented AWS infrastructure.',
  skills: 'TypeScript, Node.js, AWS Lambda, DynamoDB, Docker, CI/CD',
  education: 'MS Computer Science, University of Example',
  summary: 'Seasoned engineer with deep experience in building cloud native services.',
  rawText: 'Full resume content'
};

const preprocessJobMock = jest.fn(() => jobSectionsMock);
const preprocessResumeMock = jest.fn(() => resumeSectionsMock);

jest.mock('../../src/matching/core/textPreprocessing.utils', () => ({
  preprocessJob: preprocessJobMock,
  preprocessResume: preprocessResumeMock,
  TextPreprocessingUtils: {
    extractJobSections: jest.fn(),
    extractResumeSections: jest.fn(),
    normalize: jest.fn(),
    tokenize: jest.fn(),
    cleanTokens: jest.fn(),
    extractEducationLevel: jest.fn(),
    checkWorkAuthorization: jest.fn(),
    preprocessForEmbedding: jest.fn()
  }
}));

const featureExtractionServiceMock = {
  extractJobFeatures: jest.fn(),
  extractResumeFeatures: jest.fn(),
  analyzeFeatureMatch: jest.fn()
};

const FeatureExtractionServiceMock = jest.fn(() => featureExtractionServiceMock);

jest.mock('../../src/matching/core/featureExtraction.service', () => ({
  FeatureExtractionService: FeatureExtractionServiceMock
}));

const hybridScoringEngineMock = {
  calculateScore: jest.fn(),
  updateConfig: jest.fn(),
  getConfig: jest.fn()
};

const HybridScoringEngineMock = jest.fn(() => hybridScoringEngineMock);

jest.mock('../../src/matching/core/hybridScoring.engine', () => ({
  HybridScoringEngine: HybridScoringEngineMock,
  defaultScoringConfig: {
    weights: {},
    gates: {},
    enableBonuses: true,
    enablePenalties: true,
    strictMode: false
  }
}));

const explanationEngineMock = {
  generateExplanation: jest.fn(),
  generateQuickSummary: jest.fn(),
  generateBatchExplanations: jest.fn()
};

const ExplanationGenerationEngineMock = jest.fn(() => explanationEngineMock);

jest.mock('../../src/matching/core/explanationGeneration.engine', () => ({
  ExplanationGenerationEngine: ExplanationGenerationEngineMock
}));

const calculateSimilarityMock = jest.fn();
const clearCacheMock = jest.fn();
const getCacheStatsMock = jest.fn();

jest.mock('../../src/matching/core/semanticSimilarity.engine', () => ({
  semanticEngine: {
    calculateSimilarity: (...args: AnyObject[]) => calculateSimilarityMock(...args),
    calculateBatchSimilarity: jest.fn(),
    clearCache: (...args: AnyObject[]) => clearCacheMock(...args),
    getCacheStats: (...args: AnyObject[]) => getCacheStatsMock(...args)
  }
}));

const monitorStartMock = jest.fn();
const monitorEndMock = jest.fn();
const monitorGetMetricsMock = jest.fn();

const chainMonitorMock = {
  startCall: monitorStartMock,
  endCall: monitorEndMock,
  getMetrics: monitorGetMetricsMock
};

jest.mock('../../src/monitor/ChainPerformanceMonitor', () => ({
  ChainPerformanceMonitor: {
    getInstance: () => chainMonitorMock
  }
}));

const { JobResumeMatchingChain } = require('../../src/matching/core/jobResumeMatching.chain') as typeof import('../../src/matching/core/jobResumeMatching.chain');

const jobDescription =
  'We are looking for a senior platform engineer to own the developer productivity stack, ' +
  'including build pipelines, observability tooling, and core runtime services. ' +
  'You will collaborate with product teams to design scalable solutions and mentor newer engineers.';

const resumeContent =
  'Senior software engineer with eight years of experience building Node.js and TypeScript services. ' +
  'Implemented AWS serverless architectures, automated CI/CD pipelines, and led cross-functional delivery initiatives.';

const semanticScoresMock = {
  requirementsMatch: 0.82,
  responsibilitiesMatch: 0.79,
  qualificationsMatch: 0.87,
  overallSemantic: 0.83,
  confidence: 'high' as const
};

const jobFeaturesMock = {
  skills: {
    required: ['TypeScript', 'Node.js', 'AWS'],
    preferred: ['Docker'],
    all: ['TypeScript', 'Node.js', 'AWS', 'Docker']
  },
  domains: ['Cloud'],
  yearsRequired: 5,
  levelRequired: 'Senior',
  education: 'Bachelors',
  workAuthRequired: true,
  location: 'Remote - US only',
  rawFeatures: {
    skills: { skills: ['TypeScript', 'Node.js', 'AWS', 'Docker'] },
    domain: { domains: ['Cloud'] },
    years: { requestYears: 5 },
    level: { level: 'Senior' }
  }
};

const resumeFeaturesMock = {
  skills: ['TypeScript', 'Node.js', 'AWS', 'Docker', 'CI/CD'],
  domains: ['Cloud', 'Fintech'],
  yearsOfExperience: 7,
  currentLevel: 'Senior',
  education: 'Masters',
  workAuthStatus: true,
  location: 'Remote',
  rawFeatures: {
    skills: { skills: ['TypeScript', 'Node.js', 'AWS', 'Docker', 'CI/CD'] },
    domain: { domains: ['Cloud', 'Fintech'] },
    years: { requestYears: 7 },
    level: { level: 'Senior' }
  }
};

const featureMatchMock = {
  skillsMatch: {
    coverage: 0.92,
    matchedSkills: ['TypeScript', 'Node.js', 'AWS'],
    missingRequired: [],
    missingPreferred: [],
    additionalSkills: ['CI/CD'],
    overlapScore: 0.75
  },
  domainMatch: {
    score: 0.9,
    matchedDomains: ['Cloud'],
    jobDomains: ['Cloud'],
    candidateDomains: ['Cloud', 'Fintech']
  },
  experienceMatch: {
    score: 0.95,
    requiredYears: 5,
    candidateYears: 7,
    yearsGap: 0,
    gapSeverity: 'none' as const
  },
  levelMatch: {
    score: 0.9,
    requiredLevel: 'Senior',
    candidateLevel: 'Senior',
    levelGap: 0,
    isPromotable: true
  },
  educationMatch: {
    score: 1,
    required: 'Bachelors',
    candidate: 'Masters',
    meetsRequirement: true
  },
  locationMatch: {
    score: 1,
    workAuthRequired: true,
    candidateStatus: true,
    meetsRequirement: true
  }
};

const scoringResultMock = {
  finalScore: 88,
  confidence: 'high' as const,
  breakdown: {
    semantic: 35.2,
    skillsCoverage: 30.1,
    experience: 12.3,
    domain: 8.4,
    education: 1.5,
    location: 1.5,
    penalties: 0,
    bonuses: -0.5
  },
  gateResults: {
    skillsGate: { passed: true, value: 0.92, threshold: 0.3 },
    experienceGate: { passed: true, value: 0, threshold: 5 },
    locationGate: { passed: true, value: true, required: true },
    educationGate: { passed: true, value: 'Masters', required: 'Bachelors' },
    overallGatesPassed: true
  },
  qualityIndicators: {
    semanticConfidence: 'high' as const,
    dataCompleteness: 0.94,
    consistencyScore: 0.88
  }
};

const explanationMock = {
  strengths: ['Excellent semantic alignment', 'Skills fully cover requirements', 'Experience exceeds requirements'],
  concerns: ['None identified'],
  summary: 'Candidate is a strong fit with complete coverage across scored dimensions.',
  recommendations: ['Proceed to interview', 'Validate cloud architecture depth'],
  keyInsights: {
    strongestMatch: 'Semantic coverage across requirements',
    biggestGap: 'No major gaps detected',
    improvementPotential: 'Highlight leadership impact for clarity'
  }
};

const quickSummaryMock = {
  score: 88,
  oneLineReason: 'Strong match across skills and experience',
  topGap: 'Minor leadership storytelling improvements',
  confidence: 'high'
};

const buildInput = (overrides: Partial<JobResumeMatchingInput> = {}): JobResumeMatchingInput => ({
  jobDescription,
  resumeContent,
  options: {
    includeExplanation: true,
    strictMode: false,
    ...overrides.options
  },
  ...overrides
});

describe('JobResumeMatchingChain', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    calculateSimilarityMock.mockResolvedValue(semanticScoresMock);

    featureExtractionServiceMock.extractJobFeatures.mockResolvedValue(jobFeaturesMock);
    featureExtractionServiceMock.extractResumeFeatures.mockResolvedValue(resumeFeaturesMock);
    featureExtractionServiceMock.analyzeFeatureMatch.mockResolvedValue(featureMatchMock);

    hybridScoringEngineMock.calculateScore.mockReturnValue(scoringResultMock);
    hybridScoringEngineMock.getConfig.mockReturnValue({ current: 'config' });

    explanationEngineMock.generateExplanation.mockReturnValue(explanationMock);
    explanationEngineMock.generateQuickSummary.mockReturnValue(quickSummaryMock);

    getCacheStatsMock.mockReturnValue({ size: 1, hits: 4 });
    monitorGetMetricsMock.mockReturnValue({
      jobResumeMatching: { totalCalls: 2, totalDuration: 120 }
    });
  });

  it('analyzes a job-resume pair and returns structured result', async () => {
    const chain = new JobResumeMatchingChain();

    const input = buildInput({
      options: {
        includeExplanation: true,
        strictMode: true,
        customWeights: { semantic: 0.5, skillsCoverage: 0.3 },
        customGates: { minSkillsCoverage: 0.4, requireWorkAuth: false }
      }
    });

    const result = await chain.analyzeMatch(input);

    expect(monitorStartMock).toHaveBeenCalledWith(
      'jobResumeMatching',
      expect.stringContaining('Job:')
    );

    expect(preprocessJobMock).toHaveBeenCalledWith(jobDescription);
    expect(preprocessResumeMock).toHaveBeenCalledWith(resumeContent);
    expect(calculateSimilarityMock).toHaveBeenCalledWith(jobSectionsMock, resumeSectionsMock);
    expect(featureExtractionServiceMock.extractJobFeatures).toHaveBeenCalledWith(jobSectionsMock);
    expect(featureExtractionServiceMock.extractResumeFeatures).toHaveBeenCalledWith(resumeSectionsMock);
    expect(featureExtractionServiceMock.analyzeFeatureMatch).toHaveBeenCalledWith(jobFeaturesMock, resumeFeaturesMock);

    expect(hybridScoringEngineMock.updateConfig).toHaveBeenCalledWith({
      weights: input.options?.customWeights,
      gates: input.options?.customGates,
      strictMode: input.options?.strictMode
    });
    expect(hybridScoringEngineMock.calculateScore).toHaveBeenCalledWith(
      semanticScoresMock,
      featureMatchMock,
      jobFeaturesMock,
      resumeFeaturesMock
    );
    expect(explanationEngineMock.generateExplanation).toHaveBeenCalledWith({
      semantic: semanticScoresMock,
      features: featureMatchMock,
      job: jobFeaturesMock,
      resume: resumeFeaturesMock,
      scoring: scoringResultMock
    });

    // Type guard to ensure result is not an error
    expect(result).not.toHaveProperty('error');
    if ('error' in result) {
      throw new Error('Expected success result but got error');
    }

    expect(result.finalScore).toBe(scoringResultMock.finalScore);
    expect(result.semanticAnalysis).toEqual(semanticScoresMock);
    expect(result.skillsMatch).toEqual(featureMatchMock.skillsMatch);
    expect(result.experienceMatch).toEqual(featureMatchMock.experienceMatch);
    expect(result.explanation).toEqual(explanationMock);
    expect(result.metadata.dataQuality.sectionsExtracted).toBe(8);
    expect(result.metadata.dataQuality.jobTextLength).toBe(jobDescription.length);
    expect(result.metadata.modelVersions.embedding).toBe('Xenova/all-MiniLM-L6-v2');

    expect(monitorEndMock).toHaveBeenCalledWith(
      'jobResumeMatching',
      expect.objectContaining({ finalScore: expect.any(Number) }),
      undefined
    );
  });

  it('skips explanation generation when includeExplanation is false', async () => {
    const chain = new JobResumeMatchingChain();
    const input = buildInput({ options: { includeExplanation: false, strictMode: false } });

    const result = await chain.analyzeMatch(input);

    expect(explanationEngineMock.generateExplanation).not.toHaveBeenCalled();

    // Type guard to ensure result is not an error
    expect(result).not.toHaveProperty('error');
    if ('error' in result) {
      throw new Error('Expected success result but got error');
    }

    expect(result.explanation.summary).toBe('Explanation generation skipped');
    expect(result.explanation.strengths).toEqual([]);
    expect(result.explanation.concerns).toEqual([]);
  });

  it('returns structured error when analysis fails', async () => {
    featureExtractionServiceMock.extractJobFeatures.mockRejectedValueOnce(
      new Error('Validation failed during extraction')
    );

    const chain = new JobResumeMatchingChain();
    const result = await chain.analyzeMatch(buildInput());

    expect(result).toHaveProperty('error', 'Validation failed during extraction');
    expect(result).toHaveProperty('errorType', 'validation');
    expect(result).toHaveProperty('fallbackScore', 10);
    expect(monitorEndMock).toHaveBeenCalledWith(
      'jobResumeMatching',
      null,
      expect.any(Error)
    );
  });

  it('processes batches with mixed results', async () => {
    const chain = new JobResumeMatchingChain();
    const successResult: AnyObject = { finalScore: 80, explanation: explanationMock };

    const analyzeMatchSpy = jest
      .spyOn(chain, 'analyzeMatch')
      .mockResolvedValueOnce(successResult as any)
      .mockRejectedValueOnce(new Error('Processing failed'));

    const batchInputs = [
      buildInput(),
      buildInput({ jobDescription: `${jobDescription} Additional requirements.` })
    ];

    const results = await chain.analyzeBatchMatches(batchInputs);

    expect(analyzeMatchSpy).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(successResult);
    expect(results[1]).toMatchObject({
      error: 'Processing failed',
      errorType: 'processing',
      fallbackScore: 5
    });
  });

  it('provides quick scores from lightweight analysis', async () => {
    const chain = new JobResumeMatchingChain();
    const results = await chain.getQuickScores([{ jobDescription, resumeContent }]);

    expect(calculateSimilarityMock).toHaveBeenCalled();
    expect(featureExtractionServiceMock.extractJobFeatures).toHaveBeenCalled();
    expect(featureExtractionServiceMock.extractResumeFeatures).toHaveBeenCalled();
    expect(explanationEngineMock.generateQuickSummary).toHaveBeenCalledWith({
      semantic: semanticScoresMock,
      features: featureMatchMock,
      job: jobFeaturesMock,
      resume: resumeFeaturesMock,
      scoring: scoringResultMock
    });
    expect(results).toEqual([
      {
        score: quickSummaryMock.score,
        confidence: quickSummaryMock.confidence,
        reason: quickSummaryMock.oneLineReason,
        gap: quickSummaryMock.topGap
      }
    ]);
  });

  it('updates and retrieves scoring configuration', () => {
    const chain = new JobResumeMatchingChain();
    const newConfig = { weights: { semantic: 0.6 } };

    chain.updateScoringConfig(newConfig);
    expect(hybridScoringEngineMock.updateConfig).toHaveBeenCalledWith(newConfig);

    const config = chain.getScoringConfig();
    expect(config).toEqual({ current: 'config' });
    expect(hybridScoringEngineMock.getConfig).toHaveBeenCalled();
  });

  it('clears caches and returns stats', () => {
    const chain = new JobResumeMatchingChain();

    chain.clearCache();
    expect(clearCacheMock).toHaveBeenCalled();

    const stats = chain.getStats();
    expect(stats).toEqual({
      cache: { size: 1, hits: 4 },
      performance: { totalCalls: 2, totalDuration: 120 }
    });
  });
});
