# Blog Pipeline be-ikigai — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place un pipeline de publication blog automatisé (découverte de sujets → rédaction Gemini 3 phases → images → GitHub Projects V2 → GitHub Actions toutes les 48h), calqué sur le pipeline MesChasses, adapté au domaine coaching/ikigai de be-ikigai.

**Architecture:** Node.js (collect/classify/project/index) + Bash (draft.sh, generate-cover.sh) + prompts Markdown (3 phases) + GitHub Actions (scan lundi, draft toutes les 48h, publish manuel). LLM par défaut : Gemini. Suivi éditorial dans GitHub Projects V2. Articles bilingues FR + EN par run.

**Tech Stack:** Node.js 22, google-trends-api, rss-parser, Gemini CLI (`@google/gemini-cli`), GitHub CLI (`gh`), ImageMagick, GitHub Actions, Astro 6.

---

## Fichiers créés / modifiés

| Chemin | Action | Rôle |
|--------|--------|------|
| `pipeline/config.js` | Créer | Clusters coaching, sources RSS, keywords Google Trends, config GitHub Projects |
| `pipeline/collect.js` | Créer | Collecte RSS + Google Trends (adapté de MesChasses) |
| `pipeline/classify.js` | Créer | Classification et scoring par cluster (adapté de MesChasses) |
| `pipeline/project.js` | Créer | GitHub Projects V2 GraphQL (adapté de MesChasses) |
| `pipeline/index.js` | Créer | Orchestrateur CLI --pick / --dry-run (adapté de MesChasses) |
| `pipeline/draft.sh` | Créer | Orchestration 3 phases LLM + image + git (adapté de MesChasses, LLM=gemini) |
| `pipeline/generate-cover.sh` | Créer | Génération images Gemini (copie MesChasses, prompt coaching) |
| `pipeline/skills-prompt.md` | Créer | Standards éditoriaux be-ikigai (voix Pierre-Louis, anti-IA, SEO) |
| `pipeline/mcp.json` | Créer | Config MCP context7 + nano-banana |
| `pipeline/prompts/1-research.md` | Créer | Prompt phase recherche |
| `pipeline/prompts/2-draft.md` | Créer | Prompt phase rédaction bilingue FR+EN |
| `pipeline/prompts/3-humanize.md` | Créer | Prompt phase humanisation |
| `pipeline/package.json` | Créer | Dépendances Node.js |
| `.github/workflows/blog-trend-scan.yml` | Créer | Cron lundi 07h00 UTC |
| `.github/workflows/blog-draft.yml` | Créer | Cron toutes les 48h 08h00 UTC |
| `.github/workflows/blog-publish.yml` | Créer | workflow_dispatch publication manuelle |
| `.claude/commands/blog/draft.md` | Créer | Commande /blog:draft |
| `.claude/commands/blog/status.md` | Créer | Commande /blog:status |
| `.claude/commands/blog/publish.md` | Créer | Commande /blog:publish |
| `.claude/commands/blog/regen-cover.md` | Créer | Commande /blog:regen-cover |
| `.claude/references/PIPELINE.md` | Créer | Référence technique pipeline |
| `.claude/references/BLOG.md` | Créer | Référence blog Astro be-ikigai |

---

## Task 1 : Structure de dossiers + package.json

**Files:**
- Create: `pipeline/package.json`
- Create: `pipeline/.gitignore`

- [ ] **Step 1 : Créer le dossier pipeline et ses sous-dossiers**

```bash
mkdir -p pipeline/prompts pipeline/.logs
```

- [ ] **Step 2 : Créer `pipeline/package.json`**

```json
{
  "name": "beikigai-blog-pipeline",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "scan": "node index.js",
    "scan:dry": "node index.js --dry-run",
    "scan:pick": "node index.js --pick"
  },
  "dependencies": {
    "google-trends-api": "^4.9.2",
    "rss-parser": "^3.13.0"
  }
}
```

- [ ] **Step 3 : Créer `pipeline/.gitignore`**

```
.logs/
.research-notes.md
.card-body.md
.topic-json.tmp
node_modules/
```

- [ ] **Step 4 : Installer les dépendances**

```bash
cd pipeline && npm install
```

Résultat attendu : `node_modules/` créé, pas d'erreur.

- [ ] **Step 5 : Commit**

```bash
git add pipeline/package.json pipeline/package-lock.json pipeline/.gitignore
git commit -m "feat(pipeline): scaffold pipeline directory"
```

---

## Task 2 : config.js — clusters coaching + sources RSS + GitHub Projects

**Files:**
- Create: `pipeline/config.js`

- [ ] **Step 1 : Créer `pipeline/config.js`**

```js
// pipeline/config.js
export const WEIGHTS = {
  presse_nationale: 4,   // Le Monde, Les Echos
  presse_specialisee: 3, // Capital, Management, HBR France
  blogs_autorite: 2,     // Psychologies, Welcome to the Jungle
  google_trends: 2,
  rising_queries: 3,
  forum: 1,
  commentaires: 0.5,
};

export const SCORE_THRESHOLD = 5;
export const LOOKBACK_DAYS = 14;

export const CLUSTERS = {
  reconversion: {
    label: 'Reconversion',
    keywords: ['reconversion', 'changer de métier', 'démissionner', 'pivot', 'changer de voie', 'changer de carrière', 'nouvelle carrière'],
    contentTypes: ['guide-pratique', 'temoignage'],
  },
  sens_ikigai: {
    label: 'Sens & Ikigai',
    keywords: ['ikigai', 'sens au travail', 'mission', 'vocation', 'purpose', 'raison d\'être', 'sens professionnel', 'épanouissement'],
    contentTypes: ['conseil-ikigai', 'analyse-tendance'],
  },
  burnout: {
    label: 'Burn-out & Épuisement',
    keywords: ['burn-out', 'burnout', 'épuisement', 'fatigue', 'démission silencieuse', 'quiet quitting', 'bore-out', 'brown-out', 'souffrance au travail'],
    contentTypes: ['actualite', 'guide-pratique'],
  },
  coaching_bilan: {
    label: 'Coaching & Bilan',
    keywords: ['bilan de compétences', 'cpf', 'coaching', 'accompagnement', 'diagnostic de carrière', 'coach professionnel'],
    contentTypes: ['comparatif', 'guide-pratique'],
  },
  management: {
    label: 'Management & Leadership',
    keywords: ['management', 'leadership', 'culture d\'entreprise', 'manager toxique', 'équipe', 'télétravail', 'travail hybride'],
    contentTypes: ['analyse-tendance', 'guide-pratique'],
  },
};

export const CONTENT_TYPES = [
  'guide-pratique',
  'conseil-ikigai',
  'analyse-tendance',
  'comparatif',
  'temoignage',
  'actualite',
];

export const RSS_SOURCES = [
  // Presse nationale
  { url: 'https://www.lemonde.fr/emploi/rss_full.xml', type: 'presse_nationale', label: 'Le Monde Emploi' },
  { url: 'https://www.lefigaro.fr/emploi/rss.xml', type: 'presse_nationale', label: 'Figaro Emploi' },
  // Presse spécialisée RH
  { url: 'https://www.capital.fr/rss.xml', type: 'presse_specialisee', label: 'Capital' },
  { url: 'https://www.management.fr/rss.xml', type: 'presse_specialisee', label: 'Management' },
  { url: 'https://www.hbrfrance.fr/rss.xml', type: 'presse_specialisee', label: 'HBR France' },
  { url: 'https://www.courriercadres.com/feed/', type: 'presse_specialisee', label: 'Courrier Cadres' },
  { url: 'https://www.parlonsrh.com/feed/', type: 'presse_specialisee', label: 'Parlons RH' },
  // Blogs d'autorité
  { url: 'https://www.psychologies.com/rss.xml', type: 'blogs_autorite', label: 'Psychologies' },
  { url: 'https://www.welcometothejungle.com/fr/articles/rss', type: 'blogs_autorite', label: 'Welcome to the Jungle' },
  { url: 'https://www.maddyness.com/rss.xml', type: 'blogs_autorite', label: 'Maddyness' },
  { url: 'https://www.cadremploi.fr/editorial/rss', type: 'blogs_autorite', label: 'Cadremploi Mag' },
  { url: 'https://www.e-rh.org/rss', type: 'blogs_autorite', label: 'e-rh.org' },
  { url: 'https://www.hellowork.com/fr-fr/medias/rss', type: 'blogs_autorite', label: 'Hellowork Mag' },
];

// Filtre pour les feeds généralistes : on ne garde que les articles RH/coaching
export const COACHING_KEYWORDS = [
  'emploi', 'travail', 'carrière', 'reconversion', 'ikigai', 'burn-out', 'burnout',
  'management', 'leadership', 'coaching', 'bilan de compétences', 'cpf',
  'sens au travail', 'télétravail', 'démission', 'recrutement', 'salaire',
];

// Mots-clés Google Trends en 4 batches de 5
export const TRENDS_KEYWORDS = [
  ['ikigai', 'sens au travail', 'reconversion professionnelle', 'burn-out', 'malaise au travail'],
  ['bilan de compétences', 'cpf reconversion', 'coaching de carrière', 'ikigai exercice', 'quête de sens'],
  ['travail hybride', 'fatigue managériale', 'démission silencieuse', 'quiet quitting', 'souffrance au travail'],
  ['changer de métier', 'carrière épanouissante', 'trouver sa voie', 'ikigai au travail', 'méthode ikigai'],
];

// Configuration GitHub Projects V2 — à remplir avec les vraies valeurs après création du projet
export const PROJECT_CONFIG = {
  projectId: process.env.PROJECT_ID || '',
  fields: {
    status: {
      id: process.env.PROJECT_FIELD_STATUS_ID || '',
      options: {
        detected: process.env.PROJECT_STATUS_DETECTED || '',
        researched: process.env.PROJECT_STATUS_RESEARCHED || '',
        drafting: process.env.PROJECT_STATUS_DRAFTING || '',
        published: process.env.PROJECT_STATUS_PUBLISHED || '',
      },
    },
    trendScore: { id: process.env.PROJECT_FIELD_SCORE_ID || '' },
    cluster: { id: process.env.PROJECT_FIELD_CLUSTER_ID || '' },
    contentType: { id: process.env.PROJECT_FIELD_CONTENT_TYPE_ID || '' },
    articlePath: { id: process.env.PROJECT_FIELD_ARTICLE_PATH_ID || '' },
  },
};
```

- [ ] **Step 2 : Vérifier que le module s'importe sans erreur**

```bash
cd pipeline && node -e "import('./config.js').then(m => console.log('clusters:', Object.keys(m.CLUSTERS)))"
```

Résultat attendu :
```
clusters: [ 'reconversion', 'sens_ikigai', 'burnout', 'coaching_bilan', 'management' ]
```

- [ ] **Step 3 : Commit**

```bash
git add pipeline/config.js
git commit -m "feat(pipeline): add config (clusters, RSS sources, Trends keywords)"
```

---

## Task 3 : collect.js — RSS + Google Trends

**Files:**
- Create: `pipeline/collect.js`

- [ ] **Step 1 : Créer `pipeline/collect.js`** (adapté de MesChasses — même structure, sources différentes)

