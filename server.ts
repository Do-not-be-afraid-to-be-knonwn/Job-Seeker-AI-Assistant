import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { makeExtractSkillsChain } from "./src/chains/extractSkills.chain";
import { makeExtractDomainChain } from "./src/chains/extractDomain.chain";
import { makeExtractYearsChain } from "./src/chains/extractYearsFewShot.chain";
import { makeSmartExtractLevelChain } from "./src/chains/smartExtractLevel.chain";

const app = express();
app.use(cors());
app.use(bodyParser.json());
// Some clients may omit the content-type header when sending JSON
// (e.g., the chrome extension feedback fetch). Parse plain text bodies
// so we can still handle those requests and manually JSON.parse them.
app.use(bodyParser.text({ type: "*/*" }));

const feedbackFile = path.join(__dirname, "feedback.jsonl");

// POST /extract-all
app.post("/extract-all", async (req, res) => {
  const inputText =
    req.body.text || req.body.description || req.body.title || "";
  //console.log("Received request:", { inputText });

  let skillsResult, domainResult, yearsResult, levelResult;
  let skillsError, domainError, yearsError, levelError;

  try {
    const skillsChain = await makeExtractSkillsChain();
    try {
      skillsResult = await skillsChain({ text: inputText });
    } catch (e) {
      skillsError = e;
      console.error("Skills chain error:", e);
    }
  } catch (e) {
    skillsError = e;
    console.error("Skills chain setup error:", e);
  }

  try {
    const domainChain = await makeExtractDomainChain();
    try {
      domainResult = await domainChain({ text: inputText });
    } catch (e) {
      domainError = e;
      console.error("Domain chain error:", e);
    }
  } catch (e) {
    domainError = e;
    console.error("Domain chain setup error:", e);
  }

  try {
    const yearsChain = await makeExtractYearsChain();
    try {
      yearsResult = await yearsChain({ text: inputText });
    } catch (e) {
      yearsError = e;
      console.error("Years chain error:", e);
    }
  } catch (e) {
    yearsError = e;
    console.error("Years chain setup error:", e);
  }

  try {
    const levelChain = await makeSmartExtractLevelChain();
    try {
      levelResult = await levelChain.call({ text: inputText });
    } catch (e) {
      levelError = e;
      console.error("Level chain error:", e);
    }
  } catch (e) {
    levelError = e;
    console.error("Level chain setup error:", e);
  }

  console.log("Skills result:", skillsResult);
  console.log("Domain result:", domainResult);
  console.log("Years result:", yearsResult);
  console.log("Level result:", levelResult);

  res.json({
    skills: skillsError
      ? { error: (skillsError as any)?.message || String(skillsError) }
      : skillsResult,
    domain: domainError
      ? { error: (domainError as any)?.message || String(domainError) }
      : domainResult,
    years: yearsError
      ? { error: (yearsError as any)?.message || String(yearsError) }
      : yearsResult,
    level: levelError
      ? { error: (levelError as any)?.message || String(levelError) }
      : levelResult,
  });
});

// POST /feedback
app.post("/feedback", async (req, res) => {
  try {
    // Body may already be parsed JSON or a raw string.
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const entry = {
      timestamp: new Date().toISOString(),
      ...body,
    };

    await fs.appendFile(feedbackFile, JSON.stringify(entry) + "\n");
    res.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    res.status(500).json({ success: false, error: (error as any)?.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chain server running on http://localhost:${PORT}`);
});
