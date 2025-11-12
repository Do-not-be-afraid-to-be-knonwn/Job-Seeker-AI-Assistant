import { z } from 'zod';

// Sub-schemas for nested objects
export const SemanticScoresSchema = z.object({
  requirementsMatch: z.number().min(0).max(1),
  responsibilitiesMatch: z.number().min(0).max(1),
  qualificationsMatch: z.number().min(0).max(1),
  overallSemantic: z.number().min(0).max(1),
  confidence: z.enum(['low', 'medium', 'high'])
});

export const SkillsMatchSchema = z.object({
  coverage: z.number().min(0).max(1),
  matchedSkills: z.array(z.string()),
  missingRequired: z.array(z.string()),
  missingPreferred: z.array(z.string()),
  additionalSkills: z.array(z.string()),
  overlapScore: z.number().min(0).max(1)
});

export const ExperienceMatchSchema = z.object({
  score: z.number().min(0).max(1),
  requiredYears: z.number().nullable(),
  candidateYears: z.number().nullable(),
  yearsGap: z.number().min(0),
  gapSeverity: z.enum(['none', 'minor', 'moderate', 'major'])
});

export const DomainMatchSchema = z.object({
  score: z.number().min(0).max(1),
  matchedDomains: z.array(z.string()),
  jobDomains: z.array(z.string()),
  candidateDomains: z.array(z.string())
});

export const LevelMatchSchema = z.object({
  score: z.number().min(0).max(1),
  requiredLevel: z.string().nullable(),
  candidateLevel: z.string().nullable(),
  levelGap: z.number().min(0),
  isPromotable: z.boolean()
});

export const EducationMatchSchema = z.object({
  score: z.number().min(0).max(1),
  required: z.string().nullable(),
  candidate: z.string().nullable(),
  meetsRequirement: z.boolean()
});

export const LocationMatchSchema = z.object({
  score: z.number().min(0).max(1),
  workAuthRequired: z.boolean().nullable(),
  candidateStatus: z.boolean().nullable(),
  meetsRequirement: z.boolean()
});

export const ScoringBreakdownSchema = z.object({
  semantic: z.number(),
  skillsCoverage: z.number(),
  experience: z.number(),
  domain: z.number(),
  education: z.number(),
  location: z.number(),
  penalties: z.number(),
  bonuses: z.number()
});

export const GateResultSchema = z.object({
  skillsGate: z.object({
    passed: z.boolean(),
    value: z.number(),
    threshold: z.number()
  }),
  experienceGate: z.object({
    passed: z.boolean(),
    value: z.number(),
    threshold: z.number()
  }),
  locationGate: z.object({
    passed: z.boolean(),
    value: z.boolean(),
    required: z.boolean()
  }),
  educationGate: z.object({
    passed: z.boolean(),
    value: z.string().nullable(),
    required: z.string().nullable()
  }),
  overallGatesPassed: z.boolean()
});

export const QualityIndicatorsSchema = z.object({
  semanticConfidence: z.enum(['low', 'medium', 'high']),
  dataCompleteness: z.number().min(0).max(1),
  consistencyScore: z.number().min(0).max(1)
});

export const KeyInsightsSchema = z.object({
  strongestMatch: z.string(),
  biggestGap: z.string(),
  improvementPotential: z.string()
});

// Main schema for job-resume matching result
export const JobResumeMatchingSchema = z.object({
  // Overall Results
  finalScore: z.number().min(0).max(100),
  confidence: z.enum(['low', 'medium', 'high']),
  
  // Detailed Analysis
  semanticAnalysis: SemanticScoresSchema,
  skillsMatch: SkillsMatchSchema,
  experienceMatch: ExperienceMatchSchema,
  domainMatch: DomainMatchSchema,
  levelMatch: LevelMatchSchema,
  educationMatch: EducationMatchSchema,
  locationMatch: LocationMatchSchema,
  
  // Scoring Details
  scoringBreakdown: ScoringBreakdownSchema,
  gateResults: GateResultSchema,
  qualityIndicators: QualityIndicatorsSchema,
  
  // Human-Readable Explanation
  explanation: z.object({
    strengths: z.array(z.string()).max(3),
    concerns: z.array(z.string()).max(3),
    summary: z.string(),
    recommendations: z.array(z.string()).max(4),
    keyInsights: KeyInsightsSchema
  }),
  
  // Metadata
  metadata: z.object({
    processingTimeMs: z.number(),
    modelVersions: z.object({
      embedding: z.string(),
      skillsExtraction: z.string(),
      domainExtraction: z.string()
    }),
    dataQuality: z.object({
      jobTextLength: z.number(),
      resumeTextLength: z.number(),
      sectionsExtracted: z.number()
    })
  })
});

