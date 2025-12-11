const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadBackgroundScript(backgroundPath) {
  const listeners = [];
  const storage = {
    // Initialize with mock auth tokens
    authTokens: {
      iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      data: [1, 2, 3] // Mock encrypted data
    }
  };

  const alarmListeners = [];
  const chrome = {
    storage: {
      local: {
        get(keys, cb) {
          if (typeof keys === 'function') {
            // Handle case where no keys are provided and callback is first argument
            cb = keys;
            keys = [];
          }
          
          const kArr = Array.isArray(keys) ? keys : (keys ? [keys] : Object.keys(storage));
          const result = {};
          for (const k of kArr) {
            if (storage.hasOwnProperty(k)) {
              result[k] = storage[k];
            }
          }
          
          if (typeof cb === 'function') {
            setTimeout(() => cb(result), 0);
          }
        },
        set(items, cb) {
          Object.assign(storage, items);
          setTimeout(() => cb && cb(), 0);
        },
        remove(keys, cb) {
          const kArr = Array.isArray(keys) ? keys : [keys];
          for (const k of kArr) {
            delete storage[k];
          }
          setTimeout(() => cb && cb(), 0);
        },
      },
    },
    runtime: {
      onMessage: {
        addListener(fn) {
          listeners.push(fn);
        },
      },
      sendMessage(message) {
        return new Promise((resolve) => {
          for (const listener of listeners) {
            listener(message, {}, resolve);
          }
        });
      },
    },
    alarms: {
      create(name, info) {
        // Mock alarm creation - just store the alarm info
      },
      onAlarm: {
        addListener(fn) {
          alarmListeners.push(fn);
        },
      },
    },
  };

  const timers = [];
  function setIntervalStub(fn, _ms) {
    timers.push(fn);
    return timers.length - 1;
  }

  const context = {
    chrome,
    console,
    process: { env: { NODE_ENV: 'test', API_ORIGIN: 'localhost:3000' } },
    setInterval: setIntervalStub,
    clearInterval: () => {},
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    // Mock crypto functions for authentication
    crypto: {
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
    },
    TextEncoder,
    TextDecoder,
    module: { exports: {} }, // Add module.exports for compatibility
  };
  context.global = context;

  const code = fs.readFileSync(backgroundPath, 'utf8');
  vm.runInNewContext(code, context, { filename: backgroundPath });

  // Expose functions from the background script to the context
  // This allows tests to access functions like processQueue, enqueueFeedback, etc.
  if (typeof context.module !== 'undefined' && context.module.exports) {
    Object.assign(context, context.module.exports);
  }

  return { chrome, context };
}

module.exports = { loadBackgroundScript };
