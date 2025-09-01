// Jest test for background.js
process.env.NODE_ENV = "test";
const FEEDBACK_QUEUE_KEY = "feedbackQueue";
const AUTH_TOKEN_KEY = "authTokens";
const storage = { 
  [FEEDBACK_QUEUE_KEY]: [],
  [AUTH_TOKEN_KEY]: {
    iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    data: [1, 2, 3] // Mock encrypted data
  }
};
const API_URL = process.env.API_ORIGIN || "localhost:3000";

// Mock crypto functions for tests
global.crypto = {
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  subtle: {
    importKey: () => Promise.resolve({}),
    encrypt: () => Promise.resolve(new ArrayBuffer(16)),
    decrypt: () => Promise.resolve(new TextEncoder().encode(JSON.stringify({ jwt: 'mock-jwt-token', refresh_token: 'mock-refresh' }))),
  },
};

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.chrome = {
  storage: {
    local: {
      get: (keys, cb) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (storage[key] !== undefined) {
              result[key] = storage[key];
            }
          });
        } else if (typeof keys === 'string') {
          if (storage[keys] !== undefined) {
            result[keys] = storage[keys];
          }
        } else {
          // If keys is an object (like {feedbackQueue: undefined}), return matching keys
          Object.keys(keys).forEach(key => {
            if (storage[key] !== undefined) {
              result[key] = storage[key];
            }
          });
        }
        cb(result);
      },
      set: (obj, cb) => {
        Object.assign(storage, obj);
        if (cb) cb();
      },
      remove: (keys, cb) => {
        if (Array.isArray(keys)) {
          keys.forEach(key => delete storage[key]);
        } else {
          delete storage[keys];
        }
        if (cb) cb();
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
    // Reset auth token for each test
    storage[AUTH_TOKEN_KEY] = {
      iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      data: [1, 2, 3] // Mock encrypted data that decrypts to valid token
    };
  });

  test("processQueue fails without authentication", async () => {
    const payload = { foo: "bar" };
    await enqueueFeedback(payload);

    // Remove auth token to simulate unauthenticated state
    delete storage[AUTH_TOKEN_KEY];

    await processQueue();
    
    // Item should remain in queue due to authentication failure
    expect(storage[FEEDBACK_QUEUE_KEY]).toHaveLength(1);
    expect(storage[FEEDBACK_QUEUE_KEY][0].attempts).toBe(1);
    expect(storage[FEEDBACK_QUEUE_KEY][0].payload).toEqual(payload);
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
