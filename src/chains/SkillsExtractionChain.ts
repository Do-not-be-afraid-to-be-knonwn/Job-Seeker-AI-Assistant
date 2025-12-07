import { AbstractChain, ChainInput, ChainConfig, ChainValidationError } from '../core';
import { SkillsSchema, Skills } from '../schemas/skills.schema';
import { makeExtractSkillsPrompt } from '../prompts/extractSkillsPrompt';
import { GeminiPrimaryClient, GeminiFallbackClient } from '../llm/clients';

/**
 * Skills Extraction Chain
 *
 * Extracts technical skills from job postings using LLM.
 * Focuses on:
 * - Programming languages
 * - Frameworks and libraries
 * - Tools and platforms
 * - Databases
 * - Specific technologies
 *
 * @example
 * ```typescript
 * const chain = new SkillsExtractionChain();
 * const result = await chain.run({ text: jobDescription });
 * console.log(result.result.skills); // ['Python', 'Django', 'PostgreSQL', ...]
 * ```
 */
export class SkillsExtractionChain extends AbstractChain<ChainInput, Skills> {
  private prompt: any = null;
  private primaryModel = GeminiPrimaryClient;
  private fallbackModel = GeminiFallbackClient;

  constructor(config?: Partial<ChainConfig>) {
    super({
      name: 'extractSkills',
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
      this.prompt = await makeExtractSkillsPrompt();
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
  protected validateOutput(output: any): Skills {
    const parsed = SkillsSchema.safeParse(output);

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
  protected async execute(input: ChainInput): Promise<Skills> {
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
  private parseResponse(output: string): Skills {
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
      const validated = SkillsSchema.safeParse(parsed);

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
 * @deprecated Use `new SkillsExtractionChain()` directly
 */
export async function makeSkillsChain(): Promise<SkillsExtractionChain> {
  return new SkillsExtractionChain();
}

/**
 * Singleton instance for convenience
 */
export const skillsChain = new SkillsExtractionChain();
