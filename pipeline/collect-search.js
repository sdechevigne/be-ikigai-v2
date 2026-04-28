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

export async function collectSearch() {
  if (!SERPER_API_KEY) {
    process.stderr.write('Search skipped: SERPER_API_KEY not set\n');
    return [];
  }

  const items = [];
  const seen = new Set();

  for (const { query, cluster } of SEARCH_QUERIES) {
    try {
      const data = await searchSerper(query);
      for (const result of data.organic || []) {
        if (!result.link || seen.has(result.link)) continue;
        seen.add(result.link);
        items.push({
          title: result.title || '',
          url: result.link,
          source: `Search: ${query}`,
          sourceType: 'presse_specialisee', // poids 3 dans le scoring
          date: new Date().toISOString(),
          abstract: (result.snippet || '').slice(0, 500),
          _cluster: cluster, // hint pour le classifier
        });
      }
      // Respecter les limites de taux Serper
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      process.stderr.write(`Search error [${query}]: ${err.message}\n`);
    }
  }

  process.stderr.write(`Search items collectés : ${items.length}\n`);
  return items;
}
