import { 
  JobResumeMatchingSchema, 
  JobResumeMatchingResult, 
  JobResumeMatchingInput, 
  JobResumeMatchingInputSchema,
  JobResumeMatchingError 
} from '../schemas/jobResumeMatching.schema';
import { TextPreprocessingUtils, preprocessJob, preprocessResume } from './textPreprocessing.utils';
import { semanticEngine } from './semanticSimilarity.engine';
import { FeatureExtractionService } from './featureExtraction.service';
import { HybridScoringEngine, defaultScoringConfig } from './hybridScoring.engine';
import { ExplanationGenerationEngine } from './explanationGeneration.engine';
import { ChainPerformanceMonitor } from '../../monitor/ChainPerformanceMonitor';

/**
 * Main job-resume matching function that orchestrates all components
 * Implements the Layer 2 hybrid approach with semantic + structured analysis
 */
export class JobResumeMatchingChain {
  private featureExtractor = new FeatureExtractionService();
  private explanationEngine = new ExplanationGenerationEngine();
  private scoringEngine: HybridScoringEngine;
  private monitor = ChainPerformanceMonitor.getInstance();

  constructor(customConfig?: any) {
    this.scoringEngine = new HybridScoringEngine(customConfig);
  }

  /**
   * Analyze a single job-resume pair
   */
  async analyzeMatch(input: JobResumeMatchingInput): Promise<JobResumeMatchingResult | JobResumeMatchingError> {
    const startTime = Date.now();
    const chainName = 'jobResumeMatching';

    try {
      // 1. Validate input
      const validatedInput = JobResumeMatchingInputSchema.parse(input);
      const { jobDescription, resumeContent, options } = validatedInput;

      this.monitor.startCall(chainName, `Job: ${jobDescription.length} chars, Resume: ${resumeContent.length} chars`);

      // 2. Preprocess texts into structured sections
      console.log('Preprocessing job description and resume...');
      const jobSections = preprocessJob(jobDescription);
      const resumeSections = preprocessResume(resumeContent);

      // 3. Extract features in parallel with semantic analysis
      console.log('Extracting features and calculating semantic similarity...');
      const [
        semanticScores,
        jobFeatures,
        resumeFeatures
      ] = await Promise.all([
        semanticEngine.calculateSimilarity(jobSections, resumeSections),
        this.featureExtractor.extractJobFeatures(jobSections),
        this.featureExtractor.extractResumeFeatures(resumeSections)
      ]);

      // 4. Analyze feature matches
      console.log('Analyzing feature matches...');
      const featureMatch = await this.featureExtractor.analyzeFeatureMatch(jobFeatures, resumeFeatures);

      // 5. Update scoring configuration if custom weights/gates provided
      if (options && (options.customWeights || options.customGates || options.strictMode)) {
        const configUpdate: any = {};
        if (options.customWeights) configUpdate.weights = options.customWeights;
        if (options.customGates) configUpdate.gates = options.customGates;
        if (options.strictMode !== undefined) configUpdate.strictMode = options.strictMode;
        
        this.scoringEngine.updateConfig(configUpdate);
      }

      // 6. Calculate hybrid score
      console.log('Calculating hybrid score...');
      const scoringResult = this.scoringEngine.calculateScore(
        semanticScores,
        featureMatch,
        jobFeatures,
        resumeFeatures
      );

      // 7. Generate explanation (if requested)
      let explanation = null;
      if (!options || options.includeExplanation !== false) {
        console.log('Generating explanation...');
        explanation = this.explanationEngine.generateExplanation({
          semantic: semanticScores,
          features: featureMatch,
          job: jobFeatures,
          resume: resumeFeatures,
          scoring: scoringResult
        });
      }

      // 8. Calculate processing time and metadata
      const processingTime = Date.now() - startTime;
      
      // 9. Construct final result
      const result: JobResumeMatchingResult = {
        finalScore: scoringResult.finalScore,
        confidence: scoringResult.confidence,
        
        semanticAnalysis: semanticScores,
        skillsMatch: featureMatch.skillsMatch,
        experienceMatch: featureMatch.experienceMatch,
        domainMatch: featureMatch.domainMatch,
        levelMatch: featureMatch.levelMatch,
        educationMatch: featureMatch.educationMatch,
        locationMatch: featureMatch.locationMatch,
        
        scoringBreakdown: scoringResult.breakdown,
        gateResults: scoringResult.gateResults,
        qualityIndicators: scoringResult.qualityIndicators,
        
        explanation: explanation || {
          strengths: [],
          concerns: [],
          summary: 'Explanation generation skipped',
          recommendations: [],
          keyInsights: {
            strongestMatch: 'N/A',
            biggestGap: 'N/A',
            improvementPotential: 'N/A'
          }
        },
        
        metadata: {
          processingTimeMs: processingTime,
          modelVersions: {
            embedding: 'Xenova/all-MiniLM-L6-v2',
            skillsExtraction: 'gemini-2.5-flash-lite',
            domainExtraction: 'gemini-2.5-flash-lite'
          },
          dataQuality: {
            jobTextLength: jobDescription.length,
            resumeTextLength: resumeContent.length,
            sectionsExtracted: this.countExtractedSections(jobSections, resumeSections)
          }
        }
      };

      // 10. Validate result against schema
      const validatedResult = JobResumeMatchingSchema.parse(result);

      // 11. Record successful completion
      this.monitor.endCall(chainName, validatedResult, undefined);

      console.log(`Job-resume matching completed in ${processingTime}ms with score: ${validatedResult.finalScore}`);
      return validatedResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Record error in monitor
      this.monitor.endCall(chainName, null, error as Error);

      console.error('Job-resume matching failed:', error);

      // Return structured error response
      const errorResponse: JobResumeMatchingError = {
        error: error instanceof Error ? error.message : String(error),
        errorType: this.categorizeError(error),
        details: {
          processingTimeMs: processingTime,
          inputLengths: {
            job: input.jobDescription?.length || 0,
            resume: input.resumeContent?.length || 0
          }
        },
        timestamp: new Date().toISOString(),
        fallbackScore: 10 // Low fallback score for failed matches
      };

      return errorResponse;
    }
  }

