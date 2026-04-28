#!/usr/bin/env node
// pipeline/backfill-projects.js
// Crée une card GitHub Projects pour chaque article publié existant
// Usage : node pipeline/backfill-projects.js [--dry-run]

import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = join(__dirname, '../src/content/blog');
const isDryRun = process.argv.includes('--dry-run');

// Mapping catégories PagesCMS → clusterKey pipeline
const CATEGORY_TO_CLUSTER = {
  'Transition professionnelle': 'reconversion',
  'Reconversion': 'reconversion',
  'Sens au travail': 'burnout',
  'Sense of Purpose': 'burnout',
  'Coaching': 'coaching_bilan',
  'Ikigai': 'sens_ikigai',
  'Ikigai Philosophy': 'sens_ikigai',
  'Philosophie de vie': 'sens_ikigai',
  'Management': 'management',
};

const CLUSTER_LABELS = {
  reconversion: 'Reconversion',
  sens_ikigai: 'Sens & Ikigai',
  burnout: 'Burn-out & Épuisement',
  coaching_bilan: 'Coaching & Bilan',
  management: 'Management & Leadership',
};

const { projectId, fields } = (() => {
  const env = {};
  try {
    const envFile = readFileSync(join(__dirname, '../.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {}
  return {
    projectId: env.PROJECT_ID || process.env.PROJECT_ID || '',
    fields: {
      status: {
        id: env.PROJECT_FIELD_STATUS_ID || process.env.PROJECT_FIELD_STATUS_ID || '',
        published: env.PROJECT_STATUS_PUBLISHED || process.env.PROJECT_STATUS_PUBLISHED || '',
      },
      trendScore: { id: env.PROJECT_FIELD_SCORE_ID || process.env.PROJECT_FIELD_SCORE_ID || '' },
      cluster: { id: env.PROJECT_FIELD_CLUSTER_ID || process.env.PROJECT_FIELD_CLUSTER_ID || '' },
      contentType: { id: env.PROJECT_FIELD_CONTENT_TYPE_ID || process.env.PROJECT_FIELD_CONTENT_TYPE_ID || '' },
      articlePath: { id: env.PROJECT_FIELD_ARTICLE_PATH_ID || process.env.PROJECT_FIELD_ARTICLE_PATH_ID || '' },
      publicationDate: { id: env.PROJECT_FIELD_PUBLICATION_DATE_ID || process.env.PROJECT_FIELD_PUBLICATION_DATE_ID || '' },
    },
  };
})();

function gh(query) {
  const payload = JSON.stringify({ query });
  const result = spawnSync('gh', ['api', 'graphql', '--input', '-'], {
    input: payload,
    timeout: 30000,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function extractField(yaml, key) {
  // Matches: key: value, key: "value", key: 'value', key: "multi\nline value"
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = yaml.match(re);
  if (!m) return '';
  // Strip surrounding quotes
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const yaml = m[1];
  return {
    title: extractField(yaml, 'title'),
    lang: extractField(yaml, 'lang'),
    status: extractField(yaml, 'status'),
    publishedAt: extractField(yaml, 'publishedAt'),
    category: extractField(yaml, 'category'),
  };
}

function getExistingItems() {
  const result = gh(`{
    node(id: "${projectId}") {
      ... on ProjectV2 {
        items(first: 100) {
          nodes {
            id
            content { ... on DraftIssue { title } }
          }
        }
      }
    }
  }`);
  return result?.data?.node?.items?.nodes || [];
}

async function createCard(article) {
  const safeTitle = article.title.replace(/"/g, '\\"');
  const safeBody = article.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const result = gh(`mutation {
    addProjectV2DraftIssue(input: {
      projectId: "${projectId}"
      title: "${safeTitle}"
      body: "${safeBody}"
    }) { projectItem { id } }
  }`);

  return result?.data?.addProjectV2DraftIssue?.projectItem?.id;
}

function setFields(itemId, article) {
  const mutations = [];

  if (fields.status.published) {
    mutations.push(`
      status: updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}" itemId: "${itemId}"
        fieldId: "${fields.status.id}"
        value: { singleSelectOptionId: "${fields.status.published}" }
      }) { projectV2Item { id } }
    `);
  }

  if (article.clusterLabel && fields.cluster.id) {
    mutations.push(`
      cluster: updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}" itemId: "${itemId}"
        fieldId: "${fields.cluster.id}"
        value: { text: "${article.clusterLabel}" }
      }) { projectV2Item { id } }
    `);
  }

  if (article.contentType && fields.contentType.id) {
    mutations.push(`
      contentType: updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}" itemId: "${itemId}"
        fieldId: "${fields.contentType.id}"
        value: { text: "${article.contentType}" }
      }) { projectV2Item { id } }
    `);
  }

  if (article.articlePath && fields.articlePath.id) {
    mutations.push(`
      articlePath: updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}" itemId: "${itemId}"
        fieldId: "${fields.articlePath.id}"
        value: { text: "${article.articlePath}" }
      }) { projectV2Item { id } }
    `);
  }

  if (article.publishedAt && fields.publicationDate.id) {
    mutations.push(`
      pubDate: updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}" itemId: "${itemId}"
        fieldId: "${fields.publicationDate.id}"
        value: { date: "${article.publishedAt}" }
      }) { projectV2Item { id } }
    `);
  }

  if (mutations.length === 0) return;
  gh(`mutation { ${mutations.join('\n')} }`);
}

function slugFromFilename(filename) {
  return filename.replace(/\.mdx?$/, '');
}

function articlePathFromSlug(slug, lang) {
  if (lang === 'en') return `/en/blog/${slug}`;
  return `/blog/${slug}`;
}

function parseArticles() {
  const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const articles = [];

  for (const file of files) {
    const content = readFileSync(join(BLOG_DIR, file), 'utf8').replace(/\r\n/g, '\n');
    const fm = parseFrontmatter(content);

    if (fm.status !== 'published') continue;

    const slug = slugFromFilename(file);
    const lang = fm.lang || 'fr';
    const category = fm.category || '';
    const clusterKey = CATEGORY_TO_CLUSTER[category] || null;
    const clusterLabel = clusterKey ? CLUSTER_LABELS[clusterKey] : '';

    let publishedAt = (fm.publishedAt || '').replace(/T.*$/, '').replace(/"/g, '');
    if (!publishedAt) publishedAt = '';

    articles.push({
      file,
      title: (fm.title || slug).replace(/"/g, ''),
      lang,
      slug,
      clusterLabel,
      contentType: 'guide-pratique',
      articlePath: articlePathFromSlug(slug, lang),
      publishedAt,
      body: `Chemin : ${articlePathFromSlug(slug, lang)}\nCatégorie : ${category}\nLang : ${lang}\nPublié le : ${publishedAt}`,
    });
  }

  return articles;
}

async function main() {
  if (!projectId) {
    process.stderr.write('PROJECT_ID non défini — vérifier .env.local\n');
    process.exit(1);
  }

  const articles = parseArticles();
  process.stderr.write(`Articles trouvés : ${articles.length}\n`);

  if (isDryRun) {
    for (const a of articles) {
      process.stdout.write(`[DRY RUN] ${a.lang.toUpperCase()} ${a.publishedAt} "${a.title}" → ${a.articlePath}\n`);
    }
    return;
  }

  process.stderr.write('Récupération des cards existantes...\n');
  const existing = getExistingItems();
  const existingTitles = new Set(
    existing.map(i => i.content?.title?.trim().toLowerCase()).filter(Boolean)
  );

  for (const article of articles) {
    const titleKey = article.title.trim().toLowerCase();
    if (existingTitles.has(titleKey)) {
      process.stdout.write(`  [existe] "${article.title.slice(0, 60)}"\n`);
      continue;
    }

    try {
      const itemId = await createCard(article);
      if (itemId) {
        setFields(itemId, article);
        process.stdout.write(`  [créé] ${article.lang.toUpperCase()} "${article.title.slice(0, 60)}" (${itemId})\n`);
      }
    } catch (err) {
      process.stderr.write(`  [erreur] "${article.title.slice(0, 40)}": ${err.message}\n`);
    }
  }

  process.stdout.write('Backfill terminé.\n');
}

main().catch(err => {
  process.stderr.write(`Erreur fatale : ${err.message}\n`);
  process.exit(1);
});
