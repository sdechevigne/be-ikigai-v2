// Usage: provide env vars GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
import "dotenv/config";

const body = new URLSearchParams({
  client_id: "760910906882-1lp1ogaqiaf15pfep2a33fab4cqa9p01.apps.googleusercontent.com",
  client_secret: "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",
  refresh_token: "1//03LiA8o6y2j4iCgYIARAAGAMSNwF-L9Ir0xYkjY2Fr5PfWP8evzm9vbEYA6DA9Qm8FdW4f80gYyiCVueUwkCq6xENft7VaqTnrPA",
  grant_type: "refresh_token",
});
const { access_token } = await (await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
})).json();

const accounts = await (await fetch(
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
  { headers: { Authorization: `Bearer ${access_token}` } },
)).json();
console.log("\n=== ACCOUNTS ===\n", JSON.stringify(accounts, null, 2));

const accountName = accounts.accounts?.[0]?.name;
if (!accountName) { console.log("No account found."); process.exit(0); }

const locations = await (await fetch(
  `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
  { headers: { Authorization: `Bearer ${access_token}` } },
)).json();
console.log("\n=== LOCATIONS ===\n", JSON.stringify(locations, null, 2));
