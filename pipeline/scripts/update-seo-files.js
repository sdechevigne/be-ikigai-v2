#!/usr/bin/env node
/**
 * Régénère public/llms.txt et public/llms-full.txt depuis les articles publiés.
 * Appelé par les GitHub Actions après toute modification d'articles.
 *
 * Usage : node pipeline/scripts/update-seo-files.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const BASE_URL = 'https://be-ikigai.com';

// --- Parse frontmatter (no deps) ---
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)/);
    if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return fm;
}

// --- Collect published articles ---
const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));

const articles = files
  .map(f => {
    const content = readFileSync(join(BLOG_DIR, f), 'utf8');
    const fm = parseFrontmatter(content);
    if (fm.status !== 'published') return null;
    const slug = f.replace(/\.md$/, '');
    const lang = fm.lang || 'fr';
    const url = lang === 'en'
      ? `${BASE_URL}/en/blog/${slug}/`
      : `${BASE_URL}/blog/${slug}/`;
    return { slug, lang, title: fm.title || slug, description: fm.description || '', category: fm.category || '', url };
  })
  .filter(Boolean)
  .sort((a, b) => {
    // FR before EN, then alphabetical by slug
    if (a.lang !== b.lang) return a.lang === 'fr' ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });

const articlesFR = articles.filter(a => a.lang === 'fr');
const articlesEN = articles.filter(a => a.lang === 'en');

// --- llms.txt static header (preserved) ---
const LLMS_HEADER = `# be-ikigai.com

> be-ikigai est un service de coaching personnel basé sur la philosophie japonaise de l'Ikigai, fondé par Pierre-Louis à Paris. Le site est disponible en français et en anglais.

> be-ikigai is a personal coaching service based on the Japanese philosophy of Ikigai, founded by Pierre-Louis in Paris. The website is available in French and English.

## À propos / About

be-ikigai aide les personnes à trouver leur raison d'être grâce à un accompagnement authentique et bienveillant basé sur l'Ikigai, une philosophie millénaire née sur l'île d'Okinawa au Japon.

be-ikigai helps people find their reason for being through authentic and caring coaching based on Ikigai, a thousand-year-old philosophy born on the island of Okinawa in Japan.

### Services proposés / Services Offered

- **Séance Découverte Ikigai / Ikigai Discovery Session**: 30 minutes gratuites pour explorer votre Ikigai. / 30 free minutes to explore your Ikigai.
- **Programme Ikigai Complet / Full Ikigai Program**: Coaching personnalisé complet pour trouver sa raison d'être. / Complete personalized coaching to find your reason for being. (300€)

### Le concept Ikigai / The Ikigai Concept

L'Ikigai se trouve à l'intersection de quatre dimensions fondamentales :
1. Ce que vous aimez (votre passion)
2. Ce dont le monde a besoin (votre mission)
3. Ce pour quoi vous pouvez être payé (votre profession)
4. Ce pour quoi vous êtes doué (votre vocation)

Ikigai is found at the intersection of four fundamental dimensions:
1. What you love (your passion)
2. What the world needs (your mission)
3. What you can be paid for (your profession)
4. What you are good at (your vocation)

### Le fondateur / The Founder

Pierre-Louis est un Coach Ikigai Certifié basé à Paris (75007). Fort d'un parcours professionnel international (Amérique Latine, États-Unis, Afrique, Moyen-Orient, Asie, Europe), il a fait de sa passion pour l'accompagnement sa mission.

Pierre-Louis is a Certified Ikigai Coach based in Paris (75007). With an international professional background (Latin America, USA, Africa, Middle East, Asia, Europe), he turned his passion for coaching into his mission.

## Pages du site / Site Pages

- [Accueil / Home (FR)](https://be-ikigai.com/)
- [Home (EN)](https://be-ikigai.com/en/)
- [Blog (FR)](https://be-ikigai.com/blog/)
- [Blog (EN)](https://be-ikigai.com/en/blog/)
- [Tarifs / Pricing (FR)](https://be-ikigai.com/tarifs)
- [Pricing (EN)](https://be-ikigai.com/en/pricing)
`;

const LLMS_FOOTER = `
## Contact

- Email: pierrelouis@be-ikigai.com
- Adresse: Rue du Bac, 75007 Paris, France
- Horaires: Lundi-Vendredi 09:00-18:00

## Réseaux sociaux / Social Media

- X (Twitter): https://x.com/be_ikigai_com
- TikTok: https://www.tiktok.com/@be_ikigai
- YouTube: https://www.youtube.com/@beikigai
- Musique Ikigai: https://music.be-ikigai.com

## Informations supplémentaires / Additional Information

- Zones desservies: France, Belgique, Suisse, Luxembourg, Pays-Bas
- Langues: Français, English
- Note moyenne: 5.0/5 (3 avis)
`;

// --- Build articles sections ---
function buildArticleLines(list) {
  return list.map(a => {
    const cat = a.category ? ` — Catégorie : ${a.category}` : '';
    const desc = a.description ? `. ${a.description}` : '';
    return `- [${a.title}](${a.url})${desc}${cat}`;
  }).join('\n');
}

const llmsTxt = [
  LLMS_HEADER,
  `## Articles de blog (FR) / Blog Articles (FR)\n\n${buildArticleLines(articlesFR)}`,
  `\n## Blog Articles (EN) / Articles de blog (EN)\n\n${buildArticleLines(articlesEN)}`,
  LLMS_FOOTER,
].join('\n');

writeFileSync(join(ROOT, 'public/llms.txt'), llmsTxt, 'utf8');
console.log(`llms.txt mis à jour — ${articlesFR.length} FR, ${articlesEN.length} EN`);

// --- llms-full.txt : append articles section at the end ---
const fullPath = join(ROOT, 'public/llms-full.txt');
let fullContent = readFileSync(fullPath, 'utf8');

// Replace everything from "## 8. Blog" onwards
const blogSectionMarker = '\n## 8. Blog';
const idx = fullContent.indexOf(blogSectionMarker);
const staticPart = idx !== -1 ? fullContent.slice(0, idx) : fullContent.trimEnd();

const articlesFull = [...articlesFR, ...articlesEN].map(a => {
  const langLabel = a.lang === 'en' ? '(EN)' : '(FR)';
  return `- ${langLabel} **[${a.title}](${a.url})** — ${a.description}`;
}).join('\n');

const newBlogSection = `
## 8. Blog

Le blog de be-ikigai propose des articles sur la philosophie Ikigai, le développement personnel et le coaching, disponibles en français et en anglais.

The be-ikigai blog features articles about Ikigai philosophy, personal development and coaching, available in French and English.

- Blog (FR): ${BASE_URL}/blog/
- Blog (EN): ${BASE_URL}/en/blog/

### Articles disponibles / Available Articles

${articlesFull}
`;

writeFileSync(fullPath, staticPart + newBlogSection, 'utf8');
console.log(`llms-full.txt mis à jour — ${articles.length} articles au total`);
