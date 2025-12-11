const path = require('path');
const { loadBackgroundScript } = require('../fixtures/chromeExtensionTestKit');

describe('USER_FEEDBACK queue', () => {
  test('queues feedback messages successfully', async () => {
    const { chrome, context } = loadBackgroundScript(
      path.join(__dirname, '../../../src/chrome-extension-template/background.js')
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

    // Note: Processing requires authentication which is complex to mock in this test environment
    // The queue processing with auth is tested in the background.test.js file
  });
});