```js
// pipeline/collect.js
import Parser from 'rss-parser';
import googleTrends from 'google-trends-api';
import { RSS_SOURCES, COACHING_KEYWORDS, TRENDS_KEYWORDS, LOOKBACK_DAYS } from './config.js';

const parser = new Parser({ timeout: 10000 });

function isRecent(dateStr) {
  if (!dateStr) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  return new Date(dateStr) >= cutoff;
}

function matchesCoachingKeywords(text) {
  const lower = text.toLowerCase();
  return COACHING_KEYWORDS.some(kw => lower.includes(kw));
}

export async function collectRSS() {
  const items = [];
  const seen = new Set();

  for (const source of RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items || []) {
        if (!item.link || seen.has(item.link)) continue;
        if (!isRecent(item.pubDate || item.isoDate)) continue;

        const text = `${item.title || ''} ${item.contentSnippet || ''}`;
        // Filtre keyword pour les sources généralistes
        if (source.type === 'presse_nationale' && !matchesCoachingKeywords(text)) continue;

        seen.add(item.link);
        items.push({
          title: item.title || '',
          url: item.link,
          source: source.label,
          sourceType: source.type,
          date: item.pubDate || item.isoDate || '',
          abstract: text.slice(0, 500),
        });
      }
    } catch (err) {
      process.stderr.write(`RSS error [${source.label}]: ${err.message}\n`);
    }
  }

  return items;
}

export async function collectGoogleTrends() {
  const trendScores = {};
  const risingQueries = [];

  for (const batch of TRENDS_KEYWORDS) {
    try {
      const res = await googleTrends.interestOverTime({ keyword: batch, geo: 'FR' });
      const data = JSON.parse(res);
      const timelineData = data?.default?.timelineData || [];

      for (const point of timelineData) {
        for (let i = 0; i < batch.length; i++) {
          const kw = batch[i];
          const val = point.value?.[i] ?? 0;
          trendScores[kw] = Math.max(trendScores[kw] || 0, val);
        }
      }

      // Rising queries
      const relatedRes = await googleTrends.relatedQueries({ keyword: batch[0], geo: 'FR' });
      const relatedData = JSON.parse(relatedRes);
      const rising = relatedData?.default?.rankedList?.[1]?.rankedKeyword || [];
      risingQueries.push(...rising.map(r => r.query?.toLowerCase() || ''));
    } catch (err) {
      process.stderr.write(`Trends error [${batch[0]}]: ${err.message}\n`);
    }

    // Rate limiting Google Trends
    await new Promise(r => setTimeout(r, 1500));
  }

  return { trendScores, risingQueries };
}

export async function collectAll() {
  const [items, { trendScores, risingQueries }] = await Promise.all([
    collectRSS(),
    collectGoogleTrends(),
  ]);
  return { items, trendScores, risingQueries };
}
```

- [ ] **Step 2 : Tester la collecte RSS (dry run, sans GitHub)**

```bash
cd pipeline && node -e "
import('./collect.js').then(async m => {
  const { items } = await m.collectAll();
  console.log('Items collectés:', items.length);
  if (items[0]) console.log('Premier item:', items[0].title, '|', items[0].source);
})"
```

Résultat attendu : au moins quelques items collectés, pas d'erreur fatale (les erreurs RSS individuelles sont normales si un feed est down).

- [ ] **Step 3 : Commit**

```bash
git add pipeline/collect.js
git commit -m "feat(pipeline): add RSS + Google Trends collector"
```

---

## Task 4 : classify.js — scoring par cluster

**Files:**
- Create: `pipeline/classify.js`

- [ ] **Step 1 : Créer `pipeline/classify.js`** (adapté de MesChasses)

```js
// pipeline/classify.js
import { CLUSTERS, CONTENT_TYPES, WEIGHTS, SCORE_THRESHOLD } from './config.js';

export function classifyItem(item) {
  const text = `${item.title} ${item.abstract}`.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const [key, cluster] of Object.entries(CLUSTERS)) {
    const matches = cluster.keywords.filter(kw => text.includes(kw)).length;
    if (matches > bestScore) {
      bestScore = matches;
      best = key;
    }
  }

  return best;
}

export function suggestContentType(clusterKey, item) {
  const cluster = CLUSTERS[clusterKey];
  if (!cluster) return 'guide-pratique';

  const text = `${item.title} ${item.abstract}`.toLowerCase();

  if (text.includes('comparatif') || text.includes('versus') || text.includes(' vs ')) return 'comparatif';
  if (text.includes('témoignage') || text.includes('histoire') || text.includes('parcours')) return 'temoignage';
  if (text.includes('actualité') || text.includes('réforme') || text.includes('loi ')) return 'actualite';

  return cluster.contentTypes[0] || 'guide-pratique';
}

export function getTrendScore(clusterKey, trendScores) {
  const cluster = CLUSTERS[clusterKey];
  if (!cluster) return 0;

  const scores = cluster.keywords
    .map(kw => trendScores[kw] || 0)
    .filter(s => s > 0);

  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

export function getRisingScore(clusterKey, risingQueries) {
  const cluster = CLUSTERS[clusterKey];
  if (!cluster) return 0;

  return cluster.keywords.filter(kw =>
    risingQueries.some(rq => rq.includes(kw))
  ).length;
}

export function classifyAndScore(items, trendScores, risingQueries) {
  const groups = {};

  for (const item of items) {
    const clusterKey = classifyItem(item);
    if (!clusterKey) continue;

    if (!groups[clusterKey]) {
      groups[clusterKey] = { items: [], sourceTypes: new Set() };
    }
    groups[clusterKey].items.push(item);
    groups[clusterKey].sourceTypes.add(item.sourceType);
  }

  const results = [];

  for (const [clusterKey, group] of Object.entries(groups)) {
    let score = 0;

    for (const type of group.sourceTypes) {
      score += (WEIGHTS[type] || 1) * group.items.filter(i => i.sourceType === type).length;
    }

    const trendVal = getTrendScore(clusterKey, trendScores);
    const risingVal = getRisingScore(clusterKey, risingQueries);
    score += trendVal * WEIGHTS.google_trends;
    score += risingVal * WEIGHTS.rising_queries;

    if (score < SCORE_THRESHOLD) continue;

    const representativeItem = group.items.sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    )[0];

    results.push({
      clusterKey,
      cluster: CLUSTERS[clusterKey],
      score: Math.round(score * 10) / 10,
      itemCount: group.items.length,
      contentType: suggestContentType(clusterKey, representativeItem),
      topItems: group.items.slice(0, 5),
      trendScore: Math.round(trendVal),
      risingMatches: risingVal,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 2 : Tester classify avec des données simulées**

```bash
cd pipeline && node -e "
import('./classify.js').then(m => {
  const fakeItems = [
    { title: 'Reconversion : comment changer de métier en 2026', abstract: 'guide pratique reconversion professionnelle', sourceType: 'presse_nationale', date: new Date().toISOString() },
    { title: 'Burn-out : 1 salarié sur 3 touché', abstract: 'épuisement professionnel burnout souffrance au travail', sourceType: 'presse_specialisee', date: new Date().toISOString() },
  ];
  const results = m.classifyAndScore(fakeItems, { 'reconversion professionnelle': 70, 'burn-out': 60 }, ['reconversion 2026']);
  console.log('Clusters scorés:', results.map(r => r.clusterKey + ' score=' + r.score));
})"
```

Résultat attendu :
```
Clusters scorés: [ 'reconversion score=...', 'burnout score=...' ]
```

- [ ] **Step 3 : Commit**

```bash
git add pipeline/classify.js
git commit -m "feat(pipeline): add cluster classification and scoring"
```

---

## Task 5 : project.js — GitHub Projects V2

**Files:**
- Create: `pipeline/project.js`

- [ ] **Step 1 : Créer `pipeline/project.js`** (adapté de MesChasses — même logique GraphQL, champs be-ikigai)

```js
// pipeline/project.js
import { execSync } from 'child_process';
import { PROJECT_CONFIG } from './config.js';

function gh(query) {
  const result = execSync(`gh api graphql -f query='${query}'`, {
    timeout: 30000,
    encoding: 'utf8',
  });
  return JSON.parse(result);
}

export async function setProjectFields(itemId, { score, cluster, contentType }) {
  const { projectId, fields } = PROJECT_CONFIG;
  if (!projectId) return;

  const mutations = [];

  if (score !== undefined && fields.trendScore.id) {
    mutations.push(`
      score: updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}" itemId: "${itemId}"
        fieldId: "${fields.trendScore.id}"
        value: { number: ${score} }
      }) { projectV2Item { id } }
    `);
  }

  if (cluster && fields.cluster.id) {
    mutations.push(`
      cluster: updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}" itemId: "${itemId}"
        fieldId: "${fields.cluster.id}"
        value: { text: "${cluster}" }
      }) { projectV2Item { id } }
    `);
  }

  if (contentType && fields.contentType.id) {
    mutations.push(`
      contentType: updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}" itemId: "${itemId}"
        fieldId: "${fields.contentType.id}"
        value: { text: "${contentType}" }
      }) { projectV2Item { id } }
    `);
  }

  if (mutations.length === 0) return;
  gh(`mutation { ${mutations.join('\n')} }`);
}

export function buildCardBody(group) {
  const sourceCounts = {};
  for (const item of group.topItems) {
    sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
  }

  const sourceTable = Object.entries(sourceCounts)
    .map(([src, count]) => `| ${src} | ${count} |`)
    .join('\n');

  const links = group.topItems
    .slice(0, 5)
    .map(i => `- [${i.title}](${i.url}) — ${i.source}`)
    .join('\n');

  return `## ${group.cluster.label}

**Score :** ${group.score} | **Type suggéré :** ${group.contentType}

### Sources détectées

| Source | Articles |
|--------|---------|
${sourceTable}

### Articles représentatifs

${links}
`;
}

export function getProjectItems() {
  const { projectId } = PROJECT_CONFIG;
  if (!projectId) return [];

  const result = gh(`{
    node(id: "${projectId}") {
      ... on ProjectV2 {
        items(first: 200) {
          nodes {
            id
            content { ... on DraftIssue { title body } }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
                ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2Field { name } } }
              }
            }
          }
        }
      }
    }
  }`);

  return result?.data?.node?.items?.nodes || [];
}

export async function pickNextTopic() {
  const items = getProjectItems();
  const activeItems = items.filter(item => {
    const status = item.fieldValues?.nodes?.find(fv => fv.field?.name === 'Status')?.name;
    return status === 'Researched' || status === 'Drafting';
  });

  const activeClusters = new Set(
    activeItems.map(item => item.fieldValues?.nodes?.find(fv => fv.field?.name === 'Cluster')?.text)
  );

  const candidates = items.filter(item => {
    const status = item.fieldValues?.nodes?.find(fv => fv.field?.name === 'Status')?.name;
    const cluster = item.fieldValues?.nodes?.find(fv => fv.field?.name === 'Cluster')?.text;
    return status === 'Detected' && !activeClusters.has(cluster);
  });

  if (candidates.length === 0) return null;

  // Trier par score décroissant
  candidates.sort((a, b) => {
    const scoreA = a.fieldValues?.nodes?.find(fv => fv.field?.name === 'Trend Score')?.number || 0;
    const scoreB = b.fieldValues?.nodes?.find(fv => fv.field?.name === 'Trend Score')?.number || 0;
    return scoreB - scoreA;
  });

  const best = candidates[0];
  const cluster = best.fieldValues?.nodes?.find(fv => fv.field?.name === 'Cluster')?.text || '';
  const contentType = best.fieldValues?.nodes?.find(fv => fv.field?.name === 'Content Type')?.text || 'guide-pratique';

  return {
    itemId: best.id,
    title: best.content?.title || '',
    body: best.content?.body || '',
    category: cluster,
    contentType,
  };
}

