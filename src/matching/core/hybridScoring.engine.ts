import { SimilarityScores } from './semanticSimilarity.engine';
import { FeatureMatchAnalysis, ExtractedJobFeatures, ExtractedResumeFeatures } from './featureExtraction.service';

export interface ScoringWeights {
  semantic: number;           // Semantic similarity weight (default: 0.40)
  skillsCoverage: number;     // Required skills coverage (default: 0.30)
  experience: number;         // Years/level alignment (default: 0.15)
  domain: number;            // Domain expertise match (default: 0.10)
  education: number;         // Education requirement (default: 0.03)
  location: number;          // Work authorization (default: 0.02)
}

export interface HardGates {
  minSkillsCoverage: number;  // Minimum required skills coverage (default: 0.3)
  maxYearsGap: number;       // Maximum acceptable years gap (default: 5)
  requireWorkAuth: boolean;   // Enforce work authorization (default: true)
  requireEducation: boolean;  // Enforce education requirement (default: false)
}

export interface ScoringResult {
  finalScore: number;         // 0-100 final match score
  confidence: 'low' | 'medium' | 'high';
  breakdown: {
    semantic: number;         // Contribution from semantic similarity
    skillsCoverage: number;   // Contribution from skills coverage
    experience: number;       // Contribution from experience match
    domain: number;          // Contribution from domain match
    education: number;       // Contribution from education match
    location: number;        // Contribution from location/auth match
    penalties: number;       // Any penalties applied
    bonuses: number;         // Any bonuses applied
  };
  gateResults: {
    skillsGate: { passed: boolean; value: number; threshold: number };
    experienceGate: { passed: boolean; value: number; threshold: number };
    locationGate: { passed: boolean; value: boolean; required: boolean };
    educationGate: { passed: boolean; value: string | null; required: string | null };
    overallGatesPassed: boolean;
  };
  qualityIndicators: {
    semanticConfidence: 'low' | 'medium' | 'high';
    dataCompleteness: number; // 0-1, how much data we have
    consistencyScore: number; // 0-1, how consistent the signals are
  };
}

export interface ScoringConfig {
  weights: ScoringWeights;
  gates: HardGates;
  enableBonuses: boolean;
  enablePenalties: boolean;
  strictMode: boolean; // If true, gates are enforced more strictly
}

/**
 * Hybrid scoring engine that combines semantic similarity with structured features
 * Implements the Layer 2 scoring algorithm with configurable weights and gates
 */
export class HybridScoringEngine {
  private config: ScoringConfig;

  constructor(config?: Partial<ScoringConfig>) {
    this.config = {
      weights: {
        semantic: 0.40,
        skillsCoverage: 0.30,
        experience: 0.15,
        domain: 0.10,
        education: 0.03,
        location: 0.02,
        ...config?.weights
      },
      gates: {
        minSkillsCoverage: 0.3,
        maxYearsGap: 5,
        requireWorkAuth: true,
        requireEducation: false,
        ...config?.gates
      },
      enableBonuses: config?.enableBonuses ?? true,
      enablePenalties: config?.enablePenalties ?? true,
      strictMode: config?.strictMode ?? false
    };

    // Normalize weights to ensure they sum to 1.0
    this.normalizeWeights();
  }

