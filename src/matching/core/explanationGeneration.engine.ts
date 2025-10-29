import { SimilarityScores } from './semanticSimilarity.engine';
import { FeatureMatchAnalysis, ExtractedJobFeatures, ExtractedResumeFeatures } from './featureExtraction.service';
import { ScoringResult } from './hybridScoring.engine';

export interface MatchExplanation {
  strengths: string[];           // Top 3 positive match reasons
  concerns: string[];           // Top 3 gaps or issues  
  summary: string;              // 1-2 sentence overall assessment
  recommendations: string[];    // Actionable recommendations
  keyInsights: {
    strongestMatch: string;     // What's working best
    biggestGap: string;         // Most significant concern
    improvementPotential: string; // How candidate could grow
  };
}

export interface ExplanationContext {
  semantic: SimilarityScores;
  features: FeatureMatchAnalysis;
  job: ExtractedJobFeatures;
  resume: ExtractedResumeFeatures;
  scoring: ScoringResult;
}

/**
 * Explanation generation engine that creates human-readable match analysis
 * Provides deterministic, fact-based explanations tied to scoring components
 */
export class ExplanationGenerationEngine {
  
  /**
   * Generate comprehensive match explanation
   */
  generateExplanation(context: ExplanationContext): MatchExplanation {
    // Analyze strengths and concerns
    const strengths = this.identifyStrengths(context);
    const concerns = this.identifyConcerns(context);
    
    // Generate summary based on score and key factors
    const summary = this.generateSummary(context, strengths, concerns);
    
    // Create actionable recommendations
    const recommendations = this.generateRecommendations(context, concerns);
    
    // Extract key insights
    const keyInsights = this.generateKeyInsights(context, strengths, concerns);
    
    return {
      strengths: strengths.slice(0, 3), // Top 3 strengths
      concerns: concerns.slice(0, 3),   // Top 3 concerns
      summary,
      recommendations: recommendations.slice(0, 4), // Top 4 recommendations
      keyInsights
    };
  }

  /**
   * Generate batch explanations for multiple matches
   */
  generateBatchExplanations(contexts: ExplanationContext[]): MatchExplanation[] {
    return contexts.map(context => this.generateExplanation(context));
  }

  /**
   * Generate quick summary for dashboard/list view
   */
  generateQuickSummary(context: ExplanationContext): {
    score: number;
    oneLineReason: string;
    topGap: string;
    confidence: string;
  } {
    const strengths = this.identifyStrengths(context);
    const concerns = this.identifyConcerns(context);
    
    const primaryStrength = strengths[0] || "Basic qualification alignment";
    const primaryConcern = concerns[0] || "Minor gaps in requirements";
    
    return {
      score: context.scoring.finalScore,
      oneLineReason: this.simplifyReason(primaryStrength),
      topGap: this.simplifyGap(primaryConcern),
      confidence: context.scoring.confidence
    };
  }

