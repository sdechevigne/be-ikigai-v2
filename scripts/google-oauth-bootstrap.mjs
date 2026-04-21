// One-shot: opens Google OAuth consent, captures the code, and prints a refresh_token.
// Usage:
//   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... node scripts/google-oauth-bootstrap.mjs
import http from "node:http";
import { URL } from "node:url";
import { exec } from "node:child_process";
import "dotenv/config";

const CLIENT_ID = "760910906882-1lp1ogaqiaf15pfep2a33fab4cqa9p01.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://localhost:3000/oauth/callback";
const SCOPE = "https://www.googleapis.com/auth/business.manage";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.");
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("Opening browser to:", authUrl.toString());

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost:3000");
  if (u.pathname !== "/oauth/callback") {
    res.writeHead(404); res.end(); return;
  }
  const code = u.searchParams.get("code");
  if (!code) {
    res.writeHead(400); res.end("missing code"); return;
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK, check your terminal.");

  console.log("\n=== TOKENS ===");
  console.log(JSON.stringify(tokens, null, 2));
  console.log("\nStore GOOGLE_OAUTH_REFRESH_TOKEN =", tokens.refresh_token);
  server.close();
});

server.listen(3000, () => {
  const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
  exec(`${cmd} "${authUrl.toString()}"`);
});