export async function updateCardStatus(itemId, status) {
  const { projectId, fields } = PROJECT_CONFIG;
  if (!projectId || !itemId) return;

  const optionId = fields.status.options[status];
  if (!optionId) return;

  gh(`mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "${projectId}" itemId: "${itemId}"
      fieldId: "${fields.status.id}"
      value: { singleSelectOptionId: "${optionId}" }
    }) { projectV2Item { id } }
  }`);
}

export async function setArticlePath(itemId, path) {
  const { projectId, fields } = PROJECT_CONFIG;
  if (!projectId || !itemId || !fields.articlePath.id) return;

  gh(`mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "${projectId}" itemId: "${itemId}"
      fieldId: "${fields.articlePath.id}"
      value: { text: "${path}" }
    }) { projectV2Item { id } }
  }`);
}

export async function createProjectCard(group) {
  const { projectId } = PROJECT_CONFIG;
  if (!projectId) return null;

  const body = buildCardBody(group);

  // Vérifie si une carte existe déjà pour ce cluster
  const existing = getProjectItems().find(item =>
    item.fieldValues?.nodes?.find(fv => fv.field?.name === 'Cluster')?.text === group.cluster.label
  );

  if (existing) {
    const existingStatus = existing.fieldValues?.nodes?.find(fv => fv.field?.name === 'Status')?.name;
    if (existingStatus === 'Detected') {
      // Met à jour le score si le sujet est plus fort maintenant
      await setProjectFields(existing.id, {
        score: group.score,
        cluster: group.cluster.label,
        contentType: group.contentType,
      });
    }
    return existing.id;
  }

  // Crée une nouvelle carte
  const result = gh(`mutation {
    addProjectV2DraftIssue(input: {
      projectId: "${projectId}"
      title: "${group.cluster.label.replace(/"/g, '\\"')}"
      body: "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
    }) { projectItem { id } }
  }`);

  const itemId = result?.data?.addProjectV2DraftIssue?.projectItem?.id;
  if (itemId) {
    await setProjectFields(itemId, {
      score: group.score,
      cluster: group.cluster.label,
      contentType: group.contentType,
    });
    await updateCardStatus(itemId, 'detected');
  }

  return itemId;
}
```

- [ ] **Step 2 : Vérifier que le module s'importe sans erreur (sans GH_TOKEN)**

```bash
cd pipeline && node -e "import('./project.js').then(() => console.log('project.js OK'))"
```

Résultat attendu : `project.js OK` (pas d'erreur d'import — la vraie connexion sera testée en Task 9).

- [ ] **Step 3 : Commit**

```bash
git add pipeline/project.js
git commit -m "feat(pipeline): add GitHub Projects V2 integration"
```

---

## Task 6 : index.js — orchestrateur CLI

**Files:**
- Create: `pipeline/index.js`

- [ ] **Step 1 : Créer `pipeline/index.js`** (adapté de MesChasses)

```js
// pipeline/index.js
import { collectAll } from './collect.js';
import { classifyAndScore } from './classify.js';
import { createProjectCard, pickNextTopic } from './project.js';

const isDryRun = process.argv.includes('--dry-run');
const isPick = process.argv.includes('--pick');

async function main() {
  if (isPick) {
    // Mode --pick : retourne le prochain sujet en JSON sur stdout, logs sur stderr
    const topic = await pickNextTopic();
    if (!topic) {
      process.stderr.write('Aucun sujet disponible.\n');
      process.exit(0);
    }
    process.stdout.write(JSON.stringify(topic));
    process.exit(0);
  }

  process.stderr.write('Collecte des sources...\n');
  const { items, trendScores, risingQueries } = await collectAll();
  process.stderr.write(`Items collectés : ${items.length}\n`);

  process.stderr.write('Classification et scoring...\n');
  const scored = classifyAndScore(items, trendScores, risingQueries);
  process.stderr.write(`Clusters au-dessus du seuil : ${scored.length}\n`);

  if (scored.length === 0) {
    process.stderr.write('Aucun cluster au-dessus du seuil.\n');
    return;
  }

  // Affichage résumé
  for (const group of scored) {
    process.stderr.write(
      `  ${group.cluster.label} — score ${group.score} (${group.itemCount} articles, trend ${group.trendScore})\n`
    );
  }

  if (isDryRun) {
    process.stderr.write('[DRY RUN] Pas de modification GitHub.\n');
    return;
  }

  process.stderr.write('Création/mise à jour des cartes GitHub Projects...\n');
  for (const group of scored) {
    try {
      const itemId = await createProjectCard(group);
      process.stderr.write(`  Carte : ${group.cluster.label} (${itemId || 'maj'})\n`);
    } catch (err) {
      process.stderr.write(`  Erreur carte [${group.cluster.label}]: ${err.message}\n`);
    }
  }

  process.stderr.write('Scan terminé.\n');
}

main().catch(err => {
  process.stderr.write(`Erreur fatale : ${err.message}\n`);
  process.exit(1);
});
```

- [ ] **Step 2 : Tester le mode dry-run**

```bash
cd pipeline && node index.js --dry-run 2>&1 | head -20
```

Résultat attendu : collecte + classification + affichage résumé, sans erreur fatale (les erreurs RSS individuelles sont normales).

- [ ] **Step 3 : Commit**

```bash
git add pipeline/index.js
git commit -m "feat(pipeline): add main CLI orchestrator (scan/dry-run/pick modes)"
```

---

## Task 7 : generate-cover.sh

**Files:**
- Create: `pipeline/generate-cover.sh`

- [ ] **Step 1 : Créer `pipeline/generate-cover.sh`** (copié de MesChasses, prompt coaching adapté)

```bash
#!/usr/bin/env bash
# generate-cover.sh -- Génération d'image de couverture via Gemini API
# Usage : bash pipeline/generate-cover.sh <slug> "<prompt>" [model]

set -euo pipefail

SLUG="${1:?Slug requis}"
PROMPT="${2:?Prompt requis}"
MODEL="${3:-gemini-3.1-flash-image-preview}"
API_URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
OUT_DIR="public/images"
BLOG_SIZE="1424x752"
OG_SIZE="1200x630"

mkdir -p "${OUT_DIR}"

# Détecte ImageMagick v7 (magick) ou v6 (convert)
if command -v magick &>/dev/null; then
  CONVERT_CMD="magick"
else
  CONVERT_CMD="convert"
fi

