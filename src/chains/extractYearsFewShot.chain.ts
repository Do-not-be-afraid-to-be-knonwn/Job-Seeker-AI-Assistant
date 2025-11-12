import { YearsExtractionChain } from './YearsExtractionChain';

/**
 * @deprecated Use YearsExtractionChain directly
 * Backward compatibility adapter for old code
 */
export async function makeExtractYearsChain() {
  const chainInstance = new YearsExtractionChain();

  return async (input: { text: string }, testExpected?: any) => {
    const result = await chainInstance.run(input, testExpected);
    return result;
  };
}
