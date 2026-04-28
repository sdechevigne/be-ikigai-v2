#!/usr/bin/env node
// pipeline/merge-bilingual-cards.js
// Fusionne les paires de cards FR+EN en une seule card bilingue
// Stratégie : garde la card FR, enrichit le body avec le chemin EN, supprime la card EN
// Usage : node pipeline/merge-bilingual-cards.js [--dry-run]

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes('--dry-run');

const env = {};
try {
  const envFile = readFileSync(join(__dirname, '../.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {}

const projectId = env.PROJECT_ID || process.env.PROJECT_ID || '';
const articlePathFieldId = env.PROJECT_FIELD_ARTICLE_PATH_ID || process.env.PROJECT_FIELD_ARTICLE_PATH_ID || '';

function gh(query) {
  const result = spawnSync('gh', ['api', 'graphql', '--input', '-'], {
    input: JSON.stringify({ query }),
    timeout: 30000,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function getField(item, name) {
  return item.fieldValues?.nodes?.find(f => f.field?.name === name);
}

function getAllItems() {
  const result = gh(`{
    node(id: "${projectId}") {
      ... on ProjectV2 {
        items(first: 100) {
          nodes {
            id
            content { ... on DraftIssue { title body } }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
                ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2Field { name } } }
              }
            }
          }
        }
      }
    }
  }`);
  return result?.data?.node?.items?.nodes || [];
}

function updateArticlePath(itemId, path) {
  gh(`mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "${projectId}" itemId: "${itemId}"
      fieldId: "${articlePathFieldId}"
      value: { text: "${path.replace(/"/g, '\\"')}" }
    }) { projectV2Item { id } }
  }`);
}

function getDraftIssueId(itemId) {
  // On a besoin du vrai DraftIssue ID (différent du ProjectV2Item ID)
  const result = gh(`{
    node(id: "${itemId}") {
      ... on ProjectV2Item {
        content { ... on DraftIssue { id } }
      }
    }
  }`);
  return result?.data?.node?.content?.id || null;
}

function updateBody(itemId, body) {
  const draftId = getDraftIssueId(itemId);
  if (!draftId) return;
  const safeBody = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  gh(`mutation {
    updateProjectV2DraftIssue(input: {
      draftIssueId: "${draftId}"
      body: "${safeBody}"
    }) { draftIssue { id } }
  }`);
}

function deleteItem(itemId) {
  gh(`mutation {
    deleteProjectV2Item(input: {
      projectId: "${projectId}"
      itemId: "${itemId}"
    }) { deletedItemId }
  }`);
}

// Détecte si deux titres sont des paires FR/EN du même article
// Stratégie : même cluster + même date de publication + un chemin FR et un chemin EN
function findPairs(items) {
  const published = items.filter(i => getField(i, 'Status')?.name === 'Published');

  // Groupe par cluster + date de publication
  const groups = {};
  for (const item of published) {
    const cluster = getField(item, 'Cluster')?.text || '';
    const date = getField(item, 'Publication Date')?.date || '';
    const path = getField(item, 'Article Path')?.text || '';
    const key = `${cluster}||${date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...item, _path: path });
  }

  const pairs = [];
  for (const [key, group] of Object.entries(groups)) {
    if (group.length < 2) continue;

    // Cherche une paire FR + EN dans ce groupe
    const frItems = group.filter(i => i._path && !i._path.startsWith('/en/'));
    const enItems = group.filter(i => i._path && i._path.startsWith('/en/'));

    if (frItems.length === 1 && enItems.length === 1) {
      pairs.push({ fr: frItems[0], en: enItems[0] });
    } else if (frItems.length > 0 && enItems.length > 0) {
      // Plusieurs articles dans le cluster/date — tenter de matcher par slug similaire
      for (const fr of frItems) {
        const frSlug = fr._path.split('/').pop().replace(/-fr$/, '');
        const match = enItems.find(en => {
          const enSlug = en._path.split('/').pop().replace(/-en$/, '');
          // Heuristique : au moins 60% des mots du slug FR dans le slug EN
          const frWords = frSlug.split('-');
          const enWords = enSlug.split('-');
          const common = frWords.filter(w => w.length > 3 && enWords.includes(w)).length;
          return common >= Math.floor(frWords.length * 0.4);
        });
        if (match) pairs.push({ fr, en: match });
      }
    }
  }

  return pairs;
}

async function main() {
  if (!projectId) {
    process.stderr.write('PROJECT_ID non défini\n');
    process.exit(1);
  }

  process.stderr.write('Récupération des cards...\n');
  const items = getAllItems();
  process.stderr.write(`Cards totales : ${items.length}\n`);

  const pairs = findPairs(items);
  process.stderr.write(`Paires FR+EN détectées : ${pairs.length}\n\n`);

  if (pairs.length === 0) {
    process.stdout.write('Aucune paire à fusionner.\n');
    return;
  }

  for (const { fr, en } of pairs) {
    const frPath = fr._path;
    const enPath = en._path;
    const mergedPath = `${frPath} | ${enPath}`;

    process.stdout.write(`Fusion :\n  FR: "${fr.content?.title?.slice(0, 60)}"\n  EN: "${en.content?.title?.slice(0, 60)}"\n`);
    process.stdout.write(`  Article Path → ${mergedPath}\n`);

    if (isDryRun) {
      process.stdout.write(`  [DRY RUN] pas de modification\n\n`);
      continue;
    }

    // 1. Mettre à jour l'Article Path de la card FR avec FR|EN (dédupliqué)
    const parts = [...new Set(mergedPath.split(' | '))];
    updateArticlePath(fr.id, parts.join(' | '));

    // 2. Enrichir le body de la card FR avec le titre ET le chemin EN
    const existingBody = fr.content?.body || '';
    const enSection = `\n\n---\n**EN:** ${en.content?.title || ''}\n${enPath}`;
    const newBody = existingBody.includes('**EN:**') ? existingBody : existingBody + enSection;
    updateBody(fr.id, newBody);

    // 3. Supprimer la card EN
    deleteItem(en.id);

    process.stdout.write(`  ✓ Card EN supprimée (${en.id})\n\n`);
  }

  process.stdout.write('Fusion terminée.\n');
}

main().catch(err => {
  process.stderr.write(`Erreur fatale : ${err.message}\n`);
  process.exit(1);
});
