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

    const langCache = new Map<string, string>();
    const rows = [];
    for (const gr of reviews) {
      const text = gr.comment ?? "";
      let lang = langCache.get(text);
      if (!lang) {
        lang = await detectLanguage(text, translateKey);
        langCache.set(text, lang);
      }
      rows.push(mapGoogleReview(gr, lang, placeId));
    }

    const { error, count } = await supabase
      .from("reviews")
      .upsert(rows.map((r) => ({ ...r, synced_at: new Date().toISOString() })), {
        onConflict: "id",
        ignoreDuplicates: false,
      })
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    await supabase.from("sync_logs").insert({
      job: "sync-google-reviews",
      status: "success",
      rows_affected: count ?? rows.length,
    });

    return new Response(JSON.stringify({ ok: true, rows: rows.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("sync_logs").insert({
      job: "sync-google-reviews",
      status: "error",
      error_message: message.slice(0, 2000),
    });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