  /**
   * Analyze multiple job-resume pairs in batch
   */
  async analyzeBatchMatches(
    pairs: Array<JobResumeMatchingInput>
  ): Promise<Array<JobResumeMatchingResult | JobResumeMatchingError>> {
    const BATCH_SIZE = 3; // Process in small batches to avoid overwhelming system
    const results: Array<JobResumeMatchingResult | JobResumeMatchingError> = [];

    console.log(`Starting batch analysis of ${pairs.length} job-resume pairs...`);

    for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
      const batch = pairs.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pairs.length / BATCH_SIZE)}...`);

      const batchPromises = batch.map(pair => this.analyzeMatch(pair));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create error result for failed promise
          results.push({
            error: result.reason?.message || 'Batch processing failed',
            errorType: 'processing' as const,
            timestamp: new Date().toISOString(),
            fallbackScore: 5
          });
        }
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + BATCH_SIZE < pairs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Batch analysis completed. ${results.length} results processed.`);
    return results;
  }

  /**
   * Get quick match scores for multiple pairs (lighter processing)
   */
  async getQuickScores(
    pairs: Array<{ jobDescription: string; resumeContent: string }>
  ): Promise<Array<{ score: number; confidence: string; reason: string; gap: string }>> {
    const results = [];

    for (const pair of pairs) {
      try {
        // Simplified processing for quick scoring
        const jobSections = preprocessJob(pair.jobDescription);
        const resumeSections = preprocessResume(pair.resumeContent);
        
        // Only semantic analysis + basic feature extraction
        const [semanticScores, jobFeatures, resumeFeatures] = await Promise.all([
          semanticEngine.calculateSimilarity(jobSections, resumeSections),
          this.featureExtractor.extractJobFeatures(jobSections),
          this.featureExtractor.extractResumeFeatures(resumeSections)
        ]);

        const featureMatch = await this.featureExtractor.analyzeFeatureMatch(jobFeatures, resumeFeatures);
        const scoringResult = this.scoringEngine.calculateScore(semanticScores, featureMatch, jobFeatures, resumeFeatures);

        // Generate quick summary
        const quickSummary = this.explanationEngine.generateQuickSummary({
          semantic: semanticScores,
          features: featureMatch,
          job: jobFeatures,
          resume: resumeFeatures,
          scoring: scoringResult
        });

        // Convert to expected format
        results.push({
          score: quickSummary.score,
          confidence: quickSummary.confidence,
          reason: quickSummary.oneLineReason,
          gap: quickSummary.topGap
        });

      } catch (error) {
        console.error('Quick score calculation failed:', error);
        results.push({
          score: 5,
          confidence: 'low',
          reason: 'Analysis failed',
          gap: 'Unable to process'
        });
      }
    }

    return results;
  }

  /**
   * Update scoring configuration for future matches
   */
  updateScoringConfig(config: any): void {
    this.scoringEngine.updateConfig(config);
  }

  /**
   * Get current scoring configuration
   */
  getScoringConfig(): any {
    return this.scoringEngine.getConfig();
  }

  /**
   * Clear semantic similarity cache
   */
  clearCache(): void {
    semanticEngine.clearCache();
  }

  /**
   * Get cache and performance statistics
   */
  getStats(): {
    cache: any;
    performance: any;
  } {
    const allMetrics = this.monitor.getMetrics();
    return {
      cache: semanticEngine.getCacheStats(),
      performance: allMetrics['jobResumeMatching'] || {}
    };
  }

  // Private helper methods
  private countExtractedSections(jobSections: any, resumeSections: any): number {
    let count = 0;
    
    // Count non-empty job sections
    if (jobSections.requirements) count++;
    if (jobSections.responsibilities) count++;
    if (jobSections.qualifications) count++;
    if (jobSections.summary) count++;

    // Count non-empty resume sections
    if (resumeSections.experience) count++;
    if (resumeSections.skills) count++;
    if (resumeSections.education) count++;
    if (resumeSections.summary) count++;

    return count;
  }

  private categorizeError(error: unknown): 'validation' | 'processing' | 'timeout' | 'model' | 'unknown' {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('validation') || message.includes('schema')) {
        return 'validation';
      }
      if (message.includes('timeout') || message.includes('time')) {
        return 'timeout';
      }
      if (message.includes('model') || message.includes('embedding') || message.includes('llm')) {
        return 'model';
      }
      if (message.includes('processing') || message.includes('calculation')) {
        return 'processing';
      }
    }

    return 'unknown';
  }
}

// Factory function following existing chain pattern
export async function makeJobResumeMatchingChain(customConfig?: any): Promise<JobResumeMatchingChain> {
  // Initialize and warm up the chain
  console.log('Initializing job-resume matching chain...');
  
  const chain = new JobResumeMatchingChain(customConfig);
  
  // Optionally warm up the semantic similarity model
  // await semanticEngine.calculateTextSimilarity('test', 'test');
  
  console.log('Job-resume matching chain ready');
  return chain;
}

// Export convenience functions
export const createJobResumeMatchingChain = makeJobResumeMatchingChain;

// Export default instance
export const jobResumeMatchingChain = new JobResumeMatchingChain();