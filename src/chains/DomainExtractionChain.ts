import { AbstractChain, ChainInput, ChainConfig, ChainValidationError } from '../core';
import { DomainSchema, Domain } from '../schemas/domain.schema';
import { makeExtractDomainPrompt } from '../prompts/extractDomainPrompt';
import { GeminiPrimaryClient, GeminiFallbackClient } from '../llm/clients';

/**
 * Domain Classification Chain
 *
 * Classifies job postings into technical domains such as:
 * - Backend, Frontend, Full Stack
 * - Mobile, DevOps, Data Science
 * - QA, Security, Product, Design
 * - And 100+ other specialized domains
 *
 * Returns an array of applicable domains (jobs can have multiple domains).
 *
 * @example
 * ```typescript
 * const chain = new DomainExtractionChain();
 * const result = await chain.run({ text: jobDescription });
 * console.log(result.result.domains); // ['Backend', 'DevOps', 'Cloud']
 * ```
 */
export class DomainExtractionChain extends AbstractChain<ChainInput, Domain> {
  private prompt: any = null;
  private primaryModel = GeminiPrimaryClient;
  private fallbackModel = GeminiFallbackClient;

  constructor(config?: Partial<ChainConfig>) {
    super({
      name: 'extractDomain',
      enableMonitoring: true,
      timeout: 30000,
      retries: 3,
      exponentialBackoff: true,
      ...config
    });
  }

  /**
   * Initialize the prompt template (lazy loading)
   */
  private async ensurePromptLoaded(): Promise<void> {
    if (!this.prompt) {
      this.prompt = await makeExtractDomainPrompt();
    }
  }

  /**
   * Validate input has required text field
   */
  protected validateInput(input: ChainInput): void {
    if (!input.text || typeof input.text !== 'string') {
      throw new ChainValidationError(
        this.config.name,
        'Input must contain a non-empty text field',
        { input }
      );
    }

    if (input.text.trim().length === 0) {
      throw new ChainValidationError(
        this.config.name,
        'Input text cannot be empty',
        { input }
      );
    }
  }

  /**
   * Validate and parse output using Zod schema
   */
  protected validateOutput(output: any): Domain {
    const parsed = DomainSchema.safeParse(output);

    if (!parsed.success) {
      throw new ChainValidationError(
        this.config.name,
        'Output failed schema validation',
        {
          output,
          errors: parsed.error.format()
        }
      );
    }

    return parsed.data;
  }

  /**
   * Execute the LLM chain with primary and fallback models
   */
  protected async execute(input: ChainInput): Promise<Domain> {
    await this.ensurePromptLoaded();

    // Format prompt with input
    const formattedPrompt = await this.prompt.format(input);

    // Try primary model
    try {
      const response = await this.primaryModel._call(formattedPrompt);
      return this.parseResponse(response);
    } catch (primaryError) {
      console.log(`Primary model failed, trying fallback:`, primaryError);

      // Try fallback model
      const response = await this.fallbackModel._call(formattedPrompt);
      return this.parseResponse(response);
    }
  }

  /**
   * Parse LLM response and extract JSON
   */
  private parseResponse(output: string): Domain {
    console.log("Gemini API raw output:", output);

    try {
      // Extract JSON from markdown code blocks if present
      let jsonStr = output.trim();

      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(jsonStr);

      // Validate with schema
      const validated = DomainSchema.safeParse(parsed);

      if (!validated.success) {
        throw new Error(`Schema validation failed: ${validated.error.message}`);
      }

      return validated.data;

    } catch (error) {
      throw new ChainValidationError(
        this.config.name,
        'Failed to parse LLM response',
        {
          output,
          error: (error as Error).message
        },
        error as Error
      );
    }
  }
}

/**
 * Factory function for backward compatibility
 * @deprecated Use `new DomainExtractionChain()` directly
 */
export async function makeDomainChain(): Promise<DomainExtractionChain> {
  return new DomainExtractionChain();
}

/**
 * Singleton instance for convenience
 */
export const domainChain = new DomainExtractionChain();