attempt=0
while [[ $attempt -lt 3 ]]; do
  attempt=$((attempt + 1))
  echo "Génération image (tentative ${attempt}/3)..."

  RESPONSE=$(curl -s -X POST "${API_URL}?key=${GEMINI_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"contents\": [{\"parts\": [{\"text\": \"${PROMPT}\"}]}],
      \"generationConfig\": {\"responseModalities\": [\"IMAGE\", \"TEXT\"]}
    }")

  # Extraire le base64
  B64=$(echo "${RESPONSE}" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for part in data.get('candidates', [{}])[0].get('content', {}).get('parts', []):
    if 'inlineData' in part:
        print(part['inlineData']['data'])
        break
" 2>/dev/null || echo "")

  if [[ -z "${B64}" ]]; then
    echo "  Pas d'image dans la réponse (tentative ${attempt})"
    sleep 5
    continue
  fi

  TMP_FILE="/tmp/cover-${SLUG}.png"
  echo "${B64}" | base64 -d > "${TMP_FILE}"

  FILE_SIZE=$(stat -c%s "${TMP_FILE}" 2>/dev/null || stat -f%z "${TMP_FILE}" 2>/dev/null || echo 0)
  if [[ $FILE_SIZE -lt 10240 ]]; then
    echo "  Image trop petite (${FILE_SIZE} octets) — retry"
    sleep 5
    continue
  fi

  # Redimensionner en deux formats
  ${CONVERT_CMD} "${TMP_FILE}" -resize "${BLOG_SIZE}^" -gravity Center -extent "${BLOG_SIZE}" \
    "${OUT_DIR}/${SLUG}.png"
  ${CONVERT_CMD} "${TMP_FILE}" -resize "${OG_SIZE}^" -gravity Center -extent "${OG_SIZE}" \
    "${OUT_DIR}/${SLUG}-og.png"

  rm -f "${TMP_FILE}"
  echo "Images générées : ${OUT_DIR}/${SLUG}.png + ${OUT_DIR}/${SLUG}-og.png"
  exit 0
done

echo "ERREUR : génération image échouée après 3 tentatives" >&2
exit 1
```

- [ ] **Step 2 : Rendre exécutable**

```bash
chmod +x pipeline/generate-cover.sh
```

- [ ] **Step 3 : Commit**

```bash
git add pipeline/generate-cover.sh
git commit -m "feat(pipeline): add Gemini cover image generator"
```

---

## Task 8 : mcp.json + skills-prompt.md

**Files:**
- Create: `pipeline/mcp.json`
- Create: `pipeline/skills-prompt.md`

- [ ] **Step 1 : Créer `pipeline/mcp.json`**

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-context7"]
    },
    "nano-banana": {
      "command": "npx",
      "args": ["-y", "nano-banana-mcp"],
      "env": {
        "GEMINI_API_KEY": "${GEMINI_API_KEY}"
      }
    }
  }
}
```

- [ ] **Step 2 : Créer `pipeline/skills-prompt.md`**

```markdown
# Be-Ikigai — Standards éditoriaux blog

## Contexte et mission

Be-Ikigai est un cabinet de coaching de carrière fondé par Pierre-Louis. Il accompagne les jeunes professionnels (25–40 ans) qui se sentent à l'étroit dans leur travail : pas de burn-out déclaré, juste ce vide, ce décalage entre ce qu'ils montrent et ce qu'ils ressentent. L'offre centrale : un diagnostic de destinée en 48h pour 580€, satisfait ou remboursé. Le blog sert à capter des lecteurs en souffrance douce et à les convertir en clients.

## Public cible

Jeunes professionnels 25–40 ans, urbains, CDI ou freelance, revenus corrects, vie sociale active — mais quelque chose sonne creux. Ils cherchent « reconversion », « sens au travail », « ikigai » sur Google. Ils lisent vite, en mobile, entre deux réunions.

## Voix et ton

- Tutoiement (« tu »), jamais de vouvoiement
- Direct, concret, légèrement incisif — Pierre-Louis n'est pas un coach bienveillant générique
- Pas de jargon coaching : pas d'« alignement », « posture », « ancrage », « bienveillance », « authenticité » au sens vague
- Humour possible, autodérision bienvenue
- Opinion assumée : Pierre-Louis a un point de vue, il ne ménage pas les faux-semblants
- Langage motivant et clair, engageant sans être commercial

## Structure d'article

```
Accroche terrain (scénario concret, 100–150 mots)
→ Contexte / chiffres récents sourcés
→ Problème nommé clairement
→ Solution / analyse
→ Angle be-ikigai (naturel, non forcé — omis si ça ne colle pas)
→ CTA (micro-CTA contextuels + CTA final fort)
```

## Format et longueur

- **1 500–2 000 mots** (guides pratiques : jusqu'à 2 500)
- H1 unique avec mot-clé principal
- ≥ 4 H2, H3 pour approfondissements
- Phrases ≤ 20 mots, lisibilité Flesch > 60
- Listes à puces pour les étapes / exemples
- Tableaux pour les comparaisons (extraction IA prioritaire)
- ≥ 2 liens internes + 1 lien externe (source d'autorité)

## SEO et optimisation

- Mot-clé principal dans : H1, métadescription, intro (100 premiers mots), corps (densité 1–2 %)
- Première phrase de chaque section H2 = réponse directe (featured snippet)
- H2/H3 formulés comme questions quand c'est naturel
- Formulations naturelles pour la recherche vocale
- 2–3 suggestions d'images avec alt text SEO
- Optimisation GEO (extraction par IA) : tableaux, listes numérotées, statistiques sourcées, citations nommées
- Sources nommées : Prénom Nom, Titre, Organisation, Année — jamais « selon les experts »

## Règles typographiques strictes

- Majuscule uniquement : premier mot d'un titre/phrase + noms propres
- Guillemets français `« »` avec espaces insécables
- Espaces insécables avant `: ; ? !`
- Temps : présent pour explications, passé composé pour exemples vécus
- Accords sujet/verbe et participes passés corrects
- Synonymes pour éviter les répétitions

## Frontmatter attendu

```yaml
---
title: "H1 avec mot-clé principal, 60–70 chars"
lang: fr   # ou en
description: "Métadescription SEO, 110–160 chars exactement, jamais affichée sur le site"
seoKeywords: mot-clé 1, mot-clé 2, mot-clé 3, mot-clé 4
summary:
  - "Fait concret — spoile la conclusion principale (≤200 chars)"
  - "Règle ou chiffre à retenir (≤200 chars)"
  - "Quoi faire concrètement — actionnable (≤200 chars)"
  - "Conseil ou mise en garde (≤200 chars)"
publishedAt: YYYY-MM-DDTHH:MM:SS
author: Pierre-Louis
category: Reconversion   # Sens & Ikigai / Burn-out / Coaching / Management
image: /images/SLUG.png
readingTime: N
featured: false
status: draft
faq:
  - question: "Question ciblée snippet ?"
    answer: "Réponse concise, ≤150 chars."
---
```

## Règles absolues anti-IA

**ZÉRO tirets longs (—)** — remplacer par virgule, point, deux-points ou parenthèses.

**Mots interdits :**
- Buzzwords génériques : `essentiel`, `crucial`, `fondamental`, `incontournable`, `paradigme`, `écosystème`, `levier`, `optimiser`, `fluidifier`, `synergies`, `disruption`
- Faux-semblants coaching : `alignement` (sens vague), `posture`, `ancrage`, `bienveillance`, `authenticité`, `accompagnement holistique`, `transformation profonde`
- Transitions IA : `de plus`, `par ailleurs`, `il convient de noter`, `il est important de`, `en outre`, `notamment`, `il est à noter`, `en conclusion`, `au cœur de`, `dans le paysage actuel`, `à l'heure où`
- Superlatifs creux : `marque un tournant décisif`, `démontre un engagement envers`, `témoigne de`, `reflète une tendance profonde`

**Patterns à corriger :**
- Attributions vagues → sources nommées (Nom, Titre, Org, Année)
- Fausse modestie → énoncé direct
- Parallélismes forcés → reformuler
- Listes de trois systématiques → varier
- Paragraphes uniformes → varier la longueur (certains 1 phrase, d'autres 5–6)
- Adverbes de liaison en début de phrase → max 1 par 500 mots
- Guillemets courbes → guillemets français `« »`
- Tilde `~` pour « environ » → `environ`

**Émojis :** zéro.
**Gras :** max 2–3 par section H2. Pas de têtes de liste en gras avec deux-points.

## Section références (obligatoire)

```markdown
## Références

1. [Titre](URL) — Type/Source, Date
2. [Titre](URL) — Type/Source, Date
```

Citations inline : `<sup>[N](#fn-N)</sup>`

## Audit anti-IA final

Avant d'émettre `::done::`, lister les signaux IA résiduels et les corriger. Rechercher une dernière fois les tirets longs. Vérifier :
- Densité mot-clé principal (1–2 %)
- Lisibilité (score Flesch > 60)
- Diversité lexicale (pas de répétitions)
- Première phrase de chaque H2 = réponse directe
- FAQ 5 questions ciblées snippets
- Suggestions schema.org
- Résumé social 4–6 bullets ≤ 200 chars + hashtags
```

- [ ] **Step 3 : Commit**

```bash
git add pipeline/mcp.json pipeline/skills-prompt.md
git commit -m "feat(pipeline): add MCP config and editorial standards"
```

---

## Task 9 : Prompts de phase (1-research.md, 2-draft.md, 3-humanize.md)

**Files:**
- Create: `pipeline/prompts/1-research.md`
- Create: `pipeline/prompts/2-draft.md`
- Create: `pipeline/prompts/3-humanize.md`

- [ ] **Step 1 : Créer `pipeline/prompts/1-research.md`**

```markdown
# Phase 1 — Recherche

Lis `.card-body.md` (sujet, cluster, type de contenu suggéré).

Vérifie les articles existants dans `src/content/blog/` pour éviter les doublons.

Recherche des sources sur ce sujet :
- Sources d'autorité : Dares, INSEE, APEC, France Travail, Ministère du Travail
- Presse spécialisée : HBR France, Management Magazine, Les Echos Executives
- Coaches reconnus et leurs publications (citer nommément)
- Études et rapports récents datés

Pour chaque source, extraire :
- Faits et chiffres datés précis (pas vagues)
- Citations nommées : Prénom Nom, Titre, Organisation, Année
- Exemples terrain avec contexte réel
- Idées reçues répandues à corriger

Propose 2–3 angles d'article différents (public visé, approche, lien be-ikigai).

Écris `.research-notes.md` avec cette structure :

```
## Sujet (2–3 phrases)
## Cluster + type de contenu
## Angle retenu + justification
## Faits et chiffres (avec sources)
## Citations nommées (Nom, Titre, Org, Année)
## Exemples terrain (contexte, région si pertinent)
## Idées reçues à corriger
## Plan détaillé (H2 + description du contenu)
## CTA proposé
## Sources (liste numérotée avec type et date)
## FAQ suggérée (2–4 questions ciblées snippets)
```

Émets `::research-done::` en fin de message quand le fichier est écrit.
```

- [ ] **Step 2 : Créer `pipeline/prompts/2-draft.md`**

````markdown
# Phase 2 — Rédaction

Lis `.research-notes.md` et `.card-body.md`.

Lis 2 articles existants dans `src/content/blog/` pour calibrer le ton.

## Règles de rédaction

Tu écris **deux articles complets** dans la même passe :
1. Version française (`lang: fr`) — tutoiement, voix Pierre-Louis directe
2. Version anglaise (`lang: en`) — "you", même voix, ton adapté EN

Respecte toutes les règles de `pipeline/skills-prompt.md`.

## Format par type de contenu

| Type | Longueur | Spécificités |
|------|----------|--------------|
| guide-pratique | 2 000–2 500 mots | Étapes numérotées, tableau récap final |
| conseil-ikigai | 1 500–2 000 mots | Exercice pratique en fin d'article |
| analyse-tendance | 1 200–1 800 mots | Chiffres récents, avant/après, impact concret |
| comparatif | 2 500–3 200 mots | Tableau comparatif (cible extraction IA), guide de décision |
| temoignage | 1 200–1 800 mots | Histoire anonymisée, arc narratif, leçon universelle |
| actualite | 900–1 400 mots | Faits d'abord, contexte, impact lecteur |

## Structure obligatoire de chaque article

```markdown
[frontmatter complet]

[Zone "À retenir" : 4–6 bullets ≤ 200 chars chacun — ce sont les champs summary]

## [H1 = titre de l'article]

[Introduction 200–300 mots avec accroche terrain + mot-clé dans les 100 premiers mots]

## [H2 — question ou titre direct]

[Première phrase = réponse directe (featured snippet)]

[Corps de la section]

### [H3 si approfondissement]

[...]

## [4–5 sections H2 minimum]

## Conclusion

[200 mots + CTA fort]

## FAQ

[5 questions ciblées snippets]

## Suggestions schema.org

[Types pertinents : Article, FAQPage, HowTo selon le type de contenu]

## Résumé social

[4–5 bullets ≤ 200 chars + hashtags pertinents]

## Références

1. [Titre](URL) — Type/Source, Date
```

## Frontmatter FR

```yaml
---
title: "Mot-clé principal en français, 60–70 chars"
lang: fr
description: "Métadescription SEO 110–160 chars, jamais affichée"
seoKeywords: mot-clé 1, mot-clé 2, mot-clé 3
summary:
  - "Bullet 1 (≤200 chars)"
  - "Bullet 2 (≤200 chars)"
  - "Bullet 3 (≤200 chars)"
  - "Bullet 4 (≤200 chars)"
publishedAt: ${PUBLISH_DATETIME}
author: Pierre-Louis
category: [Reconversion|Sens & Ikigai|Burn-out|Coaching|Management]
image: /images/${SLUG}-fr.png
readingTime: [N]
featured: false
status: draft
faq:
  - question: "?"
    answer: "Réponse concise."
---
```

## Frontmatter EN

Même structure, `lang: en`, title/description/seoKeywords en anglais, `image: /images/${SLUG}-en.png`.

## Nommage des fichiers

- FR : `src/content/blog/YYYY-MM-DD-slug-fr.md`
- EN : `src/content/blog/YYYY-MM-DD-slug-en.md`

Où `slug` est le titre FR en kebab-case ASCII sans accents, tronqué à 60 chars.

Sauvegarde les deux fichiers.

Émets `::draft-path:src/content/blog/YYYY-MM-DD-slug-fr.md::` (le EN est inféré).
````

- [ ] **Step 3 : Créer `pipeline/prompts/3-humanize.md`**

```markdown
# Phase 3 — Humanisation

Article à humaniser : ${ARTICLE_PATH} (et sa version EN en remplaçant -fr.md par -en.md si elle existe).

Applique ces corrections sur **les deux fichiers** :

## Corrections absolues (zéro tolérance)

1. **Tirets longs (—)** : Remplace CHAQUE occurrence par virgule, point, deux-points ou parenthèses selon le contexte. Aucune exception.

2. **Mots interdits** — supprimer ou reformuler :
   essentiel, crucial, fondamental, incontournable, paradigme, écosystème, levier, optimiser, fluidifier, synergies, disruption, alignement (sens vague), posture, ancrage, bienveillance, authenticité, accompagnement holistique, transformation profonde, de plus, par ailleurs, il convient de noter, il est important de, en outre, notamment, il est à noter, en conclusion, au cœur de, dans le paysage actuel, à l'heure où, marque un tournant décisif, démontre un engagement envers, témoigne de, reflète une tendance profonde

3. **Guillemets** : Remplace les guillemets droits " " par des guillemets français « » avec espaces insécables.

4. **Tilde** : Remplace `~` par `environ` ou `approximativement`.

## Corrections de style

- Attributions vagues → sources nommées (Nom, Titre, Org, Année)
- Fausse modestie → énoncé direct
- Parallélismes forcés (« non seulement X, mais aussi Y ») → reformuler
- Listes de trois systématiques → varier
- Paragraphes uniformes → varier la longueur (certains 1 phrase, d'autres 5–6)
- Adverbes de liaison en début de phrase → max 1 par 500 mots
- Conclusions génériques → fait spécifique
- Gras : max 2–3 par section H2, pas de têtes de liste en gras avec deux-points

## Ajouter de la personnalité

- Avoir des opinions, réagir aux faits
- Varier le rythme (phrases courtes, puis plus longues)
- Reconnaître la complexité si elle existe
- Être précis sur les émotions (« quelque chose d'absurde dans… » plutôt que « préoccupant »)

## Vérifications finales

Avant d'émettre `::done::`, liste les signaux IA résiduels et corrige-les. Puis vérifie :
- Densité mot-clé principal (1–2 %)
- Lisibilité (score Flesch > 60 — phrases ≤ 20 mots)
- Diversité lexicale
- Première phrase de chaque H2 = réponse directe
- FAQ 5 questions présentes
- Section ## Références présente avec liens
- Suggestions schema.org présentes
- Résumé social 4–6 bullets + hashtags présents
- Zéro tiret long restant (cherche une dernière fois)

Émets `::done::`.
```

- [ ] **Step 4 : Commit**

```bash
git add pipeline/prompts/
git commit -m "feat(pipeline): add 3-phase LLM prompts (research/draft/humanize)"
```

---

## Task 10 : draft.sh — orchestrateur 3 phases

**Files:**
- Create: `pipeline/draft.sh`

- [ ] **Step 1 : Créer `pipeline/draft.sh`** (adapté de MesChasses — LLM=gemini par défaut, branche master, prompt cover coaching)

```bash
#!/usr/bin/env bash
# draft.sh -- Pipeline de rédaction automatique d'articles de blog be-ikigai
# Adapté de MesChasses : 3 phases Gemini/Claude + validation Astro + commit Git
#
# Prérequis :
#   - GEMINI_API_KEY (rédaction + images)
#   - GH_TOKEN (GitHub CLI)
#   - gemini CLI (npm i -g @google/gemini-cli) OU claude CLI
#   - ImageMagick, Node.js, jq
#
# Usage : bash pipeline/draft.sh
# Reprise : RESUME_SLUG=2026-04-28-mon-article-fr bash pipeline/draft.sh
# LLM alternatif : LLM=claude bash pipeline/draft.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PIPELINE_DIR="${SCRIPT_DIR}"
CONTENT_DIR="${REPO_ROOT}/src/content/blog"
LOG_DIR="${REPO_ROOT}/pipeline/.logs"
MCP_CONFIG="${PIPELINE_DIR}/mcp.json"
SKILLS_PROMPT="${PIPELINE_DIR}/skills-prompt.md"
CARD_BODY="${PIPELINE_DIR}/.card-body.md"
RESEARCH_NOTES="${PIPELINE_DIR}/.research-notes.md"

mkdir -p "${LOG_DIR}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/draft-${TIMESTAMP}.log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "${LOG_FILE}"; }
log_error() { echo "[$(date +%H:%M:%S)] ERREUR: $*" | tee -a "${LOG_FILE}" >&2; }

cleanup() {
  rm -f "${CARD_BODY}" "${RESEARCH_NOTES}" "${PIPELINE_DIR}/.topic-json.tmp"
}

on_error() {
  local exit_code=$?
  local line_number=$1
  log_error "Echec ligne ${line_number} (code ${exit_code})"

  if [[ -n "${ITEM_ID:-}" ]]; then
    (cd "${PIPELINE_DIR}" && node -e "
      import('./project.js').then(m => m.updateCardStatus('${ITEM_ID}', 'detected')).catch(() => {});
    " 2>/dev/null || true)
  fi

  if command -v gh &>/dev/null && [[ -n "${GH_TOKEN:-}" ]]; then
    local log_excerpt
    log_excerpt=$(tail -50 "${LOG_FILE}" 2>/dev/null || echo "Log non disponible")
    gh issue create \
      --title "Pipeline blog : echec le ${TIMESTAMP}" \
      --body "$(printf "## Erreur pipeline\n\nLigne : %s\nCode : %s\n\n\`\`\`\n%s\n\`\`\`" "${line_number}" "${exit_code}" "${log_excerpt}")" \
      --label "bug" 2>/dev/null || true
  fi

  cleanup
  exit "${exit_code}"
}

trap 'on_error ${LINENO}' ERR

LLM="${LLM:-gemini}"
log "LLM cible : ${LLM}"

set_publish_datetime() {
  local hour min
  read -r hour min < <(python3 -c "import random; print(random.randint(7,19), random.randint(0,59))")
  PUBLISH_DATETIME="$(date +%Y-%m-%d)T$(printf '%02d' "${hour}"):$(printf '%02d' "${min}"):00"
  log "Heure de publication : ${PUBLISH_DATETIME}"
  export PUBLISH_DATETIME
}

frontmatter_field() {
  local field="$1" file="$2"
  grep "^${field}:" "${file}" | head -1 | sed "s/^${field}: *//" | tr -d '"'
}

git_push_safe() {
  local label="${1:-push}"
  cd "${REPO_ROOT}"
  git pull --rebase --autostash origin master 2>>"${LOG_FILE}" || {
    log_error "git pull --rebase echoue avant ${label}"
    exit 1
  }
  git push origin master 2>>"${LOG_FILE}" || {
    log_error "git push echoue pour ${label} — relancer avec RESUME_SLUG pour reprendre"
    exit 1
  }
}

run_llm() {
  if [[ "${LLM}" == "gemini" ]]; then
    local gemini_args=()
    local system_prompt_file=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --system-prompt-file) system_prompt_file="$2"; shift 2 ;;
        --mcp-config) shift 2 ;;
        --allowedTools) shift 2 ;;
        --max-turns) shift 2 ;;
        --dangerously-skip-permissions) shift ;;
        *) gemini_args+=("$1"); shift ;;
      esac
    done
    GEMINI_API_KEY="${GEMINI_API_KEY}" \
    GEMINI_SYSTEM_MD="${system_prompt_file}" \
    GEMINI_CLI_HOME="${GEMINI_CLI_HOME:-/tmp/gemini-home}" \
      gemini --model gemini-3.1-pro-preview --approval-mode yolo "${gemini_args[@]}"
  else
    CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN:-}" claude "$@"
  fi
}

