# Référence pipeline blog be-ikigai

## Architecture

```
Scan tendances (lundi 07h00 UTC, blog-trend-scan.yml)
  └─ pipeline/index.js → GitHub Projects V2 (cartes "Detected")
        └─ Draft (jours pairs 08h00 UTC, blog-draft.yml)
              └─ pipeline/draft.sh [LLM=gemini par défaut]
                    ├─ Phase 1 : recherche (::research-done::)
                    ├─ Phase 2 : rédaction FR+EN (::draft-path::)
                    └─ Phase 3 : humanisation (::done::)
                          └─ src/content/blog/YYYY-MM-DD-slug-{fr,en}.md (draft)
                                └─ Publish (blog-publish.yml, manuel)
                                      └─ status: published + push master
```

## Secrets GitHub requis

| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | Clé API Google Gemini (rédaction + images) |
| `GH_PAT` | Personal Access Token (scopes: repo, project, workflow) |
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

## Marqueurs de phase

- Phase 1 → `::research-done::`
- Phase 2 → `::draft-path:src/content/blog/SLUG.md::`
- Phase 3 → `::done::`

## Nommage des fichiers

- `src/content/blog/YYYY-MM-DD-slug-fr.md` — version française
- `src/content/blog/YYYY-MM-DD-slug-en.md` — version anglaise
- `public/images/YYYY-MM-DD-slug-fr.png` — couverture 1424×752
- `public/images/YYYY-MM-DD-slug-fr-og.png` — OG social 1200×630

## Pièges connus

- `GITHUB_PROJECT_ID` est réservé par GitHub Actions — utiliser `PROJECT_ID`
- `python3 -c "..."` multiline → utiliser single quotes ou here-doc
- Variables avec accents dans les prompts bash → passer par variable env intermédiaire
- Mode `--pick` sans sujet → `process.exit(0)` (pas 1)
- `getProjectItems()` est synchrone — pas d'`await`
- Gemini CLI : pointer `GEMINI_CLI_HOME=/tmp/gemini-home` en CI
- `git push origin master` (pas `main`) — branche principale be-ikigai
- ImageMagick : `magick` (v7) vs `convert` (v6 Ubuntu) — le script détecte auto
- Gemini image model : `gemini-3.1-flash-image-preview` (les anciens modèles sont 404)

## Reprise en cas d'échec

```bash
RESUME_SLUG=2026-04-28-mon-article-fr bash pipeline/draft.sh
```

Le script détecte automatiquement les phases déjà commitées via les messages git.
