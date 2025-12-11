/** @jest-environment node */
const path = require("path");
const fs = require("fs/promises");
const { spawn } = require("child_process");

const FEEDBACK_QUEUE_KEY = "feedbackQueue";
const storage = { [FEEDBACK_QUEUE_KEY]: [] };
const API_URL = process.env.API_ORIGIN;
global.chrome = {
  storage: {
    local: {
      get: (_keys, cb) =>
        cb({ [FEEDBACK_QUEUE_KEY]: storage[FEEDBACK_QUEUE_KEY] }),
      set: (obj, cb) => {
        storage[FEEDBACK_QUEUE_KEY] = obj[FEEDBACK_QUEUE_KEY];
        cb();
      },
    },
  },
  runtime: { onMessage: { addListener: () => {} } },
  alarms: {
    create: (name, info) => {
      // Mock alarm creation
    },
    onAlarm: {
      addListener: (fn) => {
        // Mock alarm listener registration
      },
    },
  },
};

describe("feedback end-to-end", () => {
  let serverProc;
  jest.setTimeout(20000);

  beforeAll(async () => {
    const feedbackPath = path.join(__dirname, "../../..", "feedback.jsonl");
    try {
      await fs.unlink(feedbackPath);
    } catch (_) {}

    serverProc = spawn("npx", ["ts-node", "server.ts"], {
      cwd: path.join(__dirname, "../../.."),
      env: { ...process.env, NODE_ENV: "development" },
      shell: true,
    });

    await new Promise((resolve, reject) => {
      serverProc.stdout.on("data", (data) => {
        if (data.toString().includes("Chain server running")) resolve();
      });
      serverProc.stderr.on("data", reject);
      serverProc.on("error", reject);
    });
  });

  afterAll(() => {
    serverProc.kill();
  });

  test("feedback endpoint requires authentication", async () => {
    const {
      enqueueFeedback,
      processQueue,
    } = require("../../../src/chrome-extension-template/background.js");

    const realFetch = global.fetch;
    global.fetch = async (url, options) => {
      if (url === "https://" + API_URL + "/feedback") {
        url = "http://localhost:3000/feedback";
      }
      return await realFetch(url, options);
    };

    // Test that direct unauthenticated request to feedback endpoint fails
    const response = await fetch("http://localhost:3000/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "123", feedback: "test" })
    });

    expect(response.status).toBe(401);
    const errorData = await response.json();
    expect(errorData.error).toBe("Missing authorization header");

    // Verify that queue processing also fails without authentication
    await enqueueFeedback({ jobId: "456", feedback: "great job" });
    await processQueue();

    const feedbackPath = path.join(__dirname, "../../..", "feedback.jsonl");
    
    // The feedback file should either not exist or not contain our test data
    // because the requests were rejected due to missing authentication
    try {
      await fs.access(feedbackPath);
      // If file exists, it should be empty or not contain our test data
      const content = await fs.readFile(feedbackPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      const hasTestData = lines.some(line => {
        try {
          const data = JSON.parse(line);
          return data.jobId === "456" && data.feedback === "great job";
        } catch {
          return false;
        }
      });
      expect(hasTestData).toBe(false);
    } catch (error) {
      // File doesn't exist, which is expected
      expect(error.code).toBe('ENOENT');
    }
  });
});
