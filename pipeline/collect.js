// pipeline/collect.js
import Parser from 'rss-parser';
import googleTrends from 'google-trends-api';
import { RSS_SOURCES, COACHING_KEYWORDS, TRENDS_KEYWORDS, LOOKBACK_DAYS, LOOKBACK_DAYS_EXTENDED } from './config.js';
import { collectSearch } from './collect-search.js';
import { collectEvergreen } from './evergreen.js';

const parser = new Parser({ timeout: 10000 });

function cutoffDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function isWithin(dateStr, days) {
  if (!dateStr) return false;
  return new Date(dateStr) >= cutoffDate(days);
}

function matchesCoachingKeywords(text) {
  const lower = text.toLowerCase();
  return COACHING_KEYWORDS.some(kw => lower.includes(kw));
}

function parseItems(feed, source, days, seen) {
  const results = [];
  for (const item of feed.items || []) {
    if (!item.link || seen.has(item.link)) continue;
    if (!isWithin(item.pubDate || item.isoDate, days)) continue;
    const text = `${item.title || ''} ${item.contentSnippet || ''}`;
    if (source.type === 'presse_nationale' && !matchesCoachingKeywords(text)) continue;
    seen.add(item.link);
    results.push({
      title: item.title || '',
      url: item.link,
      source: source.label,
      sourceType: source.type,
      date: item.pubDate || item.isoDate || '',
      abstract: text.slice(0, 500),
    });
  }
  return results;
}

export async function collectRSS() {
  const items = [];
  const seen = new Set();
  const nicheTypes = new Set(['blogs_autorite', 'presse_specialisee']);

  for (const source of RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      let parsed = parseItems(feed, source, LOOKBACK_DAYS, seen);

      // Fallback 180 jours pour sources niche sans résultat sur 60 jours
      if (parsed.length === 0 && nicheTypes.has(source.type)) {
        parsed = parseItems(feed, source, LOOKBACK_DAYS_EXTENDED, seen);
        if (parsed.length > 0) {
          process.stderr.write(`Extended lookback [${source.label}]: ${parsed.length} items\n`);
        }
      }

      items.push(...parsed);
    } catch (err) {
      process.stderr.write(`RSS error [${source.label}]: ${err.message}\n`);
    }
  }

  return items;
}

export async function collectGoogleTrends() {
  const trendScores = {};
  const risingQueries = [];
  const batches = [];

  for (let i = 0; i < TRENDS_KEYWORDS.length; i += 5) {
    batches.push(TRENDS_KEYWORDS.slice(i, i + 5));
  }

  for (const batch of batches) {
    try {
      const result = await googleTrends.interestOverTime({
        keyword: batch,
        startTime: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
        geo: 'FR',
      });
      const data = JSON.parse(result);
      const timelineData = data?.default?.timelineData || [];

      if (timelineData.length > 0) {
        batch.forEach((kw, idx) => {
          const values = timelineData.map(p => p.value?.[idx] || 0).filter(v => v > 0);
          trendScores[kw] = values.length
            ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
            : 0;
        });
      }

      for (const kw of batch) {
        try {
          const relResult = await googleTrends.relatedQueries({
            keyword: kw,
            startTime: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
            geo: 'FR',
          });
          const relData = JSON.parse(relResult);
          const rising = relData?.default?.rankedList?.[1]?.rankedKeyword || [];
          rising.slice(0, 5).forEach(item => {
            if (item.query && !risingQueries.includes(item.query)) risingQueries.push(item.query);
          });
        } catch {
          // relatedQueries non disponible pour ce mot-clé — ignoré
        }
        await new Promise(r => setTimeout(r, 500));
      }

      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      process.stderr.write(`Trends error [${batch[0]}]: ${err.message}\n`);
    }
  }

  process.stderr.write(`Trends: ${Object.keys(trendScores).length} mots-clés scorés, ${risingQueries.length} requêtes en hausse\n`);
  return { trendScores, risingQueries };
}

export async function collectAll() {
  const [rssItems, searchItems, { trendScores, risingQueries }] = await Promise.all([
    collectRSS(),
    collectSearch(),
    collectGoogleTrends(),
  ]);
  const evergreenItems = collectEvergreen();
  return { items: [...rssItems, ...searchItems, ...evergreenItems], trendScores, risingQueries };
}
