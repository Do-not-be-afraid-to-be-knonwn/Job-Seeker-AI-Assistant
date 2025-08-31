// Jest test for background.js
process.env.NODE_ENV = "test";
const FEEDBACK_QUEUE_KEY = "feedbackQueue";
const storage = { [FEEDBACK_QUEUE_KEY]: [] };
const API_URL = process.env.API_ORIGIN || "localhost:3000";

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

const {
  enqueueFeedback,
  processQueue,
  MAX_ATTEMPTS,
} = require("../src/chrome-extension-template/background.js");

describe("Background Script Tests", () => {
  beforeEach(() => {
    storage[FEEDBACK_QUEUE_KEY] = [];
  });

  test("processQueue retries and posts to /feedback", async () => {
    const payload = { foo: "bar" };
    await enqueueFeedback(payload);

    const calls = [];
    let count = 0;
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      count++;
      if (count % 2 === 1) {
        return { ok: false, status: 500 };
      }
      return { ok: true, status: 200 };
    };

    await processQueue();
    expect(storage[FEEDBACK_QUEUE_KEY]).toHaveLength(1);
    expect(storage[FEEDBACK_QUEUE_KEY][0].attempts).toBe(1);

    storage[FEEDBACK_QUEUE_KEY][0].nextTryAt = 0;
    await processQueue();
    expect(storage[FEEDBACK_QUEUE_KEY]).toEqual([]);

    const second = calls[1];
    expect(second.url).toBe("http://localhost:3000/feedback");
    expect(second.options.method).toBe("POST");
    expect(second.options.headers["Content-Type"]).toBe("application/json");
    expect(second.options.body).toBe(JSON.stringify(payload));
  });

  test("processQueue drops item after MAX_ATTEMPTS failures", async () => {
    storage[FEEDBACK_QUEUE_KEY] = [
      { payload: { id: 1 }, attempts: 0, nextTryAt: 0 },
    ];
    global.fetch = async () => ({ ok: false, status: 500 });

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await processQueue();
      if (i < MAX_ATTEMPTS - 1) {
        expect(storage[FEEDBACK_QUEUE_KEY]).toHaveLength(1);
        expect(storage[FEEDBACK_QUEUE_KEY][0].attempts).toBe(i + 1);
        storage[FEEDBACK_QUEUE_KEY][0].nextTryAt = 0;
      } else {
        expect(storage[FEEDBACK_QUEUE_KEY]).toEqual([]);
      }
    }
  });
});
