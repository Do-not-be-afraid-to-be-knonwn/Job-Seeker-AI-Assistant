const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadBackgroundScript(backgroundPath) {
  const listeners = [];
  const storage = {};

  const chrome = {
    storage: {
      local: {
        get(keys, cb) {
          const kArr = Array.isArray(keys) ? keys : [keys];
          const result = {};
          for (const k of kArr) {
            result[k] = storage[k];
          }
          setTimeout(() => cb(result), 0);
        },
        set(items, cb) {
          Object.assign(storage, items);
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
  };
  context.global = context;

  const code = fs.readFileSync(backgroundPath, 'utf8');
  vm.runInNewContext(code, context, { filename: backgroundPath });

  return { chrome, context };
}

module.exports = { loadBackgroundScript };
