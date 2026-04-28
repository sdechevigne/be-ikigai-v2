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

// Génère 2-3 titres d'articles concrets à partir des signaux d'un cluster
export function suggestArticleTitles(group) {
  const titles = [];
  const cluster = group.cluster;

  // 1. Titres evergreen existants du cluster (angles déjà rédigés)
  for (const angle of (group.evergreenAngles || []).slice(0, 2)) {
    if (angle && angle.length > 10) titles.push(angle);
  }

  // 2. Titres issus des topItems RSS/Reddit (signal chaud)
  for (const item of (group.topItems || []).slice(0, 3)) {
    if (!item.title || item.title.length < 10) continue;
    // Reformuler légèrement pour le contexte ikigai/coaching
    const t = item.title.trim();
    if (!titles.some(existing => existing.toLowerCase().includes(t.slice(0, 20).toLowerCase()))) {
      titles.push(t);
    }
  }

  // 3. Fallback : titre générique basé sur le cluster
  if (titles.length === 0) {
    titles.push(`${cluster.label} : comprendre et agir — guide pratique be-ikigai`);
  }

  // Retourner 2-3 titres max, dédupliqués
  return [...new Set(titles)].slice(0, 3);
}

export function classifyAndScore(items, trendScores, risingQueries) {
  const groups = {};

  for (const item of items) {
    // Les evergreen ont un cluster hint direct, sinon on classifie par keywords
    const clusterKey = item._cluster || classifyItem(item);
    if (!clusterKey) continue;

    if (!groups[clusterKey]) {
      groups[clusterKey] = { items: [], sourceTypes: new Set(), evergreenBoost: 0 };
    }
    groups[clusterKey].items.push(item);
    groups[clusterKey].sourceTypes.add(item.sourceType);

    // Les evergreen contribuent un score fixe au cluster (pas compté comme article classique)
    if (item._evergreen) {
      groups[clusterKey].evergreenBoost = Math.max(
        groups[clusterKey].evergreenBoost,
        item._evergreenScore || 0
      );
    }
  }

  const results = [];

  for (const [clusterKey, group] of Object.entries(groups)) {
    let score = 0;

    for (const type of group.sourceTypes) {
      const nonEvergreen = group.items.filter(i => i.sourceType === type && !i._evergreen);
      score += (WEIGHTS[type] || 1) * nonEvergreen.length;
    }

    const trendVal = getTrendScore(clusterKey, trendScores);
    const risingVal = getRisingScore(clusterKey, risingQueries);
    score += trendVal * WEIGHTS.google_trends;
    score += risingVal * WEIGHTS.rising_queries;
    score += group.evergreenBoost;

    if (score < SCORE_THRESHOLD) continue;

    const realItems = group.items.filter(i => !i._evergreen);
    const evergreenItems = group.items.filter(i => i._evergreen);
    const representativeItem = (realItems.length ? realItems : evergreenItems)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    results.push({
      clusterKey,
      cluster: CLUSTERS[clusterKey],
      score: Math.round(score * 10) / 10,
      itemCount: realItems.length,
      evergreenCount: evergreenItems.length,
      contentType: suggestContentType(clusterKey, representativeItem),
      topItems: realItems.slice(0, 5),
      evergreenAngles: evergreenItems.map(i => i.title),
      trendScore: Math.round(trendVal),
      risingMatches: risingVal,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