  /**
   * Calculate final match score combining all signals
   */
  calculateScore(
    semanticScores: SimilarityScores,
    featureMatch: FeatureMatchAnalysis,
    jobFeatures: ExtractedJobFeatures,
    resumeFeatures: ExtractedResumeFeatures
  ): ScoringResult {
    // 1. Calculate base component scores (0-100)
    const componentScores = this.calculateComponentScores(semanticScores, featureMatch);

    // 2. Apply weights to get weighted contributions
    const weightedContributions = this.applyWeights(componentScores);

    // 3. Check hard gates
    const gateResults = this.checkHardGates(featureMatch, jobFeatures, resumeFeatures);

    // 4. Calculate base score
    let baseScore = Object.values(weightedContributions).reduce((sum, contrib) => sum + contrib, 0);

    // 5. Apply bonuses and penalties
    const adjustments = this.calculateAdjustments(
      semanticScores,
      featureMatch,
      jobFeatures,
      resumeFeatures,
      baseScore
    );

    // 6. Apply gate constraints
    let finalScore = baseScore + adjustments.bonuses - adjustments.penalties;

    if (!gateResults.overallGatesPassed) {
      finalScore = this.applyGatePenalties(finalScore, gateResults);
    }

    // 7. Ensure score is within bounds and handle NaN
    finalScore = isNaN(finalScore) ? 0 : Math.max(0, Math.min(100, Math.round(finalScore)));

    // 8. Assess confidence and quality
    const confidence = this.assessConfidence(semanticScores, featureMatch, gateResults);
    const qualityIndicators = this.calculateQualityIndicators(
      semanticScores,
      featureMatch,
      jobFeatures,
      resumeFeatures
    );

    return {
      finalScore,
      confidence,
      breakdown: {
        semantic: Math.round(weightedContributions.semantic * 100) / 100,
        skillsCoverage: Math.round(weightedContributions.skillsCoverage * 100) / 100,
        experience: Math.round(weightedContributions.experience * 100) / 100,
        domain: Math.round(weightedContributions.domain * 100) / 100,
        education: Math.round(weightedContributions.education * 100) / 100,
        location: Math.round(weightedContributions.location * 100) / 100,
        penalties: Math.round(adjustments.penalties * 100) / 100,
        bonuses: Math.round(adjustments.bonuses * 100) / 100
      },
      gateResults,
      qualityIndicators
    };
  }

  /**
   * Batch scoring for multiple matches
   */
  async calculateBatchScores(
    matches: Array<{
      semantic: SimilarityScores;
      features: FeatureMatchAnalysis;
      job: ExtractedJobFeatures;
      resume: ExtractedResumeFeatures;
    }>
  ): Promise<ScoringResult[]> {
    return matches.map(match => 
      this.calculateScore(match.semantic, match.features, match.job, match.resume)
    );
  }

  /**
   * Update scoring configuration
   */
  updateConfig(newConfig: Partial<ScoringConfig>): void {
    this.config = {
      weights: { ...this.config.weights, ...newConfig.weights },
      gates: { ...this.config.gates, ...newConfig.gates },
      enableBonuses: newConfig.enableBonuses ?? this.config.enableBonuses,
      enablePenalties: newConfig.enablePenalties ?? this.config.enablePenalties,
      strictMode: newConfig.strictMode ?? this.config.strictMode
    };

    this.normalizeWeights();
  }

  /**
   * Get current scoring configuration
   */
  getConfig(): ScoringConfig {
    return { ...this.config };
  }

  // Private methods for score calculation
  private calculateComponentScores(
    semanticScores: SimilarityScores,
    featureMatch: FeatureMatchAnalysis
  ) {
    return {
      semantic: semanticScores.overallSemantic * 100,
      skillsCoverage: featureMatch.skillsMatch.coverage * 100,
      experience: featureMatch.experienceMatch.score * 100,
      domain: featureMatch.domainMatch.score * 100,
      education: featureMatch.educationMatch.score * 100,
      location: featureMatch.locationMatch.score * 100
    };
  }

  private applyWeights(componentScores: { [key: string]: number }) {
    return {
      semantic: componentScores.semantic * this.config.weights.semantic,
      skillsCoverage: componentScores.skillsCoverage * this.config.weights.skillsCoverage,
      experience: componentScores.experience * this.config.weights.experience,
      domain: componentScores.domain * this.config.weights.domain,
      education: componentScores.education * this.config.weights.education,
      location: componentScores.location * this.config.weights.location
    };
  }