  // Private methods for generating explanations
  private identifyStrengths(context: ExplanationContext): string[] {
    const strengths: { score: number; reason: string }[] = [];
    const { features, semantic, scoring, job, resume } = context;

    // Semantic similarity strengths
    if (semantic.overallSemantic > 0.7) {
      strengths.push({
        score: semantic.overallSemantic,
        reason: `Strong alignment between resume content and job requirements (${Math.round(semantic.overallSemantic * 100)}% semantic similarity)`
      });
    }

    if (semantic.requirementsMatch > 0.8) {
      strengths.push({
        score: semantic.requirementsMatch,
        reason: `Excellent match with core job requirements (${Math.round(semantic.requirementsMatch * 100)}% similarity)`
      });
    }

    // Skills strengths
    if (features.skillsMatch.coverage > 0.8) {
      const matchedCount = features.skillsMatch.matchedSkills.length;
      const totalRequired = job.skills.required.length;
      strengths.push({
        score: features.skillsMatch.coverage,
        reason: `Excellent technical skills coverage (${matchedCount}/${totalRequired} required skills: ${features.skillsMatch.matchedSkills.slice(0, 3).join(', ')}${matchedCount > 3 ? '...' : ''})`
      });
    } else if (features.skillsMatch.coverage > 0.6) {
      const matchedCount = features.skillsMatch.matchedSkills.length;
      strengths.push({
        score: features.skillsMatch.coverage,
        reason: `Good technical skills match (${Math.round(features.skillsMatch.coverage * 100)}% coverage with key skills: ${features.skillsMatch.matchedSkills.slice(0, 2).join(', ')})`
      });
    }

    // Experience strengths  
    if (features.experienceMatch.score > 0.9) {
      if (features.experienceMatch.candidateYears && features.experienceMatch.requiredYears) {
        if (features.experienceMatch.candidateYears > features.experienceMatch.requiredYears) {
          strengths.push({
            score: features.experienceMatch.score,
            reason: `Exceeds experience requirements (${features.experienceMatch.candidateYears} years vs ${features.experienceMatch.requiredYears} required)`
          });
        } else {
          strengths.push({
            score: features.experienceMatch.score,
            reason: `Perfect experience match (${features.experienceMatch.candidateYears} years meets ${features.experienceMatch.requiredYears} year requirement)`
          });
        }
      }
    } else if (features.experienceMatch.score > 0.7 && features.experienceMatch.gapSeverity === 'minor') {
      strengths.push({
        score: features.experienceMatch.score,
        reason: `Experience level is very close to requirements (small gap is manageable)`
      });
    }

    // Domain strengths
    if (features.domainMatch.score > 0.8 && features.domainMatch.matchedDomains.length > 0) {
      strengths.push({
        score: features.domainMatch.score,
        reason: `Strong domain expertise alignment (${features.domainMatch.matchedDomains.join(', ')})`
      });
    }

    // Level match strengths
    if (features.levelMatch.score > 0.8) {
      if (features.levelMatch.requiredLevel && features.levelMatch.candidateLevel) {
        if (features.levelMatch.levelGap === 0) {
          strengths.push({
            score: features.levelMatch.score,
            reason: `Perfect level match (${features.levelMatch.candidateLevel} matches ${features.levelMatch.requiredLevel} requirement)`
          });
        } else if (features.levelMatch.isPromotable) {
          strengths.push({
            score: features.levelMatch.score,
            reason: `Good growth opportunity (${features.levelMatch.candidateLevel} to ${features.levelMatch.requiredLevel} is a reasonable step up)`
          });
        }
      }
    }

    // Education strengths
    if (features.educationMatch.score > 0.9 && features.educationMatch.meetsRequirement) {
      strengths.push({
        score: features.educationMatch.score,
        reason: `Meets education requirements (${features.educationMatch.candidate}${features.educationMatch.required ? ` for ${features.educationMatch.required} requirement` : ''})`
      });
    }

    // Work authorization strengths
    if (features.locationMatch.score === 1.0 && features.locationMatch.meetsRequirement) {
      strengths.push({
        score: 1.0,
        reason: "Work authorization requirements met"
      });
    }

    // High-confidence semantic match
    if (semantic.confidence === 'high' && semantic.overallSemantic > 0.5) {
      strengths.push({
        score: semantic.overallSemantic + 0.1,
        reason: "High-confidence semantic analysis indicates strong qualitative fit"
      });
    }

    // Additional skills bonus
    if (features.skillsMatch.additionalSkills.length > 5 && features.skillsMatch.additionalSkills.length < 15) {
      strengths.push({
        score: 0.7,
        reason: `Brings additional valuable skills beyond requirements (${features.skillsMatch.additionalSkills.slice(0, 3).join(', ')}...)`
      });
    }

    // Sort by relevance score and return top strengths
    return strengths
      .sort((a, b) => b.score - a.score)
      .map(s => s.reason);
  }

