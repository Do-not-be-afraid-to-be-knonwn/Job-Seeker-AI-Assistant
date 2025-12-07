import { PromptTemplate, FewShotPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { YearsSchema } from "../schemas/years.schema";

// 1) Build a parser from your Zod schema (we'll reuse this in the chain)
export const extractYearsParser =
  StructuredOutputParser.fromZodSchema(YearsSchema);

// 2) Define a few examples to ground the model
const examples = [
  {
    input: "Senior DevOps Engineer with 3–5 years of cloud experience.",
    output: `{{"minYears":3,"maxYears":5}}`,
  },
  {
    input: "Entry-level role: 0 to 1 year preferred.",
    output: `{{"minYears":0,"maxYears":1}}`,
  },
  {
    input:
      "Bachelor's degree in computer science, engineering, math, or scientific discipline with 5 years experience; OR Master's degree with 3 years of experience in software development; OR PHD with 1 year of experience in software development",
    output: `{{"minYears":1,"maxYears":5}}`,
  },
  {
    input:
      "5 to 8 years experience in Software Quality Assurance and/or Software Testing experience",
    output: `{{"minYears":5,"maxYears":8}}`,
  },
  {
    input:
      "qualifications: 'Delivered a working software stack for an ML accelerator', 'Managed teams of 20+', 'Expertise in ML compilers and ML kernel development",
    output: `{{"minYears":null,"maxYears":null}}`,
  },
  {
    input:
      "qualifications: 3+ years of non-internship professional front end, web or mobile software development using JavaScript, HTML and CSS experience 3+ years of computer science fundamentals (object-oriented design, data structures, algorithm design, problem solving and complexity analysis) experience。 Experience with object-oriented design.Experience using JavaScript frameworks such as angular and react.Preferred Qualifications 1+ years of agile software development methodology experience Experience building scalable, distributed, front-end experiences",
    output: `{{"minYears":3,"maxYears":3}}`,
  },
  {
    input:
      "4+ years of non-internship design or architecture (design patterns, reliability and scaling) of new and existing systems experience', '4+ years of non-internship professional software development experience,Preferred Qualifications 3+ years of full software development life cycle, including coding standards, code reviews, source control management, build processes, testing, and operations experience",
    output: `{{"minYears":4,"maxYears":4}}`,
  },
  {
    input:
      "8+ years of consistent track record as a data engineer, 3+ years of experience with mobile data, 5+ years of experience with distributed data technologies, 2+ years of experience with cloud-based technologies",
    output: `{{"minYears":8,"maxYears":8}}`,
  },
  {
    input:
      "Senior Software Engineer: 7+ years of software development experience, 3+ years of cloud experience, 2+ years of team leadership",
    output: `{{"minYears":7,"maxYears":7}}`,
  },
  {
    input:
      "Lead Developer: 10+ years of experience required, 5+ years in Java, 3+ years in cloud technologies",
    output: `{{"minYears":10,"maxYears":10}}`,
  },
  {
    input:
      "2-4 years of experience in backend development with Python or Node.js",
    output: `{{"minYears":2,"maxYears":4}}`,
  },
  {
    input:
      "Looking for candidates with 1-3 years OR 5-7 years of experience in data analysis",
    output: `{{"minYears":1,"maxYears":7}}`,
  },
];

// 3) How to format each example
const examplePrompt = PromptTemplate.fromTemplate(
  `Input: {input}
Output: {output}`
);

// 4) Factory to create a FewShotPromptTemplate (async because parser provides format_instructions)
export async function makeExtractYearsFewShotPrompt() {
  const formatInstructions = await extractYearsParser.getFormatInstructions();
  // Escape curly braces to avoid template parsing errors
  const escapedFormatInstructions = formatInstructions
    .replace(/\{/g, "{{")
    .replace(/\}/g, "}}");
  return new FewShotPromptTemplate({
    examplePrompt,
    examples,
    prefix: `You are a JSON job posting analyzer. Extract the years of experience range required from job postings.

Rules:
- Extract both minYears and maxYears
- For single numbers like "5+ years", set minYears = maxYears = 5
- For ranges like "3-5 years", set minYears = 3, maxYears = 5
- For multiple separate ranges like "1-3 OR 5-7 years", take the overall min and max (minYears = 1, maxYears = 7)
- For multiple different requirements (e.g., "5 years with Bachelor's OR 3 years with Master's"), use the full range (minYears = 3, maxYears = 5)
- If no years are mentioned, return minYears = null, maxYears = null
- When multiple experience requirements are listed (e.g., "8+ years as data engineer, 3+ years with mobile"), use the HIGHEST number as the primary requirement (minYears = 8, maxYears = 8)
- Focus on overall work experience, not specific technology experience unless that's the only requirement mentioned

For each "Input", produce exactly this schema (no extra keys, no prose):
${escapedFormatInstructions}

Here are some examples:
`,
    suffix: `Now extract from this job text:
Input: {text}
Output:`,
    inputVariables: ["text"],
  });
}
