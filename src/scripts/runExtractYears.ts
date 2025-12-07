import { YearsExtractionChain } from "../chains/YearsExtractionChain";

export async function runExtractYearsChain() {
  const chain = new YearsExtractionChain();

  // Test with various sample texts
  const sampleTexts = [
    {
      name: "Single requirement (5+ years)",
      text: "Looking for a Senior Developer with 5+ years of experience."
    },
    {
      name: "Range (3-5 years)",
      text: "We need a Mid-level Engineer with 3-5 years of experience."
    },
    {
      name: "Multiple requirements (highest)",
      text: "8+ years as data engineer, 3+ years with mobile data, 5+ years with distributed systems"
    },
    {
      name: "Multiple OR requirements",
      text: "5 years with Bachelor's degree OR 3 years with Master's degree"
    },
    {
      name: "No years mentioned",
      text: "Looking for a talented designer with strong portfolio and creative skills."
    },
    {
      name: "Entry-level range",
      text: "Entry-level position, 0-2 years of experience preferred"
    }
  ];

  console.log("=== Years Extraction Test ===\n");

  for (const sample of sampleTexts) {
    console.log(`Test: ${sample.name}`);
    console.log(`Input: "${sample.text}"\n`);

    try {
      const result = await chain.run({ text: sample.text });
      const { minYears, maxYears } = result.result;

      console.log("Results:");
      console.log(`  Min Years: ${minYears !== null ? minYears : "None"}`);
      console.log(`  Max Years: ${maxYears !== null ? maxYears : "None"}`);
      console.log("\n" + "=".repeat(50) + "\n");
    } catch (error) {
      console.error(`Error processing "${sample.name}":`, error);
      console.log("\n" + "=".repeat(50) + "\n");
    }
  }
}

if (require.main === module) {
  runExtractYearsChain().catch(console.error);
}
