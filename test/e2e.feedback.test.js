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
};

describe("feedback end-to-end", () => {
  let serverProc;
  jest.setTimeout(20000);

  beforeAll(async () => {
    const feedbackPath = path.join(__dirname, "..", "feedback.jsonl");
    try {
      await fs.unlink(feedbackPath);
    } catch (_) {}

    serverProc = spawn("npx", ["ts-node", "server.ts"], {
      cwd: path.join(__dirname, ".."),
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

  test("records feedback in feedback.jsonl", async () => {
    const {
      enqueueFeedback,
      processQueue,
    } = require("../src/chrome-extension-template/background.js");

    const realFetch = global.fetch;
    global.fetch = async (url, options) => {
      if (url === "https://" + API_URL + "/feedback") {
        url = "http://localhost:3000/feedback";
      }
      return await realFetch(url, options);
    };

    await enqueueFeedback({ jobId: "123", feedback: "great job" });
    await processQueue();

    const feedbackPath = path.join(__dirname, "..", "feedback.jsonl");
    // wait a moment for file to be written
    await new Promise((r) => setTimeout(r, 100));
    const content = await fs.readFile(feedbackPath, "utf-8");
    const lines = content.trim().split("\n");
    const last = JSON.parse(lines[lines.length - 1]);
    expect(last.jobId).toBe("123");
    expect(last.feedback).toBe("great job");
  });
});
