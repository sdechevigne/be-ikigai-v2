# Pipeline blog be-ikigai — fonctionnement global

## Vue d'ensemble

Le pipeline transforme des signaux de tendance en articles publiés sur le site, sans intervention manuelle entre le scan et la publication. Il y a deux boucles : une boucle **automatique** (scan → draft → publication) et une boucle **manuelle** (idée libre → draft → publication).

```
┌─────────────────────────────────────────────────────────────────┐
│                      BOUCLE AUTOMATIQUE                         │
│                                                                 │
│  Lundi + Jeudi 08h00 UTC                                        │
│  blog-schedule.yml → blog-draft.yml                             │
│    └─ pipeline/draft.sh                                         │
│         ├─ Phase 1 : recherche Serper                           │
│         ├─ Phase 2 : rédaction Gemini FR+EN (status: published) │
│         ├─ Phase 3 : humanisation + image                       │
│         └─ commit + push → card Projects = Published            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      BOUCLE MANUELLE                            │
│                                                                 │
│  bash pipeline/trigger-draft.sh "Mon idée d'article"           │
│    ├─ Vérification doublon (check-duplicate.py)                 │
│    │    └─ Similaire trouvé → ideas-pending.md (pas de draft)  │
│    ├─ Création card GitHub Projects (statut : Idée)            │
│    └─ blog-draft.yml -f free_text="..."                        │
│         └─ pipeline/draft.sh (même 3 phases)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Statuts GitHub Projects

Les cards suivent ce cycle de vie. **Le pipeline ne fait jamais avancer un statut manuellement** — sauf à la création (toujours `Detected`) et à la publication (passe à `Published`).

```
Idée          → idée libre saisie via trigger-draft.sh
Detected      → cluster détecté par le scan de tendances
Researched    → recherche validée (manuel)
Drafting      → rédaction en cours (manuel)
Published     → article live sur le site
Archived      → sujet abandonné ou doublon
```

Le pipeline ne crée jamais de doublons sur un même cluster : `pickNextTopic()` exclut les clusters ayant déjà une card en `Researched` ou `Drafting`.

---

## Cycle de vie d'un article

### 1. Scan automatique (lundi 07h00 UTC)

`blog-trend-scan.yml` déclenche `pipeline/index.js` qui :

1. Collecte les sources (RSS, Reddit, Serper, evergreen hardcodé)
2. Classe chaque item dans un cluster (reconversion, sens_ikigai, burnout, coaching_bilan, management)
3. Calcule un score pondéré (presse nationale × 4, presse spécialisée × 3, Google Trends × 2…)
4. Crée une card GitHub Projects par article suggéré (statut `Detected`) avec : titre, cluster, score, type de contenu, liens sources

### 2. Revue manuelle des idées (GitHub Projects)

Dans GitHub Projects (vue Kanban ou Tableau), tu vois toutes les cards `Detected`. Actions possibles :

- **Laisser passer** → le scheduling automatique prend les meilleures
- **Passer en `Researched`** → prioritaire pour le prochain draft
- **Passer en `Archived`** → le sujet est ignoré pour les scans suivants
- **Ajouter une idée libre** → `bash pipeline/trigger-draft.sh "Mon idée"` crée une card `Idée` + déclenche un draft immédiat

### 3. Rédaction (blog-draft.yml)

Déclenché soit par `blog-schedule.yml` (automatique), soit par `trigger-draft.sh` (manuel). Le script `pipeline/draft.sh` tourne en 3 phases :

| Phase | Marqueur | Ce qui se passe |
|-------|----------|-----------------|
| Recherche | `::research-done::` | Serper fetch + notes dans `research-notes.md` |
| Rédaction | `::draft-path::` | Gemini rédige FR + EN dans `src/content/blog/` (status: published) |
| Humanisation | `::done::` | Reformulation + génération image couverture |

Chaque phase est commitée — si le workflow échoue, il peut reprendre :

```bash
RESUME_SLUG=2026-04-28-mon-article-fr bash pipeline/trigger-draft.sh
```

### 4. Publication (blog-schedule.yml)

Lundi et jeudi à 08h00 UTC, `blog-schedule.yml` déclenche `blog-draft.yml` (mode auto).

`draft.sh` :
- Sélectionne la card `Detected` avec la `Publication Date` la plus ancienne (ou le meilleur Trend Score si aucune date)
- Rédige et humanise l'article
- Passe les fichiers FR + EN en `status: published` directement
- Commit + push sur `master`
- Met à jour la card GitHub Projects : statut `Published` + date de publication

`blog-publish.yml` reste disponible pour **publier manuellement** un slug précis depuis GitHub Actions.

---

## Outils locaux

### Déclencher un draft manuellement

```bash
# Idée libre
bash pipeline/trigger-draft.sh "Pourquoi le bilan de compétences ne suffit plus"

# Stdin
echo "Mon idée" | bash pipeline/trigger-draft.sh

# Mode auto (prend le meilleur sujet GitHub Projects)
bash pipeline/trigger-draft.sh

