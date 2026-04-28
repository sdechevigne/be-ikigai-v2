// pipeline/collect.js
import Parser from 'rss-parser';
import googleTrends from 'google-trends-api';
import { RSS_SOURCES, COACHING_KEYWORDS, TRENDS_KEYWORDS, LOOKBACK_DAYS, LOOKBACK_DAYS_EXTENDED } from './config.js';

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

      const relatedRes = await googleTrends.relatedQueries({ keyword: batch[0], geo: 'FR' });
      const relatedData = JSON.parse(relatedRes);
      const rising = relatedData?.default?.rankedList?.[1]?.rankedKeyword || [];
      risingQueries.push(...rising.map(r => r.query?.toLowerCase() || ''));
    } catch (err) {
      process.stderr.write(`Trends error [${batch[0]}]: ${err.message}\n`);
    }

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
