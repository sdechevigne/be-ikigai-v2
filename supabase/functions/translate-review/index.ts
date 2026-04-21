import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { computeTargets, translateText } from "./translate.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const env = (k: string) => {
    const v = Deno.env.get(k);
    if (!v) throw new Error(`Missing env ${k}`);
    return v;
  };

  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

  try {
    const { review_id } = await req.json();
    if (!review_id) throw new Error("review_id required");

    const { data: row, error: selErr } = await supabase
      .from("reviews")
      .select("id, content_original, content_fr, content_en, original_lang")
      .eq("id", review_id)
      .single();

    if (selErr) throw selErr;
    if (!row) throw new Error(`review ${review_id} not found`);

    const targets = computeTargets(row);
    if (targets.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = env("GOOGLE_TRANSLATE_API_KEY");
    const patch: Record<string, string> = {};
    for (const target of targets) {
      // If the target language is the same as the original, just copy the text —
      // Google Translate rejects same-language pairs with 400 "Bad language pair".
      if (row.original_lang.toLowerCase() === target) {
        patch[`content_${target}`] = row.content_original;
      } else {
        patch[`content_${target}`] = await translateText(
          row.content_original,
          row.original_lang,
          target,
          apiKey,
        );
      }
    }

    const { error: updErr } = await supabase
      .from("reviews")
      .update(patch)
      .eq("id", review_id);
    if (updErr) throw updErr;

    await supabase.from("sync_logs").insert({
      job: "translate-review",
      status: "success",
      rows_affected: 1,
    });

    return new Response(JSON.stringify({ ok: true, targets }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("sync_logs").insert({
      job: "translate-review",
      status: "error",
      error_message: message.slice(0, 2000),
    });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
