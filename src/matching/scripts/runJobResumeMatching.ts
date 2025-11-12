#!/usr/bin/env node

/**
 * Standalone script for testing job-resume matching
 * Usage: npx ts-node src/matching/scripts/runJobResumeMatching.ts
 */

import { config } from 'dotenv';
import { makeJobResumeMatchingChain } from '../core/jobResumeMatching.chain';
import { JobResumeMatchingInput } from '../schemas/jobResumeMatching.schema';

// Load environment variables
config();

// Sample job description for testing
const SAMPLE_JOB = `
Senior Software Engineer - Full Stack

We are seeking a Senior Software Engineer to join our growing team. You will be responsible for building scalable web applications using modern technologies.

Requirements:
- 5+ years of software development experience
- Strong proficiency in JavaScript/TypeScript
- Experience with React and Node.js
- Knowledge of databases (PostgreSQL, MongoDB)
- Familiarity with cloud platforms (AWS, GCP)
- Bachelor's degree in Computer Science or related field
- Authorized to work in the United States

Responsibilities:
- Design and implement new features for our web platform
- Collaborate with cross-functional teams
- Write clean, maintainable code
- Participate in code reviews and technical discussions
- Mentor junior developers

Nice to Have:
- Experience with Docker and Kubernetes
- Knowledge of GraphQL
- Previous startup experience
- Open source contributions
`;

// Sample resume for testing
const SAMPLE_RESUME = `
John Smith
Senior Software Developer

Professional Experience:

Software Engineer | TechCorp | 2020-2024 (4 years)
• Developed full-stack web applications using React, Node.js, and TypeScript
• Built RESTful APIs and integrated with PostgreSQL databases
• Deployed applications on AWS using Docker containers
• Collaborated with product managers and designers on feature development
• Mentored 2 junior developers and conducted code reviews

Full Stack Developer | StartupXYZ | 2018-2020 (2 years)  
• Created responsive web interfaces using React and modern CSS
• Implemented backend services with Node.js and Express
• Worked with MongoDB for data storage and retrieval
• Participated in agile development process with daily standups

Technical Skills:
JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, MongoDB, AWS, Docker, Git, HTML/CSS

Education:
Bachelor of Science in Computer Science
State University, 2018

Work Authorization: Authorized to work in the US
`;

// Alternative samples for testing different scenarios
const SAMPLES = {
  perfectMatch: {
    job: SAMPLE_JOB,
    resume: SAMPLE_RESUME
  },
  
  skillsGap: {
    job: `
Frontend Developer Position

Requirements:
- 3+ years React experience  
- TypeScript proficiency
- CSS/SCSS expertise
- Bachelor's degree required
`,
    resume: `
Backend Developer with 5 years experience in Python and Django.
Skills: Python, Django, PostgreSQL, Linux, Git
Education: Bachelor's in Computer Science
`
  },

  experienceGap: {
    job: `
Senior Engineering Manager

Requirements:
- 10+ years software development experience
- 5+ years management experience
- Leadership and team building skills
`,
    resume: `
Software Engineer with 3 years development experience.
Skills: JavaScript, React, Node.js
No management experience but eager to learn.
`
  },

  sparseResume: {
    job: SAMPLE_JOB,
    resume: `
Developer with React experience.
Skills: JavaScript, React
Recent graduate.
`
  }
};

