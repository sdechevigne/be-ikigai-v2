# Design spec — Pipeline blog be-ikigai

**Date :** 2026-04-28  
**Statut :** approuvé  
**Modèle de référence :** MesChasses (pipeline/ + .claude/commands/blog/)

---

## Objectif

Mettre en place un pipeline de publication d'articles blog entièrement automatisé, calqué sur le pipeline MesChasses, avec :

- Découverte automatique de sujets tendance (RSS + Google Trends)
- Rédaction 3 phases orchestrée par **Gemini CLI** (par défaut)
- Génération d'images de couverture via **Gemini API**
- Suivi éditorial dans **GitHub Projects V2**
- Publication automatique via **GitHub Actions** (toutes les 48h)
- Commandes Claude `/blog:draft`, `/blog:status`, `/blog:publish`, `/blog:regen-cover`

---

## Architecture

```
Scan tendances (lundi 07h00 UTC, GH Actions blog-trend-scan.yml)
  └─ pipeline/index.js → GitHub Projects V2 (cartes "Detected")
        └─ Draft (toutes les 48h, 08h00 UTC, GH Actions blog-draft.yml)
              └─ pipeline/draft.sh  [LLM=gemini par défaut]
                    ├─ Phase 1 : recherche (WebSearch, WebFetch, Read, Write)
                    ├─ Phase 2 : rédaction (Read, Write, WebSearch)
                    └─ Phase 3 : humanisation (Read, Edit)
                          └─ src/content/blog/YYYY-MM-DD-slug.md (status: draft)
                                └─ Publish (blog-publish.yml, manuel workflow_dispatch)
                                      └─ status: published + commit sur master
```

---

## Fichiers à créer

```
pipeline/
  config.js
  collect.js
  classify.js
  project.js
  index.js
  draft.sh
  generate-cover.sh
  skills-prompt.md
  mcp.json
  prompts/
    1-research.md
    2-draft.md
    3-humanize.md

.github/workflows/
  blog-trend-scan.yml
  blog-draft.yml
  blog-publish.yml

.claude/commands/blog/
  draft.md
  status.md
  publish.md
  regen-cover.md

.claude/references/
  PIPELINE.md
  BLOG.md
```

---

## Sources de données (config.js)

### Scoring weights

| Source | Poids |
|--------|-------|
| Presse nationale (Le Monde, Les Echos) | 4 |
| Presse spécialisée RH/coaching | 3 |
| Blogs d'autorité (HBR France, Psychologies) | 2 |
| Google Trends interestOverTime | 2 |
| Google Trends rising queries | 3 |
| Forums / Reddit | 1 |

**Score minimum :** 5 points  
**Fenêtre de lookback :** 14 jours

### Feeds RSS (≥20 sources)

- Le Monde Emploi — `https://www.lemonde.fr/emploi/rss_full.xml`
- Les Echos Executives — `https://executives.lesechos.fr/rss.xml`
- Capital — `https://www.capital.fr/rss.xml`
- Cadremploi Mag — `https://www.cadremploi.fr/editorial/rss`
- Management Magazine — `https://www.management.fr/rss.xml`
- Harvard Business Review France — `https://www.hbrfrance.fr/rss.xml`
- Psychologies Magazine — `https://www.psychologies.com/rss.xml`
- Linkedin Pulse (agrégateur RH) — à confirmer
- Welcome to the Jungle Mag — `https://www.welcometothejungle.com/fr/articles/rss`
- Maddyness (startups/travail) — `https://www.maddyness.com/rss.xml`
- L'Express Emploi — `https://www.lexpress.fr/emploi/rss.xml`
- Figaro Emploi — `https://www.lefigaro.fr/emploi/rss.xml`
- Courrier Cadres — `https://www.courriercadres.com/feed/`
- Hellowork Mag — `https://www.hellowork.com/fr-fr/medias/rss`
- Parlons RH — `https://www.parlonsrh.com/feed/`
- e-rh.org — `https://www.e-rh.org/rss`

