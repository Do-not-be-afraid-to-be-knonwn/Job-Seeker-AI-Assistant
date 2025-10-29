import { pipeline } from '@xenova/transformers';
import { Matrix } from 'ml-matrix';
import { JobSections, ResumeSections, TextPreprocessingUtils } from './textPreprocessing.utils';

export interface SimilarityScores {
  requirementsMatch: number;
  responsibilitiesMatch: number; 
  qualificationsMatch: number;
  overallSemantic: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface EmbeddingCacheEntry {
  text: string;
  embedding: number[];
  timestamp: number;
}

/**
 * Semantic similarity engine using transformer embeddings
 * Implements caching and optimized similarity calculations
 */
export class SemanticSimilarityEngine {
  private static instance: SemanticSimilarityEngine;
  private embeddingModel: any = null;
  private cache: Map<string, EmbeddingCacheEntry> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour TTL
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'; // Lightweight, multilingual

  private constructor() {}

  static getInstance(): SemanticSimilarityEngine {
    if (!SemanticSimilarityEngine.instance) {
      SemanticSimilarityEngine.instance = new SemanticSimilarityEngine();
    }
    return SemanticSimilarityEngine.instance;
  }

  /**
   * Initialize the embedding model (lazy loading)
   */
  private async initializeModel(): Promise<void> {
    if (!this.embeddingModel) {
      console.log('Loading semantic similarity model...');
      this.embeddingModel = await pipeline('feature-extraction', this.MODEL_NAME, {
        quantized: true // Smaller model size
      });
      console.log('Semantic similarity model loaded successfully');
    }
  }

  /**
   * Generate embedding for text with caching
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const normalizedText = TextPreprocessingUtils.normalize(text);
    const cacheKey = this.hashText(normalizedText);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.embedding;
    }

    // Clean cache if too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }

    await this.initializeModel();

    // Generate new embedding
    const result = await this.embeddingModel(normalizedText, {
      pooling: 'mean',
      normalize: true
    });

    // Extract embedding array from tensor
    const embedding = Array.from(result.data) as number[];

    // Cache the result
    this.cache.set(cacheKey, {
      text: normalizedText,
      embedding,
      timestamp: Date.now()
    });

    return embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embedding vectors must have the same length');
    }

    const dotProduct = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0; // Handle zero vectors
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Calculate comprehensive similarity between job and resume
   */
  async calculateSimilarity(
    jobSections: JobSections, 
    resumeSections: ResumeSections
  ): Promise<SimilarityScores> {
    try {
      // Generate embeddings for job sections (parallel processing)
      const [
        jobRequirementsEmbedding,
        jobResponsibilitiesEmbedding,
        jobQualificationsEmbedding,
        resumeExperienceEmbedding,
        resumeSkillsEmbedding
      ] = await Promise.all([
        this.generateEmbedding(jobSections.requirements || jobSections.summary),
        this.generateEmbedding(jobSections.responsibilities || jobSections.summary),
        this.generateEmbedding(jobSections.qualifications || jobSections.summary),
        this.generateEmbedding(resumeSections.experience || resumeSections.summary),
        this.generateEmbedding(resumeSections.skills || resumeSections.rawText)
      ]);

      // Create combined resume embedding (weighted average)
      const resumeEmbedding = this.weightedAverageEmbeddings([
        { embedding: resumeExperienceEmbedding, weight: 0.7 },
        { embedding: resumeSkillsEmbedding, weight: 0.3 }
      ]);

      // Calculate section-wise similarities
      const requirementsMatch = this.cosineSimilarity(resumeEmbedding, jobRequirementsEmbedding);
      const responsibilitiesMatch = this.cosineSimilarity(resumeEmbedding, jobResponsibilitiesEmbedding);
      const qualificationsMatch = this.cosineSimilarity(resumeEmbedding, jobQualificationsEmbedding);

      // Calculate overall semantic similarity (weighted)
      const overallSemantic = this.calculateWeightedSimilarity({
        requirements: requirementsMatch,
        responsibilities: responsibilitiesMatch,
        qualifications: qualificationsMatch
      });

      // Determine confidence based on text quality and similarity consistency
      const confidence = this.assessConfidence({
        jobSections,
        resumeSections,
        similarities: { requirementsMatch, responsibilitiesMatch, qualificationsMatch }
      });

      return {
        requirementsMatch: Math.round(requirementsMatch * 1000) / 1000, // 3 decimal places
        responsibilitiesMatch: Math.round(responsibilitiesMatch * 1000) / 1000,
        qualificationsMatch: Math.round(qualificationsMatch * 1000) / 1000,
        overallSemantic: Math.round(overallSemantic * 1000) / 1000,
        confidence
      };

    } catch (error) {
      console.error('Error calculating semantic similarity:', error);
      
      // Return fallback scores
      return {
        requirementsMatch: 0.1,
        responsibilitiesMatch: 0.1,
        qualificationsMatch: 0.1,
        overallSemantic: 0.1,
        confidence: 'low'
      };
    }
  }

