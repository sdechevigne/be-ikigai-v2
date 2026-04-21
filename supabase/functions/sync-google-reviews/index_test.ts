import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapGoogleReview } from "./mapper.ts";
import { refreshAccessToken, fetchAllReviews } from "./google.ts";
import { detectLanguage } from "./translate.ts";
import type { GoogleReview } from "@shared/types.ts";

Deno.test("mapGoogleReview — FR original fills content_fr and content_original", () => {
  const gr: GoogleReview = {
    name: "accounts/1/locations/2/reviews/abc",
    reviewer: { displayName: "Alice", profilePhotoUrl: "https://img/a.jpg" },
    starRating: "FIVE",
    comment: "Super expérience !",
    createTime: "2026-03-01T10:00:00Z",
    updateTime: "2026-03-02T10:00:00Z",
  };

  const row = mapGoogleReview(gr, "fr", "PLACE123");

  assertEquals(row.id, "accounts/1/locations/2/reviews/abc");
  assertEquals(row.author_name, "Alice");
  assertEquals(row.author_photo_url, "https://img/a.jpg");
  assertEquals(row.rating, 5);
  assertEquals(row.content_original, "Super expérience !");
  assertEquals(row.content_fr, "Super expérience !");
  assertEquals(row.content_en, null);
  assertEquals(row.original_lang, "fr");
  assertEquals(row.review_url, "https://search.google.com/local/reviews?placeid=PLACE123");
  assertEquals(row.published_at, "2026-03-01T10:00:00Z");
  assertEquals(row.updated_at_google, "2026-03-02T10:00:00Z");
});

Deno.test("mapGoogleReview — EN original fills content_en", () => {
  const gr: GoogleReview = {
    name: "accounts/1/locations/2/reviews/xyz",
    reviewer: { displayName: "Bob" },
    starRating: "FOUR",
    comment: "Great coach.",
    createTime: "2026-03-10T10:00:00Z",
  };
  const row = mapGoogleReview(gr, "en", "PLACE123");
  assertEquals(row.content_fr, null);
  assertEquals(row.content_en, "Great coach.");
  assertEquals(row.original_lang, "en");
  assertEquals(row.author_photo_url, null);
  assertEquals(row.updated_at_google, null);
});

Deno.test("mapGoogleReview — non-FR/EN original leaves both translations null", () => {
  const gr: GoogleReview = {
    name: "accounts/1/locations/2/reviews/esp",
    reviewer: { displayName: "Carlos" },
    starRating: "FIVE",
    comment: "Muy buen coach.",
    createTime: "2026-03-15T10:00:00Z",
  };
  const row = mapGoogleReview(gr, "es", "PLACE123");
  assertEquals(row.content_fr, null);
  assertEquals(row.content_en, null);
  assertEquals(row.content_original, "Muy buen coach.");
  assertEquals(row.original_lang, "es");
});

Deno.test("mapGoogleReview — empty comment defaults to empty string", () => {
  const gr: GoogleReview = {
    name: "accounts/1/locations/2/reviews/empty",
    reviewer: { displayName: "D" },
    starRating: "FIVE",
    createTime: "2026-03-15T10:00:00Z",
  };
  const row = mapGoogleReview(gr, "fr", "PLACE123");
  assertEquals(row.content_original, "");
  assertEquals(row.content_fr, "");
});

Deno.test("refreshAccessToken — posts correct form body and returns access_token", async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody = "";
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    capturedBody = init?.body as string;
    return new Response(JSON.stringify({ access_token: "at_xyz", expires_in: 3600 }), { status: 200 });
  }) as typeof fetch;

  const token = await refreshAccessToken({
    clientId: "cid",
    clientSecret: "csec",
    refreshToken: "rt",
  });

  assertEquals(token, "at_xyz");
  const params = new URLSearchParams(capturedBody);
  assertEquals(params.get("client_id"), "cid");
  assertEquals(params.get("client_secret"), "csec");
  assertEquals(params.get("refresh_token"), "rt");
  assertEquals(params.get("grant_type"), "refresh_token");

  globalThis.fetch = originalFetch;
});

Deno.test("fetchAllReviews — paginates until nextPageToken absent", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    if (urls.length === 1) {
      return new Response(JSON.stringify({
        reviews: [{ name: "r1", reviewer: { displayName: "A" }, starRating: "FIVE", comment: "ok", createTime: "2026-01-01T00:00:00Z" }],
        nextPageToken: "tok2",
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      reviews: [{ name: "r2", reviewer: { displayName: "B" }, starRating: "FOUR", comment: "nice", createTime: "2026-01-02T00:00:00Z" }],
    }), { status: 200 });
  }) as typeof fetch;

  const reviews = await fetchAllReviews({
    accessToken: "at",
    accountId: "1",
    locationId: "2",
  });

  assertEquals(reviews.length, 2);
  assertEquals(urls.length, 2);
  assertEquals(urls[1].includes("pageToken=tok2"), true);

  globalThis.fetch = originalFetch;
});

Deno.test("detectLanguage — returns ISO code from Cloud Translation", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    if (!url.includes("detect")) throw new Error("wrong url");
    return new Response(JSON.stringify({
      data: { detections: [[{ language: "fr", confidence: 0.99 }]] },
    }), { status: 200 });
  }) as typeof fetch;

  const lang = await detectLanguage("Super expérience", "key_abc");
  assertEquals(lang, "fr");

  globalThis.fetch = originalFetch;
});

Deno.test("detectLanguage — returns 'und' for empty text", async () => {
  const lang = await detectLanguage("", "key_abc");
  assertEquals(lang, "und");
});
