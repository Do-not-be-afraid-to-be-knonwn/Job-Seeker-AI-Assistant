console.log("Background script loaded!");

const FEEDBACK_QUEUE_KEY = "feedbackQueue";
const MAX_ATTEMPTS = 8;
const PROCESS_INTERVAL_MS = 60 * 1000;
const API_URL = "http://localhost:3000";

const AUTH_TOKEN_KEY = "authTokens";
const AUTH_SECRET_KEY = "authSecret";

// Debug function to check storage integrity
async function debugStorageIntegrity() {
  console.log('debugStorageIntegrity: Checking all storage contents...');
  
  try {
    // Get all storage items
    const allStorage = await new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve(result);
      });
    });
    
    console.log('debugStorageIntegrity: All storage keys:', Object.keys(allStorage));
    console.log('debugStorageIntegrity: Storage contents:', {
      hasAuthTokens: !!allStorage[AUTH_TOKEN_KEY],
      hasAuthSecret: !!allStorage[AUTH_SECRET_KEY],
      hasFeedbackQueue: !!allStorage[FEEDBACK_QUEUE_KEY],
      tokenStructure: allStorage[AUTH_TOKEN_KEY] ? {
        hasIv: !!allStorage[AUTH_TOKEN_KEY].iv,
        hasData: !!allStorage[AUTH_TOKEN_KEY].data,
        ivLength: allStorage[AUTH_TOKEN_KEY].iv?.length,
        dataLength: allStorage[AUTH_TOKEN_KEY].data?.length
      } : null
    });
  } catch (error) {
    console.error('debugStorageIntegrity: Error checking storage:', error);
  }
}

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
      const response = await makeAuthenticatedRequest(API_URL + "/feedback", {
        method: "POST",
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
  console.log('getCryptoKey: Getting crypto key...');
  const result = await chrome.storage.local.get([AUTH_SECRET_KEY]);
  console.log('getCryptoKey: Storage result:', { hasSecretKey: !!result[AUTH_SECRET_KEY] });
  
  let raw = result[AUTH_SECRET_KEY];
  if (!raw) {
    console.log('getCryptoKey: No existing secret key, generating new one...');
    raw = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    await chrome.storage.local.set({ [AUTH_SECRET_KEY]: raw });
    console.log('getCryptoKey: Generated and stored new secret key');
  } else {
    console.log('getCryptoKey: Using existing secret key');
  }
  
  console.log('getCryptoKey: Importing crypto key...');
  const key = await crypto.subtle.importKey("raw", new Uint8Array(raw), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  console.log('getCryptoKey: Crypto key imported successfully');
  return key;
}

async function encryptString(str) {
  console.log('encryptString: Starting encryption...', { stringLength: str.length });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getCryptoKey();
  const encoded = new TextEncoder().encode(str);
  console.log('encryptString: Encoded string, performing encryption...');
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const result = { iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) };
  console.log('encryptString: Encryption completed successfully');
  return result;
}

async function decryptString(obj) {
  if (!obj) {
    console.log('decryptString: No object to decrypt');
    return null;
  }
  console.log('decryptString: Starting decryption...', { hasIv: !!obj.iv, hasData: !!obj.data });
  const key = await getCryptoKey();
  const iv = new Uint8Array(obj.iv);
  const data = new Uint8Array(obj.data);
  console.log('decryptString: Performing decryption...');
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  const result = new TextDecoder().decode(decrypted);
  console.log('decryptString: Decryption completed successfully', { resultLength: result.length });
  return result;
}

async function saveAuth(tokens) {
  try {
    console.log('saveAuth: Saving auth tokens:', { 
      hasJwt: !!tokens.jwt, 
      hasRefreshToken: !!tokens.refresh_token,
      jwtLength: tokens.jwt?.length 
    });
    const enc = await encryptString(JSON.stringify(tokens));
    console.log('saveAuth: Encrypted token, saving to storage...');
    await chrome.storage.local.set({ [AUTH_TOKEN_KEY]: enc });
    console.log('saveAuth: Successfully saved tokens to storage');
  } catch (error) {
    console.error('saveAuth: Error saving auth tokens:', error);
    throw error;
  }
}

async function loadAuth() {
  try {
    console.log('loadAuth: Loading auth tokens...');
    const result = await chrome.storage.local.get([AUTH_TOKEN_KEY]);
    console.log('loadAuth: Storage result:', result);
    
    if (!result[AUTH_TOKEN_KEY]) {
      console.log('loadAuth: No auth token found in storage');
      return null;
    }
    
    console.log('loadAuth: Encrypted token found, decrypting...');
    const str = await decryptString(result[AUTH_TOKEN_KEY]);
    const tokens = JSON.parse(str);
    console.log('loadAuth: Successfully loaded tokens:', { 
      hasJwt: !!tokens.jwt, 
      hasRefreshToken: !!tokens.refresh_token,
      jwtLength: tokens.jwt?.length 
    });
    return tokens;
  } catch (error) {
    console.error('loadAuth: Error loading auth tokens:', error);
    return null;
  }
}

// Helper function to check if user is authenticated
async function isAuthenticated() {
  try {
    console.log('isAuthenticated: Checking authentication status...');
    
    // Debug storage integrity first
    await debugStorageIntegrity();
    
    const tokens = await loadAuth();
    const authenticated = tokens && tokens.jwt;
    console.log('isAuthenticated: Result:', authenticated);
    return authenticated;
  } catch (error) {
    console.error('isAuthenticated: Error checking auth:', error);
    return false;
  }
}

// Helper function to make authenticated API requests with automatic token refresh
async function makeAuthenticatedRequest(url, options = {}) {
  console.log('makeAuthenticatedRequest: Starting authenticated request to:', url);
  
  let tokens = await loadAuth();
  console.log('makeAuthenticatedRequest: Initial token load result:', { 
    hasTokens: !!tokens, 
    hasJwt: !!tokens?.jwt, 
    jwtLength: tokens?.jwt?.length 
  });
  
  if (!tokens || !tokens.jwt) {
    console.error('makeAuthenticatedRequest: No valid tokens found');
    throw new Error('Authentication required. Please sign in first.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    Authorization: `Bearer ${tokens.jwt}`
  };
  console.log('makeAuthenticatedRequest: Prepared headers with Authorization bearer token');

  try {
    console.log('makeAuthenticatedRequest: Making initial request...');
    const response = await fetch(url, {
      ...options,
      headers
    });
    console.log('makeAuthenticatedRequest: Initial response status:', response.status);

    // If token is expired (401), try to refresh and retry once
    if (response.status === 401) {
      console.log('makeAuthenticatedRequest: Token expired (401), attempting refresh...');
      await refreshAuth();
      
      // Get refreshed tokens
      console.log('makeAuthenticatedRequest: Loading refreshed tokens...');
      tokens = await loadAuth();
      console.log('makeAuthenticatedRequest: Refreshed token load result:', { 
        hasTokens: !!tokens, 
        hasJwt: !!tokens?.jwt,
        jwtLength: tokens?.jwt?.length
      });
      
      if (tokens && tokens.jwt) {
        headers.Authorization = `Bearer ${tokens.jwt}`;
        console.log('makeAuthenticatedRequest: Retrying request with refreshed token...');
        return await fetch(url, {
          ...options,
          headers
        });
      } else {
        console.error('makeAuthenticatedRequest: Failed to get refreshed tokens');
        throw new Error('Authentication expired. Please sign in again.');
      }
    }

    console.log('makeAuthenticatedRequest: Request completed successfully');
    return response;
  } catch (error) {
    console.error('makeAuthenticatedRequest: Request failed:', error);
    throw error;
  }
}

async function login() {
  try {
    console.log('login: Starting login process...');
    
    // Send Chrome's redirect URL to server - this is the critical fix
    const redirectUri = chrome.identity.getRedirectURL();
    console.log("login: Chrome redirect URI:", redirectUri);

    console.log('login: Fetching auth start URL...');
    const start = await fetch(API_URL + "/auth/google/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirectUri }),
    }).then((r) => r.json());
    console.log('login: Auth start response:', start);

    console.log('login: Launching web auth flow...');
    const redirect = await chrome.identity.launchWebAuthFlow({
      url: start.authUrl,
      interactive: true,
    });
    console.log("login: Auth flow redirect:", redirect);

    const url = new URL(redirect);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    console.log('login: Extracted code and state:', { hasCode: !!code, hasState: !!state, codeLength: code?.length });

    console.log('login: Exchanging code for tokens...');
    const tokens = await fetch(API_URL + "/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state, redirectUri }),
    }).then((r) => r.json());
    console.log('login: Token exchange response:', { 
      hasJwt: !!tokens.jwt, 
      hasRefreshToken: !!tokens.refresh_token,
      jwtLength: tokens.jwt?.length,
      refreshTokenLength: tokens.refresh_token?.length
    });

    console.log('login: Calling saveAuth...');
    await saveAuth(tokens);
    console.log('login: saveAuth completed');

    console.log('login: Scheduling refresh...');
    scheduleRefresh();
    console.log('login: Login process completed successfully');

    // Verify tokens were actually saved
    console.log('login: Verifying saved tokens...');
    await debugStorageIntegrity(); // Check storage after save
    const verifyTokens = await loadAuth();
    console.log('login: Verification result:', { 
      hasJwt: !!verifyTokens?.jwt, 
      hasRefreshToken: !!verifyTokens?.refresh_token,
      tokensMatch: verifyTokens?.jwt === tokens.jwt
    });
  } catch (error) {
    console.error('login: Login process failed:', error);
    throw error;
  }
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
      body: JSON.stringify({ refreshtoken: tokens.refresh_token }),
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
      
      console.log("INDEED_JOB_DETAIL: Checking authentication status...");
      // Check if user is authenticated
      const authenticated = await isAuthenticated();
      console.log("INDEED_JOB_DETAIL: Authentication check result:", authenticated);
      
      if (!authenticated) {
        console.log("INDEED_JOB_DETAIL: User not authenticated, sending auth required response");
        sendResponse({ 
          success: false, 
          error: "Authentication required. Please sign in first.",
          requiresAuth: true 
        });
        return;
      }

      console.log("INDEED_JOB_DETAIL: User authenticated, proceeding with extraction request");
      try {
        const response = await makeAuthenticatedRequest(API_URL + "/extract-all", {
          method: "POST",
          body: JSON.stringify({
            description: job.description,
            title: job.title,
          }),
        });
        console.log("INDEED_JOB_DETAIL: API response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("INDEED_JOB_DETAIL: Extraction result:", data);
        sendResponse({ success: true, extraction: data });
      } catch (error) {
        console.error("INDEED_JOB_DETAIL: Request failed:", error);
        const isAuthError = error.message.includes('Authentication');
        sendResponse({ 
          success: false, 
          error: error.message,
          requiresAuth: isAuthError
        });
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
        console.error('Login failed:', e);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (msg.type === "AUTH_LOGOUT") {
    (async () => {
      try {
        await logout();
        sendResponse({ success: true });
      } catch (e) {
        console.error('Logout failed:', e);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (msg.type === "CHECK_AUTH_STATUS") {
    (async () => {
      try {
        const authenticated = await isAuthenticated();
        sendResponse({ isAuthenticated: authenticated });
      } catch (e) {
        console.error('Auth status check failed:', e);
        sendResponse({ isAuthenticated: false });
      }
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
