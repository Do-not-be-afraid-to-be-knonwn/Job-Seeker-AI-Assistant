import { config } from "dotenv";
config(); // Load environment variables from .env file

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

  return {
    yearsChain,
    levelChain,
    domainChain,
    skillsChain,
  };
}

async function runLocalSmokeTest() {
  console.log("🚀 Starting local smoke test...");
  console.log(`📊 Testing ${rows.length} job descriptions\n`);

  let totalTests = 0;
  let correctYears = 0;
  let correctLevel = 0;
  let correctDomain = 0;
  let correctSkills = 0;

  const startTime = Date.now();

  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    console.log(`\n--- Test ${i + 1}: ${row.job_title} ---`);

    try {
      const { yearsChain, levelChain, domainChain, skillsChain } = await target(
        { text: row.job_description }
      );
      const inputText = { text: row.job_description };

      // Years
      const yearsResponse = await yearsChain.run(inputText, row.years_required);
      const yearsValidation = yearsResponse?.validation;
      if (yearsValidation?.match) correctYears++;
      console.log(
        `Years: ${yearsValidation?.actual} (expected: ${
          yearsValidation?.expected
        }) ${yearsValidation?.match ? "✅" : "❌"}`
      );

      // Level
      const levelResponse = await levelChain.run(inputText, row.title_level);
      const levelValidation = levelResponse?.validation;
      if (levelValidation?.match) correctLevel++;
      console.log(
        `Level: ${levelValidation?.actual} (expected: ${
          levelValidation?.expected
        }) ${levelValidation?.match ? "✅" : "❌"}`
      );

      // Domain
      const domainResponse = await domainChain.run(inputText, row.job_domain);
      const domainValidation = domainResponse?.validation;
      if (domainValidation?.match) correctDomain++;
      console.log(
        `Domains: [${domainValidation?.actual.join(", ")}] (expected: ${
          domainValidation?.expected
        }) ${domainValidation?.match ? "✅" : "❌"}`
      );

      // Skills
      const expectedSkills = row.technologies_required || [];
      const skillsResponse = await skillsChain.run(inputText, expectedSkills);
      const skillsValidation = skillsResponse?.validation;
      if (skillsValidation?.match) correctSkills++;
      console.log(
        `Skills: [${skillsValidation?.actual.join(
          ", "
        )}] (expected: [${skillsValidation?.expected.join(", ")}]) ${
          skillsValidation?.match ? "✅" : "❌"
        }`
      );

      totalTests++;
    } catch (error) {
      console.error(`❌ Error processing test ${i + 1}:`, error);
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log(`\n📈 Results Summary:`);
  console.log(
    `Years Accuracy: ${correctYears}/${totalTests} (${(
      (correctYears / totalTests) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `Level Accuracy: ${correctLevel}/${totalTests} (${(
      (correctLevel / totalTests) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `Domain Accuracy: ${correctDomain}/${totalTests} (${(
      (correctDomain / totalTests) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `Skills Accuracy: ${correctSkills}/${totalTests} (${(
      (correctSkills / totalTests) *
      100
    ).toFixed(1)}%)`
  );

  const overallAccuracy = (
    ((correctYears + correctLevel + correctDomain + correctSkills) /
      (totalTests * 4)) *
    100
  ).toFixed(1);
  console.log(`\n🎯 Overall Accuracy: ${overallAccuracy}%`);
  console.log(`⏱️  Total Test Duration: ${totalDuration}ms`);
}

// Execute the function
runLocalSmokeTest().catch(console.error);
