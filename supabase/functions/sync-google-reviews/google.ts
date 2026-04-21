import type { GoogleReview, GoogleReviewsResponse } from "@shared/types.ts";

interface RefreshArgs {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function refreshAccessToken(args: RefreshArgs): Promise<string> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    refresh_token: args.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`OAuth refresh failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.access_token as string;
}

interface FetchArgs {
  accessToken: string;
  accountId: string;
  locationId: string;
}

export async function fetchAllReviews(args: FetchArgs): Promise<GoogleReview[]> {
  const all: GoogleReview[] = [];
  let pageToken: string | undefined;
  const base = `https://mybusiness.googleapis.com/v4/accounts/${args.accountId}/locations/${args.locationId}/reviews`;

  do {
    const url = new URL(base);
    url.searchParams.set("pageSize", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${args.accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Reviews fetch failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as GoogleReviewsResponse;
    if (json.reviews) all.push(...json.reviews);
    pageToken = json.nextPageToken;
  } while (pageToken);

  return all;
}
