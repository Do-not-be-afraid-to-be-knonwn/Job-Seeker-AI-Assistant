import { config } from "dotenv";
config(); // Load environment variables from .env file

import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import { StringEvaluator } from "langsmith/evaluation";
import rows from "./smoke.json";
import { YearsExtractionChain } from "../../src/chains/YearsExtractionChain";
import { SkillsExtractionChain } from "../../src/chains/SkillsExtractionChain";
import { LevelExtractionChain } from "../../src/chains/LevelExtractionChain";
import { DomainExtractionChain } from "../../src/chains/DomainExtractionChain";

async function target(inputs: { text: string }) {
  const yearsChain = new YearsExtractionChain();
  const levelChain = new LevelExtractionChain();
  const domainChain = new DomainExtractionChain();
  const skillsChain = new SkillsExtractionChain();

  const years = await yearsChain.run(inputs);
  const level = await levelChain.run(inputs);
  const domain = await domainChain.run(inputs);
  const skills = await skillsChain.run(inputs);

  return {
    ...years.result,
    level: level.result.level,
    domains: domain.result.domains,
    skills: skills.result.skills,
  };
}

async function runSmokeTest() {
  const client = new Client({
    apiKey: process.env.LANGSMITH_API_KEY,
  });

  // programmatically create your 20-row smoke dataset
  const ds = await client.createDataset("Smoke Test", {
    description: "20-row smoke data set for LLM extraction chains",
  });

  const examples = rows.map((r: any) => ({
    inputs: { text: r.job_description },
    outputs: {
      requestYears: r.years_required,
      level: r.title_level,
      domain: r.job_domain,
      skills: r.technologies_required || [],
    },
    datasetId: ds.id,
  }));

  await client.createExamples(examples);

  console.log("Dataset created successfully with", examples.length, "examples");
  console.log("Dataset ID:", ds.id);

  // Create evaluators for exact-match fields
  const yearsEvaluator = new StringEvaluator({
    inputKey: "text",
    predictionKey: "requestYears",
    gradingFunction: async (params: any) => {
      const isCorrect =
        params.prediction.requestYears === params.reference.years;
      return {
        score: isCorrect ? 1 : 0,
        reasoning: isCorrect ? "Exact match" : "Mismatch",
      };
    },
  });

  const levelEvaluator = new StringEvaluator({
    inputKey: "text",
    predictionKey: "level",
    gradingFunction: async (params: any) => {
      const isCorrect = params.prediction.level === params.reference.level;
      return {
        score: isCorrect ? 1 : 0,
        reasoning: isCorrect ? "Exact match" : "Mismatch",
      };
    },
  });

  const domainEvaluator = new StringEvaluator({
    inputKey: "text",
    predictionKey: "domains",
    gradingFunction: async (params: any) => {
      // Check if the expected domain is in the predicted domains array
      const expectedDomain = params.reference.domains;
      const predictedDomains = params.prediction.domains || [];
      const isCorrect = predictedDomains.includes(expectedDomain);
      return {
        score: isCorrect ? 1 : 0,
        reasoning: isCorrect ? "Expected domain found in domains array" : "Expected domain not found in domains array",
      };
    },
  });

  const skillsEvaluator = new StringEvaluator({
    inputKey: "text",
    predictionKey: "skills",
    gradingFunction: async (params: any) => {
      const isCorrect =
        JSON.stringify(params.prediction.skills) ===
        JSON.stringify(params.reference.skills);
      return {
        score: isCorrect ? 1 : 0,
        reasoning: isCorrect ? "Exact match" : "Mismatch",
      };
    },
  });

  // Run evaluation using LangSmith
  console.log("Starting evaluation...");
  await evaluate(target, {
    client,
    data: ds.id,
    evaluators: [
      yearsEvaluator,
      levelEvaluator,
      domainEvaluator,
      skillsEvaluator,
    ],
    experimentPrefix: "smoke-test-v1",
    maxConcurrency: 5,
  });

  console.log("Evaluation completed!");
}

// Execute the function
runSmokeTest().catch(console.error);