// Export the result type
export type JobResumeMatchingResult = z.infer<typeof JobResumeMatchingSchema>;

// Export component types for internal use
export type SemanticScores = z.infer<typeof SemanticScoresSchema>;
export type SkillsMatch = z.infer<typeof SkillsMatchSchema>;
export type ExperienceMatch = z.infer<typeof ExperienceMatchSchema>;
export type DomainMatch = z.infer<typeof DomainMatchSchema>;
export type LevelMatch = z.infer<typeof LevelMatchSchema>;
export type EducationMatch = z.infer<typeof EducationMatchSchema>;
export type LocationMatch = z.infer<typeof LocationMatchSchema>;
export type ScoringBreakdown = z.infer<typeof ScoringBreakdownSchema>;
export type GateResults = z.infer<typeof GateResultSchema>;
export type QualityIndicators = z.infer<typeof QualityIndicatorsSchema>;
export type KeyInsights = z.infer<typeof KeyInsightsSchema>;

// Pre-extracted resume features schema
export const PreExtractedResumeFeaturesSchema = z.object({
  skills: z.array(z.string()),
  domains: z.array(z.string()),
  yearsOfExperience: z.number().nullable(),
  currentLevel: z.string().nullable(),
  education: z.string().nullable(),
  workAuthStatus: z.boolean().nullable(),
  location: z.string().nullable(),
  // Optional: raw text sections if semantic analysis is needed
  rawSections: z.object({
    experience: z.string().optional(),
    skills: z.string().optional(),
    education: z.string().optional(),
    summary: z.string().optional(),
    rawText: z.string().optional()
  }).optional()
});

export type PreExtractedResumeFeatures = z.infer<typeof PreExtractedResumeFeaturesSchema>;

// Input validation schema for the matching function
export const JobResumeMatchingInputSchema = z.object({
  jobDescription: z.string().min(100, "Job description must be at least 100 characters"),
  // Support both raw resume content and pre-extracted features
  resumeContent: z.string().min(50, "Resume content must be at least 50 characters").optional(),
  resumeFeatures: PreExtractedResumeFeaturesSchema.optional(),
  options: z.object({
    includeExplanation: z.boolean().optional().default(true),
    strictMode: z.boolean().optional().default(false),
    customWeights: z.object({
      semantic: z.number().min(0).max(1).optional(),
      skillsCoverage: z.number().min(0).max(1).optional(),
      experience: z.number().min(0).max(1).optional(),
      domain: z.number().min(0).max(1).optional(),
      education: z.number().min(0).max(1).optional(),
      location: z.number().min(0).max(1).optional()
    }).optional(),
    customGates: z.object({
      minSkillsCoverage: z.number().min(0).max(1).optional(),
      maxYearsGap: z.number().min(0).max(10).optional(),
      requireWorkAuth: z.boolean().optional(),
      requireEducation: z.boolean().optional()
    }).optional()
  }).optional().default({})
}).refine(
  data => data.resumeContent || data.resumeFeatures,
  { message: "Either resumeContent or resumeFeatures must be provided" }
);

export type JobResumeMatchingInput = z.infer<typeof JobResumeMatchingInputSchema>;

// Error schema for consistent error handling
export const JobResumeMatchingErrorSchema = z.object({
  error: z.string(),
  errorType: z.enum(['validation', 'processing', 'timeout', 'model', 'unknown']),
  details: z.record(z.any()).optional(),
  timestamp: z.string(),
  fallbackScore: z.number().min(0).max(100).optional()
});

export type JobResumeMatchingError = z.infer<typeof JobResumeMatchingErrorSchema>;