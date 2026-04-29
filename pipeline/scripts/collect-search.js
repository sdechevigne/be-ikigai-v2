// pipeline/collect-search.js
// Sourcing sémantique via Serper (Google Search API) par cluster/angle ikigai
// Requiert SERPER_API_KEY dans l'environnement

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = 'https://google.serper.dev/search';

// Requêtes par cluster — angles éditoriaux ciblés ikigai/reconversion/sens
const SEARCH_QUERIES = [
  // Ikigai & sens
  { query: 'ikigai meaning purpose work life 2024', cluster: 'sens_ikigai' },
  { query: 'ikigai career purpose how to find', cluster: 'sens_ikigai' },
  { query: 'finding purpose work ikigai framework', cluster: 'sens_ikigai' },
  { query: 'ikigai burnout meaning lost at work', cluster: 'sens_ikigai' },
  { query: 'raison être travail sens professionnel ikigai', cluster: 'sens_ikigai' },

  // Reconversion
  { query: 'career change ikigai how to reinvent yourself', cluster: 'reconversion' },
  { query: 'career pivot meaningful work ikigai method', cluster: 'reconversion' },
  { query: 'professional transition purpose driven career', cluster: 'reconversion' },
  { query: 'reconversion professionnelle trouver sa voie ikigai', cluster: 'reconversion' },
  { query: 'changer de métier sens travail coaching', cluster: 'reconversion' },

  // Burnout
  { query: 'ikigai burnout prevention workplace stress', cluster: 'burnout' },
  { query: 'burnout recovery purpose meaning work', cluster: 'burnout' },
  { query: 'quiet quitting meaning work engagement ikigai', cluster: 'burnout' },
  { query: 'épuisement professionnel sens travail reconversion', cluster: 'burnout' },

  // Coaching & bilan
  { query: 'career coaching ikigai self assessment tool', cluster: 'coaching_bilan' },
  { query: 'bilan de compétences ikigai coaching carrière', cluster: 'coaching_bilan' },
  { query: 'life coach purpose ikigai framework exercises', cluster: 'coaching_bilan' },

  // Management & leadership
  { query: 'ikigai leadership purpose driven management', cluster: 'management' },
  { query: 'meaningful work employee engagement purpose', cluster: 'management' },
  { query: 'workplace culture ikigai sense of purpose team', cluster: 'management' },
];

// Domaines à exclure (paywalls, réseaux sociaux, agrégateurs)
const BLOCKED_DOMAINS = [
  'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
  'pinterest.com', 'youtube.com', 'reddit.com',
  'wsj.com', 'ft.com', 'bloomberg.com', // paywalls stricts
];

function isBlocked(url) {
  return BLOCKED_DOMAINS.some(d => url.includes(d));
}

async function searchSerper(query) {
  const res = await fetch(SERPER_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: 5, hl: 'en' }),
  });
  if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
  return res.json();
}

// Extrait le texte principal d'une page HTML — approche légère sans dépendance
async function fetchContent(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; be-ikigai-pipeline/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Supprimer scripts, styles, nav, footer, header
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Garder les 3000 premiers chars — suffisant pour Gemini
    return cleaned.slice(0, 3000);
  } catch {
    return null;
  }
}

export async function collectSearch() {
  if (!SERPER_API_KEY) {
    process.stderr.write('Search skipped: SERPER_API_KEY not set\n');
    return [];
  }

  const rawItems = [];
  const seen = new Set();

  // Phase 1 : collecter tous les résultats Serper
  for (const { query, cluster } of SEARCH_QUERIES) {
    try {
      const data = await searchSerper(query);
      for (const result of data.organic || []) {
        if (!result.link || seen.has(result.link)) continue;
        if (isBlocked(result.link)) continue;
        seen.add(result.link);
        rawItems.push({
          title: result.title || '',
          url: result.link,
          snippet: result.snippet || '',
          cluster,
        });
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      process.stderr.write(`Search error [${query}]: ${err.message}\n`);
    }
  }

  process.stderr.write(`Search: ${rawItems.length} URLs trouvées, fetch contenu...\n`);

  // Phase 2 : fetch contenu complet en parallèle (max 5 simultanés)
  const items = [];
  const BATCH = 5;
  for (let i = 0; i < rawItems.length; i += BATCH) {
    const batch = rawItems.slice(i, i + BATCH);
    const contents = await Promise.all(batch.map(r => fetchContent(r.url)));

    for (let j = 0; j < batch.length; j++) {
      const r = batch[j];
      const content = contents[j];
      items.push({
        title: r.title,
        url: r.url,
        source: 'Serper Search',
        sourceType: 'presse_specialisee',
        date: new Date().toISOString(),
        // abstract = contenu complet si disponible, sinon snippet
        abstract: content ? content.slice(0, 2000) : r.snippet.slice(0, 500),
        _cluster: r.cluster,
        _hasFullContent: !!content,
      });
    }

    // Pause entre batches pour ne pas surcharger les serveurs cibles
    if (i + BATCH < rawItems.length) await new Promise(r => setTimeout(r, 500));
  }

  const withContent = items.filter(i => i._hasFullContent).length;
  process.stderr.write(`Search items : ${items.length} (${withContent} avec contenu complet)\n`);
  return items;
}