  private checkHardGates(
    featureMatch: FeatureMatchAnalysis,
    jobFeatures: ExtractedJobFeatures,
    resumeFeatures: ExtractedResumeFeatures
  ) {
    // Skills gate: minimum coverage of required skills
    const skillsGate = {
      passed: featureMatch.skillsMatch.coverage >= this.config.gates.minSkillsCoverage,
      value: featureMatch.skillsMatch.coverage,
      threshold: this.config.gates.minSkillsCoverage
    };

    // Experience gate: not too far below required years
    const yearsGap = isNaN(featureMatch.experienceMatch.yearsGap) ? 0 : featureMatch.experienceMatch.yearsGap;
    const experienceGate = {
      passed: yearsGap <= this.config.gates.maxYearsGap,
      value: yearsGap,
      threshold: this.config.gates.maxYearsGap
    };

    // Location/work auth gate: must meet work authorization requirement
    const locationRequired = this.config.gates.requireWorkAuth && !!jobFeatures.workAuthRequired;
    const locationGate = {
      passed: !locationRequired || featureMatch.locationMatch.meetsRequirement,
      value: featureMatch.locationMatch.meetsRequirement,
      required: locationRequired
    };

    // Education gate: must meet education requirement if strictly enforced
    const educationRequired = this.config.gates.requireEducation && jobFeatures.education;
    const educationGate = {
      passed: !educationRequired || featureMatch.educationMatch.meetsRequirement,
      value: resumeFeatures.education,
      required: jobFeatures.education
    };

    const overallGatesPassed = skillsGate.passed && experienceGate.passed && 
                              locationGate.passed && educationGate.passed;

    return {
      skillsGate,
      experienceGate,
      locationGate,
      educationGate,
      overallGatesPassed
    };
  }

  private calculateAdjustments(
    semanticScores: SimilarityScores,
    featureMatch: FeatureMatchAnalysis,
    jobFeatures: ExtractedJobFeatures,
    resumeFeatures: ExtractedResumeFeatures,
    baseScore: number
  ): { bonuses: number; penalties: number } {
    let bonuses = 0;
    let penalties = 0;

    if (this.config.enableBonuses) {
      // Bonus for high semantic similarity with high confidence
      if (semanticScores.overallSemantic > 0.8 && semanticScores.confidence === 'high') {
        bonuses += 5;
      }

      // Bonus for exceeding experience requirements
      if (featureMatch.experienceMatch.candidateYears && 
          featureMatch.experienceMatch.requiredYears &&
          featureMatch.experienceMatch.candidateYears > featureMatch.experienceMatch.requiredYears) {
        const bonus = Math.min(3, featureMatch.experienceMatch.candidateYears - featureMatch.experienceMatch.requiredYears);
        bonuses += bonus;
      }

      // Bonus for perfect skills match
      if (featureMatch.skillsMatch.coverage >= 0.95) {
        bonuses += 3;
      }

      // Bonus for higher education than required
      if (featureMatch.educationMatch.score > 1.0) {
        bonuses += 2;
      }
    }

    if (this.config.enablePenalties) {
      // Penalty for low semantic similarity despite good structural match
      if (semanticScores.overallSemantic < 0.3 && baseScore > 70) {
        penalties += 10;
      }

      // Penalty for keyword stuffing (too many additional skills)
      const additionalSkillsCount = featureMatch.skillsMatch.additionalSkills.length;
      if (additionalSkillsCount > 20) {
        penalties += Math.min(5, additionalSkillsCount - 20);
      }

      // Penalty for inconsistent signals
      const consistencyScore = this.calculateConsistencyScore(semanticScores, featureMatch);
      if (consistencyScore < 0.5) {
        penalties += 8;
      }
    }

    return { bonuses, penalties };
  }

  private applyGatePenalties(score: number, gateResults: any): number {
    let penalizedScore = score;

    // DISABLED: Work authorization gate penalty
    // Reason: Most resumes don't include work authorization statements
    // if (!gateResults.locationGate.passed && gateResults.locationGate.required) {
    //   penalizedScore = Math.min(score, 25); // Cap at 25 for work auth issues
    // }

    // Moderate penalty for skills gate failure
    if (!gateResults.skillsGate.passed) {
      const skillsDeficit = this.config.gates.minSkillsCoverage - gateResults.skillsGate.value;
      const penalty = skillsDeficit * 50; // 50 point penalty per 100% skills deficit
      penalizedScore = Math.max(10, score - penalty);
    }

    // Light penalty for experience gate failure
    if (!gateResults.experienceGate.passed) {
      const experienceDeficit = gateResults.experienceGate.value - gateResults.experienceGate.threshold;
      const penalty = Math.min(20, experienceDeficit * 3); // 3 points per year over limit
      penalizedScore -= penalty;
    }

    return Math.max(0, penalizedScore);
  }

