import { ValidatorFactory } from '../../monitor/Validator';
import { JobResumeMatchingResult } from '../schemas/jobResumeMatching.schema';

/**
 * Custom validator for job-resume matching results
 * Integrates with the existing ChainPerformanceMonitor system
 */
export class JobResumeMatchingValidator {
  private static instance: JobResumeMatchingValidator;

  private constructor() {}

  static getInstance(): JobResumeMatchingValidator {
    if (!JobResumeMatchingValidator.instance) {
      JobResumeMatchingValidator.instance = new JobResumeMatchingValidator();
    }
    return JobResumeMatchingValidator.instance;
  }

  /**
   * Validate matching result against expected outcome
   * Used for performance monitoring and accuracy tracking
   */
  validateMatch(
    actual: JobResumeMatchingResult, 
    expected: Partial<JobResumeMatchingResult>, 
    tolerance: { 
      scoreTolerance?: number; 
      skillsTolerance?: number;
      strictValidation?: boolean;
    } = {}
  ): { 
    match: boolean; 
    confidence: number; 
    details: string[] 
  } {
    const {
      scoreTolerance = 10,  // ±10 points tolerance for scores
      skillsTolerance = 0.2, // ±20% tolerance for skills coverage
      strictValidation = false
    } = tolerance;

    const details: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Check final score
    if (expected.finalScore !== undefined) {
      totalChecks++;
      const scoreDiff = Math.abs(actual.finalScore - expected.finalScore);
      if (scoreDiff <= scoreTolerance) {
        passedChecks++;
        details.push(`✅ Score match: ${actual.finalScore} vs ${expected.finalScore} (±${scoreTolerance})`);
      } else {
        details.push(`❌ Score mismatch: ${actual.finalScore} vs ${expected.finalScore} (diff: ${scoreDiff}, tolerance: ±${scoreTolerance})`);
      }
    }

    // Check confidence level
    if (expected.confidence !== undefined) {
      totalChecks++;
      if (actual.confidence === expected.confidence) {
        passedChecks++;
        details.push(`✅ Confidence match: ${actual.confidence}`);
      } else {
        details.push(`❌ Confidence mismatch: ${actual.confidence} vs ${expected.confidence}`);
      }
    }

    // Check skills coverage
    if (expected.skillsMatch?.coverage !== undefined) {
      totalChecks++;
      const coverageDiff = Math.abs(actual.skillsMatch.coverage - expected.skillsMatch.coverage);
      if (coverageDiff <= skillsTolerance) {
        passedChecks++;
        details.push(`✅ Skills coverage match: ${(actual.skillsMatch.coverage * 100).toFixed(1)}% vs ${(expected.skillsMatch.coverage * 100).toFixed(1)}%`);
      } else {
        details.push(`❌ Skills coverage mismatch: ${(actual.skillsMatch.coverage * 100).toFixed(1)}% vs ${(expected.skillsMatch.coverage * 100).toFixed(1)}% (diff: ${(coverageDiff * 100).toFixed(1)}%)`);
      }
    }

    // Check specific matched skills
    if (expected.skillsMatch?.matchedSkills !== undefined) {
      totalChecks++;
      const expectedSkills = new Set(expected.skillsMatch.matchedSkills.map(s => s.toLowerCase()));
      const actualSkills = new Set(actual.skillsMatch.matchedSkills.map(s => s.toLowerCase()));
      
      const intersection = new Set([...expectedSkills].filter(s => actualSkills.has(s)));
      const matchRate = intersection.size / Math.max(expectedSkills.size, 1);
      
      if (matchRate >= 0.7) { // 70% of expected skills should match
        passedChecks++;
        details.push(`✅ Matched skills overlap: ${intersection.size}/${expectedSkills.size} expected skills found`);
      } else {
        const missing = [...expectedSkills].filter(s => !actualSkills.has(s));
        details.push(`❌ Missing expected skills: ${missing.join(', ')}`);
      }
    }

    // Check missing skills
    if (expected.skillsMatch?.missingRequired !== undefined) {
      totalChecks++;
      const expectedMissing = new Set(expected.skillsMatch.missingRequired.map(s => s.toLowerCase()));
      const actualMissing = new Set(actual.skillsMatch.missingRequired.map(s => s.toLowerCase()));
      
      const overlap = new Set([...expectedMissing].filter(s => actualMissing.has(s)));
      const overlapRate = overlap.size / Math.max(expectedMissing.size, 1);
      
      if (overlapRate >= 0.6) { // 60% of expected missing skills should be identified
        passedChecks++;
        details.push(`✅ Missing skills identification: ${overlap.size}/${expectedMissing.size} correctly identified`);
      } else {
        details.push(`❌ Missing skills identification low: ${overlap.size}/${expectedMissing.size} correctly identified`);
      }
    }

    // Check experience match
    if (expected.experienceMatch?.score !== undefined) {
      totalChecks++;
      const expDiff = Math.abs(actual.experienceMatch.score - expected.experienceMatch.score);
      if (expDiff <= 0.2) { // ±20% tolerance for experience scores
        passedChecks++;
        details.push(`✅ Experience score match: ${(actual.experienceMatch.score * 100).toFixed(1)}%`);
      } else {
        details.push(`❌ Experience score mismatch: ${(actual.experienceMatch.score * 100).toFixed(1)}% vs ${(expected.experienceMatch.score * 100).toFixed(1)}%`);
      }
    }

    // Check years gap
    if (expected.experienceMatch?.yearsGap !== undefined) {
      totalChecks++;
      const gapDiff = Math.abs(actual.experienceMatch.yearsGap - expected.experienceMatch.yearsGap);
      if (gapDiff <= 1) { // ±1 year tolerance
        passedChecks++;
        details.push(`✅ Years gap match: ${actual.experienceMatch.yearsGap} years`);
      } else {
        details.push(`❌ Years gap mismatch: ${actual.experienceMatch.yearsGap} vs ${expected.experienceMatch.yearsGap} years`);
      }
    }

    // Check gate results  
    if (expected.gateResults?.overallGatesPassed !== undefined) {
      totalChecks++;
      if (actual.gateResults.overallGatesPassed === expected.gateResults.overallGatesPassed) {
        passedChecks++;
        details.push(`✅ Gates result match: ${actual.gateResults.overallGatesPassed}`);
      } else {
        details.push(`❌ Gates result mismatch: ${actual.gateResults.overallGatesPassed} vs ${expected.gateResults.overallGatesPassed}`);
      }
    }

    // Check semantic similarity (if provided)
    if (expected.semanticAnalysis?.overallSemantic !== undefined) {
      totalChecks++;
      const semanticDiff = Math.abs(actual.semanticAnalysis.overallSemantic - expected.semanticAnalysis.overallSemantic);
      if (semanticDiff <= 0.15) { // ±15% tolerance for semantic similarity
        passedChecks++;
        details.push(`✅ Semantic similarity match: ${(actual.semanticAnalysis.overallSemantic * 100).toFixed(1)}%`);
      } else {
        details.push(`❌ Semantic similarity mismatch: ${(actual.semanticAnalysis.overallSemantic * 100).toFixed(1)}% vs ${(expected.semanticAnalysis.overallSemantic * 100).toFixed(1)}%`);
      }
    }

    // Check explanation quality (basic validation)
    if (expected.explanation?.strengths !== undefined || expected.explanation?.concerns !== undefined) {
      totalChecks++;
      const hasStrengths = actual.explanation.strengths.length > 0;
      const hasConcerns = actual.explanation.concerns.length > 0;
      const hasSummary = actual.explanation.summary.length > 20; // At least 20 chars
      
      if (hasStrengths && hasConcerns && hasSummary) {
        passedChecks++;
        details.push(`✅ Explanation quality: ${actual.explanation.strengths.length} strengths, ${actual.explanation.concerns.length} concerns, summary provided`);
      } else {
        details.push(`❌ Explanation quality insufficient: strengths=${hasStrengths}, concerns=${hasConcerns}, summary=${hasSummary}`);
      }
    }

    const confidence = totalChecks > 0 ? passedChecks / totalChecks : 0;
    const match = strictValidation ? confidence === 1.0 : confidence >= 0.7;

    return { match, confidence, details };
  }

