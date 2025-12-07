/**
 * Debug Single Test Case - Step-by-Step Analysis
 *
 * This script runs a single test case with detailed logging at each step
 * to identify where the matching logic deviates from expectations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { JobResumeMatchingChain } from '../../src/matching/core/jobResumeMatching.chain';

// Load the dataset
const datasetPath = path.join(__dirname, 'matchingValidation.dataset.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

async function debugTestCase(testId: string) {
  console.log('='.repeat(80));
  console.log(`DEBUGGING TEST CASE: ${testId}`);
  console.log('='.repeat(80));
  console.log('');

  // Find the test case
  const testCase = dataset.testCases.find((tc: any) => tc.id === testId);

  if (!testCase) {
    console.error(`❌ Test case ${testId} not found!`);
    return;
  }

  console.log(`📋 Test: ${testCase.name}`);
  console.log(`📂 Category: ${testCase.category}`);
  console.log(`🎯 Expected Score: ${testCase.expectedScore.min}-${testCase.expectedScore.max}`);
  console.log(`🔒 Expected Confidence: ${testCase.expectedConfidence}`);
  console.log('');

  console.log('📝 Ground Truth:');
  console.log(`   Should Match: ${testCase.groundTruth.shouldMatch}`);
  console.log(`   Reasoning: ${testCase.groundTruth.reasoning}`);
  console.log('');

  console.log('✅ Expected Strengths:');
  testCase.groundTruth.expectedStrengths.forEach((s: string, i: number) => {
    console.log(`   ${i + 1}. ${s}`);
  });
  console.log('');

  console.log('⚠️  Expected Concerns:');
  testCase.groundTruth.expectedConcerns.forEach((c: string, i: number) => {
    console.log(`   ${i + 1}. ${c}`);
  });
  console.log('');

  // Create matching chain
  const chain = new JobResumeMatchingChain();

  console.log('🚀 Starting matching process...');
  console.log('-'.repeat(80));
  console.log('');

  try {
    // Run the match with detailed logging enabled
    const result = await chain.analyzeMatch({
      jobDescription: testCase.jobDescription,
      resumeContent: testCase.resumeContent,
      options: {
        includeExplanation: true,
        strictMode: false
      }
    });

    if ('error' in result) {
      console.error('❌ ERROR during matching:', result.error);
      return;
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📊 RESULTS BREAKDOWN');
    console.log('='.repeat(80));
    console.log('');

    // Overall Score
    console.log('🎯 FINAL SCORE');
    console.log('-'.repeat(80));
    console.log(`   Final Score: ${result.finalScore}/100`);
    console.log(`   Expected: ${testCase.expectedScore.min}-${testCase.expectedScore.max}`);
    console.log(`   Deviation: ${Math.abs(result.finalScore - testCase.expectedScore.min)} points`);
    console.log(`   ✓ Within Range: ${result.finalScore >= testCase.expectedScore.min && result.finalScore <= testCase.expectedScore.max ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Confidence: ${result.confidence} (expected: ${testCase.expectedConfidence})`);
    console.log('');

    // Semantic Analysis
    console.log('🔍 SEMANTIC ANALYSIS');
    console.log('-'.repeat(80));
    console.log(`   Overall Semantic: ${(result.semanticAnalysis.overallSemantic * 100).toFixed(1)}%`);
    console.log(`   Requirements Match: ${(result.semanticAnalysis.requirementsMatch * 100).toFixed(1)}%`);
    console.log(`   Responsibilities Match: ${(result.semanticAnalysis.responsibilitiesMatch * 100).toFixed(1)}%`);
    console.log(`   Qualifications Match: ${(result.semanticAnalysis.qualificationsMatch * 100).toFixed(1)}%`);
    console.log(`   Confidence: ${result.semanticAnalysis.confidence}`);
    console.log('');

    // Skills Match
    console.log('💻 SKILLS MATCH');
    console.log('-'.repeat(80));
    console.log(`   Coverage: ${(result.skillsMatch.coverage * 100).toFixed(1)}%`);
    console.log(`   Matched Skills (${result.skillsMatch.matchedSkills.length}): ${result.skillsMatch.matchedSkills.slice(0, 5).join(', ')}${result.skillsMatch.matchedSkills.length > 5 ? '...' : ''}`);
    console.log(`   Missing Required (${result.skillsMatch.missingRequired.length}): ${result.skillsMatch.missingRequired.slice(0, 5).join(', ')}${result.skillsMatch.missingRequired.length > 5 ? '...' : ''}`);
    console.log(`   Missing Preferred (${result.skillsMatch.missingPreferred.length}): ${result.skillsMatch.missingPreferred.slice(0, 5).join(', ')}${result.skillsMatch.missingPreferred.length > 5 ? '...' : ''}`);
    console.log(`   Additional Skills (${result.skillsMatch.additionalSkills.length}): ${result.skillsMatch.additionalSkills.slice(0, 3).join(', ')}${result.skillsMatch.additionalSkills.length > 3 ? '...' : ''}`);
    console.log(`   Overlap Score: ${(result.skillsMatch.overlapScore * 100).toFixed(1)}%`);
    console.log('');

    // Experience Match
    console.log('📅 EXPERIENCE MATCH');
    console.log('-'.repeat(80));
    console.log(`   Score: ${(result.experienceMatch.score * 100).toFixed(1)}%`);
    console.log(`   Required Years: ${result.experienceMatch.requiredYears ?? 'N/A'}`);
    console.log(`   Candidate Years: ${result.experienceMatch.candidateYears ?? 'N/A'}`);
    console.log(`   Years Gap: ${result.experienceMatch.yearsGap} years`);
    console.log(`   Gap Severity: ${result.experienceMatch.gapSeverity}`);
    console.log('');

    // Domain Match
    console.log('🏢 DOMAIN MATCH');
    console.log('-'.repeat(80));
    console.log(`   Score: ${(result.domainMatch.score * 100).toFixed(1)}%`);
    console.log(`   Matched Domains: ${result.domainMatch.matchedDomains.join(', ') || 'None'}`);
    console.log(`   Job Domains: ${result.domainMatch.jobDomains.join(', ')}`);
    console.log(`   Candidate Domains: ${result.domainMatch.candidateDomains.join(', ')}`);
    console.log('');

    // Level Match
    console.log('📊 LEVEL MATCH');
    console.log('-'.repeat(80));
    console.log(`   Score: ${(result.levelMatch.score * 100).toFixed(1)}%`);
    console.log(`   Required Level: ${result.levelMatch.requiredLevel ?? 'N/A'}`);
    console.log(`   Candidate Level: ${result.levelMatch.candidateLevel ?? 'N/A'}`);
    console.log(`   Level Gap: ${result.levelMatch.levelGap}`);
    console.log(`   Is Promotable: ${result.levelMatch.isPromotable ? 'Yes' : 'No'}`);
    console.log('');

    // Education Match
    console.log('🎓 EDUCATION MATCH');
    console.log('-'.repeat(80));
    console.log(`   Score: ${(result.educationMatch.score * 100).toFixed(1)}%`);
    console.log(`   Required: ${result.educationMatch.required ?? 'N/A'}`);
    console.log(`   Candidate: ${result.educationMatch.candidate ?? 'N/A'}`);
    console.log(`   Meets Requirement: ${result.educationMatch.meetsRequirement ? 'Yes' : 'No'}`);
    console.log('');

    // Location/Work Auth Match
    console.log('📍 LOCATION/WORK AUTH MATCH');
    console.log('-'.repeat(80));
    console.log(`   Score: ${(result.locationMatch.score * 100).toFixed(1)}%`);
    console.log(`   Work Auth Required: ${result.locationMatch.workAuthRequired ?? 'N/A'}`);
    console.log(`   Candidate Status: ${result.locationMatch.candidateStatus ?? 'N/A'}`);
    console.log(`   Meets Requirement: ${result.locationMatch.meetsRequirement ? 'Yes' : 'No'}`);
    console.log('');

    // Scoring Breakdown
    console.log('⚖️  SCORING BREAKDOWN');
    console.log('-'.repeat(80));
    console.log(`   Semantic Contribution: ${result.scoringBreakdown.semantic.toFixed(2)} points`);
    console.log(`   Skills Coverage Contribution: ${result.scoringBreakdown.skillsCoverage.toFixed(2)} points`);
    console.log(`   Experience Contribution: ${result.scoringBreakdown.experience.toFixed(2)} points`);
    console.log(`   Domain Contribution: ${result.scoringBreakdown.domain.toFixed(2)} points`);
    console.log(`   Education Contribution: ${result.scoringBreakdown.education.toFixed(2)} points`);
    console.log(`   Location Contribution: ${result.scoringBreakdown.location.toFixed(2)} points`);
    console.log(`   Bonuses Applied: +${result.scoringBreakdown.bonuses.toFixed(2)} points`);
    console.log(`   Penalties Applied: -${result.scoringBreakdown.penalties.toFixed(2)} points`);
    console.log('');

    // Gate Results
    console.log('🚧 GATE RESULTS');
    console.log('-'.repeat(80));
    console.log(`   Skills Gate: ${result.gateResults.skillsGate.passed ? '✅ PASS' : '❌ FAIL'} (${(result.gateResults.skillsGate.value * 100).toFixed(1)}% vs ${(result.gateResults.skillsGate.threshold * 100).toFixed(1)}% threshold)`);
    console.log(`   Experience Gate: ${result.gateResults.experienceGate.passed ? '✅ PASS' : '❌ FAIL'} (${result.gateResults.experienceGate.value} years gap vs ${result.gateResults.experienceGate.threshold} max)`);
    console.log(`   Location Gate: ${result.gateResults.locationGate.passed ? '✅ PASS' : '❌ FAIL'} (${result.gateResults.locationGate.required ? 'required' : 'not required'})`);
    console.log(`   Education Gate: ${result.gateResults.educationGate.passed ? '✅ PASS' : '❌ FAIL'} (${result.gateResults.educationGate.required ? 'required' : 'not required'})`);
    console.log(`   Overall Gates: ${result.gateResults.overallGatesPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
    console.log('');

    // Quality Indicators
    console.log('📈 QUALITY INDICATORS');
    console.log('-'.repeat(80));
    console.log(`   Semantic Confidence: ${result.qualityIndicators.semanticConfidence}`);
    console.log(`   Data Completeness: ${(result.qualityIndicators.dataCompleteness * 100).toFixed(1)}%`);
    console.log(`   Consistency Score: ${(result.qualityIndicators.consistencyScore * 100).toFixed(1)}%`);
    console.log('');

    // Explanation
    console.log('💬 GENERATED EXPLANATION');
    console.log('-'.repeat(80));
    console.log('Strengths:');
    result.explanation.strengths.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s}`);
    });
    console.log('');
    console.log('Concerns:');
    result.explanation.concerns.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c}`);
    });
    console.log('');
    console.log('Summary:');
    console.log(`   ${result.explanation.summary}`);
    console.log('');
    console.log('Recommendations:');
    result.explanation.recommendations.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r}`);
    });
    console.log('');
    console.log('Key Insights:');
    console.log(`   Strongest Match: ${result.explanation.keyInsights.strongestMatch}`);
    console.log(`   Biggest Gap: ${result.explanation.keyInsights.biggestGap}`);
    console.log(`   Improvement Potential: ${result.explanation.keyInsights.improvementPotential}`);
    console.log('');

    // Analysis
    console.log('='.repeat(80));
    console.log('🔬 ANALYSIS & DIAGNOSIS');
    console.log('='.repeat(80));
    console.log('');

    // Check what went wrong
    const issues = [];

    if (result.finalScore < testCase.expectedScore.min) {
      const diff = testCase.expectedScore.min - result.finalScore;
      issues.push(`❌ Score is ${diff} points BELOW expected minimum`);
    } else if (result.finalScore > testCase.expectedScore.max) {
      const diff = result.finalScore - testCase.expectedScore.max;
      issues.push(`❌ Score is ${diff} points ABOVE expected maximum`);
    } else {
      issues.push(`✅ Score is within expected range`);
    }

    if (result.confidence !== testCase.expectedConfidence) {
      issues.push(`⚠️  Confidence is ${result.confidence} (expected: ${testCase.expectedConfidence})`);
    }

    if (!result.gateResults.overallGatesPassed) {
      issues.push(`❌ CRITICAL: Gate(s) failed, causing score penalties`);
      if (!result.gateResults.skillsGate.passed) {
        issues.push(`   ↳ Skills gate failed: ${(result.gateResults.skillsGate.value * 100).toFixed(1)}% < ${(result.gateResults.skillsGate.threshold * 100).toFixed(1)}%`);
      }
      if (!result.gateResults.experienceGate.passed) {
        issues.push(`   ↳ Experience gate failed: ${result.gateResults.experienceGate.value} years gap > ${result.gateResults.experienceGate.threshold} max`);
      }
      if (!result.gateResults.locationGate.passed) {
        issues.push(`   ↳ Location gate failed: Work authorization not met`);
      }
      if (!result.gateResults.educationGate.passed) {
        issues.push(`   ↳ Education gate failed: Does not meet education requirement`);
      }
    }

    if (result.skillsMatch.coverage < 0.5) {
      issues.push(`⚠️  Low skills coverage: ${(result.skillsMatch.coverage * 100).toFixed(1)}%`);
    }

    if (result.semanticAnalysis.overallSemantic < 0.3) {
      issues.push(`⚠️  Low semantic similarity: ${(result.semanticAnalysis.overallSemantic * 100).toFixed(1)}%`);
    }

    if (result.scoringBreakdown.penalties > 10) {
      issues.push(`⚠️  High penalties applied: ${result.scoringBreakdown.penalties.toFixed(1)} points`);
    }

    console.log('Issues Detected:');
    issues.forEach(issue => {
      console.log(`   ${issue}`);
    });
    console.log('');

    // Root cause analysis
    console.log('🎯 ROOT CAUSE ANALYSIS');
    console.log('-'.repeat(80));

    if (!result.gateResults.skillsGate.passed) {
      console.log('❗ PRIMARY ISSUE: Skills Gate Failure');
      console.log('');
      console.log('   The skills gate is the most likely cause of the low score.');
      console.log(`   Coverage: ${(result.skillsMatch.coverage * 100).toFixed(1)}%`);
      console.log(`   Threshold: ${(result.gateResults.skillsGate.threshold * 100).toFixed(1)}%`);
      console.log(`   Missing Required Skills (${result.skillsMatch.missingRequired.length}):`);
      result.skillsMatch.missingRequired.forEach(skill => {
        console.log(`      • ${skill}`);
      });
      console.log('');
      console.log('   Possible Causes:');
      console.log('   1. Skills extraction not recognizing synonyms (e.g., "React.js" vs "React")');
      console.log('   2. Skills threshold too strict (30% may be too high)');
      console.log('   3. Job description lists many nice-to-have skills as "required"');
      console.log('');
    }

    if (result.semanticAnalysis.overallSemantic < 0.5) {
      console.log('⚠️  CONTRIBUTING FACTOR: Low Semantic Similarity');
      console.log('');
      console.log(`   Overall: ${(result.semanticAnalysis.overallSemantic * 100).toFixed(1)}%`);
      console.log('   This is dragging the score down due to 40% semantic weight.');
      console.log('');
    }

    if (result.finalScore < testCase.expectedScore.min - 30) {
      console.log('🚨 CATASTROPHIC FAILURE DETECTED');
      console.log('');
      console.log('   The score is >30 points below expected. This suggests:');
      console.log('   1. Gate penalty is too severe (capping score at 25)');
      console.log('   2. Multiple penalties stacking');
      console.log('   3. Core scoring logic issue');
      console.log('');
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ DEBUG COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR during analysis:');
    console.error(error);
  }
}

// Main execution
async function main() {
  // Default to test-002, but allow command line argument
  const testId = process.argv[2] || 'test-002';

  await debugTestCase(testId);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { debugTestCase };