  private assessConfidence(
    semanticScores: SimilarityScores,
    featureMatch: FeatureMatchAnalysis,
    gateResults: any
  ): 'low' | 'medium' | 'high' {
    const factors = {
      semanticConfidence: semanticScores.confidence,
      gatesPassed: gateResults.overallGatesPassed,
      skillsCoverage: featureMatch.skillsMatch.coverage,
      dataQuality: this.assessDataQuality(featureMatch)
    };

    // High confidence criteria
    if (
      factors.semanticConfidence === 'high' &&
      factors.gatesPassed &&
      factors.skillsCoverage > 0.7 &&
      factors.dataQuality > 0.8
    ) {
      return 'high';
    }

    // Low confidence criteria
    if (
      factors.semanticConfidence === 'low' ||
      !factors.gatesPassed ||
      factors.dataQuality < 0.4
    ) {
      return 'low';
    }

    return 'medium';
  }

  private calculateQualityIndicators(
    semanticScores: SimilarityScores,
    featureMatch: FeatureMatchAnalysis,
    jobFeatures: ExtractedJobFeatures,
    resumeFeatures: ExtractedResumeFeatures
  ) {
    const dataCompleteness = this.calculateDataCompleteness(jobFeatures, resumeFeatures);
    const consistencyScore = this.calculateConsistencyScore(semanticScores, featureMatch);

    return {
      semanticConfidence: semanticScores.confidence,
      dataCompleteness,
      consistencyScore
    };
  }

  private calculateDataCompleteness(
    jobFeatures: ExtractedJobFeatures,
    resumeFeatures: ExtractedResumeFeatures
  ): number {
    const jobFields = [
      jobFeatures.skills.all.length > 0,
      jobFeatures.domains.length > 0,
      jobFeatures.yearsRequired !== null,
      jobFeatures.levelRequired !== null,
      jobFeatures.education !== null
    ];

    const resumeFields = [
      resumeFeatures.skills.length > 0,
      resumeFeatures.domains.length > 0,
      resumeFeatures.yearsOfExperience !== null,
      resumeFeatures.currentLevel !== null,
      resumeFeatures.education !== null
    ];

    const jobCompleteness = jobFields.filter(Boolean).length / jobFields.length;
    const resumeCompleteness = resumeFields.filter(Boolean).length / resumeFields.length;

    return (jobCompleteness + resumeCompleteness) / 2;
  }

  private calculateConsistencyScore(
    semanticScores: SimilarityScores,
    featureMatch: FeatureMatchAnalysis
  ): number {
    // Check if semantic and structural signals align
    const semanticScore = semanticScores.overallSemantic;
    const structuralScore = (
      featureMatch.skillsMatch.coverage +
      featureMatch.experienceMatch.score +
      featureMatch.domainMatch.score
    ) / 3;

    const difference = Math.abs(semanticScore - structuralScore);
    
    // High consistency if difference is small
    return Math.max(0, 1 - difference);
  }

  private assessDataQuality(featureMatch: FeatureMatchAnalysis): number {
    const factors = [];

    // Skills data quality
    if (featureMatch.skillsMatch.matchedSkills.length > 0) factors.push(1);
    else factors.push(0);

    // Experience data quality
    if (featureMatch.experienceMatch.candidateYears !== null && 
        featureMatch.experienceMatch.requiredYears !== null) factors.push(1);
    else factors.push(0.5);

    // Domain data quality
    if (featureMatch.domainMatch.jobDomains.length > 0 && 
        featureMatch.domainMatch.candidateDomains.length > 0) factors.push(1);
    else factors.push(0.5);

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  private normalizeWeights(): void {
    const weights = this.config.weights;
    const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
    
    if (sum !== 1.0) {
      Object.keys(weights).forEach(key => {
        weights[key as keyof ScoringWeights] /= sum;
      });
    }
  }
}

// Export default configuration
export const defaultScoringConfig: ScoringConfig = {
  weights: {
    semantic: 0.40,
    skillsCoverage: 0.30,
    experience: 0.15,
    domain: 0.10,
    education: 0.03,
    location: 0.02
  },
  gates: {
    minSkillsCoverage: 0.3,
    maxYearsGap: 5,
    requireWorkAuth: true,
    requireEducation: false
  },
  enableBonuses: true,
  enablePenalties: true,
  strictMode: false
};