async function testSingleMatch() {
  console.log('🚀 Testing Single Job-Resume Match\n');
  
  try {
    const chain = await makeJobResumeMatchingChain();
    
    const input: JobResumeMatchingInput = {
      jobDescription: SAMPLES.perfectMatch.job,
      resumeContent: SAMPLES.perfectMatch.resume,
      options: {
        includeExplanation: true,
        strictMode: false
      }
    };

    console.log('Analyzing match...\n');
    const result = await chain.analyzeMatch(input);

    if ('error' in result) {
      console.error('❌ Analysis failed:', result.error);
      return;
    }

    console.log('✅ Analysis completed!\n');
    console.log('📊 RESULTS:');
    console.log(`Final Score: ${result.finalScore}/100`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Processing Time: ${result.metadata.processingTimeMs}ms\n`);

    console.log('🎯 SCORING BREAKDOWN:');
    Object.entries(result.scoringBreakdown).forEach(([component, score]) => {
      console.log(`  ${component}: ${score.toFixed(2)}`);
    });
    console.log();

    console.log('🔍 DETAILED ANALYSIS:');
    console.log(`Semantic Similarity: ${(result.semanticAnalysis.overallSemantic * 100).toFixed(1)}%`);
    console.log(`Skills Coverage: ${(result.skillsMatch.coverage * 100).toFixed(1)}%`);
    console.log(`Experience Match: ${(result.experienceMatch.score * 100).toFixed(1)}%`);
    console.log(`Domain Match: ${(result.domainMatch.score * 100).toFixed(1)}%\n`);

    console.log('💪 STRENGTHS:');
    result.explanation.strengths.forEach((strength, i) => {
      console.log(`  ${i + 1}. ${strength}`);
    });
    console.log();

    console.log('⚠️  CONCERNS:');
    result.explanation.concerns.forEach((concern, i) => {
      console.log(`  ${i + 1}. ${concern}`);
    });
    console.log();

    console.log('📝 SUMMARY:');
    console.log(`  ${result.explanation.summary}\n`);

    console.log('💡 RECOMMENDATIONS:');
    result.explanation.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
    console.log();

    console.log('🎯 KEY INSIGHTS:');
    console.log(`  Strongest Match: ${result.explanation.keyInsights.strongestMatch}`);
    console.log(`  Biggest Gap: ${result.explanation.keyInsights.biggestGap}`);
    console.log(`  Growth Potential: ${result.explanation.keyInsights.improvementPotential}\n`);

    console.log('🚪 GATE RESULTS:');
    console.log(`  Overall Gates Passed: ${result.gateResults.overallGatesPassed ? '✅' : '❌'}`);
    console.log(`  Skills Gate: ${result.gateResults.skillsGate.passed ? '✅' : '❌'} (${(result.gateResults.skillsGate.value * 100).toFixed(1)}% >= ${(result.gateResults.skillsGate.threshold * 100).toFixed(1)}%)`);
    console.log(`  Experience Gate: ${result.gateResults.experienceGate.passed ? '✅' : '❌'} (${result.gateResults.experienceGate.value} <= ${result.gateResults.experienceGate.threshold})`);
    console.log(`  Location Gate: ${result.gateResults.locationGate.passed ? '✅' : '❌'}`);
    console.log(`  Education Gate: ${result.gateResults.educationGate.passed ? '✅' : '❌'}\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testBatchMatches() {
  console.log('🚀 Testing Batch Job-Resume Matches\n');
  
  try {
    const chain = await makeJobResumeMatchingChain();
    
    const pairs = Object.entries(SAMPLES).map(([name, sample]) => ({
      jobDescription: sample.job,
      resumeContent: sample.resume,
      options: { 
        includeExplanation: false, // Skip explanations for batch to save time
        strictMode: false
      }
    }));

    console.log(`Analyzing ${pairs.length} matches in batch...\n`);
    const results = await chain.analyzeBatchMatches(pairs);

    console.log('📊 BATCH RESULTS:');
    results.forEach((result, i) => {
      const sampleName = Object.keys(SAMPLES)[i];
      
      if ('error' in result) {
        console.log(`  ${i + 1}. ${sampleName}: ❌ FAILED - ${result.error}`);
      } else {
        console.log(`  ${i + 1}. ${sampleName}: ${result.finalScore}/100 (${result.confidence} confidence)`);
      }
    });
    console.log();

  } catch (error) {
    console.error('❌ Batch test failed:', error);
  }
}

async function testQuickScores() {
  console.log('🚀 Testing Quick Scoring\n');
  
  try {
    const chain = await makeJobResumeMatchingChain();
    
    const pairs = Object.values(SAMPLES).map(sample => ({
      jobDescription: sample.job,
      resumeContent: sample.resume
    }));
    
    console.log(`Getting quick scores for ${pairs.length} matches...\n`);
    const results = await chain.getQuickScores(pairs);

    console.log('⚡ QUICK SCORES:');
    results.forEach((result, i) => {
      const sampleName = Object.keys(SAMPLES)[i];
      console.log(`  ${i + 1}. ${sampleName}:`);
      console.log(`     Score: ${result.score}/100 (${result.confidence})`);
      console.log(`     Reason: ${result.reason}`);
      console.log(`     Gap: ${result.gap}\n`);
    });

  } catch (error) {
    console.error('❌ Quick scores test failed:', error);
  }
}

async function testCustomConfiguration() {
  console.log('🚀 Testing Custom Configuration\n');
  
  try {
    // Create chain with custom scoring weights
    const customConfig = {
      weights: {
        semantic: 0.20,        // Lower semantic weight
        skillsCoverage: 0.50,  // Higher skills weight  
        experience: 0.20,
        domain: 0.10
      },
      gates: {
        minSkillsCoverage: 0.8, // Stricter skills requirement
        maxYearsGap: 2,         // Stricter experience requirement
        requireWorkAuth: true,
        requireEducation: false
      },
      strictMode: true
    };

    const chain = await makeJobResumeMatchingChain(customConfig);
    
    const input: JobResumeMatchingInput = {
      jobDescription: SAMPLES.perfectMatch.job,
      resumeContent: SAMPLES.perfectMatch.resume,
      options: {
        includeExplanation: true,
        strictMode: false
      }
    };

    console.log('Analyzing with custom configuration...\n');
    const result = await chain.analyzeMatch(input);

    if ('error' in result) {
      console.error('❌ Analysis failed:', result.error);
      return;
    }

    console.log('✅ Custom configuration results:');
    console.log(`Final Score: ${result.finalScore}/100`);
    console.log(`Gates Passed: ${result.gateResults.overallGatesPassed ? '✅' : '❌'}`);
    console.log('\n🎯 SCORING BREAKDOWN:');
    Object.entries(result.scoringBreakdown).forEach(([component, score]) => {
      console.log(`  ${component}: ${score.toFixed(2)}`);
    });
    console.log();

  } catch (error) {
    console.error('❌ Custom configuration test failed:', error);
  }
}

async function main() {
  console.log('🎯 Job-Resume Matching System Test Suite\n');
  console.log('=' .repeat(50) + '\n');

  // Check if required environment variables are set
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY environment variable is required');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const testType = args[0] || 'single';

  switch (testType) {
    case 'single':
      await testSingleMatch();
      break;
    case 'batch':
      await testBatchMatches();
      break;
    case 'quick':
      await testQuickScores();
      break;
    case 'custom':
      await testCustomConfiguration();
      break;
    case 'all':
      await testSingleMatch();
      console.log('\n' + '='.repeat(50) + '\n');
      await testBatchMatches();
      console.log('\n' + '='.repeat(50) + '\n');
      await testQuickScores();
      console.log('\n' + '='.repeat(50) + '\n');
      await testCustomConfiguration();
      break;
    default:
      console.log('Usage: npx ts-node src/matching/scripts/runJobResumeMatching.ts [single|batch|quick|custom|all]');
      console.log('  single - Test single job-resume match (default)');
      console.log('  batch  - Test multiple matches in batch');
      console.log('  quick  - Test quick scoring mode'); 
      console.log('  custom - Test custom configuration');
      console.log('  all    - Run all tests');
      break;
  }

  console.log('\n✅ Test suite completed!');
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}