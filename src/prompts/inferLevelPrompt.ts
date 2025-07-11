import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { LevelSchema } from "../schemas/level.schema";

// Parser reusable in chain wiring
export const inferLevelParser =
  StructuredOutputParser.fromZodSchema(LevelSchema);

/**
 * Builds a PromptTemplate that asks the model to *infer* the level
 * when it's not stated explicitly.
 */
export async function makeInferLevelPrompt() {
  const formatInstructions = await inferLevelParser.getFormatInstructions();
  // Escape curly braces to avoid template parsing errors
  const escapedFormatInstructions = formatInstructions
    .replace(/\{/g, "{{")
    .replace(/\}/g, "}}");
  return PromptTemplate.fromTemplate(
    `Sometimes a job posting doesn't state "Senior" or "Junior" explicitly.
Based on the following job **description**, pick the best-fit level from:
["Intern","Entry","Junior","Mid","Senior","Lead","Manager","Director","Executive"].

Level Criteria:
- Intern: Students/recent graduates, no experience required, learning on the job
- Entry: 0-1 years experience, basic skills, supervised work
- Junior: 1-2 years experience, some independence, basic mentoring
- Mid: 3-4 years experience, works independently, may mentor juniors, handles complex tasks
- Senior: 5-7 years experience, leads technical decisions, mentors others, handles architecture
- Lead: 5-8 years experience, leads small teams (2-5 people), technical leadership
- Manager:  manages multiple teams, people management focus
- Director: 10+ years experience, oversees departments, strategic planning
- Executive: 15+ years experience, C-level positions, company-wide decisions

Here are some examples:

Example 1:
Description: "Looking for a recent graduate or student to join our team. No prior experience required. Will learn on the job."
Level: Intern

Example 2:
Description: "Seeking a developer with 1-2 years of experience. Knowledge of basic programming concepts required."
Level: Junior

Example 3:
Description: "We need someone with 3-4 years of experience who can work independently on complex features."
Level: Mid

Example 4:
Description: "We need someone with 5-7 years of experience who can work independently and mentor junior developers."
Level: Senior

Example 5:
Description: "Leading a team of 5-10 engineers. Responsible for technical decisions and project planning."
Level: Lead

Example 6:
Description: "Managing multiple teams and departments. Strategic planning and budget responsibility."
Level: Manager

Example 7:
Description: "Overseeing all engineering operations. Reporting to CTO. 10+ years experience required."
Level: Director

Respond with exactly this JSON schema (no extra keys, no prose):
${escapedFormatInstructions}

Description:
{text}

`
  );
}