  private identifyConcerns(context: ExplanationContext): string[] {
    const concerns: { severity: number; reason: string }[] = [];
    const { features, semantic, scoring, job, resume } = context;

    // Gate failures (highest severity)
    if (!scoring.gateResults.overallGatesPassed) {
      if (!scoring.gateResults.skillsGate.passed) {
        const deficit = Math.round((scoring.gateResults.skillsGate.threshold - scoring.gateResults.skillsGate.value) * 100);
        concerns.push({
          severity: 10,
          reason: `Critical skills gap: only ${Math.round(scoring.gateResults.skillsGate.value * 100)}% of required skills covered (need ${deficit}% more)`
        });
      }

      if (!scoring.gateResults.locationGate.passed && scoring.gateResults.locationGate.required) {
        concerns.push({
          severity: 10,
          reason: "Work authorization requirement not met"
        });
      }

      if (!scoring.gateResults.experienceGate.passed) {
        const gap = scoring.gateResults.experienceGate.value - scoring.gateResults.experienceGate.threshold;
        concerns.push({
          severity: 9,
          reason: `Experience gap: candidate falls ${gap} year${gap > 1 ? 's' : ''} short of maximum acceptable range`
        });
      }

      if (!scoring.gateResults.educationGate.passed && scoring.gateResults.educationGate.required) {
        concerns.push({
          severity: 8,
          reason: `Education requirement not met: ${scoring.gateResults.educationGate.required} required${scoring.gateResults.educationGate.value ? `, candidate has ${scoring.gateResults.educationGate.value}` : ', candidate education unclear'}`
        });
      }
    }

    // Skills concerns
    if (features.skillsMatch.missingRequired.length > 0) {
      const missingSkills = features.skillsMatch.missingRequired.slice(0, 4);
      const severity = features.skillsMatch.missingRequired.length > 2 ? 8 : 6;
      concerns.push({
        severity,
        reason: `Missing key technical skills: ${missingSkills.join(', ')}${features.skillsMatch.missingRequired.length > 4 ? ` and ${features.skillsMatch.missingRequired.length - 4} more` : ''}`
      });
    }

    // Experience concerns
    if (features.experienceMatch.yearsGap > 0) {
      const gap = features.experienceMatch.yearsGap;
      let severity = 5;
      if (gap > 3) severity = 7;
      if (gap > 5) severity = 9;
      
      concerns.push({
        severity,
        reason: `Experience below requirement: ${gap} year${gap > 1 ? 's' : ''} less than ${features.experienceMatch.requiredYears} years required`
      });
    }

    // Semantic similarity concerns
    if (semantic.overallSemantic < 0.3) {
      concerns.push({
        severity: 7,
        reason: `Low semantic similarity (${Math.round(semantic.overallSemantic * 100)}%) suggests limited alignment with job context`
      });
    } else if (semantic.overallSemantic < 0.5) {
      concerns.push({
        severity: 5,
        reason: `Moderate semantic alignment (${Math.round(semantic.overallSemantic * 100)}%) - some job context mismatch`
      });
    }

    // Domain mismatch
    if (features.domainMatch.score < 0.5 && job.domains.length > 0) {
      concerns.push({
        severity: 6,
        reason: `Limited domain expertise match (candidate: ${features.domainMatch.candidateDomains.join(', ')} vs required: ${features.domainMatch.jobDomains.join(', ')})`
      });
    }

    // Level mismatch
    if (features.levelMatch.score < 0.5 && !features.levelMatch.isPromotable) {
      const gap = features.levelMatch.levelGap;
      concerns.push({
        severity: 7,
        reason: `Significant level gap: ${features.levelMatch.candidateLevel || 'Unknown'} to ${features.levelMatch.requiredLevel} may be too large a jump`
      });
    }

    // Confidence concerns
    if (semantic.confidence === 'low') {
      concerns.push({
        severity: 4,
        reason: "Analysis confidence is low due to limited or unclear resume/job information"
      });
    }

    // Data quality concerns
    if (scoring.qualityIndicators.dataCompleteness < 0.5) {
      concerns.push({
        severity: 3,
        reason: "Incomplete profile data limits match accuracy - consider requesting more information"
      });
    }

    // Consistency concerns
    if (scoring.qualityIndicators.consistencyScore < 0.5) {
      concerns.push({
        severity: 5,
        reason: "Inconsistent signals between semantic analysis and structured data - review manually"
      });
    }

    // Keyword stuffing concern
    if (features.skillsMatch.additionalSkills.length > 25) {
      concerns.push({
        severity: 4,
        reason: `Resume may contain keyword stuffing (${features.skillsMatch.additionalSkills.length} additional skills listed) - verify actual proficiency`
      });
    }

    // Sort by severity and return top concerns
    return concerns
      .sort((a, b) => b.severity - a.severity)
      .map(c => c.reason);
  }