### Google Trends keywords (20)

| Catégorie | Mots-clés |
|-----------|-----------|
| Génériques | ikigai, sens au travail, reconversion professionnelle, burn-out, malaise au travail |
| Outils | bilan de compétences, CPF reconversion, coaching de carrière, ikigai exercice |
| Contexte | travail hybride, fatigue managériale, démission silencieuse, quête de sens, quiet quitting |
| Transitions | changer de métier, carrière épanouissante, trouver sa voie, souffrance au travail |
| Spécifiques | ikigai au travail, méthode ikigai, raison d'être professionnelle |

### 5 clusters thématiques

| Cluster | Mots-clés | Types de contenu |
|---------|-----------|-----------------|
| Reconversion | reconversion, changer de métier, démissionner, pivot, changer de voie | guide-pratique, temoignage |
| Sens & Ikigai | ikigai, sens au travail, mission, vocation, purpose, raison d'être | conseil-ikigai, analyse-tendance |
| Burn-out & Épuisement | burn-out, épuisement, fatigue, démission silencieuse, quiet quitting | actualite, guide-pratique |
| Coaching & Bilan | bilan de compétences, CPF, coaching, accompagnement, diagnostic | comparatif, guide-pratique |
| Management & Leadership | management, leadership, culture d'entreprise, équipe, manager toxique | analyse-tendance, conseil |

---

## draft.sh — comportement

Copie exacte de MesChasses avec ces adaptations :

