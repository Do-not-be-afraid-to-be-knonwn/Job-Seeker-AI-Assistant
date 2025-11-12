import { LevelExtractionChain } from './LevelExtractionChain';

/**
 * @deprecated Use LevelExtractionChain directly
 * Backward compatibility adapter for old code
 *
 * IMPORTANT: Old code uses .call() method instead of .run()
 * This adapter provides both interfaces
 */
export async function makeSmartExtractLevelChain() {
  const chainInstance = new LevelExtractionChain();

  // Return object with .call() method for backwards compatibility
  return {
    /**
     * @deprecated Use chain.run() instead
     */
    call: async (input: { text: string }, testExpected?: any) => {
      const result = await chainInstance.run(input, testExpected);
      return result;
    },

    // Also expose run() for new code
    run: async (input: { text: string }, testExpected?: any) => {
      const result = await chainInstance.run(input, testExpected);
      return result;
    }
  };
}