  private generateSummary(
    context: ExplanationContext,
    strengths: string[],
    concerns: string[]
  ): string {
    const { scoring } = context;
    const score = scoring.finalScore;
    const confidence = scoring.confidence;

    // Determine overall assessment
    let assessment = '';
    let confidenceNote = '';

    if (score >= 85) {
      assessment = 'Excellent match with strong alignment across technical skills and requirements.';
    } else if (score >= 70) {
      assessment = 'Good match with solid technical foundation and manageable gaps.';
    } else if (score >= 50) {
      assessment = 'Fair match with some alignment but notable gaps that need consideration.';
    } else if (score >= 30) {
      assessment = 'Limited match with significant gaps in key requirements.';
    } else {
      assessment = 'Poor match with major misalignment in core requirements.';
    }

    // Add confidence qualifier
    if (confidence === 'high') {
      confidenceNote = ' Analysis has high confidence based on complete data.';
    } else if (confidence === 'medium') {
      confidenceNote = ' Analysis has moderate confidence - some data limitations.';
    } else {
      confidenceNote = ' Analysis has low confidence due to incomplete information.';
    }

    return assessment + confidenceNote;
  }

  private generateRecommendations(
    context: ExplanationContext,
    concerns: string[]
  ): string[] {
    const recommendations: string[] = [];
    const { features, job, resume, scoring } = context;

    // Skills-based recommendations
    if (features.skillsMatch.missingRequired.length > 0) {
      const topMissing = features.skillsMatch.missingRequired.slice(0, 3);
      recommendations.push(`Consider candidates with experience in: ${topMissing.join(', ')}`);
      
      if (features.skillsMatch.coverage > 0.6) {
        recommendations.push(`Skills gap may be bridgeable with training in ${topMissing[0]}`);
      }
    }

    // Experience-based recommendations
    if (features.experienceMatch.yearsGap > 0 && features.experienceMatch.yearsGap <= 2) {
      recommendations.push('Consider if related experience or strong fundamentals could compensate for years gap');
    } else if (features.experienceMatch.yearsGap > 2) {
      recommendations.push('Significant experience gap - consider for more junior role or extensive training program');
    }

    // Level-based recommendations
    if (features.levelMatch.isPromotable && features.levelMatch.levelGap > 0) {
      recommendations.push(`Good growth candidate: ${features.levelMatch.candidateLevel} with potential to grow into ${features.levelMatch.requiredLevel} role`);
    }

    // Domain recommendations
    if (features.domainMatch.score < 0.5 && job.domains.length > 0) {
      recommendations.push('Consider domain expertise gap - may need extended onboarding or mentoring');
    }

    // Quality-based recommendations
    if (scoring.qualityIndicators.dataCompleteness < 0.7) {
      recommendations.push('Request additional information to improve match accuracy');
    }

    // Gate failure recommendations
    if (!scoring.gateResults.overallGatesPassed) {
      if (!scoring.gateResults.skillsGate.passed) {
        recommendations.push('Critical skills deficiency - not recommended without significant training investment');
      }
      if (!scoring.gateResults.locationGate.passed) {
        recommendations.push('Work authorization must be resolved before proceeding');
      }
    }

    // Positive recommendations for good matches
    if (scoring.finalScore > 75) {
      recommendations.push('Strong candidate - recommend moving to next stage');
      
      if (features.skillsMatch.additionalSkills.length > 3) {
        const additional = features.skillsMatch.additionalSkills.slice(0, 3);
        recommendations.push(`Brings valuable additional skills: ${additional.join(', ')}`);
      }
    }

    // Interview focus recommendations
    if (scoring.finalScore > 50 && scoring.finalScore < 85) {
      const focusAreas = [];
      if (features.skillsMatch.missingRequired.length > 0) {
        focusAreas.push('technical skills depth');
      }
      if (features.experienceMatch.yearsGap > 0) {
        focusAreas.push('relevant experience quality');
      }
      if (focusAreas.length > 0) {
        recommendations.push(`Interview should focus on: ${focusAreas.join(' and ')}`);
      }
    }

    return recommendations;
  }

