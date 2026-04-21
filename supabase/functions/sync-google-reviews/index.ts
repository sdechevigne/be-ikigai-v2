import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { refreshAccessToken, fetchAllReviews } from "./google.ts";
import { detectLanguage } from "./translate.ts";
import { mapGoogleReview } from "./mapper.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const env = (k: string) => {
    const v = Deno.env.get(k);
    if (!v) throw new Error(`Missing env ${k}`);
    return v;
  };

  const supabase = createClient(
    env("SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
  );

  try {
    const accessToken = await refreshAccessToken({
      clientId: env("GOOGLE_OAUTH_CLIENT_ID"),
      clientSecret: env("GOOGLE_OAUTH_CLIENT_SECRET"),
      refreshToken: env("GOOGLE_OAUTH_REFRESH_TOKEN"),
    });

    const reviews = await fetchAllReviews({
      accessToken,
      accountId: env("GOOGLE_BUSINESS_ACCOUNT_ID"),
      locationId: env("GOOGLE_BUSINESS_LOCATION_ID"),
    });

    const translateKey = env("GOOGLE_TRANSLATE_API_KEY");
    const placeId = env("GOOGLE_PLACE_ID");

    const rows = [];
    for (const gr of reviews) {
      const lang = await detectLanguage(gr.comment ?? "", translateKey);
      rows.push(mapGoogleReview(gr, lang, placeId));
    }

    // Fetch existing IDs so we can split inserts from updates. This matters because:
    //  (a) on INSERT we need content_fr/content_en pre-filled for the same-language column
    //      so the trigger only translates the missing side;
    //  (b) on UPDATE we must NOT touch content_fr/content_en/original_lang — otherwise every
    //      daily sync would null out one translation and re-fire Cloud Translation for nothing.
    const ids = rows.map((r) => r.id);
    const { data: existing, error: selErr } = await supabase
      .from("reviews")
      .select("id")
      .in("id", ids);
    if (selErr) throw selErr;
    const existingIds = new Set((existing ?? []).map((r) => r.id));

    const now = new Date().toISOString();
    const toInsert = rows
      .filter((r) => !existingIds.has(r.id))
      .map((r) => ({ ...r, synced_at: now }));
    const toUpdate = rows
      .filter((r) => existingIds.has(r.id))
      .map((r) => ({
        id: r.id,
        author_name: r.author_name,
        author_photo_url: r.author_photo_url,
        rating: r.rating,
        content_original: r.content_original,
        review_url: r.review_url,
        published_at: r.published_at,
        updated_at_google: r.updated_at_google,
        synced_at: now,
      }));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("reviews").insert(toInsert);
      if (insErr) throw insErr;
    }
    for (const u of toUpdate) {
      const { error: updErr } = await supabase
        .from("reviews")
        .update(u)
        .eq("id", u.id);
      if (updErr) throw updErr;
    }

    await supabase.from("sync_logs").insert({
      job: "sync-google-reviews",
      status: "success",
      rows_affected: toInsert.length + toUpdate.length,
    });

    return new Response(
      JSON.stringify({ ok: true, inserted: toInsert.length, updated: toUpdate.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("sync_logs").insert({
      job: "sync-google-reviews",
      status: "error",
      error_message: message.slice(0, 2000),
    });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