# Prérequis
log "Vérification des prérequis..."
for cmd in node npm git python3; do
  if ! command -v "${cmd}" &>/dev/null; then
    log_error "Commande manquante : ${cmd}"
    exit 1
  fi
done

if [[ "${LLM}" == "gemini" ]]; then
  if ! command -v gemini &>/dev/null; then
    log_error "gemini CLI manquant — installer : npm i -g @google/gemini-cli"
    exit 1
  fi
  if [[ -z "${GEMINI_API_KEY:-}" ]]; then
    log_error "GEMINI_API_KEY non défini"
    exit 1
  fi
  export GEMINI_CLI_HOME="/tmp/gemini-home"
  mkdir -p "${GEMINI_CLI_HOME}/.gemini"
  echo '{"projects":{}}' > "${GEMINI_CLI_HOME}/.gemini/projects.json"
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  log_error "GEMINI_API_KEY requis pour la génération d'images"
  exit 1
fi

# Mise à jour du repo
log "Mise à jour du repo..."
cd "${REPO_ROOT}"
git stash 2>>"${LOG_FILE}" || true
git pull --rebase origin master 2>>"${LOG_FILE}" || true
git stash pop 2>>"${LOG_FILE}" || true

# Mode reprise
RESUME_SLUG="${RESUME_SLUG:-}"
SKIP_PHASE1=false; SKIP_PHASE2=false; SKIP_PHASE3=false; SKIP_IMAGE=false
ARTICLE_PATH=""

if [[ -n "${RESUME_SLUG}" ]]; then
  log "Mode reprise : slug=${RESUME_SLUG}"
  ARTICLE_PATH="src/content/blog/${RESUME_SLUG}.md"
  if [[ ! -f "${REPO_ROOT}/${ARTICLE_PATH}" ]]; then
    log_error "Article introuvable : ${ARTICLE_PATH}"
    exit 1
  fi
  if git log --format=%s | grep -qF "wip(phase3): ${RESUME_SLUG}"; then
    SKIP_PHASE1=true; SKIP_PHASE2=true; SKIP_PHASE3=true
    log "  Phases 1, 2, 3 déjà commitées"
  elif git log --format=%s | grep -qF "wip(phase2): ${RESUME_SLUG}"; then
    SKIP_PHASE1=true; SKIP_PHASE2=true
    git show "HEAD:pipeline/.research-notes.md" > "${RESEARCH_NOTES}" 2>/dev/null || true
    log "  Phases 1, 2 déjà commitées — reprise depuis Phase 3"
  elif git log --format=%s | grep -qF "wip(phase1): ${RESUME_SLUG}"; then
    SKIP_PHASE1=true
    PHASE1_HASH=$(git log --format="%H %s" | grep -F "wip(phase1): ${RESUME_SLUG}" | awk '{print $1}' | head -1)
    git show "${PHASE1_HASH}:pipeline/.research-notes.md" > "${RESEARCH_NOTES}" 2>/dev/null || true
    log "  Phase 1 déjà commitée — reprise depuis Phase 2"
  fi
  if [[ -f "${REPO_ROOT}/public/images/${RESUME_SLUG}.png" ]]; then
    SKIP_IMAGE=true
    log "  Image déjà présente"
  fi
fi

ITEM_ID=""

if [[ -n "${RESUME_SLUG}" ]]; then
  TOPIC_TITLE=$(frontmatter_field title "${REPO_ROOT}/${ARTICLE_PATH}")
  TOPIC_CATEGORY=$(frontmatter_field category "${REPO_ROOT}/${ARTICLE_PATH}")
  TOPIC_CONTENT_TYPE="resume"
  PUBLISH_DATETIME=$(frontmatter_field publishedAt "${REPO_ROOT}/${ARTICLE_PATH}")
  export PUBLISH_DATETIME
elif [[ "${DRAFT_FROM_URL:-}" == "true" ]]; then
  log "Mode URL : utilisation du .card-body.md fourni"
  [[ ! -f "${CARD_BODY}" ]] && { log_error ".card-body.md introuvable"; exit 1; }
  set_publish_datetime
