/**
 * Quick verification script to confirm skills extraction is working correctly
 */

import { FeatureExtractionService } from '../../src/matching/core/featureExtraction.service';
import { preprocessJob } from '../../src/matching/core/textPreprocessing.utils';

const sampleJobDescription = `
Senior Backend Engineer

We are looking for a Senior Backend Engineer to join our team.

Requirements:
- 5+ years of experience with Python and Django
- Strong knowledge of PostgreSQL and Redis
- Experience with AWS services (EC2, S3, RDS)
- RESTful API design and implementation
- Docker and containerization

Qualifications:
- Bachelor's degree in Computer Science (preferred)
- Experience with Kubernetes is a plus
- Knowledge of CI/CD pipelines
`;

async function verify() {
  console.log('='.repeat(80));
  console.log('SKILLS EXTRACTION VERIFICATION TEST');
  console.log('='.repeat(80));

  const service = new FeatureExtractionService();
  const jobSections = preprocessJob(sampleJobDescription);

  console.log('\n1. Preprocessing job description...');
  console.log(`   Requirements section length: ${jobSections.requirements.length} chars`);
  console.log(`   Qualifications section length: ${jobSections.qualifications.length} chars`);

  console.log('\n2. Extracting job features...');
  const jobFeatures = await service.extractJobFeatures(jobSections);

  console.log('\n3. Results:');
  console.log('   Required Skills:', JSON.stringify(jobFeatures.skills.required, null, 2));
  console.log('   Preferred Skills:', JSON.stringify(jobFeatures.skills.preferred, null, 2));
  console.log('   All Skills:', JSON.stringify(jobFeatures.skills.all, null, 2));

  console.log('\n4. Verification:');
  if (jobFeatures.skills.required.length > 0) {
    console.log('   ✅ PASS: Required skills are not empty!');
    console.log(`   Found ${jobFeatures.skills.required.length} required skills`);
  } else {
    console.log('   ❌ FAIL: Required skills are empty');
  }

  if (jobFeatures.skills.all.length > 0) {
    console.log('   ✅ PASS: All skills are not empty!');
    console.log(`   Found ${jobFeatures.skills.all.length} total skills`);
  } else {
    console.log('   ❌ FAIL: All skills are empty');
  }

  console.log('\n' + '='.repeat(80));
}

verify().catch(console.error);
