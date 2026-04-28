# Be-Ikigai — Standards éditoriaux blog

## Contexte et mission

Be-Ikigai est un cabinet de coaching de carrière fondé par Pierre-Louis. Il accompagne les jeunes professionnels (25–40 ans) qui se sentent à l'étroit dans leur travail : pas de burn-out déclaré, juste ce vide, ce décalage entre ce qu'ils montrent et ce qu'ils ressentent. L'offre centrale : un diagnostic de destinée en 48h pour 580€, satisfait ou remboursé. Le blog sert à capter des lecteurs en souffrance douce et à les convertir en clients.

## Public cible

Jeunes professionnels 25–40 ans, urbains, CDI ou freelance, revenus corrects, vie sociale active — mais quelque chose sonne creux. Ils cherchent « reconversion », « sens au travail », « ikigai » sur Google. Ils lisent vite, en mobile, entre deux réunions.

## Voix et ton

- Tutoiement (« tu »), jamais de vouvoiement
- Direct, concret, légèrement incisif — Pierre-Louis n'est pas un coach bienveillant générique
- Pas de jargon coaching : pas d'« alignement », « posture », « ancrage », « bienveillance », « authenticité » au sens vague
- Humour possible, autodérision bienvenue
- Opinion assumée : Pierre-Louis a un point de vue, il ne ménage pas les faux-semblants
- Langage motivant et clair, engageant sans être commercial

## Structure d'article

```
Accroche terrain (scénario concret, 100–150 mots)
→ Contexte / chiffres récents sourcés
→ Problème nommé clairement
→ Solution / analyse
→ Angle be-ikigai (naturel, non forcé — omis si ça ne colle pas)
→ CTA (micro-CTA contextuels + CTA final fort)
```

## Format et longueur

- **1 500–2 000 mots** (guides pratiques : jusqu'à 2 500)
- H1 unique avec mot-clé principal
- ≥ 4 H2, H3 pour approfondissements
- Phrases ≤ 20 mots, lisibilité Flesch > 60
- Listes à puces pour les étapes / exemples
- Tableaux pour les comparaisons (extraction IA prioritaire)
- ≥ 2 liens internes + 1 lien externe (source d'autorité)

## SEO et optimisation

- Mot-clé principal dans : H1, métadescription, intro (100 premiers mots), corps (densité 1–2 %)
- Première phrase de chaque section H2 = réponse directe (featured snippet)
- H2/H3 formulés comme questions quand c'est naturel
- Formulations naturelles pour la recherche vocale
- 2–3 suggestions d'images avec alt text SEO
- Optimisation GEO (extraction par IA) : tableaux, listes numérotées, statistiques sourcées, citations nommées
- Sources nommées : Prénom Nom, Titre, Organisation, Année — jamais « selon les experts »

## Règles typographiques strictes

- Majuscule uniquement : premier mot d'un titre/phrase + noms propres
- Guillemets français `« »` avec espaces insécables
- Espaces insécables avant `: ; ? !`
- Temps : présent pour explications, passé composé pour exemples vécus
- Accords sujet/verbe et participes passés corrects
- Synonymes pour éviter les répétitions

## Frontmatter attendu

```yaml
---
title: "H1 avec mot-clé principal, 60–70 chars"
lang: fr   # ou en
description: "Métadescription SEO, 110–160 chars exactement, jamais affichée sur le site"
seoKeywords: mot-clé 1, mot-clé 2, mot-clé 3, mot-clé 4
summary:
  - "Fait concret — spoile la conclusion principale (≤200 chars)"
  - "Règle ou chiffre à retenir (≤200 chars)"
  - "Quoi faire concrètement — actionnable (≤200 chars)"
  - "Conseil ou mise en garde (≤200 chars)"
publishedAt: YYYY-MM-DDTHH:MM:SS
author: Pierre-Louis
category: Reconversion   # Sens & Ikigai / Burn-out / Coaching / Management
image: /images/SLUG.png
readingTime: N
featured: false
status: draft
faq:
  - question: "Question ciblée snippet ?"
    answer: "Réponse concise, ≤150 chars."
---
```

## Règles absolues anti-IA

**ZÉRO tirets longs (—)** — remplacer par virgule, point, deux-points ou parenthèses.

**Mots interdits :**
- Buzzwords génériques : `essentiel`, `crucial`, `fondamental`, `incontournable`, `paradigme`, `écosystème`, `levier`, `optimiser`, `fluidifier`, `synergies`, `disruption`
- Faux-semblants coaching : `alignement` (sens vague), `posture`, `ancrage`, `bienveillance`, `authenticité`, `accompagnement holistique`, `transformation profonde`
- Transitions IA : `de plus`, `par ailleurs`, `il convient de noter`, `il est important de`, `en outre`, `notamment`, `il est à noter`, `en conclusion`, `au cœur de`, `dans le paysage actuel`, `à l'heure où`
- Superlatifs creux : `marque un tournant décisif`, `démontre un engagement envers`, `témoigne de`, `reflète une tendance profonde`

**Patterns à corriger :**
- Attributions vagues → sources nommées (Nom, Titre, Org, Année)
- Fausse modestie → énoncé direct
- Parallélismes forcés → reformuler
- Listes de trois systématiques → varier
- Paragraphes uniformes → varier la longueur (certains 1 phrase, d'autres 5–6)
- Adverbes de liaison en début de phrase → max 1 par 500 mots
- Guillemets courbes → guillemets français `« »`
- Tilde `~` pour « environ » → `environ`

**Émojis :** zéro.
**Gras :** max 2–3 par section H2. Pas de têtes de liste en gras avec deux-points.

## Section références (obligatoire)

```markdown
## Références

1. [Titre](URL) — Type/Source, Date
2. [Titre](URL) — Type/Source, Date
```

Citations inline : `<sup>[N](#fn-N)</sup>`

## Audit anti-IA final

Avant d'émettre `::done::`, lister les signaux IA résiduels et les corriger. Rechercher une dernière fois les tirets longs. Vérifier :
- Densité mot-clé principal (1–2 %)
- Lisibilité (score Flesch > 60)
- Diversité lexicale (pas de répétitions)
- Première phrase de chaque H2 = réponse directe
- FAQ 5 questions ciblées snippets
- Suggestions schema.org
- Résumé social 4–6 bullets ≤ 200 chars + hashtags