else
  log "Sélection du prochain sujet..."
  cd "${PIPELINE_DIR}"
  npm install --silent 2>>"${LOG_FILE}"
  TOPIC_JSON=$(node index.js --pick 2>>"${LOG_FILE}" || true)
  if [[ -z "${TOPIC_JSON}" ]]; then
    log "Aucun sujet disponible."
    exit 0
  fi
  TOPIC_JSON_FILE="${PIPELINE_DIR}/.topic-json.tmp"
  printf '%s' "${TOPIC_JSON}" > "${TOPIC_JSON_FILE}"
  IFS=$'\t' read -r ITEM_ID TOPIC_TITLE TOPIC_CATEGORY TOPIC_CONTENT_TYPE < <(python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
print(d["itemId"], d["title"], d["category"], d["contentType"], sep="\t")
' "${TOPIC_JSON_FILE}")
  python3 -c "import json, sys; d=json.load(open(sys.argv[1])); print(d.get('body',''),end='')" "${TOPIC_JSON_FILE}" > "${CARD_BODY}"
  rm -f "${TOPIC_JSON_FILE}"
  log "Sujet : ${TOPIC_TITLE} (${TOPIC_CATEGORY})"
  set_publish_datetime
  node -e "import('./project.js').then(m => m.updateCardStatus('${ITEM_ID}', 'researched')).catch(e => console.warn(e.message));" 2>>"${LOG_FILE}" || true
fi

# Phase 1 : Recherche
if [[ "${SKIP_PHASE1}" == "true" ]]; then
  log "Phase 1 : ignorée."
else
  log "Phase 1 : Recherche..."
  cd "${REPO_ROOT}"
  RESEARCH_OUTPUT=$(run_llm \
    --mcp-config "${MCP_CONFIG}" \
    --system-prompt-file "${SKILLS_PROMPT}" \
    --allowedTools "WebSearch,WebFetch,Read,Write" \
    --max-turns 30 \
    --dangerously-skip-permissions \
    -p "$(cat "${PIPELINE_DIR}/prompts/1-research.md")" \
    2> >(tee -a "${LOG_FILE}" >&2)) || true

  if ! echo "${RESEARCH_OUTPUT}" | grep -q "::research-done::"; then
    log_error "Phase 1 : marqueur ::research-done:: non trouvé"
    exit 1
  fi
  if [[ ! -f "${RESEARCH_NOTES}" ]]; then
    log_error "Phase 1 : .research-notes.md non créé"
    exit 1
  fi

  PHASE1_REF="$(date +%Y-%m-%d)-$(md5sum "${CARD_BODY}" 2>/dev/null | cut -c1-6 || echo 'noref')"
  cd "${REPO_ROOT}"
  git add "${RESEARCH_NOTES}"
  git commit -m "wip(phase1): ${PHASE1_REF}

Pipeline: automatique — phase recherche terminée
Log: pipeline/.logs/draft-${TIMESTAMP}.log" 2>>"${LOG_FILE}"
  git_push_safe "wip(phase1)"
fi

# Phase 2 : Rédaction
if [[ "${SKIP_PHASE2}" == "true" ]]; then
  log "Phase 2 : ignorée."
else
  log "Phase 2 : Rédaction (FR + EN)..."
  cd "${REPO_ROOT}"
  DRAFT_OUTPUT=$(run_llm \
    --mcp-config "${MCP_CONFIG}" \
    --system-prompt-file "${SKILLS_PROMPT}" \
    --allowedTools "Read,Write,WebSearch" \
    --max-turns 20 \
    --dangerously-skip-permissions \
    -p "$(cat "${PIPELINE_DIR}/prompts/2-draft.md")" \
    2> >(tee -a "${LOG_FILE}" >&2))

  ARTICLE_PATH=$(echo "${DRAFT_OUTPUT}" | grep -oP '::draft-path:\K[^:]+' | head -1)

  # Fallback si Gemini écrit directement sur stdout
  if [[ -z "${ARTICLE_PATH}" ]] || [[ ! -f "${REPO_ROOT}/${ARTICLE_PATH}" ]]; then
    log "Fichier non créé par le LLM — récupération depuis stdout..."
    MARKDOWN_CONTENT=$(echo "${DRAFT_OUTPUT}" | sed -n '/^---$/,$ p')
    if [[ -n "${MARKDOWN_CONTENT}" ]]; then
      RAW_TITLE=$(echo "${MARKDOWN_CONTENT}" | grep -m1 '^title:' | sed 's/^title: *//' | tr -d '"' | tr '[:upper:]' '[:lower:]')
      DERIVED_SLUG=$(echo "${RAW_TITLE}" | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' | cut -c1-55)
      ARTICLE_PATH="src/content/blog/$(date +%Y-%m-%d)-${DERIVED_SLUG}-fr.md"
      mkdir -p "${CONTENT_DIR}"
      echo "${MARKDOWN_CONTENT}" > "${REPO_ROOT}/${ARTICLE_PATH}"
      FINAL_SLUG=$(basename "${ARTICLE_PATH}" .md)
      sed -i "s|^image:.*|image: /images/${FINAL_SLUG}.png|" "${REPO_ROOT}/${ARTICLE_PATH}"
      log "Article sauvegardé depuis stdout : ${ARTICLE_PATH}"
    else
      log_error "Phase 2 : ni fichier créé ni contenu markdown dans stdout"
      exit 1
    fi
  fi

  log "Article FR créé : ${ARTICLE_PATH}"
  ARTICLE_SLUG=$(basename "${ARTICLE_PATH}" .md)

  # Validation Astro
  log "Validation Astro..."
  cd "${REPO_ROOT}"
  ASTRO_ATTEMPTS=0
  while [[ $ASTRO_ATTEMPTS -lt 3 ]]; do
    ASTRO_ATTEMPTS=$((ASTRO_ATTEMPTS + 1))
    if npx astro sync 2>>"${LOG_FILE}"; then
      log "Validation Astro : OK"
      break
    fi
    if [[ $ASTRO_ATTEMPTS -ge 3 ]]; then
      log_error "Validation Astro échouée après 3 tentatives"
      exit 1
    fi
    ASTRO_ERROR=$(npx astro sync 2>&1 | tail -20 || true)
    run_llm \
      --allowedTools "Read,Edit" \
      --max-turns 5 \
      --dangerously-skip-permissions \
      -p "Corrige les erreurs de frontmatter dans ${ARTICLE_PATH}. Erreur Astro : ${ASTRO_ERROR}. description doit faire 110–160 chars. category doit être : Reconversion / Sens & Ikigai / Burn-out / Coaching / Management. publishedAt au format AAAA-MM-JJTHH:MM:SS." \
      2>>"${LOG_FILE}" || true
  done

  # Correction description
  FULL_PATH="${REPO_ROOT}/${ARTICLE_PATH}"
  python3 - "${FULL_PATH}" <<'PYEOF'
import sys, re
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
match = re.search(r'^description:\s*"(.+?)"', content, re.MULTILINE)
if match:
    desc = match.group(1)
    if len(desc) > 160:
        short = desc[:157].rstrip() + '...'
        content = content.replace(f'description: "{desc}"', f'description: "{short}"')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Description tronquée : {len(desc)} -> {len(short)} chars")
    elif len(desc) < 110:
        print(f"  WARNING: Description trop courte : {len(desc)} chars")
PYEOF

  # Nettoyage tirets longs
  if grep -q "—" "${FULL_PATH}" 2>/dev/null; then
    sed -i 's/ — /, /g; s/— /: /g; s/ —/,/g' "${FULL_PATH}"
    log "  Tirets longs remplacés"
  fi

  cd "${REPO_ROOT}"
  git add "${CONTENT_DIR}/"
  git commit -m "wip(phase2): ${ARTICLE_SLUG}

Pipeline: automatique — phase rédaction terminée (FR+EN)
Log: pipeline/.logs/draft-${TIMESTAMP}.log" 2>>"${LOG_FILE}"
  git_push_safe "wip(phase2)"
fi

[[ -z "${ARTICLE_PATH}" ]] && { log_error "ARTICLE_PATH non défini"; exit 1; }
ARTICLE_SLUG=$(basename "${ARTICLE_PATH}" .md)

# Phase 3 : Humanisation
if [[ "${SKIP_PHASE3}" == "true" ]]; then
  log "Phase 3 : ignorée."
else
  log "Phase 3 : Humanisation..."
  cd "${REPO_ROOT}"
  HUMANIZE_OUTPUT=$(run_llm \
    --system-prompt-file "${SKILLS_PROMPT}" \
    --allowedTools "Read,Edit" \
    --max-turns 15 \
    --dangerously-skip-permissions \
    -p "$(cat "${PIPELINE_DIR}/prompts/3-humanize.md")

Article à humaniser : ${ARTICLE_PATH}" \
    2> >(tee -a "${LOG_FILE}" >&2))

  echo "${HUMANIZE_OUTPUT}" | grep -q "::done::" || log "WARNING: marqueur ::done:: non trouvé"

  cd "${REPO_ROOT}"
  git add "${CONTENT_DIR}/"
  git commit -m "wip(phase3): ${ARTICLE_SLUG}

Pipeline: automatique — phase humanisation terminée
Log: pipeline/.logs/draft-${TIMESTAMP}.log" 2>>"${LOG_FILE}"
  git_push_safe "wip(phase3)"
fi

# Génération image (version FR uniquement — même visuel pour EN)
BASE_SLUG="${ARTICLE_SLUG%-fr}"
if [[ "${SKIP_IMAGE}" == "true" ]]; then
  log "Image : ignorée."
else
  log "Génération image de couverture..."
  TOPIC_TITLE_SAFE="${TOPIC_TITLE:-coaching carrière ikigai}"
  COVER_PROMPT="Photographie lifestyle professionnelle. ${TOPIC_TITLE_SAFE}. Jeune professionnel 30 ans, bureau moderne ou espace naturel ouvert, lumière naturelle dorée. Ambiance sereine et inspirante, pas de texte en incrustation. Style photo éditoriale professionnelle. Format 16:9."
  bash "${PIPELINE_DIR}/generate-cover.sh" "${BASE_SLUG}-fr" "${COVER_PROMPT}" 2>>"${LOG_FILE}" || \
    log "WARNING: génération image échouée — article créé sans image"
fi

# Commit final
log "Commit final..."
cd "${REPO_ROOT}"
git add "${CONTENT_DIR}/" "public/images/${BASE_SLUG}"* 2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "blog: draft '${TOPIC_TITLE:-article}' [${TOPIC_CATEGORY:-coaching}]

Type: ${TOPIC_CONTENT_TYPE:-guide}
LLM: ${LLM}
Pipeline: automatique
Log: pipeline/.logs/draft-${TIMESTAMP}.log" 2>>"${LOG_FILE}"
  git_push_safe "commit final"
fi

# Mise à jour statut GitHub Projects
cd "${PIPELINE_DIR}"
node -e "
import('./project.js').then(async m => {
  await m.updateCardStatus('${ITEM_ID}', 'drafting');
  await m.setArticlePath('${ITEM_ID}', '${ARTICLE_PATH}');
}).catch(e => console.warn(e.message));
" 2>>"${LOG_FILE}" || true

cleanup

log ""
log "=== Pipeline terminé avec succès ==="
log "Article FR : ${ARTICLE_PATH}"
log "Log : ${LOG_FILE}"
```

- [ ] **Step 2 : Rendre exécutable**

```bash
chmod +x pipeline/draft.sh
```

- [ ] **Step 3 : Commit**

```bash
git add pipeline/draft.sh
git commit -m "feat(pipeline): add 3-phase draft orchestrator (Gemini default)"
```

---

## Task 11 : GitHub Actions workflows

**Files:**
- Create: `.github/workflows/blog-trend-scan.yml`
- Create: `.github/workflows/blog-draft.yml`
- Create: `.github/workflows/blog-publish.yml`

- [ ] **Step 1 : Créer `.github/workflows/blog-trend-scan.yml`**

```yaml
name: Blog — Scan tendances

on:
  schedule:
    - cron: '0 7 * * 1'   # lundi 07h00 UTC
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install pipeline deps
        run: npm install
        working-directory: pipeline

      - name: Run trend scan
        run: node index.js
        working-directory: pipeline
        env:
          GH_TOKEN: ${{ secrets.GH_PAT }}
          PROJECT_ID: ${{ secrets.PROJECT_ID }}
          PROJECT_FIELD_STATUS_ID: ${{ secrets.PROJECT_FIELD_STATUS_ID }}
          PROJECT_FIELD_SCORE_ID: ${{ secrets.PROJECT_FIELD_SCORE_ID }}
          PROJECT_FIELD_CLUSTER_ID: ${{ secrets.PROJECT_FIELD_CLUSTER_ID }}
          PROJECT_FIELD_CONTENT_TYPE_ID: ${{ secrets.PROJECT_FIELD_CONTENT_TYPE_ID }}
          PROJECT_FIELD_ARTICLE_PATH_ID: ${{ secrets.PROJECT_FIELD_ARTICLE_PATH_ID }}
          PROJECT_STATUS_DETECTED: ${{ secrets.PROJECT_STATUS_DETECTED }}
          PROJECT_STATUS_RESEARCHED: ${{ secrets.PROJECT_STATUS_RESEARCHED }}
          PROJECT_STATUS_DRAFTING: ${{ secrets.PROJECT_STATUS_DRAFTING }}
          PROJECT_STATUS_PUBLISHED: ${{ secrets.PROJECT_STATUS_PUBLISHED }}
```

- [ ] **Step 2 : Créer `.github/workflows/blog-draft.yml`**

```yaml
name: Blog — Draft automatique

on:
  schedule:
    - cron: '0 8 */2 * *'   # toutes les 48h (jours pairs), 08h00 UTC
  workflow_dispatch:
    inputs:
      resume_slug:
        description: 'Slug à reprendre (ex: 2026-04-28-ikigai-reconversion-fr)'
        required: false
        default: ''
      llm:
        description: 'LLM à utiliser (gemini ou claude)'
        required: false
        default: 'gemini'

jobs:
  draft:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GH_PAT }}

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install system deps
        run: |
          sudo apt-get update -qq
          sudo apt-get install -y jq imagemagick
          npm install -g @google/gemini-cli
          cd pipeline && npm install

      - name: Configure git
        run: |
          git config user.email "pipeline@be-ikigai.fr"
          git config user.name "Be-Ikigai Pipeline"

      - name: Run draft pipeline
        run: RESUME_SLUG="${{ inputs.resume_slug }}" bash pipeline/draft.sh
        env:
          LLM: ${{ inputs.llm || 'gemini' }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GH_TOKEN: ${{ secrets.GH_PAT }}
          PROJECT_ID: ${{ secrets.PROJECT_ID }}
          PROJECT_FIELD_STATUS_ID: ${{ secrets.PROJECT_FIELD_STATUS_ID }}
          PROJECT_FIELD_SCORE_ID: ${{ secrets.PROJECT_FIELD_SCORE_ID }}
          PROJECT_FIELD_CLUSTER_ID: ${{ secrets.PROJECT_FIELD_CLUSTER_ID }}
          PROJECT_FIELD_CONTENT_TYPE_ID: ${{ secrets.PROJECT_FIELD_CONTENT_TYPE_ID }}
          PROJECT_FIELD_ARTICLE_PATH_ID: ${{ secrets.PROJECT_FIELD_ARTICLE_PATH_ID }}
          PROJECT_STATUS_DETECTED: ${{ secrets.PROJECT_STATUS_DETECTED }}
          PROJECT_STATUS_RESEARCHED: ${{ secrets.PROJECT_STATUS_RESEARCHED }}
          PROJECT_STATUS_DRAFTING: ${{ secrets.PROJECT_STATUS_DRAFTING }}
          PROJECT_STATUS_PUBLISHED: ${{ secrets.PROJECT_STATUS_PUBLISHED }}
```

- [ ] **Step 3 : Créer `.github/workflows/blog-publish.yml`**

```yaml
name: Blog — Publier un article

on:
  workflow_dispatch:
    inputs:
      slug:
        description: 'Slug de l'article (ex: 2026-04-28-ikigai-reconversion-fr)'
        required: true

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GH_PAT }}

      - name: Configure git
        run: |
          git config user.email "pipeline@be-ikigai.fr"
          git config user.name "Be-Ikigai Pipeline"

      - name: Publish FR article
        run: |
          FILE="src/content/blog/${{ inputs.slug }}.md"
          if [[ ! -f "$FILE" ]]; then
            echo "Fichier introuvable : $FILE"
            exit 1
          fi
          # Vérification description
          python3 - "$FILE" <<'PYEOF'
          import sys, re
          path = sys.argv[1]
          content = open(path).read()
          m = re.search(r'^description:\s*"(.+?)"', content, re.MULTILINE)
          if m:
              l = len(m.group(1))
              if l < 110 or l > 160:
                  print(f"ERREUR: description {l} chars (attendu 110-160)")
                  sys.exit(1)
          print("Frontmatter OK")
          PYEOF
          sed -i 's/^status: draft/status: published/' "$FILE"
          git add "$FILE"
          git commit -m "blog: publish '${{ inputs.slug }}'"

      - name: Publish EN article (si existant)
        run: |
          EN_SLUG="${{ inputs.slug }}"
          EN_SLUG="${EN_SLUG%-fr}-en"
          FILE="src/content/blog/${EN_SLUG}.md"
          if [[ -f "$FILE" ]]; then
            sed -i 's/^status: draft/status: published/' "$FILE"
            git add "$FILE"
            git commit -m "blog: publish '${EN_SLUG}'"
          else
            echo "Pas de version EN trouvée (${FILE}) — ignoré"
          fi

      - name: Push
        run: git push origin master
