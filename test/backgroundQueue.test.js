const path = require('path');
const { loadBackgroundScript } = require('./chromeExtensionTestKit');

describe('USER_FEEDBACK queue', () => {
  test('grows and processes in order', async () => {
    const { chrome, context } = loadBackgroundScript(
      path.join(__dirname, '../src/chrome-extension-template/background.js')
    );

    const res1 = await chrome.runtime.sendMessage({
      type: 'USER_FEEDBACK',
      payload: { id: 1 },
    });
    const res2 = await chrome.runtime.sendMessage({
      type: 'USER_FEEDBACK',
      payload: { id: 2 },
    });

    expect(res1).toEqual({ success: true });
    expect(res2).toEqual({ success: true });

    const queueData = await new Promise((resolve) =>
      chrome.storage.local.get(['feedbackQueue'], resolve)
    );
    expect(queueData.feedbackQueue).toHaveLength(2);
    expect(queueData.feedbackQueue[0].payload.id).toBe(1);
    expect(queueData.feedbackQueue[1].payload.id).toBe(2);

    const processed = [];
    context.fetch = async (_url, opts) => {
      processed.push(JSON.parse(opts.body).id);
      return { ok: true, json: async () => ({}) };
    };

    await context.processQueue();

    expect(processed).toEqual([1, 2]);
    const queueAfter = await new Promise((resolve) =>
      chrome.storage.local.get(['feedbackQueue'], resolve)
    );
    expect(queueAfter.feedbackQueue).toHaveLength(0);
  });
});
