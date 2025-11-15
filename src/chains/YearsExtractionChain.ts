import { AbstractChain, ChainInput, ChainConfig, ChainValidationError } from '../core';
import { YearsSchema, Years } from '../schemas/years.schema';
import { makeExtractYearsFewShotPrompt } from '../prompts/extractYearsFewShot';
import { GeminiPrimaryClient, GeminiFallbackClient } from '../llm/clients';

/**
 * Years of Experience Extraction Chain
 *
 * Extracts required years of experience range from job postings.
 * Returns minYears and maxYears. For single requirements (e.g., "5+ years"),
 * both values are the same. For ranges (e.g., "3-5 years"), they differ.
 * Returns null if no specific years are mentioned.
 *
 * Uses few-shot learning for better accuracy.
 *
 * @example
 * ```typescript
 * const chain = new YearsExtractionChain();
 * const result = await chain.run({ text: "3-5 years of experience..." });
 * console.log(result.result.minYears); // 3
 * console.log(result.result.maxYears); // 5
 * ```
 */
export class YearsExtractionChain extends AbstractChain<ChainInput, Years> {
  private prompt: any = null;
  private primaryModel = GeminiPrimaryClient;
  private fallbackModel = GeminiFallbackClient;

  constructor(config?: Partial<ChainConfig>) {
    super({
      name: 'extractYears',
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
      this.prompt = await makeExtractYearsFewShotPrompt();
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
  protected validateOutput(output: any): Years {
    const parsed = YearsSchema.safeParse(output);

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
  protected async execute(input: ChainInput): Promise<Years> {
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
  private parseResponse(output: string): Years {
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
      const validated = YearsSchema.safeParse(parsed);

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
 * @deprecated Use `new YearsExtractionChain()` directly
 */
export async function makeYearsChain(): Promise<YearsExtractionChain> {
  return new YearsExtractionChain();
}

/**
 * Singleton instance for convenience
 */
export const yearsChain = new YearsExtractionChain();
