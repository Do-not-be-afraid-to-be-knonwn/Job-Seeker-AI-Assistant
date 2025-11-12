import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { extractionService } from "./src/services/ExtractionService";
import { jobResumeMatchingChain } from "./src/matching/core/jobResumeMatching.chain";
import authRouter from "./src/auth/googleAuth";
import { requireAuth, AuthenticatedRequest } from "./src/middleware/auth";

const app = express();
app.use(cors());
app.use(bodyParser.json());
// Some clients may omit the content-type header when sending JSON
// (e.g., the chrome extension feedback fetch). Parse plain text bodies
// so we can still handle those requests and manually JSON.parse them.
app.use(bodyParser.text({ type: "*/*" }));
app.use("/auth", authRouter);

const feedbackFile = path.join(__dirname, "feedback.jsonl");

// POST /extract-all - Protected endpoint
app.post("/extract-all", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const inputText =
      req.body.text || req.body.description || req.body.title || "";

    // Validate input
    if (!inputText || inputText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Input text is required and cannot be empty"
      });
    }

    // Extract all features in parallel using the service
    const results = await extractionService.extractAll(inputText);

    // Format response to match old API format
    res.json({
      skills: results.skills.success
        ? results.skills.data
        : { error: results.skills.error },
      domain: results.domain.success
        ? results.domain.data
        : { error: results.domain.error },
      years: results.years.success
        ? results.years.data
        : { error: results.years.error },
      level: results.level.success
        ? results.level.data
        : { error: results.level.error }
    });

  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /feedback - Protected endpoint
app.post("/feedback", requireAuth, async (req: AuthenticatedRequest, res) => {
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

// POST /match-resume - Job-Resume Matching endpoint
app.post("/match-resume", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { jobDescription, resumeContent, options } = req.body;

    if (!jobDescription || !resumeContent) {
      return res.status(400).json({
        success: false,
        error: "Both jobDescription and resumeContent are required"
      });
    }

    const input = {
      jobDescription,
      resumeContent,
      options: {
        includeExplanation: true,
        strictMode: false,
        ...options
      }
    };

    const result = await jobResumeMatchingChain.analyzeMatch(input);
    
    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error("Job-resume matching error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /match-batch - Batch Job-Resume Matching endpoint
app.post("/match-batch", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { pairs, options } = req.body;

    if (!pairs || !Array.isArray(pairs)) {
      return res.status(400).json({
        success: false,
        error: "pairs array is required"
      });
    }

    const processedPairs = pairs.map((pair: any) => ({
      jobDescription: pair.jobDescription,
      resumeContent: pair.resumeContent,
      options: {
        includeExplanation: false, // Default to false for batch to save time
        strictMode: false,
        ...pair.options,
        ...options
      }
    }));

    const results = await jobResumeMatchingChain.analyzeBatchMatches(processedPairs);
    
    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error("Batch job-resume matching error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /match-quick - Quick scoring endpoint
app.post("/match-quick", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { pairs } = req.body;

    if (!pairs || !Array.isArray(pairs)) {
      return res.status(400).json({
        success: false,
        error: "pairs array is required"
      });
    }

    const results = await jobResumeMatchingChain.getQuickScores(pairs);
    
    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error("Quick matching error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Chain server running on http://localhost:${PORT}`);
  });
}

export default app;
