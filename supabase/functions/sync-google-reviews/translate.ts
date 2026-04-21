export async function detectLanguage(text: string, apiKey: string): Promise<string> {
  if (!text.trim()) return "und";

  const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text }),
  });

  if (!res.ok) {
    throw new Error(`Language detect failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const lang = json?.data?.detections?.[0]?.[0]?.language;
  return typeof lang === "string" ? lang : "und";
}
