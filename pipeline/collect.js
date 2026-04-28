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