- `LLM=gemini` par défaut (variable d'environnement)
- `git push origin master` (branche master, pas main)
- Prompt cover image coaching/lifestyle (pas chasse)
- Marqueurs de phase identiques : `::research-done::`, `::draft-path::`, `::done::`
- Mode reprise identique : `RESUME_SLUG=2026-04-28-mon-article bash pipeline/draft.sh`
- Mode URL identique : `DRAFT_FROM_URL=true` avec `.card-body.md` pré-rempli
- Validation Astro : `npx astro sync` + correction automatique frontmatter

---

## skills-prompt.md — standards éditoriaux

### Contexte & mission

Be-Ikigai est un cabinet de coaching de carrière fondé par Pierre-Louis. Il accompagne les jeunes professionnels (25–40 ans) qui se sentent à l'étroit dans leur travail : pas de burn-out déclaré, juste ce vide, ce décalage entre ce qu'ils montrent et ce qu'ils ressentent. L'offre centrale : un diagnostic de destinée en 48h pour 580€, satisfait ou remboursé. Le blog sert à capter des lecteurs en souffrance douce et à les convertir en clients.

### Public cible

Jeunes professionnels 25–40 ans, urbains, CDI ou freelance, revenus corrects, vie sociale active — mais quelque chose sonne creux. Ils cherchent « reconversion », « sens au travail », « ikigai » sur Google. Ils lisent vite, en mobile, entre deux réunions.

### Voix et ton

- Tutoiement (« tu »), jamais de vouvoiement
- Direct, concret, légèrement incisif — Pierre-Louis n'est pas un coach bienveillant générique
- Pas de jargon coaching : pas d'« alignement », « posture », « ancrage », « bienveillance », « authenticité » au sens vague
- Humour possible, autodérision bienvenue
- Opinion assumée : Pierre-Louis a un point de vue, il ne ménage pas les faux-semblants

### Structure d'article

```
Accroche terrain (scénario concret, 100–150 mots)
→ Contexte / chiffres récents
→ Problème nommé clairement
→ Solution / analyse
→ Angle be-ikigai (naturel, non forcé — omis si ça ne colle pas)
→ CTA (micro-CTA contextuels + CTA final)
```

### Format et longueur

- **1 500–2 000 mots** (guides pratiques : jusqu'à 2 500)
- H1 unique avec mot-clé principal
- ≥ 4 H2, H3 pour approfondissements
- Phrases ≤ 20 mots, score Flesch > 60
- Listes à puces pour les étapes / exemples
- Tableaux pour les comparaisons (extraction IA prioritaire)
- ≥ 2 liens internes + 1 lien externe (source d'autorité)

### SEO et optimisation

- Mot-clé principal dans : H1, métadescription, intro (100 premiers mots), corps (densité 1–2 %)
- Première phrase de chaque section H2 = réponse directe (extraction featured snippet)
- H2/H3 formulés comme questions quand c'est naturel
- Formulations naturelles pour la recherche vocale
- 2–3 suggestions d'images avec alt text SEO
- FAQ 5 questions ciblées pour les rich snippets
- Suggestions schema.org pertinentes
- Résumé social (4–5 bullets ≤ 200 chars chacun) + hashtags

### Règles typographiques strictes

- Majuscule uniquement : premier mot d'un titre/phrase + noms propres
- Guillemets français `« »` avec espaces insécables
- Espaces insécables avant `: ; ? !`
- Temps : présent pour explications, passé composé pour exemples vécus
- Accords sujet/verbe et participes passés corrects

### Frontmatter attendu

```yaml
---
title: "H1 avec mot-clé principal, 60–70 chars"
lang: fr
description: "Métadescription SEO, 110–160 chars exactement, jamais affichée sur le site"
seoKeywords: mot-clé 1, mot-clé 2, mot-clé 3, mot-clé 4
summary:
  - "Fait concret — spoile la conclusion principale (≤200 chars)"
  - "Règle ou chiffre à retenir (≤200 chars)"
  - "Quoi faire concrètement — actionnable (≤200 chars)"
  - "Conseil ou mise en garde (≤200 chars)"
publishedAt: YYYY-MM-DDTHH:MM:SS
author: Pierre-Louis
category: Reconversion  # ou : Sens & Ikigai / Burn-out / Coaching / Management
image: /images/SLUG.png
readingTime: N
featured: false
status: draft
faq:
  - question: "Question ciblée snippet ?"
    answer: "Réponse concise, ≤150 chars."
---
```

### Règles absolues anti-IA

**Zéro tirets longs (—)** — remplacer par virgule, point, deux-points ou parenthèses.

**Mots interdits (supprimer ou remplacer) :**
- Buzzwords génériques : `essentiel`, `crucial`, `fondamental`, `incontournable`, `paradigme`, `écosystème`, `levier`, `optimiser`, `fluidifier`, `synergies`, `disruption`
- Faux-semblants coaching : `alignement` (sens vague), `posture`, `ancrage`, `bienveillance`, `authenticité`, `accompagnement holistique`, `transformation profonde`
- Transitions IA : `de plus`, `par ailleurs`, `il convient de noter`, `il est important de`, `en outre`, `notamment`, `il est à noter`, `en conclusion`, `au cœur de`, `dans le paysage actuel`, `à l'heure où`
- Superlatifs creux : `marque un tournant décisif`, `démontre un engagement envers`, `témoigne de`, `reflète une tendance profonde`

**Patterns à corriger :**
- Attributions vagues (`selon les experts`, `les études montrent`) → sources nommées avec organisme + année
- Fausse modestie (`malgré les défis, continue de prospérer`)
- Parallélismes forcés (`non seulement X, mais aussi Y`)
- Listes de trois systématiques
- Paragraphes uniformes → varier la longueur (certains 1 phrase, d'autres 5–6)
- Adverbes de liaison en début de phrase (max 1 par 500 mots)
- Guillemets courbes → guillemets français `« »`
- Tilde `~` pour « environ » → écrire `environ` ou `approximativement`

**Émojis :** zéro.  
**Gras :** max 2–3 occurrences par section H2.  
**Pas de têtes de liste en gras avec deux-points.**

### Section références (obligatoire)

```markdown
## Références

1. [Titre](URL) — Type/Source, Date
2. [Titre](URL) — Type/Source, Date
```

Citations inline : `<sup>[N](#fn-N)</sup>`  
Attribution après blockquote : `*Prénom Nom, Titre<sup>[N](#fn-N)</sup>*`

### Audit anti-IA final

Avant d'émettre `::done::`, lister les signaux IA résiduels et les corriger. Rechercher une dernière fois les tirets longs.

---

## Prompts de phase

### Phase 1 — Recherche (1-research.md)

Lire `.card-body.md` → vérifier doublons dans les articles existants → recherche web (presse RH, études, rapports officiels : Dares, INSEE, APEC, Pôle Emploi) + sites spécialisés (coaches reconnus, blogs carrière) → extraire faits, chiffres datés, citations nommées (Prénom Nom, titre, organisation, année), exemples terrain, idées reçues à corriger → proposer 2–3 angles → écrire `.research-notes.md` → émettre `::research-done::`.

### Phase 2 — Rédaction (2-draft.md)

Lire `.research-notes.md` + `.card-body.md` + 2 articles existants pour calibrage du ton → écrire **deux articles** : un en français (`lang: fr`) et un en anglais (`lang: en`) → tutoiement en FR, "you" direct en EN, même voix Pierre-Louis → respecter toutes les règles skills-prompt.md dans les deux langues → frontmatter complet pour chaque fichier → section Références → sauvegarder :
- `src/content/blog/YYYY-MM-DD-slug-fr.md` (ou sans suffixe pour le FR)
- `src/content/blog/YYYY-MM-DD-slug-en.md`

Convention de nommage (cohérente avec le repo existant) :
- `src/content/blog/YYYY-MM-DD-slug-fr.md` — version française
- `src/content/blog/YYYY-MM-DD-slug-en.md` — version anglaise

Émettre `::draft-path:src/content/blog/YYYY-MM-DD-slug-fr.md::` (le EN est au même slug avec suffixe `-en`).

**Formats par type de contenu :**

| Type | Longueur | Spécificités |
|------|----------|--------------|
| guide-pratique | 2 000–2 500 mots | Étapes numérotées, exemples terrain, tableau récap |
| conseil-ikigai | 1 500–2 000 mots | Angle be-ikigai naturel, exercice pratique en fin |
| analyse-tendance | 1 200–1 800 mots | Chiffres récents sourcés, avant/après, impact concret |
| comparatif | 2 500–3 200 mots | Tableau comparatif (cible extraction IA), guide de décision |
| temoignage | 1 200–1 800 mots | Histoire anonymisée, arc narratif, leçon universelle |
| actualite | 900–1 400 mots | Faits d'abord, contexte, impact concret pour le lecteur |

### Phase 3 — Humanisation (3-humanize.md)

Appliquer toutes les règles anti-IA de skills-prompt.md → vérifier densité mot-clé (1–2 %) → vérifier lisibilité Flesch > 60 → vérifier diversité lexicale → vérifier featured snippet et recherche vocale → audit final anti-IA → émettre `::done::`.

---

## GitHub Actions workflows

### blog-trend-scan.yml

```yaml
on:
  schedule:
    - cron: '0 7 * * 1'  # lundi 07h00 UTC
  workflow_dispatch:
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm install
        working-directory: pipeline
      - run: node pipeline/index.js
        env:
          GH_TOKEN: ${{ secrets.GH_PAT }}
          PROJECT_ID: ${{ secrets.PROJECT_ID }}
          # ... champs project
```

### blog-draft.yml

```yaml
on:
  schedule:
    - cron: '0 8 */2 * *'  # toutes les 48h, 08h00 UTC
  workflow_dispatch:
    inputs:
      resume_slug:
        description: 'Slug à reprendre (optionnel)'
        required: false
jobs:
  draft:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - name: Install deps
        run: |
          sudo apt-get install -y jq imagemagick
          npm install -g @google/gemini-cli
          npm install
        working-directory: pipeline
      - name: Run draft pipeline
        env:
          LLM: gemini
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GH_TOKEN: ${{ secrets.GH_PAT }}
          RESUME_SLUG: ${{ inputs.resume_slug }}
          PROJECT_ID: ${{ secrets.PROJECT_ID }}
          # ... champs project
        run: |
          git config user.email "pipeline@be-ikigai.fr"
          git config user.name "Be-Ikigai Pipeline"
          RESUME_SLUG="${{ inputs.resume_slug }}" bash pipeline/draft.sh
```

### blog-publish.yml

```yaml
on:
  workflow_dispatch:
    inputs:
      slug:
        description: 'Slug de l'article à publier'
        required: true
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Publish article
        run: |
          FILE="src/content/blog/${{ inputs.slug }}.md"
          sed -i 's/^status: draft/status: published/' "$FILE"
          git config user.email "pipeline@be-ikigai.fr"
          git config user.name "Be-Ikigai Pipeline"
          git add "$FILE"
          git commit -m "blog: publish '${{ inputs.slug }}'"
          git push origin master
        env:
          GITHUB_TOKEN: ${{ secrets.GH_PAT }}
```

---

## Commandes Claude

### /blog:draft
Récupère le prochain sujet via `node pipeline/index.js --pick`, affiche le sujet, demande confirmation, lance `bash pipeline/draft.sh`, surveille les marqueurs de phase, affiche le chemin de l'article créé.

### /blog:status
Affiche les cartes GitHub Projects par statut + nombre d'articles en draft vs publiés + 3 articles les plus récents.

### /blog:publish [slug]
Valide le frontmatter (description 110–160 chars, image présente, category valide, summary 4 bullets, zéro tirets longs), passe `status: draft` → `status: published`, commit + push sur master.

### /blog:regen-cover <slug>
Construit un prompt photo lifestyle coaching (bureau, nature, jeune professionnel, lumière naturelle, 16:9, pas de texte en incrustation), lance `pipeline/generate-cover.sh`, commit les images.

---

## Secrets GitHub — liste complète

| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | Clé API Google Gemini (rédaction + images) |
| `GH_PAT` | Personal Access Token (scopes : repo, project, workflow) |
| `PROJECT_ID` | ID du projet GitHub (PVT_...) |
| `PROJECT_FIELD_STATUS_ID` | ID du champ Status |
| `PROJECT_FIELD_SCORE_ID` | ID du champ Trend Score |
| `PROJECT_FIELD_CLUSTER_ID` | ID du champ Cluster |
| `PROJECT_FIELD_CONTENT_TYPE_ID` | ID du champ Content Type |
| `PROJECT_FIELD_ARTICLE_PATH_ID` | ID du champ Article Path |
| `PROJECT_STATUS_DETECTED` | Option ID "Detected" |
| `PROJECT_STATUS_RESEARCHED` | Option ID "Researched" |
| `PROJECT_STATUS_DRAFTING` | Option ID "Drafting" |
| `PROJECT_STATUS_PUBLISHED` | Option ID "Published" |

---

## Points chauds (pièges connus de MesChasses à réappliquer)

- `GITHUB_PROJECT_ID` est réservé par GitHub Actions — utiliser `PROJECT_ID`
- `python3 -c "..."` multiline → single quotes obligatoires
- Variables avec accents dans les prompts bash → passer par une variable env intermédiaire
- Mode `--pick` sans sujet → `process.exit(0)` (pas 1)
- `getProjectItems()` est synchrone — pas d'`await`
- Gemini CLI : pointer `GEMINI_CLI_HOME` vers `/tmp/gemini-home` en CI pour éviter le bug rename atomique cross-fs
- `git push origin master` (pas `main`) — branche principale du repo be-ikigai
- ImageMagick : détecter `magick` (v7) vs `convert` (v6 Ubuntu) automatiquement
