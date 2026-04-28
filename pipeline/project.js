// pipeline/project.js
import { spawnSync } from 'child_process';
import { PROJECT_CONFIG } from './config.js';

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

  candidates.sort((a, b) => {
    const prioA = a.fieldValues?.nodes?.find(fv => fv.field?.name === 'Priority')?.number ?? null;
    const prioB = b.fieldValues?.nodes?.find(fv => fv.field?.name === 'Priority')?.number ?? null;
    const dateA = a.fieldValues?.nodes?.find(fv => fv.field?.name === 'Publication Date')?.date || '';
    const dateB = b.fieldValues?.nodes?.find(fv => fv.field?.name === 'Publication Date')?.date || '';
    const scoreA = a.fieldValues?.nodes?.find(fv => fv.field?.name === 'Trend Score')?.number || 0;
    const scoreB = b.fieldValues?.nodes?.find(fv => fv.field?.name === 'Trend Score')?.number || 0;

    // 1. Priority renseignée en premier (croissant : 1 avant 2)
    if (prioA !== null && prioB !== null) return prioA - prioB;
    if (prioA !== null) return -1;
    if (prioB !== null) return 1;
    // 2. Publication Date (croissant)
    if (dateA && dateB) return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    if (dateA) return -1;
    if (dateB) return 1;
    // 3. Trend Score (décroissant)
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

export async function setPublicationDate(itemId, date) {
  const { projectId, fields } = PROJECT_CONFIG;
  if (!projectId || !itemId || !fields.publicationDate.id) return;

  // date doit être au format YYYY-MM-DD
  const dateOnly = date.slice(0, 10);
  gh(`mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "${projectId}" itemId: "${itemId}"
      fieldId: "${fields.publicationDate.id}"
      value: { date: "${dateOnly}" }
    }) { projectV2Item { id } }
  }`);
}

export async function createArticleCard(title, group) {
  const { projectId, fields } = PROJECT_CONFIG;
  if (!projectId) return null;

  // Vérifier si une card avec ce titre exact existe déjà
  const existing = getProjectItems().find(item =>
    item.content?.title?.trim().toLowerCase() === title.trim().toLowerCase()
  );
  if (existing) return existing.id;

  const body = buildCardBody(group);
  const safeTitle = title.replace(/"/g, '\\"');
  const safeBody = body.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const result = gh(`mutation {
    addProjectV2DraftIssue(input: {
      projectId: "${projectId}"
      title: "${safeTitle}"
      body: "${safeBody}"
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

export async function createProjectCard(group) {
  const { projectId } = PROJECT_CONFIG;
  if (!projectId) return null;

  const body = buildCardBody(group);

  const existing = getProjectItems().find(item =>
    item.fieldValues?.nodes?.find(fv => fv.field?.name === 'Cluster')?.text === group.cluster.label
  );

  if (existing) {
    const existingStatus = existing.fieldValues?.nodes?.find(fv => fv.field?.name === 'Status')?.name;
    if (existingStatus === 'Detected') {
      await setProjectFields(existing.id, {
        score: group.score,
        cluster: group.cluster.label,
        contentType: group.contentType,
      });
    }
    return existing.id;
  }

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