  /**
   * Validate against acceptance test criteria from the user's specification
   */
  validateAcceptanceTest(
    testName: string,
    actual: JobResumeMatchingResult,
    expectedCriteria: {
      minScore?: number;
      maxScore?: number;
      shouldPassGates?: boolean;
      expectedSkillsFound?: string[];
      expectedMissingSkills?: string[];
      expectedExplanationKeywords?: string[];
    }
  ): { passed: boolean; details: string[] } {
    const details: string[] = [];
    let passed = true;

    // Score range check
    if (expectedCriteria.minScore !== undefined) {
      if (actual.finalScore >= expectedCriteria.minScore) {
        details.push(`✅ Score meets minimum: ${actual.finalScore} >= ${expectedCriteria.minScore}`);
      } else {
        details.push(`❌ Score below minimum: ${actual.finalScore} < ${expectedCriteria.minScore}`);
        passed = false;
      }
    }

    if (expectedCriteria.maxScore !== undefined) {
      if (actual.finalScore <= expectedCriteria.maxScore) {
        details.push(`✅ Score within maximum: ${actual.finalScore} <= ${expectedCriteria.maxScore}`);
      } else {
        details.push(`❌ Score exceeds maximum: ${actual.finalScore} > ${expectedCriteria.maxScore}`);
        passed = false;
      }
    }

    // Gates check
    if (expectedCriteria.shouldPassGates !== undefined) {
      if (actual.gateResults.overallGatesPassed === expectedCriteria.shouldPassGates) {
        details.push(`✅ Gates result as expected: ${actual.gateResults.overallGatesPassed}`);
      } else {
        details.push(`❌ Gates result unexpected: ${actual.gateResults.overallGatesPassed}, expected ${expectedCriteria.shouldPassGates}`);
        passed = false;
      }
    }

    // Skills found check
    if (expectedCriteria.expectedSkillsFound !== undefined) {
      const actualSkillsLower = actual.skillsMatch.matchedSkills.map(s => s.toLowerCase());
      const expectedSkillsLower = expectedCriteria.expectedSkillsFound.map(s => s.toLowerCase());
      
      const foundExpectedSkills = expectedSkillsLower.filter(skill => 
        actualSkillsLower.some(actualSkill => actualSkill.includes(skill) || skill.includes(actualSkill))
      );

      if (foundExpectedSkills.length >= expectedSkillsLower.length * 0.7) { // 70% should be found
        details.push(`✅ Expected skills found: ${foundExpectedSkills.join(', ')}`);
      } else {
        const missing = expectedSkillsLower.filter(skill => !foundExpectedSkills.includes(skill));
        details.push(`❌ Missing expected skills: ${missing.join(', ')}`);
        passed = false;
      }
    }

    // Missing skills check
    if (expectedCriteria.expectedMissingSkills !== undefined) {
      const actualMissingLower = actual.skillsMatch.missingRequired.map(s => s.toLowerCase());
      const expectedMissingLower = expectedCriteria.expectedMissingSkills.map(s => s.toLowerCase());
      
      const foundMissingSkills = expectedMissingLower.filter(skill =>
        actualMissingLower.some(actualMissing => actualMissing.includes(skill) || skill.includes(actualMissing))
      );

      if (foundMissingSkills.length >= expectedMissingLower.length * 0.6) { // 60% should be identified as missing
        details.push(`✅ Expected missing skills identified: ${foundMissingSkills.join(', ')}`);
      } else {
        details.push(`❌ Failed to identify missing skills: expected ${expectedMissingLower.join(', ')}, found ${foundMissingSkills.join(', ')}`);
        passed = false;
      }
    }

    // Explanation keywords check
    if (expectedCriteria.expectedExplanationKeywords !== undefined) {
      const explanationText = [
        actual.explanation.summary,
        ...actual.explanation.strengths,
        ...actual.explanation.concerns,
        ...actual.explanation.recommendations
      ].join(' ').toLowerCase();

      const foundKeywords = expectedCriteria.expectedExplanationKeywords.filter(keyword =>
        explanationText.includes(keyword.toLowerCase())
      );

      if (foundKeywords.length >= expectedCriteria.expectedExplanationKeywords.length * 0.6) { // 60% of keywords should appear
        details.push(`✅ Expected explanation keywords found: ${foundKeywords.join(', ')}`);
      } else {
        const missing = expectedCriteria.expectedExplanationKeywords.filter(k => !foundKeywords.includes(k));
        details.push(`❌ Missing explanation keywords: ${missing.join(', ')}`);
        passed = false;
      }
    }

    return { passed, details };
  }

  /**
   * Register validator with the ValidatorFactory
   */
  static registerWithFactory(): void {
    const validator = JobResumeMatchingValidator.getInstance();
    
    ValidatorFactory.register('jobResumeMatching', (actual: any, expected: any, testMatch?: boolean) => {
      if (testMatch && expected) {
        const result = validator.validateMatch(actual, expected);
        return result.match;
      }
      
      // Basic validation - check that result has required structure
      return (
        actual &&
        typeof actual.finalScore === 'number' &&
        actual.finalScore >= 0 &&
        actual.finalScore <= 100 &&
        actual.confidence &&
        actual.skillsMatch &&
        actual.explanation
      );
    });
  }
}

// Auto-register when module is loaded
JobResumeMatchingValidator.registerWithFactory();