```

- [ ] **Step 4 : Commit**

```bash
git add .github/workflows/
git commit -m "feat(ci): add blog trend-scan, draft, and publish GitHub Actions"
```

---

## Task 12 : Commandes Claude (/blog:draft, status, publish, regen-cover)

**Files:**
- Create: `.claude/commands/blog/draft.md`
- Create: `.claude/commands/blog/status.md`
- Create: `.claude/commands/blog/publish.md`
- Create: `.claude/commands/blog/regen-cover.md`

- [ ] **Step 1 : Créer `.claude/commands/blog/draft.md`**

```markdown
# /blog:draft — Lancer le pipeline de rédaction

Récupère le prochain sujet et lance le pipeline complet.

## Étapes

1. Récupère le prochain sujet :
   ```bash
   cd pipeline && node index.js --pick
   ```

2. Affiche le sujet sélectionné (titre, cluster, type de contenu) et demande confirmation avant de continuer.

3. Lance le pipeline :
   ```bash
   LLM=gemini bash pipeline/draft.sh
   ```

4. Surveille les marqueurs de phase dans stdout :
   - `::research-done::` → Phase 1 terminée
   - `::draft-path:src/content/blog/SLUG.md::` → Article FR créé
   - `::done::` → Humanisation terminée

5. À la fin, affiche :
   - Chemin des articles créés (FR + EN)
   - Rappel : relire avant publication avec `/blog:publish`

## Reprise en cas d'échec

```bash
RESUME_SLUG=2026-04-28-mon-article-fr bash pipeline/draft.sh
```

## Dépannage

- Logs dans `pipeline/.logs/`
- Vérifier `GEMINI_API_KEY` défini dans l'environnement
- Si GitHub Projects vide : lancer d'abord `node pipeline/index.js` pour scanner les tendances
```

- [ ] **Step 2 : Créer `.claude/commands/blog/status.md`**

```markdown
# /blog:status — Dashboard pipeline

## Étapes

1. Récupère les cartes GitHub Projects :
   ```bash
   cd pipeline && node -e "
   import('./project.js').then(m => {
     const items = m.getProjectItems();
     const byStatus = {};
     for (const item of items) {
       const status = item.fieldValues?.nodes?.find(fv => fv.field?.name === 'Status')?.name || 'Inconnu';
       byStatus[status] = (byStatus[status] || 0) + 1;
     }
     console.log(JSON.stringify(byStatus, null, 2));
   })"
   ```

2. Compte les articles locaux :
   ```bash
   echo "Drafts FR:" $(grep -rl 'status: draft' src/content/blog/ | grep '\-fr\.md' | wc -l)
   echo "Drafts EN:" $(grep -rl 'status: draft' src/content/blog/ | grep '\-en\.md' | wc -l)
   echo "Publiés FR:" $(grep -rl 'status: published' src/content/blog/ | grep '\-fr\.md' | wc -l)
   echo "Publiés EN:" $(grep -rl 'status: published' src/content/blog/ | grep '\-en\.md' | wc -l)
   ```

3. Liste les 3 articles les plus récents :
   ```bash
   ls -t src/content/blog/*.md | head -6
   ```

4. Affiche un résumé structuré :
   ```
   ## Pipeline blog be-ikigai

   ### GitHub Projects
   - Detected : N
   - Researched : N
   - Drafting : N
   - Published : N

   ### Articles locaux
   - Drafts FR : N | EN : N
   - Publiés FR : N | EN : N

   ### Derniers articles créés
   - [slug] (FR + EN)
   ```
```

- [ ] **Step 3 : Créer `.claude/commands/blog/publish.md`**

```markdown
# /blog:publish [slug] — Publier un article

## Usage

```
/blog:publish 2026-04-28-ikigai-reconversion
```

Si le slug est fourni sans `-fr`/`-en`, publie les deux versions.

## Étapes

1. Trouve l'article FR :
   ```bash
   FILE="src/content/blog/${SLUG}-fr.md"
   # ou src/content/blog/${SLUG}.md si sans suffixe
   ```

2. Valide le frontmatter :
   - `description` : 110–160 chars exactement
   - `image` : fichier présent dans `public/images/`
   - `category` : l'une de Reconversion / Sens & Ikigai / Burn-out / Coaching / Management
   - `summary` : exactement 4 bullets
   - Zéro tiret long `—` dans le corps

3. Change le statut :
   ```bash
   sed -i 's/^status: draft/status: published/' "$FILE"
   ```

4. Fait de même pour la version EN si elle existe.

5. Commit et push :
   ```bash
   git add src/content/blog/${SLUG}-fr.md src/content/blog/${SLUG}-en.md 2>/dev/null || true
   git commit -m "blog: publish '${SLUG}'"
   git push origin master
   ```

6. Affiche l'URL de l'article publié : `https://be-ikigai.fr/blog/${SLUG%-fr}`
```

- [ ] **Step 4 : Créer `.claude/commands/blog/regen-cover.md`**

```markdown
# /blog:regen-cover <slug> [prompt personnalisé] — Régénérer l'image de couverture

## Usage

```
/blog:regen-cover 2026-04-28-ikigai-reconversion-fr
/blog:regen-cover 2026-04-28-ikigai-reconversion-fr "Jeune femme méditative, bureau lumineux, plantes vertes"
```

## Étapes

1. Trouve l'article et extrait le titre :
   ```bash
   FILE="src/content/blog/${SLUG}.md"
   TITLE=$(grep '^title:' "$FILE" | head -1 | sed 's/^title: *//' | tr -d '"')
   ```

2. Si aucun prompt personnalisé, construit le prompt par défaut :
   ```
   Photographie lifestyle professionnelle. ${TITLE}. Jeune professionnel 25-35 ans, bureau moderne ou espace naturel, lumière naturelle dorée. Ambiance sereine et inspirante, pas de texte en incrustation. Style photo éditoriale. Format 16:9.
   ```

3. Lance la génération :
   ```bash
   bash pipeline/generate-cover.sh "${SLUG%-fr}" "${PROMPT}"
   ```

4. Vérifie les fichiers générés :
   ```bash
   ls -lh public/images/${SLUG%-fr}*.png
   # Attendu : SLUG-fr.png (1424×752) + SLUG-fr-og.png (1200×630)
   ```

5. Commit :
   ```bash
   git add public/images/${SLUG%-fr}*.png
   git commit -m "blog: régénération couverture '${SLUG}'"
   git push origin master
   ```
```

- [ ] **Step 5 : Commit**

```bash
git add .claude/commands/blog/
git commit -m "feat(claude): add /blog:draft /blog:status /blog:publish /blog:regen-cover commands"
```

---

## Task 13 : Références Claude (PIPELINE.md, BLOG.md)

**Files:**
- Create: `.claude/references/PIPELINE.md`
- Create: `.claude/references/BLOG.md`

- [ ] **Step 1 : Créer `.claude/references/PIPELINE.md`**

```markdown
# Référence pipeline blog be-ikigai

