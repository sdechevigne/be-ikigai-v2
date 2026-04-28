// pipeline/classify.js
import { CLUSTERS, WEIGHTS, SCORE_THRESHOLD } from './config.js';

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
