import { makeExtractSkillsChain } from "../chains/extractSkills.chain";
import { runExtractYearsChain } from "./runExtractYears";
import { runSmartExtractLevelChain } from "./runSmartExtractLevelChain";
import { runExtractDomainChain } from "./runExtractDomain";

async function runExtractSkillsChain() {
  const chain = await makeExtractSkillsChain();
  const sampleText =
    "We are seeking a Full-Stack Developer proficient in JavaScript, TypeScript, React, Node.js, and experience with AWS services and CI/CD pipelines.";

  const result = await chain({ text: sampleText });
  const { skills } = result;

  console.log("Extracted skills:", skills);
}
runExtractSkillsChain().catch(console.error);

runSmartExtractLevelChain().catch(console.error);

runExtractDomainChain().catch(console.error);
runExtractYearsChain().catch(console.error);
