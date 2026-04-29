# Phase 2 — Rédaction

Les notes de recherche et le contexte sujet sont fournis ci-dessous dans les sections "Notes de recherche (injectées)" et "Contexte sujet".

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

> **À retenir**
> - [Bullet 1 — fait concret ou chiffre clé, ≤200 chars]
> - [Bullet 2 — règle ou insight actionnable, ≤200 chars]
> - [Bullet 3 — quoi faire concrètement, ≤200 chars]
> - [Bullet 4 — conseil ou mise en garde, ≤200 chars]
> - [Bullet 5 optionnel, ≤200 chars]
> - [Bullet 6 optionnel, ≤200 chars]

[Introduction 200–300 mots avec accroche terrain + mot-clé dans les 100 premiers mots]

## [H2 — question ou titre direct]

[Première phrase = réponse directe (featured snippet)]

[Corps de la section avec exemples concrets, statistiques sourcées, témoignages]

[Micro-CTA contextuel intégré naturellement dans le corps si pertinent]

### [H3 si approfondissement]

[4–5 sections H2 minimum]

**Ne pas inclure de balises image dans le corps de l'article** — les images sont générées séparément par le pipeline.

## Conclusion

[200 mots + CTA fort]

## FAQ

[5 questions ciblées snippets]
```

**⚠️ Les sections suivantes sont des métadonnées de production — NE PAS les inclure dans le fichier `.md` de l'article. Les écrire en dehors du contenu publié, après les deux articles.**

### Suggestions schema.org (hors article)

[Types pertinents : Article, FAQPage, HowTo selon le type de contenu]

### Résumé social (hors article)

[4–6 bullets ≤ 200 chars chacun + hashtags pertinents]

### Références (hors article)

1. [Titre](URL) — Type/Source, Date

## Mapping cluster → catégorie

Valeurs autorisées pour `category` (liste **strictement fermée**, toute autre valeur est invalide) :
`Ikigai` · `Sens au travail` · `Transition professionnelle` · `Philosophie de vie` · `Coaching`

| Cluster | category à utiliser |
|---------|---------------------|
| Reconversion | `Transition professionnelle` |
| Sens & Ikigai | `Sens au travail` |
| Burn-out & Épuisement | `Coaching` |
| Coaching & Bilan | `Coaching` |
| Management & Leadership | `Sens au travail` |

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
category: Transition professionnelle
image: /assets/img/blog/YYYY-MM-DD-slug-fr.webp
featured: false
status: draft
faq:
  - question: "?"
    answer: "Réponse concise."
---
```

## Frontmatter EN

Même structure, `lang: en`, title/description/seoKeywords en anglais, `image: /assets/img/blog/YYYY-MM-DD-slug-fr.webp` (même image que le FR).

## Nommage des fichiers

- FR : `src/content/blog/YYYY-MM-DD-slug-fr.md` — slug = titre FR en kebab-case ASCII sans accents, tronqué à 55 chars
- EN : `src/content/blog/YYYY-MM-DD-slug-en.md` — slug = titre EN en kebab-case ASCII, tronqué à 55 chars (traduction du slug FR, pas le même slug)

Exemple : titre FR "Pourquoi ton boss a 10 ans de retard" → slug FR `pourquoi-ton-boss-a-10-ans-de-retard` / slug EN `why-your-boss-is-10-years-behind`

Sauvegarde les deux fichiers.

Émets les deux markers :
`::draft-path:src/content/blog/YYYY-MM-DD-slug-fr.md::`
`::draft-path-en:src/content/blog/YYYY-MM-DD-slug-en.md::`
