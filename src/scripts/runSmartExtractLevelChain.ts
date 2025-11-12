import { LevelExtractionChain } from "../chains/LevelExtractionChain";

export async function runSmartExtractLevelChain() {
  const chain = new LevelExtractionChain();
  const text = `
    Title: Platform Engineer
    Description: We need someone to build and maintain our internal CI/CD pipelines...
    Experience: 4+ years preferred.
  `;

  const result = await chain.run({ text });
  console.log(result.result);
  // → { level: "Mid" }  // or whatever comes from explicit/inference
}

runSmartExtractLevelChain();
