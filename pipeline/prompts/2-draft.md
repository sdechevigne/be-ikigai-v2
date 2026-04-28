# Phase 2 — Rédaction

Lis `pipeline/research-notes.md` et `pipeline/card-body.md`.

Lis 2 articles existants dans `src/content/blog/` pour calibrer le ton.

## Règles de rédaction

Tu écris **deux articles complets** dans la même passe :
1. Version française (`lang: fr`) — tutoiement, voix Pierre-Louis directe
2. Version anglaise (`lang: en`) — "you", même voix, ton adapté EN

Respecte toutes les règles de `pipeline/skills-prompt.md`.

## Format par type de contenu

| Type | Longueur | Spécificités |
|------|----------|--------------|
| guide-pratique | 2 000–2 500 mots | Étapes numérotées, tableau récap final |
| conseil-ikigai | 1 500–2 000 mots | Exercice pratique en fin d'article |
| analyse-tendance | 1 200–1 800 mots | Chiffres récents, avant/après, impact concret |
| comparatif | 2 500–3 200 mots | Tableau comparatif (cible extraction IA), guide de décision |
| temoignage | 1 200–1 800 mots | Histoire anonymisée, arc narratif, leçon universelle |
| actualite | 900–1 400 mots | Faits d'abord, contexte, impact lecteur |

## Structure obligatoire de chaque article

```
[frontmatter complet]

[Introduction 200–300 mots avec accroche terrain + mot-clé dans les 100 premiers mots]

## [H2 — question ou titre direct]

[Première phrase = réponse directe (featured snippet)]

[Corps de la section]

### [H3 si approfondissement]

[4–5 sections H2 minimum]

## Conclusion

[200 mots + CTA fort]

## FAQ

[5 questions ciblées snippets]

## Suggestions schema.org

[Types pertinents : Article, FAQPage, HowTo selon le type de contenu]

## Résumé social

[4–5 bullets ≤ 200 chars + hashtags pertinents]

## Références

1. [Titre](URL) — Type/Source, Date
```

## Frontmatter FR

```yaml
---
title: "Mot-clé principal en français, 60–70 chars"
lang: fr
description: "Métadescription SEO 110–160 chars, jamais affichée"
seoKeywords: mot-clé 1, mot-clé 2, mot-clé 3
summary:
  - "Bullet 1 (≤200 chars)"
  - "Bullet 2 (≤200 chars)"
  - "Bullet 3 (≤200 chars)"
  - "Bullet 4 (≤200 chars)"
publishedAt: ${PUBLISH_DATETIME}
author: Pierre-Louis
category: Reconversion
image: /images/SLUG-fr.png
readingTime: N
featured: false
status: draft
faq:
  - question: "?"
    answer: "Réponse concise."
---
```

## Frontmatter EN

Même structure, `lang: en`, title/description/seoKeywords en anglais, `image: /images/SLUG-en.png`.

## Nommage des fichiers

- FR : `src/content/blog/YYYY-MM-DD-slug-fr.md`
- EN : `src/content/blog/YYYY-MM-DD-slug-en.md`

Où `slug` est le titre FR en kebab-case ASCII sans accents, tronqué à 55 chars.

Sauvegarde les deux fichiers.

Émets `::draft-path:src/content/blog/YYYY-MM-DD-slug-fr.md::` (le EN est inféré).
