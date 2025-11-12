/**
 * Resume Feature Extraction Service
 *
 * This service is used to extract features from a resume ONCE when it's uploaded,
 * so those features can be reused for matching against multiple job postings.
 */

import { FeatureExtractionService } from '../core/featureExtraction.service';
import { preprocessResume } from '../core/textPreprocessing.utils';
import { PreExtractedResumeFeatures } from '../schemas/jobResumeMatching.schema';

export class ResumeExtractionService {
  private featureExtractor = new FeatureExtractionService();

  /**
   * Extract features from a resume for reuse in multiple matching operations
   *
   * @param resumeContent - Raw resume text
   * @param includeRawSections - Whether to include raw text sections for semantic analysis
   * @returns Pre-extracted resume features that can be reused
   */
  async extractResumeFeatures(
    resumeContent: string,
    includeRawSections: boolean = true
  ): Promise<PreExtractedResumeFeatures> {
    console.log('Extracting resume features for reuse...');

    // Preprocess resume
    const resumeSections = preprocessResume(resumeContent);

    // Extract features
    const extractedFeatures = await this.featureExtractor.extractResumeFeatures(resumeSections);

    // Build pre-extracted features object
    const preExtractedFeatures: PreExtractedResumeFeatures = {
      skills: extractedFeatures.skills,
      domains: extractedFeatures.domains,
      yearsOfExperience: extractedFeatures.yearsOfExperience,
      currentLevel: extractedFeatures.currentLevel,
      education: extractedFeatures.education,
      workAuthStatus: extractedFeatures.workAuthStatus,
      location: extractedFeatures.location,
    };

    // Optionally include raw sections for semantic analysis
    if (includeRawSections) {
      preExtractedFeatures.rawSections = {
        experience: resumeSections.experience,
        skills: resumeSections.skills,
        education: resumeSections.education,
        summary: resumeSections.summary,
        rawText: resumeSections.rawText
      };
    }

    console.log('Resume features extracted successfully:');
    console.log(`  - Skills: ${extractedFeatures.skills.length}`);
    console.log(`  - Domains: ${extractedFeatures.domains.length}`);
    console.log(`  - Years of Experience: ${extractedFeatures.yearsOfExperience ?? 'N/A'}`);
    console.log(`  - Level: ${extractedFeatures.currentLevel ?? 'N/A'}`);
    console.log(`  - Education: ${extractedFeatures.education ?? 'N/A'}`);
    console.log(`  - Work Auth: ${extractedFeatures.workAuthStatus ?? 'N/A'}`);

    return preExtractedFeatures;
  }

  /**
   * Batch extract features from multiple resumes
   */
  async extractBatchResumeFeatures(
    resumes: Array<{ id: string; content: string }>,
    includeRawSections: boolean = true
  ): Promise<Array<{ id: string; features: PreExtractedResumeFeatures }>> {
    console.log(`Extracting features from ${resumes.length} resumes...`);

    const results = [];

    for (const resume of resumes) {
      try {
        const features = await this.extractResumeFeatures(
          resume.content,
          includeRawSections
        );

        results.push({
          id: resume.id,
          features
        });

        console.log(`✅ Extracted features for resume ${resume.id}`);
      } catch (error) {
        console.error(`❌ Failed to extract features for resume ${resume.id}:`, error);
        // Return empty features on failure
        results.push({
          id: resume.id,
          features: {
            skills: [],
            domains: [],
            yearsOfExperience: null,
            currentLevel: null,
            education: null,
            workAuthStatus: null,
            location: null
          }
        });
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Batch extraction completed: ${results.length} resumes processed`);
    return results;
  }
}

// Export singleton instance
export const resumeExtractionService = new ResumeExtractionService();

// Export convenience function
export async function extractResumeForMatching(
  resumeContent: string,
  includeRawSections: boolean = true
): Promise<PreExtractedResumeFeatures> {
  return resumeExtractionService.extractResumeFeatures(resumeContent, includeRawSections);
}
