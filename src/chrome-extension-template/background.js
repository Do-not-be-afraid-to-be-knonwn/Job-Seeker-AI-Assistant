console.log("Background script loaded!");

const FEEDBACK_QUEUE_KEY = "feedbackQueue";
const MAX_ATTEMPTS = 8;
const PROCESS_INTERVAL_MS = 60 * 1000;
const API_URL = process.env.API_ORIGIN;

// Helpers for chrome.storage.local
async function getQueue() {
  return new Promise((resolve) => {
    chrome.storage.local.get([FEEDBACK_QUEUE_KEY], (result) => {
      resolve(result[FEEDBACK_QUEUE_KEY] || []);
    });
  });
}

async function setQueue(queue) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FEEDBACK_QUEUE_KEY]: queue }, () => resolve());
  });
}

function getNextDelay(attempts) {
  const baseDelay = Math.pow(2, attempts) * PROCESS_INTERVAL_MS;
  const jitter = Math.random() * 0.1 * baseDelay; // add up to 10% jitter
  return baseDelay + jitter;
}

async function enqueueFeedback(payload) {
  const queue = await getQueue();
  queue.push({ payload, attempts: 0, nextTryAt: Date.now() });
  await setQueue(queue);
}

async function processQueue() {
  const now = Date.now();
  const queue = await getQueue();
  const remaining = [];

  for (const item of queue) {
    if (item.nextTryAt > now) {
      remaining.push(item);
      continue;
    }

    try {
      const response = await fetch("https://" + API_URL + "/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      // success -> do not re-add to queue
    } catch (_error) {
      item.attempts += 1;
      if (item.attempts < MAX_ATTEMPTS) {
        item.nextTryAt = Date.now() + getNextDelay(item.attempts);
        remaining.push(item);
      }
      // drop if max attempts reached
    }
  }

  await setQueue(remaining);
}

if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
  setInterval(processQueue, PROCESS_INTERVAL_MS);
  processQueue();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received:", msg);
  if (msg.type === "INDEED_JOB_DETAIL") {
    (async () => {
      const job = msg.job;
      console.log("Job received:", job);
      try {
        const response = await fetch("https://" + API_URL + "/extract-all/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: job.description,
            title: job.title,
          }),
        });
        const data = await response.json();
        console.log("Extraction result:", data);
        sendResponse({ success: true, extraction: data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Indicate async response
  } else if (msg.type === "USER_FEEDBACK") {
    (async () => {
      await enqueueFeedback(msg.payload);
      sendResponse({ success: true });
    })();
    return true;
  }
});

if (typeof module !== "undefined") {
  module.exports = {
    enqueueFeedback,
    processQueue,
    MAX_ATTEMPTS,
    FEEDBACK_QUEUE_KEY,
  };
}
