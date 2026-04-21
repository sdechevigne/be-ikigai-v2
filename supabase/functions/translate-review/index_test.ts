import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { translateText, computeTargets } from "./translate.ts";

Deno.test("computeTargets — FR original, only EN missing", () => {
  const t = computeTargets({ original_lang: "fr", content_fr: "x", content_en: null });
  assertEquals(t, ["en"]);
});

Deno.test("computeTargets — EN original, only FR missing", () => {
  const t = computeTargets({ original_lang: "en", content_fr: null, content_en: "x" });
  assertEquals(t, ["fr"]);
});

Deno.test("computeTargets — foreign original, both missing", () => {
  const t = computeTargets({ original_lang: "es", content_fr: null, content_en: null });
  assertEquals(t.sort(), ["en", "fr"]);
});

Deno.test("computeTargets — all filled, nothing to do", () => {
  const t = computeTargets({ original_lang: "fr", content_fr: "x", content_en: "y" });
  assertEquals(t, []);
});

Deno.test("translateText — calls Cloud Translation and returns translated text", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({
      data: { translations: [{ translatedText: "Great coach." }] },
    }), { status: 200 });
  }) as typeof fetch;

  const out = await translateText("Super coach.", "fr", "en", "key");
  assertEquals(out, "Great coach.");

  globalThis.fetch = originalFetch;
});
