# Référence blog Astro — be-ikigai

## Framework

Astro 6, collection `blog` dans `src/content/blog/`.

## Schéma frontmatter (src/content.config.ts)

```yaml
title: string           # 60–70 chars, H1 avec mot-clé principal
lang: fr | en           # locale de l'article
description: string     # 110–160 chars, SEO uniquement, jamais affiché
seoKeywords: string?    # mots-clés secondaires
summary: string[]?      # 4 bullets ≤ 200 chars — zone "À retenir"
publishedAt: date?      # YYYY-MM-DDTHH:MM:SS (heure aléatoire 07h–19h)
author: string?         # Pierre-Louis
category: string?       # Reconversion / Sens & Ikigai / Burn-out / Coaching / Management
image: string?          # /images/SLUG-fr.png (1424×752)
readingTime: number?    # minutes de lecture estimées
featured: boolean       # false par défaut
status: draft|published # draft jusqu'à /blog:publish
faq: [{question, answer}]?
```

## Pages

- `src/pages/blog/index.astro` — liste FR
- `src/pages/blog/[slug].astro` — article FR
- `src/pages/[lang]/blog/index.astro` — liste EN
- `src/pages/[lang]/blog/[slug].astro` — article EN

## Filtre draft

Les pages filtrent par `status === 'published'` — les drafts ne sont jamais exposés.

## Images

- Blog cover : 1424×752 px, PNG
- OG social : 1200×630 px, PNG
- Générées par `pipeline/generate-cover.sh` via Gemini API
- Stockées dans `public/images/`

## Règles éditoriales

- Majuscule uniquement : premier mot du titre + noms propres
- Guillemets français « »
- Tutoiement, voix Pierre-Louis directe
- Densité mot-clé 1–2 %, Flesch > 60
- Voir `pipeline/skills-prompt.md` pour les règles complètes
