export interface TargetComputeInput {
  original_lang: string;
  content_fr: string | null;
  content_en: string | null;
}

export function computeTargets(row: TargetComputeInput): Array<"fr" | "en"> {
  const targets: Array<"fr" | "en"> = [];
  if (row.content_fr === null) targets.push("fr");
  if (row.content_en === null) targets.push("en");
  return targets;
}

export async function translateText(
  text: string,
  source: string,
  target: "fr" | "en",
  apiKey: string,
): Promise<string> {
  if (!text.trim()) return "";
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const body: Record<string, string> = { q: text, target, format: "text" };
  if (source !== "und") body.source = source;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Translate failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json?.data?.translations?.[0]?.translatedText ?? "";
}