  /**
   * Batch similarity calculation for multiple job-resume pairs
   */
  async calculateBatchSimilarity(
    jobResumePairs: Array<{ job: JobSections; resume: ResumeSections }>
  ): Promise<SimilarityScores[]> {
    const BATCH_SIZE = 5; // Process in small batches to avoid memory issues
    const results: SimilarityScores[] = [];

    for (let i = 0; i < jobResumePairs.length; i += BATCH_SIZE) {
      const batch = jobResumePairs.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(pair => 
        this.calculateSimilarity(pair.job, pair.resume)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Add fallback for failed calculations
          results.push({
            requirementsMatch: 0.1,
            responsibilitiesMatch: 0.1,
            qualificationsMatch: 0.1,
            overallSemantic: 0.1,
            confidence: 'low'
          });
        }
      }
    }

    return results;
  }

  /**
   * Find most similar sections between job and resume
   */
  async findBestSectionMatches(
    jobSections: JobSections,
    resumeSections: ResumeSections
  ): Promise<{ section: string; similarity: number; jobSection: string; resumeSection: string }[]> {
    const jobSectionList = [
      { name: 'requirements', text: jobSections.requirements },
      { name: 'responsibilities', text: jobSections.responsibilities },
      { name: 'qualifications', text: jobSections.qualifications },
      { name: 'summary', text: jobSections.summary }
    ].filter(section => section.text && section.text.length > 50);

    const resumeSectionList = [
      { name: 'experience', text: resumeSections.experience },
      { name: 'skills', text: resumeSections.skills },
      { name: 'education', text: resumeSections.education },
      { name: 'summary', text: resumeSections.summary }
    ].filter(section => section.text && section.text.length > 20);

    const matches = [];

    for (const jobSection of jobSectionList) {
      for (const resumeSection of resumeSectionList) {
        const similarity = await this.calculateTextSimilarity(
          jobSection.text, 
          resumeSection.text
        );
        
        matches.push({
          section: `${jobSection.name}-${resumeSection.name}`,
          similarity,
          jobSection: jobSection.name,
          resumeSection: resumeSection.name
        });
      }
    }

    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 matches
  }

  /**
   * Direct text similarity calculation
   */
  async calculateTextSimilarity(text1: string, text2: string): Promise<number> {
    const [embedding1, embedding2] = await Promise.all([
      this.generateEmbedding(text1),
      this.generateEmbedding(text2)
    ]);

    return this.cosineSimilarity(embedding1, embedding2);
  }

  // Private helper methods
  private weightedAverageEmbeddings(
    embeddings: Array<{ embedding: number[]; weight: number }>
  ): number[] {
    const totalWeight = embeddings.reduce((sum, item) => sum + item.weight, 0);
    const embeddingLength = embeddings[0].embedding.length;
    const result = new Array(embeddingLength).fill(0);

    for (const { embedding, weight } of embeddings) {
      for (let i = 0; i < embeddingLength; i++) {
        result[i] += embedding[i] * (weight / totalWeight);
      }
    }

    return result;
  }

  private calculateWeightedSimilarity(similarities: {
    requirements: number;
    responsibilities: number;
    qualifications: number;
  }): number {
    // Requirements are most important, followed by responsibilities, then qualifications
    const weights = {
      requirements: 0.5,
      responsibilities: 0.3,
      qualifications: 0.2
    };

    return (
      similarities.requirements * weights.requirements +
      similarities.responsibilities * weights.responsibilities +
      similarities.qualifications * weights.qualifications
    );
  }

  private assessConfidence(data: {
    jobSections: JobSections;
    resumeSections: ResumeSections;
    similarities: { requirementsMatch: number; responsibilitiesMatch: number; qualificationsMatch: number };
  }): 'low' | 'medium' | 'high' {
    const { jobSections, resumeSections, similarities } = data;

    // Text quality factors
    const jobTextLength = jobSections.rawText.length;
    const resumeTextLength = resumeSections.rawText.length;
    const hasGoodSections = (
      jobSections.requirements.length > 100 &&
      resumeSections.experience.length > 100
    );

    // Similarity consistency (low variance = high confidence)
    const simValues = [similarities.requirementsMatch, similarities.responsibilitiesMatch, similarities.qualificationsMatch];
    const mean = simValues.reduce((sum, val) => sum + val, 0) / simValues.length;
    const variance = simValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / simValues.length;

    // Confidence rules
    if (
      jobTextLength > 1000 &&
      resumeTextLength > 500 &&
      hasGoodSections &&
      variance < 0.1 &&
      mean > 0.3
    ) {
      return 'high';
    } else if (
      jobTextLength > 500 &&
      resumeTextLength > 300 &&
      variance < 0.2 &&
      mean > 0.2
    ) {
      return 'medium';
    }

    return 'low';
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private cleanupCache(): void {
    // Remove oldest entries if cache is too large
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2));
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    oldestEntry?: number;
  } {
    const entries = Array.from(this.cache.values());
    const oldestTimestamp = entries.reduce(
      (min, entry) => Math.min(min, entry.timestamp),
      Date.now()
    );

    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      oldestEntry: oldestTimestamp
    };
  }

  /**
   * Clear cache (for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const semanticEngine = SemanticSimilarityEngine.getInstance();