  private generateKeyInsights(
    context: ExplanationContext,
    strengths: string[],
    concerns: string[]
  ): {
    strongestMatch: string;
    biggestGap: string;
    improvementPotential: string;
  } {
    const { features, semantic, scoring } = context;

    // Identify strongest match area
    let strongestMatch = 'Overall qualification alignment';
    let strongestScore = 0;

    const areas = [
      { name: 'Technical skills coverage', score: features.skillsMatch.coverage },
      { name: 'Experience level match', score: features.experienceMatch.score },
      { name: 'Domain expertise alignment', score: features.domainMatch.score },
      { name: 'Semantic content similarity', score: semantic.overallSemantic },
      { name: 'Education requirements', score: features.educationMatch.score }
    ];

    areas.forEach(area => {
      if (area.score > strongestScore) {
        strongestScore = area.score;
        strongestMatch = area.name;
      }
    });

    // Identify biggest gap
    const biggestGap = concerns.length > 0 ? 
      this.extractGapType(concerns[0]) : 
      'Minor alignment areas for optimization';

    // Determine improvement potential
    let improvementPotential = 'Limited growth potential in current role';
    
    if (scoring.finalScore > 70) {
      improvementPotential = 'High potential for success with proper onboarding';
    } else if (scoring.finalScore > 50 && features.experienceMatch.gapSeverity !== 'major') {
      improvementPotential = 'Moderate potential with targeted skill development';
    } else if (features.skillsMatch.coverage > 0.4) {
      improvementPotential = 'Some potential if willing to invest in training and development';
    }

    return {
      strongestMatch,
      biggestGap,
      improvementPotential
    };
  }

  private simplifyReason(reason: string): string {
    // Extract key phrase from detailed reason
    if (reason.includes('technical skills')) return 'Strong technical skills match';
    if (reason.includes('experience') && reason.includes('exceeds')) return 'Experience exceeds requirements';
    if (reason.includes('semantic')) return 'Content aligns well with job';
    if (reason.includes('domain')) return 'Relevant domain expertise';
    if (reason.includes('perfect')) return 'Perfect requirement match';
    
    return reason.split('(')[0].trim(); // Remove parenthetical details
  }

  private simplifyGap(gap: string): string {
    // Extract key concern type
    if (gap.includes('skills gap') || gap.includes('Missing key')) return 'Missing key skills';
    if (gap.includes('Experience below')) return 'Insufficient experience';
    if (gap.includes('Work authorization')) return 'Work auth required';
    if (gap.includes('Education requirement')) return 'Education requirement not met';
    if (gap.includes('semantic similarity')) return 'Limited job context alignment';
    
    return gap.split(':')[0]; // Take first part before colon
  }

  private extractGapType(concern: string): string {
    if (concern.includes('skills')) return 'Technical skills gaps';
    if (concern.includes('experience') || concern.includes('Experience')) return 'Experience level concerns';
    if (concern.includes('authorization')) return 'Work authorization requirements';
    if (concern.includes('education') || concern.includes('Education')) return 'Education requirements';
    if (concern.includes('semantic')) return 'Job context alignment';
    if (concern.includes('domain')) return 'Domain expertise gaps';
    
    return 'Requirement alignment concerns';
  }
}