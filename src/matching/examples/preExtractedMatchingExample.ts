/**
 * Example: Using Pre-Extracted Resume Features for Matching
 *
 * This demonstrates the new efficient workflow:
 * 1. Extract resume features ONCE when uploaded
 * 2. Reuse those features for matching against MULTIPLE job postings
 */

import { extractResumeForMatching } from '../services/resumeExtraction.service';
import { JobResumeMatchingChain } from '../core/jobResumeMatching.chain';
import { PreExtractedResumeFeatures } from '../schemas/jobResumeMatching.schema';

// Sample resume
const SAMPLE_RESUME = `
John Smith
Senior Software Engineer

Professional Summary:
Experienced full-stack engineer with 7 years building scalable web applications.
Specialized in React, Node.js, and cloud infrastructure.

Experience:
- Senior Software Engineer, TechCorp (2020-2024): Led development of React-based dashboard,
  migrated services to AWS, mentored junior developers.
- Software Engineer, StartupXYZ (2017-2020): Built Node.js microservices, implemented CI/CD
  pipelines, worked with MongoDB and PostgreSQL.

Skills: React, Node.js, TypeScript, AWS, Docker, Kubernetes, PostgreSQL, MongoDB, GraphQL

Education: B.S. Computer Science, State University (2017)

Work Authorization: Authorized to work in the US
`;

// Multiple job postings to match against
const JOB_POSTINGS = [
  {
    id: 'job-001',
    description: `
Senior Full Stack Engineer

Requirements:
- 5+ years of software development experience
- Expert in React and Node.js
- Experience with AWS and containerization
- TypeScript proficiency
- Bachelor's degree in Computer Science
`
  },
  {
    id: 'job-002',
    description: `
Lead Frontend Engineer

Requirements:
- 8+ years of frontend development
- Deep React expertise
- Experience with design systems
- Leadership and mentoring experience
- Master's degree preferred
`
  },
  {
    id: 'job-003',
    description: `
Backend Engineer (Python)

Requirements:
- 5+ years Python development
- FastAPI or Django experience
- PostgreSQL and Redis
- Microservices architecture
- Bachelor's degree
`
  }
];

async function demonstratePreExtractedMatching() {
  console.log('='.repeat(80));
  console.log('DEMONSTRATION: Pre-Extracted Resume Feature Matching');
  console.log('='.repeat(80));
  console.log('');

  // STEP 1: Extract resume features ONCE
  console.log('📋 STEP 1: Extracting resume features (done ONCE when uploaded)...');
  console.log('-'.repeat(80));

  const startExtraction = Date.now();
  const resumeFeatures: PreExtractedResumeFeatures = await extractResumeForMatching(
    SAMPLE_RESUME,
    true // Include raw sections for semantic analysis
  );
  const extractionTime = Date.now() - startExtraction;

  console.log(`✅ Resume features extracted in ${extractionTime}ms`);
  console.log('');

  // STEP 2: Match against multiple job postings using the SAME extracted features
  console.log('🔍 STEP 2: Matching against multiple job postings (reusing features)...');
  console.log('-'.repeat(80));
  console.log('');

  const chain = new JobResumeMatchingChain();
  const results = [];

  for (const job of JOB_POSTINGS) {
    console.log(`Matching against ${job.id}...`);
    const startMatch = Date.now();

    const result = await chain.analyzeMatch({
      jobDescription: job.description,
      resumeFeatures: resumeFeatures, // ✅ Reusing pre-extracted features!
      options: {
        includeExplanation: true,
        strictMode: false
      }
    });

    const matchTime = Date.now() - startMatch;

    if ('error' in result) {
      console.log(`  ❌ ERROR: ${result.error}`);
    } else {
      console.log(`  ✅ Score: ${result.finalScore}/100 (matched in ${matchTime}ms)`);
      results.push({
        jobId: job.id,
        score: result.finalScore,
        confidence: result.confidence,
        matchTime,
        result
      });
    }

    console.log('');
  }

  // STEP 3: Show results and performance comparison
  console.log('='.repeat(80));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  console.log('Performance:');
  console.log(`  Resume extraction: ${extractionTime}ms (one-time cost)`);
  console.log(`  Average match time: ${(results.reduce((sum, r) => sum + r.matchTime, 0) / results.length).toFixed(0)}ms per job`);
  console.log(`  Total time: ${extractionTime + results.reduce((sum, r) => sum + r.matchTime, 0)}ms for ${JOB_POSTINGS.length} jobs`);
  console.log('');

  console.log('Match Scores:');
  results
    .sort((a, b) => b.score - a.score)
    .forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.jobId}: ${r.score}/100 (${r.confidence} confidence)`);
    });
  console.log('');

  // Show best match details
  const bestMatch = results.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  console.log('🏆 BEST MATCH DETAILS:');
  console.log('-'.repeat(80));
  console.log(`Job: ${bestMatch.jobId}`);
  console.log(`Score: ${bestMatch.score}/100`);
  console.log(`Confidence: ${bestMatch.confidence}`);
  console.log('');
  console.log('Strengths:');
  bestMatch.result.explanation.strengths.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s}`);
  });
  console.log('');
  console.log('Concerns:');
  bestMatch.result.explanation.concerns.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c}`);
  });
  console.log('');

  console.log('='.repeat(80));
  console.log('✅ DEMONSTRATION COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('💡 Key Takeaway:');
  console.log('   Resume features extracted once and reused for all matches.');
  console.log('   This is MUCH more efficient than re-extracting for each job!');
  console.log('');
}

// Run if called directly
if (require.main === module) {
  demonstratePreExtractedMatching().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

export { demonstratePreExtractedMatching };
