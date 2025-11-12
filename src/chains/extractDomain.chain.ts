import { DomainExtractionChain } from './DomainExtractionChain';

/**
 * @deprecated Use DomainExtractionChain directly
 * Backward compatibility adapter for old code
 */
export async function makeExtractDomainChain() {
  const chainInstance = new DomainExtractionChain();

  return async (input: { text: string }, testExpected?: any) => {
    const result = await chainInstance.run(input, testExpected);
    return result;
  };
}
