import express from "express";
import crypto from "crypto";
import fetch from "node-fetch";

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";

// Store code_verifier by state during PKCE flow
const pkceStore = new Map<string, string>();
// Store Google tokens by app refresh token
interface SessionTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  id_token?: string;
}
const sessions = new Map<string, SessionTokens>();

// Generate ephemeral RSA key pair for JWT signing
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = publicKey.export({ format: "jwk" }) as any;
jwk.kid = crypto.randomUUID();

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(sub: string | undefined, scope: string) {
  const header = { alg: "RS256", typ: "JWT", kid: jwk.kid };
  const payload = {
    aud: "extension",
    sub,
    scope,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    jti: crypto.randomUUID(),
  };
  const segments = [
    base64url(JSON.stringify(header)),
    base64url(JSON.stringify(payload)),
  ];
  const signingInput = segments.join(".");
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(privateKey);
  segments.push(base64url(signature));
  return segments.join(".");
}

router.post("/google/start", (req, res) => {
  const { redirectUri } = req.body;

  // Use Chrome's dynamic redirect URI instead of hardcoded one
  const actualRedirectUri = redirectUri || REDIRECT_URI;
  console.log("Using redirect URI:", actualRedirectUri);

  const state = crypto.randomUUID();
  const codeVerifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  pkceStore.set(state, codeVerifier);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set(
    "client_id",
    "114029742286-q8o712v5ipsnbub88p60vpb9vo5n93r2.apps.googleusercontent.com"
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", actualRedirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  res.json({ authUrl: url.toString() });
});

router.post("/exchange", async (req, res) => {
  const { code, state, redirectUri } = req.body;
  const codeVerifier = pkceStore.get(state);
  pkceStore.delete(state);
  if (!codeVerifier) {
    return res.status(400).json({ error: "invalid_state" });
  }

  // Use the same redirect URI that was used in the auth request
  const actualRedirectUri = redirectUri || REDIRECT_URI;

  const params = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: actualRedirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const tokens = (await tokenRes.json()) as any;
  if (!tokenRes.ok) {
    return res.status(400).json(tokens);
  }

  const refreshToken = crypto.randomUUID();
  sessions.set(refreshToken, tokens as SessionTokens);
  const idPayload = tokens.id_token
    ? JSON.parse(
        Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
      )
    : {};
  const jwt = signJwt(idPayload.sub, tokens.scope);
  res.json({ jwt, refresh_token: refreshToken });
});

router.post("/refresh", async (req, res) => {
  const { refreshtoken } = req.body;
  const session = sessions.get(refreshtoken as string);
  if (!session) {
    return res.status(401).json({ error: "invalid_refresh" });
  }
  sessions.delete(refreshtoken as string);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: session.refresh_token,
    grant_type: "refresh_token",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const updated = (await tokenRes.json()) as any;
  if (tokenRes.ok) {
    session.access_token = updated.access_token;
    session.refresh_token = updated.refresh_token || session.refresh_token;
    session.scope = updated.scope || session.scope;
  }

  const newRefresh = crypto.randomUUID();
  sessions.set(newRefresh, session);
  const idPayload = session.id_token
    ? JSON.parse(
        Buffer.from(session.id_token.split(".")[1], "base64").toString()
      )
    : {};
  const jwt = signJwt(idPayload.sub, session.scope);
  res.json({ jwt, refresh_token: newRefresh });
});

router.post("/logout", async (req, res) => {
  const { refresh_token } = req.body;
  const session = sessions.get(refresh_token as string);
  if (session) {
    sessions.delete(refresh_token as string);
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: session.refresh_token }).toString(),
      });
    } catch {
      // ignore errors
    }
  }
  res.json({ success: true });
});

router.get("/jwks.json", (_req, res) => {
  res.json({ keys: [jwk] });
});

export default router;
