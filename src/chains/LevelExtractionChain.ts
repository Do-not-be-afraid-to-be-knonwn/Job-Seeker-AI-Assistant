import { AbstractChain, ChainInput, ChainConfig, ChainValidationError } from '../core';
import { LevelSchema, Level } from '../schemas/level.schema';
import { makeExtractLevelFewShotPrompt } from '../prompts/extractLevelFewShot';
import { makeInferLevelPrompt } from '../prompts/inferLevelPrompt';
import { GeminiPrimaryClient, GeminiFallbackClient } from '../llm/clients';

/**
 * Output type that wraps Level with text property for backwards compatibility
 */
export interface LevelOutput {
  text: Level;
}

/**
 * Level Extraction Chain (Smart)
 *
 * Uses a two-stage approach:
 * 1. Explicit extraction: Looks for direct level mentions (e.g., "Senior Engineer")
 * 2. Inference: If no explicit level found, infers from requirements/responsibilities
 *
 * Levels: Intern, Entry, Junior, Mid, Senior, Lead, Manager, Director, Executive
 *
 * @example
 * ```typescript
 * const chain = new LevelExtractionChain();
 * const result = await chain.run({ text: "Senior Software Engineer..." });
 * console.log(result.result.text.level); // 'Senior'
 * ```
 */
export class LevelExtractionChain extends AbstractChain<ChainInput, LevelOutput> {
  private explicitPrompt: any = null;
  private inferPrompt: any = null;
  private primaryModel = GeminiPrimaryClient;
  private fallbackModel = GeminiFallbackClient;

  constructor(config?: Partial<ChainConfig>) {
    super({
      name: 'extractLevel',
      enableMonitoring: true,
      timeout: 30000,
      retries: 3,
      exponentialBackoff: true,
      ...config
    });
  }

  /**
   * Initialize the prompt templates (lazy loading)
   */
  private async ensurePromptsLoaded(): Promise<void> {
    if (!this.explicitPrompt) {
      this.explicitPrompt = await makeExtractLevelFewShotPrompt();
    }
    if (!this.inferPrompt) {
      this.inferPrompt = await makeInferLevelPrompt();
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
  protected validateOutput(output: any): LevelOutput {
    // Output should be { text: { level: ... } }
    if (!output || !output.text) {
      throw new ChainValidationError(
        this.config.name,
        'Output must have text property',
        { output }
      );
    }

    const parsed = LevelSchema.safeParse(output.text);

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

    return { text: parsed.data };
  }

  /**
   * Execute the smart level extraction with two-stage approach
   */
  protected async execute(input: ChainInput): Promise<LevelOutput> {
    await this.ensurePromptsLoaded();

    // Stage 1: Try explicit extraction
    try {
      const explicitLevel = await this.tryExplicitExtraction(input);

      if (explicitLevel?.level) {
        console.log(`Explicit level found: ${explicitLevel.level}`);
        return { text: explicitLevel };
      }
    } catch (error) {
      console.log('Explicit extraction failed, will try inference:', error);
    }

    // Stage 2: Fallback to inference
    console.log('No explicit level found, inferring from context...');
    const inferredLevel = await this.tryInferenceExtraction(input);

    return { text: inferredLevel };
  }

  /**
   * Try to extract level explicitly from title/description
   */
  private async tryExplicitExtraction(input: ChainInput): Promise<Level> {
    const formattedPrompt = await this.explicitPrompt.format(input);

    try {
      const response = await this.primaryModel._call(formattedPrompt);
      return this.parseResponse(response);
    } catch (primaryError) {
      const response = await this.fallbackModel._call(formattedPrompt);
      return this.parseResponse(response);
    }
  }

  /**
   * Infer level from job requirements/responsibilities
   */
  private async tryInferenceExtraction(input: ChainInput): Promise<Level> {
    const formattedPrompt = await this.inferPrompt.format(input);

    try {
      const response = await this.primaryModel._call(formattedPrompt);
      return this.parseResponse(response);
    } catch (primaryError) {
      const response = await this.fallbackModel._call(formattedPrompt);
      return this.parseResponse(response);
    }
  }

  /**
   * Parse LLM response and extract JSON
   */
  private parseResponse(output: string): Level {
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
      const validated = LevelSchema.safeParse(parsed);

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
 * @deprecated Use `new LevelExtractionChain()` directly
 */
export async function makeLevelChain(): Promise<LevelExtractionChain> {
  return new LevelExtractionChain();
}

/**
 * Singleton instance for convenience
 */
export const levelChain = new LevelExtractionChain();
