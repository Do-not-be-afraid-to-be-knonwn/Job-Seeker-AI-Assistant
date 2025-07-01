import { makeExtractDomainChain } from "../chains/extractDomain.chain";

export async function runExtractDomainChain() {
  // Instantiate the domain extraction chain
  const chain = await makeExtractDomainChain();

  // Use a short, hardcoded example instead of reading a CSV
  const sampleDescription =
    "Looking for a Data Scientist with strong skills in machine learning, data analysis, and Python programming.";

  // Call the chain and parse the JSON output
  const result = await chain({ text: sampleDescription });
  const { domain } = result;

  console.log("Extracted domain:", domain);
}

runExtractDomainChain().catch(console.error);
