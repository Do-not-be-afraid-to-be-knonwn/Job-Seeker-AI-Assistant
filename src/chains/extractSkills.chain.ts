import { SkillsExtractionChain } from './SkillsExtractionChain';

/**
 * @deprecated Use SkillsExtractionChain directly
 * Backward compatibility adapter for old code
 *
 * @example
 * // Old pattern (still works)
 * const chain = await makeExtractSkillsChain();
 * const result = await chain({ text: jobDescription });
 *
 * // New pattern (recommended)
 * const chain = new SkillsExtractionChain();
 * const result = await chain.run({ text: jobDescription });
 */
export async function makeExtractSkillsChain() {
  const chainInstance = new SkillsExtractionChain();

  // Return an adapter function that matches the old interface
  return async (input: { text: string }, testExpected?: any) => {
    const result = await chainInstance.run(input, testExpected);
    // Return format matches old { result } or { result, validation } structure
    return result;
  };
}
