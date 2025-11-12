import { YearsExtractionChain } from "../chains/YearsExtractionChain";

export async function runExtractYearsChain() {
  const chain = new YearsExtractionChain();

  const jobText =
    "Looking for a UX Designer with at least 4 years in product design.";
  const result = await chain.run({ text: jobText });
  const { requestYears } = result.result;
  console.log({ requestYears });
}

runExtractYearsChain();