## Architecture

```
Scan tendances (lundi 07h00 UTC, blog-trend-scan.yml)
  └─ pipeline/index.js → GitHub Projects V2 (cartes "Detected")
        └─ Draft (jours pairs 08h00 UTC, blog-draft.yml)
              └─ pipeline/draft.sh [LLM=gemini par défaut]
                    ├─ Phase 1 : recherche (::research-done::)
                    ├─ Phase 2 : rédaction FR+EN (::draft-path::)
                    └─ Phase 3 : humanisation (::done::)
                          └─ src/content/blog/YYYY-MM-DD-slug-{fr,en}.md (draft)
                                └─ Publish (blog-publish.yml, manuel)
                                      └─ status: published + push master
```

## Secrets GitHub requis

| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | Clé API Google Gemini (rédaction + images) |
| `GH_PAT` | Personal Access Token (scopes: repo, project, workflow) |
| `PROJECT_ID` | ID du projet GitHub (PVT_...) |
| `PROJECT_FIELD_STATUS_ID` | ID du champ Status |
| `PROJECT_FIELD_SCORE_ID` | ID du champ Trend Score |
| `PROJECT_FIELD_CLUSTER_ID` | ID du champ Cluster |
| `PROJECT_FIELD_CONTENT_TYPE_ID` | ID du champ Content Type |
| `PROJECT_FIELD_ARTICLE_PATH_ID` | ID du champ Article Path |
| `PROJECT_STATUS_DETECTED` | Option ID "Detected" |
| `PROJECT_STATUS_RESEARCHED` | Option ID "Researched" |
| `PROJECT_STATUS_DRAFTING` | Option ID "Drafting" |
| `PROJECT_STATUS_PUBLISHED` | Option ID "Published" |

## Marqueurs de phase

- Phase 1 → `::research-done::`
- Phase 2 → `::draft-path:src/content/blog/SLUG.md::`
- Phase 3 → `::done::`

## Nommage des fichiers

- `src/content/blog/YYYY-MM-DD-slug-fr.md` — version française
- `src/content/blog/YYYY-MM-DD-slug-en.md` — version anglaise
- `public/images/YYYY-MM-DD-slug-fr.png` — couverture 1424×752
- `public/images/YYYY-MM-DD-slug-fr-og.png` — OG social 1200×630

## Pièges connus

- `GITHUB_PROJECT_ID` est réservé par GitHub Actions — utiliser `PROJECT_ID`
- `python3 -c "..."` multiline → utiliser single quotes ou here-doc
- Variables avec accents dans les prompts bash → passer par variable env intermédiaire
- Mode `--pick` sans sujet → `process.exit(0)` (pas 1)
- `getProjectItems()` est synchrone — pas d'`await`
- Gemini CLI : pointer `GEMINI_CLI_HOME=/tmp/gemini-home` en CI
- `git push origin master` (pas `main`) — branche principale be-ikigai
- ImageMagick : `magick` (v7) vs `convert` (v6 Ubuntu) — le script détecte auto
- Gemini image model : `gemini-3.1-flash-image-preview` (les anciens modèles sont 404)

## Reprise en cas d'échec

```bash
RESUME_SLUG=2026-04-28-mon-article-fr bash pipeline/draft.sh
```

Le script détecte automatiquement les phases déjà commitées via les messages git.
```

- [ ] **Step 2 : Créer `.claude/references/BLOG.md`**

```markdown
# Référence blog Astro — be-ikigai

## Framework

Astro 6, collection `blog` dans `src/content/blog/`.

## Schéma frontmatter (src/content.config.ts)

```yaml
title: string           # 60–70 chars, H1 avec mot-clé principal
lang: fr | en           # locale de l'article
description: string     # 110–160 chars, SEO uniquement, jamais affiché
seoKeywords: string?    # mots-clés secondaires
summary: string[]?      # 4 bullets ≤ 200 chars — zone "À retenir"
publishedAt: date?      # YYYY-MM-DDTHH:MM:SS (heure aléatoire 07h–19h)
author: string?         # Pierre-Louis
category: string?       # Reconversion / Sens & Ikigai / Burn-out / Coaching / Management
image: string?          # /images/SLUG-fr.png (1424×752)
readingTime: number?    # minutes de lecture estimées
featured: boolean       # false par défaut
status: draft|published # draft jusqu'à /blog:publish
faq: [{question, answer}]?
```

## Pages

- `src/pages/blog/index.astro` — liste FR
- `src/pages/blog/[slug].astro` — article FR
- `src/pages/[lang]/blog/index.astro` — liste EN
- `src/pages/[lang]/blog/[slug].astro` — article EN

## Filtre draft

Les pages filtrent par `status === 'published'` — les drafts ne sont jamais exposés.

## Images

- Blog cover : 1424×752 px, PNG
- OG social : 1200×630 px, PNG
- Générées par `pipeline/generate-cover.sh` via Gemini API
- Stockées dans `public/images/`

## Règles éditoriales

- Majuscule uniquement : premier mot du titre + noms propres
- Guillemets français « »
- Tutoiement, voix Pierre-Louis directe
- Densité mot-clé 1–2 %, Flesch > 60
- Voir `pipeline/skills-prompt.md` pour les règles complètes
```

- [ ] **Step 3 : Commit**

```bash
git add .claude/references/
git commit -m "docs(claude): add PIPELINE.md and BLOG.md references"
```

---

## Task 14 : Créer le GitHub Project V2 et configurer les secrets

**Files:** aucun fichier — configuration GitHub UI + secrets.

- [ ] **Step 1 : Créer le GitHub Project V2**

1. Aller sur [github.com/sdechevigne/be-ikigai-v2/projects](https://github.com/sdechevigne/be-ikigai-v2/projects) (adapter si le repo s'appelle différemment)
2. Cliquer « New project » → « Board »
3. Nommer le projet : `Blog be-ikigai pipeline`
4. Ajouter les statuts : **Detected**, **Researched**, **Drafting**, **Published**
5. Ajouter les champs personnalisés :
   - `Trend Score` (Number)
   - `Cluster` (Text)
   - `Content Type` (Text)
   - `Article Path` (Text)

- [ ] **Step 2 : Récupérer les IDs du projet via GitHub CLI**

```bash
gh api graphql -f query='{ viewer { projectsV2(first: 10) { nodes { id title } } } }'
```

Copier le `id` du projet (`PVT_...`).

```bash
PROJECT_ID="PVT_..."
gh api graphql -f query="{ node(id: \"${PROJECT_ID}\") { ... on ProjectV2 { fields(first: 20) { nodes { ... on ProjectV2Field { id name } ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }"
```

Copier les IDs de chaque champ et les IDs des options de statut.

- [ ] **Step 3 : Ajouter les secrets GitHub**

```bash
REPO="sdechevigne/be-ikigai-v2"  # adapter si besoin

gh secret set GEMINI_API_KEY --repo "$REPO"           # coller la clé
gh secret set GH_PAT --repo "$REPO"                   # PAT avec scopes: repo, project, workflow
gh secret set PROJECT_ID --repo "$REPO"               # PVT_...
gh secret set PROJECT_FIELD_STATUS_ID --repo "$REPO"
gh secret set PROJECT_FIELD_SCORE_ID --repo "$REPO"
gh secret set PROJECT_FIELD_CLUSTER_ID --repo "$REPO"
gh secret set PROJECT_FIELD_CONTENT_TYPE_ID --repo "$REPO"
gh secret set PROJECT_FIELD_ARTICLE_PATH_ID --repo "$REPO"
gh secret set PROJECT_STATUS_DETECTED --repo "$REPO"
gh secret set PROJECT_STATUS_RESEARCHED --repo "$REPO"
gh secret set PROJECT_STATUS_DRAFTING --repo "$REPO"
gh secret set PROJECT_STATUS_PUBLISHED --repo "$REPO"
```

- [ ] **Step 4 : Tester le scan manuellement**

```bash
cd pipeline
GH_TOKEN=$(gh auth token) PROJECT_ID="PVT_..." node index.js --dry-run
```

Résultat attendu : clusters scorés affichés, aucune modification GitHub.

- [ ] **Step 5 : Commit de vérification (pas de code, juste valider le setup)**

```bash
git status  # doit être propre
```

---

## Task 15 : Test end-to-end du pipeline

**Files:** aucun — test de validation.

- [ ] **Step 1 : Lancer le scan complet (crée les cartes)**

```bash
cd pipeline
GH_TOKEN=$(gh auth token) \
PROJECT_ID="PVT_..." \
PROJECT_FIELD_STATUS_ID="..." \
# ... autres vars ...
node index.js
```

Résultat attendu : cartes créées dans GitHub Projects, statut "Detected".

- [ ] **Step 2 : Tester le mode --pick**

```bash
cd pipeline
GH_TOKEN=$(gh auth token) PROJECT_ID="PVT_..." \
# ... autres vars ...
node index.js --pick
```

Résultat attendu : JSON avec `{itemId, title, category, contentType, body}`.

- [ ] **Step 3 : Lancer le pipeline draft manuellement (avec GEMINI_API_KEY réel)**

```bash
LLM=gemini GEMINI_API_KEY="..." GH_TOKEN=$(gh auth token) \
PROJECT_ID="PVT_..." \
# ... autres vars ...
bash pipeline/draft.sh
```

Surveiller les logs dans `pipeline/.logs/`. Résultat attendu : deux fichiers MD créés (FR + EN), image générée, push sur master.

- [ ] **Step 4 : Vérifier les fichiers créés**

```bash
ls -lh src/content/blog/*.md | tail -4
ls -lh public/images/*.png | tail -4
```

Résultat attendu : fichiers `YYYY-MM-DD-slug-fr.md`, `YYYY-MM-DD-slug-en.md` avec `status: draft`.

- [ ] **Step 5 : Déclencher le workflow publish via GitHub Actions UI**

Aller sur le repo → Actions → « Blog — Publier un article » → Run workflow → saisir le slug.

Résultat attendu : `status: published` dans le fichier MD, push sur master.

---

## Self-Review — Couverture du spec

| Exigence spec | Tâche qui l'implémente |
|---------------|----------------------|
| Node.js collect/classify/project/index | Tasks 1–6 |
| Gemini par défaut, fallback Claude | Task 10 (run_llm) |
| Articles bilingues FR + EN | Tasks 9 (2-draft.md), 10 (draft.sh) |
| GitHub Projects V2 | Tasks 5, 14 |
| GitHub Actions (scan, draft, publish) | Task 11 |
| generate-cover.sh (Gemini images) | Task 7 |
| skills-prompt.md (standards éditoriaux) | Task 8 |
| Prompts 3 phases | Task 9 |
| Commandes Claude /blog: | Task 12 |
| Références .claude/ | Task 13 |
| Secrets + setup projet | Task 14 |
| Test end-to-end | Task 15 |
| `git push origin master` (pas main) | Task 10 |
| Nommage -fr.md / -en.md | Tasks 9, 10, 11 |
| Prompt cover coaching/lifestyle | Task 10 |
| MCP context7 + nano-banana | Task 8 |
| Frontmatter be-ikigai (champs existants) | Tasks 8, 9 |
| Pièges MesChasses (GITHUB_PROJECT_ID, etc.) | Task 13 (PIPELINE.md) |
