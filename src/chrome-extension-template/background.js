console.log("Background script loaded!");

const FEEDBACK_QUEUE_KEY = "feedbackQueue";
const MAX_ATTEMPTS = 8;
const PROCESS_INTERVAL_MS = 60 * 1000;
const API_URL = "http://ec2-54-166-244-73.compute-1.amazonaws.com:3000";

const AUTH_TOKEN_KEY = "authTokens";
const AUTH_SECRET_KEY = "authSecret";

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
      const response = await fetch(API_URL + "/feedback", {
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

// ===== Authentication Helpers =====

async function getCryptoKey() {
  const result = await chrome.storage.local.get([AUTH_SECRET_KEY]);
  let raw = result[AUTH_SECRET_KEY];
  if (!raw) {
    raw = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    await chrome.storage.local.set({ [AUTH_SECRET_KEY]: raw });
  }
  return crypto.subtle.importKey("raw", new Uint8Array(raw), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptString(str) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getCryptoKey();
  const encoded = new TextEncoder().encode(str);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) };
}

async function decryptString(obj) {
  if (!obj) return null;
  const key = await getCryptoKey();
  const iv = new Uint8Array(obj.iv);
  const data = new Uint8Array(obj.data);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

async function saveAuth(tokens) {
  const enc = await encryptString(JSON.stringify(tokens));
  await chrome.storage.local.set({ [AUTH_TOKEN_KEY]: enc });
}

async function loadAuth() {
  const result = await chrome.storage.local.get([AUTH_TOKEN_KEY]);
  if (!result[AUTH_TOKEN_KEY]) return null;
  const str = await decryptString(result[AUTH_TOKEN_KEY]);
  return JSON.parse(str);
}

async function login() {
  const start = await fetch(API_URL + "/auth/google/start").then((r) =>
    r.json()
  );
  const redirect = await chrome.identity.launchWebAuthFlow({
    url: start.authUrl,
    interactive: true,
  });
  const url = new URL(redirect);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const tokens = await fetch(API_URL + "/auth/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, state }),
  }).then((r) => r.json());
  await saveAuth(tokens);
  scheduleRefresh();
}

function scheduleRefresh() {
  chrome.alarms.create("authRefresh", { delayInMinutes: 55 });
}

async function silentReauth() {
  const start = await fetch(API_URL + "/auth/google/start").then((r) =>
    r.json()
  );
  const redirect = await chrome.identity.launchWebAuthFlow({
    url: start.authUrl + "&prompt=none",
    interactive: false,
  });
  const url = new URL(redirect);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const tokens = await fetch(API_URL + "/auth/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, state }),
  }).then((r) => r.json());
  await saveAuth(tokens);
  scheduleRefresh();
}

async function refreshAuth() {
  const tokens = await loadAuth();
  if (!tokens) return;
  try {
    const resp = await fetch(API_URL + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    }).then((r) => r.json());
    if (resp.jwt && resp.refresh_token) {
      await saveAuth(resp);
      scheduleRefresh();
    } else {
      throw new Error("refresh failed");
    }
  } catch (_e) {
    try {
      await silentReauth();
    } catch (err) {
      console.warn("Silent reauth failed", err);
    }
  }
}

async function logout() {
  const tokens = await loadAuth();
  if (tokens) {
    try {
      await fetch(API_URL + "/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });
    } catch {
      // ignore
    }
  }
  await chrome.storage.local.remove([AUTH_TOKEN_KEY]);
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
        const response = await fetch(API_URL + "/extract-all/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: job.description,
            title: job.title,
          }),
        });
        console.log("Response:", response);
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
  } else if (msg.type === "AUTH_LOGIN") {
    (async () => {
      try {
        await login();
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (msg.type === "AUTH_LOGOUT") {
    (async () => {
      await logout();
      sendResponse({ success: true });
    })();
    return true;
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "authRefresh") {
    refreshAuth();
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
