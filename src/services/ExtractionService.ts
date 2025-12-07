import { AbstractService } from '../core';
import { ChainOutput } from '../core/AbstractChain';
import { SkillsExtractionChain } from '../chains/SkillsExtractionChain';
import { DomainExtractionChain } from '../chains/DomainExtractionChain';
import { YearsExtractionChain } from '../chains/YearsExtractionChain';
import { LevelExtractionChain } from '../chains/LevelExtractionChain';
import { Skills } from '../schemas/skills.schema';
import { Domain } from '../schemas/domain.schema';
import { Years } from '../schemas/years.schema';
import { LevelOutput } from '../chains/LevelExtractionChain';

/**
 * Result type for individual extraction with error handling
 */
export type ExtractionResult<T> =
  | { success: true; data: ChainOutput<T> }
  | { success: false; error: string };

/**
 * Combined result from all extraction chains
 */
export interface ExtractionServiceResult {
  skills: ExtractionResult<Skills>;
  domain: ExtractionResult<Domain>;
  years: ExtractionResult<Years>;
  level: ExtractionResult<LevelOutput>;
}

/**
 * Extraction Service - Facade for all job extraction chains
 *
 * Provides a unified interface for extracting all features from job postings.
 * Handles errors gracefully and runs chains in parallel for better performance.
 *
 * @example
 * ```typescript
 * const service = new ExtractionService();
 * const result = await service.extractAll(jobDescription);
 *
 * if (result.skills.success) {
 *   console.log(result.skills.data.result.skills);
 * } else {
 *   console.error(result.skills.error);
 * }
 * ```
 */
export class ExtractionService extends AbstractService {
  private skillsChain: SkillsExtractionChain;
  private domainChain: DomainExtractionChain;
  private yearsChain: YearsExtractionChain;
  private levelChain: LevelExtractionChain;

  constructor() {
    super();
    this.skillsChain = new SkillsExtractionChain();
    this.domainChain = new DomainExtractionChain();
    this.yearsChain = new YearsExtractionChain();
    this.levelChain = new LevelExtractionChain();
  }

  /**
   * Initialize service (no-op for now, chains lazy-load prompts)
   */
  protected async initialize(): Promise<void> {
    // Chains initialize themselves on first use
  }

  /**
   * Health check - verify chains are available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple check - chains exist and are instantiated
      return !!(this.skillsChain && this.domainChain && this.yearsChain && this.levelChain);
    } catch {
      return false;
    }
  }

  /**
   * Cleanup resources (no-op for now)
   */
  async dispose(): Promise<void> {
    // No resources to clean up
  }

  /**
   * Extract all features from job posting in parallel
   * Returns results with error handling for each chain
   *
   * @param text - Job posting text (title + description)
   * @returns Object with results/errors for each extraction type
   */
  async extractAll(text: string): Promise<ExtractionServiceResult> {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      const error = 'Input text is required and cannot be empty';
      return {
        skills: { success: false, error },
        domain: { success: false, error },
        years: { success: false, error },
        level: { success: false, error }
      };
    }

    // Run all chains in parallel for better performance
    const [skills, domain, years, level] = await Promise.allSettled([
      this.skillsChain.run({ text }),
      this.domainChain.run({ text }),
      this.yearsChain.run({ text }),
      this.levelChain.run({ text })
    ]);

    return {
      skills: this.handleResult(skills),
      domain: this.handleResult(domain),
      years: this.handleResult(years),
      level: this.handleResult(level)
    };
  }

  /**
   * Extract skills only
   */
  async extractSkills(text: string): Promise<ChainOutput<Skills>> {
    return this.skillsChain.run({ text });
  }

  /**
   * Extract domain only
   */
  async extractDomain(text: string): Promise<ChainOutput<Domain>> {
    return this.domainChain.run({ text });
  }

  /**
   * Extract years only
   */
  async extractYears(text: string): Promise<ChainOutput<Years>> {
    return this.yearsChain.run({ text });
  }

  /**
   * Extract level only
   */
  async extractLevel(text: string): Promise<ChainOutput<LevelOutput>> {
    return this.levelChain.run({ text });
  }

  /**
   * Convert Promise.allSettled result to ExtractionResult
   */
  private handleResult<T>(
    result: PromiseSettledResult<ChainOutput<T>>
  ): ExtractionResult<T> {
    if (result.status === 'fulfilled') {
      return {
        success: true,
        data: result.value
      };
    } else {
      return {
        success: false,
        error: result.reason?.message || String(result.reason)
      };
    }
  }

  /**
   * Get all chain instances (for advanced usage)
   */
  getChains() {
    return {
      skills: this.skillsChain,
      domain: this.domainChain,
      years: this.yearsChain,
      level: this.levelChain
    };
  }
}

/**
 * Singleton instance for convenience
 */
export const extractionService = new ExtractionService();
