/**
 * Debug test-018 in detail
 */

import * as fs from 'fs';
import * as path from 'path';
import { JobResumeMatchingChain } from '../../src/matching/core/jobResumeMatching.chain';

async function debugTest018() {
  console.log('='.repeat(80));
  console.log('DEBUGGING TEST-018: Poor Match - Outdated Skills');
  console.log('='.repeat(80));
  console.log('');

  // Load test case
  const datasetPath = path.join(__dirname, 'matchingValidation.dataset.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  const testCase = dataset.testCases.find((t: any) => t.id === 'test-018');

  console.log('Test Details:');
  console.log(`  ID: ${testCase.id}`);
  console.log(`  Category: ${testCase.category}`);
  console.log(`  Name: ${testCase.name}`);
  console.log(`  Expected Score: ${testCase.expectedScore.min}-${testCase.expectedScore.max}`);
  console.log(`  Expected Confidence: ${testCase.expectedConfidence}`);
  console.log('');

  console.log('Ground Truth:');
  console.log(`  Should Match: ${testCase.groundTruth.shouldMatch}`);
  console.log(`  Reasoning: ${testCase.groundTruth.reasoning}`);
  console.log('');

  console.log('Expected Concerns:');
  testCase.groundTruth.expectedConcerns.forEach((concern: string, i: number) => {
    console.log(`  ${i + 1}. ${concern}`);
  });
  console.log('');

  // Run matching
  console.log('Running matching analysis...');
  console.log('-'.repeat(80));
  console.log('');

  const chain = new JobResumeMatchingChain();

  try {
    const result = await chain.analyzeMatch({
      jobDescription: testCase.jobDescription,
      resumeContent: testCase.resumeContent,
      options: {
        includeExplanation: true,
        strictMode: false
      }
    });

    if ('error' in result) {
      console.error('❌ ERROR:', result.error);
      return;
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('MATCHING RESULTS');
    console.log('='.repeat(80));
    console.log('');

    // Overall score
    console.log('🎯 FINAL SCORE');
    console.log('-'.repeat(80));
    console.log(`  Actual Score: ${result.finalScore}/100`);
    console.log(`  Expected: ${testCase.expectedScore.min}-${testCase.expectedScore.max}`);
    const deviation = result.finalScore < testCase.expectedScore.min
      ? testCase.expectedScore.min - result.finalScore
      : result.finalScore - testCase.expectedScore.max;
    console.log(`  Deviation: ${deviation.toFixed(1)} points ${result.finalScore < testCase.expectedScore.min ? 'BELOW' : 'ABOVE'}`);
    console.log(`  Within Range: ${result.finalScore >= testCase.expectedScore.min && result.finalScore <= testCase.expectedScore.max ? '✅ YES' : '❌ NO'}`);
    console.log(`  Confidence: ${result.confidence} (expected: ${testCase.expectedConfidence})`);
    console.log('');

    // Component scores
    console.log('📊 COMPONENT SCORES');
    console.log('-'.repeat(80));
    console.log(`  Semantic Similarity: ${(result.semanticAnalysis.overallSemantic * 100).toFixed(1)}%`);
    console.log(`    - Requirements Match: ${(result.semanticAnalysis.requirementsMatch * 100).toFixed(1)}%`);
    console.log(`    - Responsibilities Match: ${(result.semanticAnalysis.responsibilitiesMatch * 100).toFixed(1)}%`);
    console.log(`    - Qualifications Match: ${(result.semanticAnalysis.qualificationsMatch * 100).toFixed(1)}%`);
    console.log(`  Skills Coverage: ${(result.skillsMatch.coverage * 100).toFixed(1)}%`);
    console.log(`  Skills Overlap: ${(result.skillsMatch.overlapScore * 100).toFixed(1)}%`);
    console.log(`  Experience Score: ${(result.experienceMatch.score * 100).toFixed(1)}%`);
    console.log(`  Domain Match: ${(result.domainMatch.score * 100).toFixed(1)}%`);
    console.log(`  Level Match: ${(result.levelMatch.score * 100).toFixed(1)}%`);
    console.log(`  Education Match: ${(result.educationMatch.score * 100).toFixed(1)}%`);
    console.log(`  Location Match: ${(result.locationMatch.score * 100).toFixed(1)}%`);
    console.log('');

    // Skills details
    console.log('💻 SKILLS ANALYSIS');
    console.log('-'.repeat(80));
    console.log(`  Matched Skills (${result.skillsMatch.matchedSkills.length}):`);
    result.skillsMatch.matchedSkills.forEach(skill => console.log(`    ✅ ${skill}`));
    console.log(`  Missing Required (${result.skillsMatch.missingRequired.length}):`);
    result.skillsMatch.missingRequired.forEach(skill => console.log(`    ❌ ${skill}`));
    console.log(`  Additional Skills (${result.skillsMatch.additionalSkills.length}):`);
    result.skillsMatch.additionalSkills.slice(0, 5).forEach(skill => console.log(`    + ${skill}`));
    if (result.skillsMatch.additionalSkills.length > 5) {
      console.log(`    ... and ${result.skillsMatch.additionalSkills.length - 5} more`);
    }
    console.log('');

    // Experience details
    console.log('📅 EXPERIENCE ANALYSIS');
    console.log('-'.repeat(80));
    console.log(`  Required Years: ${result.experienceMatch.requiredYears ?? 'N/A'}`);
    console.log(`  Candidate Years: ${result.experienceMatch.candidateYears ?? 'N/A'}`);
    console.log(`  Years Gap: ${result.experienceMatch.yearsGap} (${result.experienceMatch.gapSeverity})`);
    console.log('');

    // Domain details
    console.log('🏢 DOMAIN ANALYSIS');
    console.log('-'.repeat(80));
    console.log(`  Job Domains: ${result.domainMatch.jobDomains.join(', ')}`);
    console.log(`  Candidate Domains: ${result.domainMatch.candidateDomains.join(', ')}`);
    console.log(`  Matched: ${result.domainMatch.matchedDomains.join(', ') || 'None'}`);
    console.log('');

    // Level details
    console.log('📊 LEVEL ANALYSIS');
    console.log('-'.repeat(80));
    console.log(`  Required Level: ${result.levelMatch.requiredLevel ?? 'N/A'}`);
    console.log(`  Candidate Level: ${result.levelMatch.candidateLevel ?? 'N/A'}`);
    console.log(`  Level Gap: ${result.levelMatch.levelGap}`);
    console.log(`  Is Promotable: ${result.levelMatch.isPromotable ? 'Yes' : 'No'}`);
    console.log('');

    // Scoring breakdown
    console.log('⚖️  SCORING BREAKDOWN');
    console.log('-'.repeat(80));
    console.log(`  Semantic Contribution: ${result.scoringBreakdown.semantic.toFixed(2)} points`);
    console.log(`  Skills Coverage: ${result.scoringBreakdown.skillsCoverage.toFixed(2)} points`);
    console.log(`  Experience: ${result.scoringBreakdown.experience.toFixed(2)} points`);
    console.log(`  Domain: ${result.scoringBreakdown.domain.toFixed(2)} points`);
    console.log(`  Education: ${result.scoringBreakdown.education.toFixed(2)} points`);
    console.log(`  Location: ${result.scoringBreakdown.location.toFixed(2)} points`);
    console.log(`  Bonuses: +${result.scoringBreakdown.bonuses.toFixed(2)} points`);
    console.log(`  Penalties: -${result.scoringBreakdown.penalties.toFixed(2)} points`);
    console.log('');

    // Gate results
    console.log('🚧 GATE RESULTS');
    console.log('-'.repeat(80));
    console.log(`  Skills Gate: ${result.gateResults.skillsGate.passed ? '✅ PASS' : '❌ FAIL'} (${(result.gateResults.skillsGate.value * 100).toFixed(1)}% vs ${(result.gateResults.skillsGate.threshold * 100).toFixed(1)}%)`);
    console.log(`  Experience Gate: ${result.gateResults.experienceGate.passed ? '✅ PASS' : '❌ FAIL'} (gap: ${result.gateResults.experienceGate.value} vs max: ${result.gateResults.experienceGate.threshold})`);
    console.log(`  Location Gate: ${result.gateResults.locationGate.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Education Gate: ${result.gateResults.educationGate.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Overall: ${result.gateResults.overallGatesPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
    console.log('');

    // Quality indicators
    console.log('📈 QUALITY INDICATORS');
    console.log('-'.repeat(80));
    console.log(`  Semantic Confidence: ${result.qualityIndicators.semanticConfidence}`);
    console.log(`  Data Completeness: ${(result.qualityIndicators.dataCompleteness * 100).toFixed(1)}%`);
    console.log(`  Consistency Score: ${(result.qualityIndicators.consistencyScore * 100).toFixed(1)}%`);
    console.log('');

    // Explanation
    console.log('💬 GENERATED EXPLANATION');
    console.log('-'.repeat(80));
    console.log('Strengths:');
    result.explanation.strengths.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    console.log('');
    console.log('Concerns:');
    result.explanation.concerns.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
    console.log('');
    console.log('Summary:');
    console.log(`  ${result.explanation.summary}`);
    console.log('');
    console.log('Recommendations:');
    result.explanation.recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    console.log('');
    console.log('Key Insights:');
    console.log(`  Strongest Match: ${result.explanation.keyInsights.strongestMatch}`);
    console.log(`  Biggest Gap: ${result.explanation.keyInsights.biggestGap}`);
    console.log(`  Improvement Potential: ${result.explanation.keyInsights.improvementPotential}`);
    console.log('');

    // Analysis
    console.log('='.repeat(80));
    console.log('🔬 ROOT CAUSE ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    console.log('❓ WHY IS THE SCORE SO HIGH?');
    console.log('-'.repeat(80));

    if (result.semanticAnalysis.overallSemantic > 0.5) {
      console.log(`⚠️  HIGH SEMANTIC SIMILARITY: ${(result.semanticAnalysis.overallSemantic * 100).toFixed(1)}%`);
      console.log(`   This is likely driving the high score despite poor technical match.`);
      console.log(`   The system is matching on general "web development" keywords.`);
      console.log('');
    }

    if (result.skillsMatch.coverage > 0.3) {
      console.log(`⚠️  SOME SKILLS MATCHED: ${(result.skillsMatch.coverage * 100).toFixed(1)}%`);
      console.log(`   Even though skills are outdated, some overlap exists.`);
      console.log(`   System doesn't penalize for OUTDATED skills (jQuery vs React).`);
      console.log('');
    }

    if (result.gateResults.overallGatesPassed) {
      console.log(`⚠️  ALL GATES PASSED`);
      console.log(`   Gates are too lenient - should FAIL for outdated tech stack.`);
      console.log('');
    }

    if (result.scoringBreakdown.penalties < 10) {
      console.log(`⚠️  LOW PENALTIES: ${result.scoringBreakdown.penalties.toFixed(2)} points`);
      console.log(`   System is not applying enough penalty for:`);
      console.log(`   - Outdated skills (jQuery, PHP, HTML4, CSS2)`);
      console.log(`   - Experience gap (2015-2023 = 8 years out of workforce)`);
      console.log(`   - Technology mismatch (WordPress vs React/Node.js)`);
      console.log('');
    }

    console.log('🎯 WHAT SHOULD HAPPEN:');
    console.log('-'.repeat(80));
    console.log('Expected Score: 25-40 (Poor match)');
    console.log('Actual Score: ' + result.finalScore);
    console.log('');
    console.log('Required Penalties:');
    console.log('  1. Outdated technology stack: -20 points');
    console.log('  2. Long experience gap (8 years): -15 points');
    console.log('  3. Missing modern skills (React, Node.js, etc): -15 points');
    console.log('  4. Wrong tech ecosystem (PHP/WordPress vs JS/Node): -10 points');
    console.log('');
    console.log(`Total penalties needed: ~60 points`);
    console.log(`Would bring score from ${result.finalScore} to ~${result.finalScore - 60} (around expected range)`);
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ DEBUG COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:');
    console.error(error);
  }
}

if (require.main === module) {
  debugTest018().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { debugTest018 };
