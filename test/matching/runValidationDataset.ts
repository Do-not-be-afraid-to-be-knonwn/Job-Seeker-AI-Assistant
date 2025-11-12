/**
 * Validation Dataset Test Runner
 *
 * This script runs the matching system against the comprehensive validation dataset
 * and analyzes the accuracy of scores and explanations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { JobResumeMatchingChain } from '../../src/matching/core/jobResumeMatching.chain';
import { JobResumeMatchingResult } from '../../src/matching/schemas/jobResumeMatching.schema';

interface TestCase {
  id: string;
  category: 'excellent' | 'good' | 'fair' | 'poor';
  name: string;
  expectedScore: { min: number; max: number };
  expectedConfidence: string;
  jobDescription: string;
  resumeContent: string;
  groundTruth: {
    shouldMatch: boolean;
    reasoning: string;
    expectedStrengths: string[];
    expectedConcerns: string[];
    expectedGateResults: {
      skillsGate: string;
      experienceGate: string;
      locationGate: string;
      educationGate: string;
    };
    testFocus: string;
  };
}

interface ValidationDataset {
  metadata: {
    version: string;
    created: string;
    description: string;
    scoringSystem: Record<string, string>;
    purpose: string;
  };
  testCases: TestCase[];
}

interface TestResult {
  testCase: TestCase;
  result: JobResumeMatchingResult;
  scoreAccurate: boolean;
  scoreDiff: number;
  confidenceMatch: boolean;
  gatesAccurate: boolean;
  hasExpectedStrengths: number; // Percentage of expected strengths found
  hasExpectedConcerns: number; // Percentage of expected concerns found
  passed: boolean;
}

interface ValidationReport {
  totalTests: number;
  passed: number;
  failed: number;
  byCategory: Record<string, { total: number; passed: number; avgScore: number; avgScoreDiff: number }>;
  scoreAccuracy: {
    withinRange: number;
    averageDiff: number;
    maxDiff: number;
  };
  confidenceAccuracy: number;
  gateAccuracy: number;
  explanationQuality: {
    strengthsMatchRate: number;
    concernsMatchRate: number;
  };
  detailedResults: TestResult[];
}

class ValidationRunner {
  private chain: JobResumeMatchingChain;
  private dataset: ValidationDataset;

  constructor() {
    this.chain = new JobResumeMatchingChain();
    this.dataset = this.loadDataset();
  }

  private loadDataset(): ValidationDataset {
    const datasetPath = path.join(__dirname, 'matchingValidation.dataset.json');
    const content = fs.readFileSync(datasetPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Run validation on all test cases
   */
  async runValidation(): Promise<ValidationReport> {
    console.log('='.repeat(80));
    console.log('MATCHING SYSTEM VALIDATION DATASET TEST');
    console.log('='.repeat(80));
    console.log(`Dataset: ${this.dataset.metadata.description}`);
    console.log(`Total Test Cases: ${this.dataset.testCases.length}`);
    console.log('='.repeat(80));
    console.log('');

    const results: TestResult[] = [];

    for (let i = 0; i < this.dataset.testCases.length; i++) {
      const testCase = this.dataset.testCases[i];
      console.log(`\n[${i + 1}/${this.dataset.testCases.length}] Running: ${testCase.id} - ${testCase.name}`);
      console.log(`Category: ${testCase.category.toUpperCase()}`);

      try {
        const result = await this.chain.analyzeMatch({
          jobDescription: testCase.jobDescription,
          resumeContent: testCase.resumeContent,
          options: {
            includeExplanation: true,
            strictMode: false
          }
        });

        if ('error' in result) {
          console.log(`❌ ERROR: ${result.error}`);
          results.push({
            testCase,
            result: result as any,
            scoreAccurate: false,
            scoreDiff: 999,
            confidenceMatch: false,
            gatesAccurate: false,
            hasExpectedStrengths: 0,
            hasExpectedConcerns: 0,
            passed: false
          });
          continue;
        }

        const testResult = this.evaluateResult(testCase, result);
        results.push(testResult);

        // Print summary
        console.log(`  Score: ${result.finalScore} (expected: ${testCase.expectedScore.min}-${testCase.expectedScore.max})`);
        console.log(`  Confidence: ${result.confidence} (expected: ${testCase.expectedConfidence})`);
        console.log(`  Score Accurate: ${testResult.scoreAccurate ? '✅' : '❌'} (diff: ${testResult.scoreDiff.toFixed(1)})`);
        console.log(`  Confidence Match: ${testResult.confidenceMatch ? '✅' : '❌'}`);
        console.log(`  Gates Accurate: ${testResult.gatesAccurate ? '✅' : '❌'}`);
        console.log(`  Overall: ${testResult.passed ? '✅ PASS' : '❌ FAIL'}`);

      } catch (error) {
        console.log(`❌ EXCEPTION: ${error instanceof Error ? error.message : String(error)}`);
        results.push({
          testCase,
          result: null as any,
          scoreAccurate: false,
          scoreDiff: 999,
          confidenceMatch: false,
          gatesAccurate: false,
          hasExpectedStrengths: 0,
          hasExpectedConcerns: 0,
          passed: false
        });
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return this.generateReport(results);
  }

  /**
   * Evaluate a single test result
   */
  private evaluateResult(testCase: TestCase, result: JobResumeMatchingResult): TestResult {
    // Check score accuracy
    const scoreInRange = result.finalScore >= testCase.expectedScore.min &&
                         result.finalScore <= testCase.expectedScore.max;
    const scoreDiff = scoreInRange ? 0 : Math.min(
      Math.abs(result.finalScore - testCase.expectedScore.min),
      Math.abs(result.finalScore - testCase.expectedScore.max)
    );

    // Check confidence match
    const confidenceMatch = result.confidence === testCase.expectedConfidence ||
                           this.isAcceptableConfidenceVariation(result.confidence, testCase.expectedConfidence);

    // Check gate results
    const gatesAccurate = this.evaluateGates(testCase.groundTruth.expectedGateResults, result.gateResults);

    // Check explanation quality
    const strengthsMatch = this.checkExplanationMatch(
      testCase.groundTruth.expectedStrengths,
      result.explanation.strengths
    );
    const concernsMatch = this.checkExplanationMatch(
      testCase.groundTruth.expectedConcerns,
      result.explanation.concerns
    );

    // Overall pass criteria
    const passed = scoreInRange &&
                   (confidenceMatch || scoreDiff <= 5) && // Allow some confidence flexibility if score is close
                   gatesAccurate;

    return {
      testCase,
      result,
      scoreAccurate: scoreInRange,
      scoreDiff,
      confidenceMatch,
      gatesAccurate,
      hasExpectedStrengths: strengthsMatch,
      hasExpectedConcerns: concernsMatch,
      passed
    };
  }

  /**
   * Check if confidence variation is acceptable (e.g., high vs medium is closer than high vs low)
   */
  private isAcceptableConfidenceVariation(actual: string, expected: string): boolean {
    const confidenceLevels = { low: 0, medium: 1, high: 2 };
    const actualLevel = confidenceLevels[actual as keyof typeof confidenceLevels] ?? 1;
    const expectedLevel = confidenceLevels[expected as keyof typeof confidenceLevels] ?? 1;

    // Allow 1 level difference (e.g., medium vs high is OK)
    return Math.abs(actualLevel - expectedLevel) <= 1;
  }

  /**
   * Evaluate gate results accuracy
   */
  private evaluateGates(expected: any, actual: any): boolean {
    const gateTypes = ['skillsGate', 'experienceGate', 'locationGate', 'educationGate'];

    for (const gateType of gateTypes) {
      const expectedStatus = expected[gateType];
      const actualPassed = actual[gateType].passed;

      if (expectedStatus === 'pass' && !actualPassed) return false;
      if (expectedStatus === 'fail' && actualPassed) return false;
      // 'borderline' allows either pass or fail
    }

    return true;
  }

  /**
   * Check how many expected explanation points appear in actual explanations
   */
  private checkExplanationMatch(expected: string[], actual: string[]): number {
    if (expected.length === 0) return 100;

    let matches = 0;

    for (const expectedPoint of expected) {
      const keywords = this.extractKeywords(expectedPoint);

      for (const actualPoint of actual) {
        const actualLower = actualPoint.toLowerCase();
        const keywordMatches = keywords.filter(kw => actualLower.includes(kw.toLowerCase()));

        // If at least 40% of keywords match, count as a match
        if (keywordMatches.length / keywords.length >= 0.4) {
          matches++;
          break;
        }
      }
    }

    return (matches / expected.length) * 100;
  }

  /**
   * Extract important keywords from explanation text
   */
  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !commonWords.includes(w));

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Generate comprehensive validation report
   */
  private generateReport(results: TestResult[]): ValidationReport {
    const totalTests = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = totalTests - passed;

    // By category analysis
    const byCategory: Record<string, { total: number; passed: number; avgScore: number; avgScoreDiff: number }> = {};

    for (const category of ['excellent', 'good', 'fair', 'poor']) {
      const categoryResults = results.filter(r => r.testCase.category === category);
      byCategory[category] = {
        total: categoryResults.length,
        passed: categoryResults.filter(r => r.passed).length,
        avgScore: categoryResults.reduce((sum, r) => sum + (r.result?.finalScore || 0), 0) / categoryResults.length,
        avgScoreDiff: categoryResults.reduce((sum, r) => sum + r.scoreDiff, 0) / categoryResults.length
      };
    }

    // Score accuracy
    const withinRange = results.filter(r => r.scoreAccurate).length;
    const averageDiff = results.reduce((sum, r) => sum + r.scoreDiff, 0) / totalTests;
    const maxDiff = Math.max(...results.map(r => r.scoreDiff));

    // Confidence accuracy
    const confidenceAccuracy = (results.filter(r => r.confidenceMatch).length / totalTests) * 100;

    // Gate accuracy
    const gateAccuracy = (results.filter(r => r.gatesAccurate).length / totalTests) * 100;

    // Explanation quality
    const strengthsMatchRate = results.reduce((sum, r) => sum + r.hasExpectedStrengths, 0) / totalTests;
    const concernsMatchRate = results.reduce((sum, r) => sum + r.hasExpectedConcerns, 0) / totalTests;

    return {
      totalTests,
      passed,
      failed,
      byCategory,
      scoreAccuracy: {
        withinRange,
        averageDiff,
        maxDiff
      },
      confidenceAccuracy,
      gateAccuracy,
      explanationQuality: {
        strengthsMatchRate,
        concernsMatchRate
      },
      detailedResults: results
    };
  }

  /**
   * Print validation report
   */
  printReport(report: ValidationReport): void {
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log('');

    console.log('📊 OVERALL RESULTS');
    console.log('-'.repeat(80));
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passed} (${((report.passed / report.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${report.failed} (${((report.failed / report.totalTests) * 100).toFixed(1)}%)`);
    console.log('');

    console.log('📈 SCORE ACCURACY');
    console.log('-'.repeat(80));
    console.log(`Within Expected Range: ${report.scoreAccuracy.withinRange}/${report.totalTests} (${((report.scoreAccuracy.withinRange / report.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Average Deviation: ${report.scoreAccuracy.averageDiff.toFixed(2)} points`);
    console.log(`Maximum Deviation: ${report.scoreAccuracy.maxDiff.toFixed(2)} points`);
    console.log('');

    console.log('🎯 RESULTS BY CATEGORY');
    console.log('-'.repeat(80));
    for (const [category, stats] of Object.entries(report.byCategory)) {
      console.log(`${category.toUpperCase()}:`);
      console.log(`  Tests: ${stats.total}`);
      console.log(`  Passed: ${stats.passed}/${stats.total} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
      console.log(`  Avg Score: ${stats.avgScore.toFixed(1)}`);
      console.log(`  Avg Deviation: ${stats.avgScoreDiff.toFixed(2)} points`);
      console.log('');
    }

    console.log('🔍 OTHER METRICS');
    console.log('-'.repeat(80));
    console.log(`Confidence Accuracy: ${report.confidenceAccuracy.toFixed(1)}%`);
    console.log(`Gate Results Accuracy: ${report.gateAccuracy.toFixed(1)}%`);
    console.log(`Explanation Strengths Match: ${report.explanationQuality.strengthsMatchRate.toFixed(1)}%`);
    console.log(`Explanation Concerns Match: ${report.explanationQuality.concernsMatchRate.toFixed(1)}%`);
    console.log('');

    console.log('❌ FAILED TESTS');
    console.log('-'.repeat(80));
    const failedTests = report.detailedResults.filter(r => !r.passed);
    if (failedTests.length === 0) {
      console.log('None - all tests passed! 🎉');
    } else {
      failedTests.forEach((test, idx) => {
        console.log(`${idx + 1}. ${test.testCase.id} - ${test.testCase.name}`);
        console.log(`   Expected: ${test.testCase.expectedScore.min}-${test.testCase.expectedScore.max}, Got: ${test.result?.finalScore || 'ERROR'}`);
        console.log(`   Reason: ${this.getFailureReason(test)}`);
        console.log('');
      });
    }

    console.log('='.repeat(80));
    console.log('');
  }

  /**
   * Get human-readable failure reason
   */
  private getFailureReason(test: TestResult): string {
    const reasons = [];

    if (!test.scoreAccurate) {
      reasons.push(`Score off by ${test.scoreDiff.toFixed(1)} points`);
    }
    if (!test.confidenceMatch) {
      reasons.push(`Confidence mismatch (got ${test.result?.confidence}, expected ${test.testCase.expectedConfidence})`);
    }
    if (!test.gatesAccurate) {
      reasons.push('Gate results incorrect');
    }

    return reasons.join(', ');
  }

  /**
   * Export detailed results to CSV for analysis
   */
  exportToCSV(report: ValidationReport, filename: string): void {
    const csvLines = [
      'Test ID,Category,Name,Expected Min,Expected Max,Actual Score,Score Diff,Score Accurate,Confidence Expected,Confidence Actual,Confidence Match,Gates Accurate,Strengths Match %,Concerns Match %,Passed'
    ];

    for (const result of report.detailedResults) {
      const line = [
        result.testCase.id,
        result.testCase.category,
        `"${result.testCase.name}"`,
        result.testCase.expectedScore.min,
        result.testCase.expectedScore.max,
        result.result?.finalScore || 'ERROR',
        result.scoreDiff.toFixed(2),
        result.scoreAccurate ? 'Yes' : 'No',
        result.testCase.expectedConfidence,
        result.result?.confidence || 'N/A',
        result.confidenceMatch ? 'Yes' : 'No',
        result.gatesAccurate ? 'Yes' : 'No',
        result.hasExpectedStrengths.toFixed(1),
        result.hasExpectedConcerns.toFixed(1),
        result.passed ? 'Yes' : 'No'
      ].join(',');

      csvLines.push(line);
    }

    fs.writeFileSync(filename, csvLines.join('\n'));
    console.log(`📄 Detailed results exported to: ${filename}`);
  }
}

/**
 * Main execution
 */
async function main() {
  const runner = new ValidationRunner();

  const report = await runner.runValidation();
  runner.printReport(report);

  // Export results
  const csvPath = path.join(__dirname, 'validation-results.csv');
  runner.exportToCSV(report, csvPath);

  // Exit with appropriate code
  process.exit(report.failed === 0 ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ValidationRunner, ValidationReport, TestResult };
