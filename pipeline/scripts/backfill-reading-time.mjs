import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = resolve(__dirname, '../../src/content/blog');
const dryRun = process.argv.includes('--dry-run');

const files = readdirSync(dir).filter(f => f.endsWith('.md'));
for (const file of files) {
  const path = join(dir, file);
  const content = readFileSync(path, 'utf-8');
  if (/^readingTime:/m.test(content)) {
    console.log(`  skip (exists): ${file}`);
    continue;
  }
  const parts = content.split('---');
  if (parts.length < 3) { console.log(`  no frontmatter: ${file}`); continue; }
  const body = parts.slice(2).join('---');
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  if (dryRun) {
    console.log(`  [dry-run] ${file}: ${readingTime} min (${wordCount} words)`);
    continue;
  }
  // Insert readingTime at end of frontmatter block
  const newContent = parts[0] + '---' + parts[1] + `readingTime: ${readingTime}\n---` + parts.slice(2).join('---');
  writeFileSync(path, newContent, 'utf-8');
  console.log(`  ${file}: ${readingTime} min (${wordCount} words)`);
}