# Reprendre un draft en échec
RESUME_SLUG=2026-04-28-mon-slug-fr bash pipeline/trigger-draft.sh

# Forcer malgré doublon détecté
FORCE=1 bash pipeline/trigger-draft.sh "Mon idée"
```

### Réordonner les publications

```bash
# Prioriser une card pour le prochain draft automatique
# → Dans GitHub Projects, renseigner le champ "Publication Date" sur une card "Detected"
# → pickNextTopic() la sélectionne en premier (avant les autres triées par Trend Score)
# → Les cards sans date sont traitées dans l'ordre du Trend Score
```

### Backfill / maintenance

```bash
# Créer les cards GitHub Projects pour les articles déjà publiés
node pipeline/backfill-projects.js

# Fusionner les cards FR+EN en une seule card bilingue
node pipeline/merge-bilingual-cards.js

# Voir sans toucher
node pipeline/backfill-projects.js --dry-run
node pipeline/merge-bilingual-cards.js --dry-run
```

---

## Champs GitHub Projects

| Champ | Type | Rôle |
|-------|------|------|
| Status | Single select | Cycle de vie (Idée → Published) |
| Cluster | Texte | Thème détecté (Reconversion, Burn-out…) |
| Trend Score | Nombre | Score pondéré du scan |
| Content Type | Texte | guide-pratique, comparatif, temoignage… |
| Article Path | Texte | `/blog/slug-fr \| /en/blog/slug-en` |
| Publication Date | Date | Date de mise en ligne (vue calendrier) |

---

## Sources actives (2026-04)

| Type | Sources |
|------|---------|
| Presse nationale FR | Le Monde Emploi, Figaro Emploi |
| Presse spécialisée FR | Parlons RH, Cadremploi |
| Presse spécialisée EN | HBR, SHRM, Fast Company, Inc. |
| Blogs autorité | Psychologies, Zen Habits, Tiny Buddha, ikigai.blog… |
| Forum | Reddit (7 subreddits : conseilboulot, antiwork, burnout…) |
| Search sémantique | Serper (requiert `SERPER_API_KEY`) |
| Evergreen | Hardcodé dans `pipeline/evergreen.js` |
| Google Trends | 5 mots-clés max par batch, `LOOKBACK_DAYS=60` |

---

## Secrets GitHub requis

| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | Clé API Google Gemini (rédaction + images) |
| `GH_PAT` | PAT (scopes : repo, project, workflow) |
| `PROJECT_ID` | ID du projet GitHub (PVT_…) |
| `PROJECT_FIELD_STATUS_ID` | ID champ Status |
| `PROJECT_FIELD_SCORE_ID` | ID champ Trend Score |
| `PROJECT_FIELD_CLUSTER_ID` | ID champ Cluster |
| `PROJECT_FIELD_CONTENT_TYPE_ID` | ID champ Content Type |
| `PROJECT_FIELD_ARTICLE_PATH_ID` | ID champ Article Path |
| `PROJECT_FIELD_PUBLICATION_DATE_ID` | ID champ Publication Date |
| `PROJECT_STATUS_DETECTED` | Option ID "Detected" |
| `PROJECT_STATUS_RESEARCHED` | Option ID "Researched" |
| `PROJECT_STATUS_DRAFTING` | Option ID "Drafting" |
| `PROJECT_STATUS_PUBLISHED` | Option ID "Published" |
| `PROJECT_STATUS_IDEA` | Option ID "Idée" |
| `PROJECT_STATUS_ARCHIVED` | Option ID "Archivé" |
| `SERPER_API_KEY` | Clé Serper (recherche sémantique) |

---

## Pièges connus

- `GITHUB_PROJECT_ID` est réservé par GitHub Actions — utiliser `PROJECT_ID`
- `gh api graphql` avec body multi-lignes → `spawnSync` + stdin JSON (pas `execSync`)
- Gemini CLI headless : `GEMINI_CLI_TRUST_WORKSPACE=true` + `settings.json` avec `trustedDirectories`
- Gemini CLI ignore les fichiers préfixés par `.` — les fichiers de travail (`card-body.md`, `research-notes.md`) sans point
- GitHub Projects V2 : limite `items(first: 100)` max
- Images blog : `public/assets/img/blog/` (pas `public/images/`)
- Catégories blog (liste fermée PagesCMS) : `Transition professionnelle`, `Sens au travail`, `Coaching`, `Ikigai`, `Philosophie de vie`
- Google Trends : 5 mots-clés max par batch — au-delà, erreur silencieuse
- `git push origin master` (pas `main`)
- CRLF sur Windows : normaliser avec `.replace(/\r\n/g, '\n')` avant de parser les frontmatters
- **Règle éditoriale absolue** : ne jamais critiquer ou moquer l'ikigai, même subtilement

## Marqueurs de phase (draft.sh)

- Phase 1 → `::research-done::`
- Phase 2 → `::draft-path:src/content/blog/SLUG.md::`
- Phase 3 → `::done::`
