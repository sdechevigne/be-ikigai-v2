# Full-Auto Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le pipeline blog entièrement automatique — scan → draft → publication sans intervention, avec réordonnancement via la date dans GitHub Projects.

**Architecture:** `draft.sh` publie directement à la fin (status: published + card Projects = Published) sans passer par `blog-publish.yml`. `blog-schedule.yml` devient un simple déclencheur de drafts (lun/jeu). `pickNextTopic()` trie en priorité par Publication Date renseignée, puis par Trend Score — ce qui permet de prioriser une card en lui mettant une date dans Projects.

**Tech Stack:** Bash, Node.js ESM, GitHub Actions workflows, GitHub Projects V2 GraphQL API.

---

## Contexte codebase

Les fichiers clés et leur état actuel :

- `pipeline/draft.sh` — 469 lignes. Trois phases (recherche, rédaction, humanisation). Termine en `status: draft` + statut Projects `Drafting`. **À modifier** : passer à `published` + appeler setPublicationDate + updateCardStatus('published').
- `pipeline/project.js` — `pickNextTopic()` trie par Trend Score uniquement. `setPublicationDate()` et `updateCardStatus()` existent déjà.
- `.github/workflows/blog-draft.yml` — a son propre `schedule: cron`. **À modifier** : supprimer le cron (géré par `blog-schedule.yml`).
- `.github/workflows/blog-schedule.yml` — lun/jeu 08h00 UTC. Cherche un draft à publier OU déclenche un nouveau draft. **À modifier** : supprimer la logique "find draft + publish", garder uniquement "déclencher blog-draft.yml".
- `.github/workflows/blog-publish.yml` — reste intact, sert pour "publier maintenant" manuel.

---

## Fichiers modifiés

| Fichier | Type | Ce qui change |
|---------|------|---------------|
| `pipeline/project.js` | Modify | `pickNextTopic()` : tri par Publication Date puis Trend Score |
| `pipeline/draft.sh` | Modify | Fin de script : status published + updateCardStatus + setPublicationDate |
| `.github/workflows/blog-draft.yml` | Modify | Supprimer le bloc `schedule:` |
| `.github/workflows/blog-schedule.yml` | Modify | Simplifier : supprimer la logique find-draft, garder seulement le déclenchement de blog-draft.yml |

---

## Task 1 : `pickNextTopic()` — tri par Publication Date puis Trend Score

**Files:**
- Modify: `pipeline/project.js:125-148`

La logique actuelle trie uniquement par `Trend Score`. On veut : si une card `Detected` a une `Publication Date` renseignée, elle passe en premier (triée par date croissante). Les cards sans date suivent, triées par Trend Score décroissant.

- [ ] **Step 1 : Modifier `pickNextTopic()` dans `pipeline/project.js`**

Remplacer les lignes 133-137 (le bloc `candidates.sort(...)`) par :

```js
  candidates.sort((a, b) => {
    const dateA = a.fieldValues?.nodes?.find(fv => fv.field?.name === 'Publication Date')?.date || '';
    const dateB = b.fieldValues?.nodes?.find(fv => fv.field?.name === 'Publication Date')?.date || '';
    const scoreA = a.fieldValues?.nodes?.find(fv => fv.field?.name === 'Trend Score')?.number || 0;
    const scoreB = b.fieldValues?.nodes?.find(fv => fv.field?.name === 'Trend Score')?.number || 0;

    // Cards avec date en premier, triées par date croissante
    if (dateA && dateB) return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    if (dateA) return -1;
    if (dateB) return 1;
    // Sans date : tri par score décroissant
    return scoreB - scoreA;
  });
```

- [ ] **Step 2 : Vérifier que le fichier est valide**

```bash
cd D:/Projets/beikigai/site/pipeline && node -e "import('./project.js').then(() => console.log('OK')).catch(e => { console.error(e.message); process.exit(1); })"
```

Résultat attendu : `OK`

- [ ] **Step 3 : Commit**

```bash
git add pipeline/project.js
git commit -m "feat(pipeline): pickNextTopic trie par Publication Date puis Trend Score"
```

---

## Task 2 : `draft.sh` — publier directement à la fin

**Files:**
- Modify: `pipeline/draft.sh:439-469` (bloc "Commit final" et "Mise à jour statut GitHub Projects")

Actuellement le script finit avec `status: draft` dans le frontmatter et passe la card en `Drafting`. On veut :
1. Le frontmatter écrit par Gemini (phase 2) a déjà `status: draft` — on le corrige en `published` juste avant le commit final
2. La card passe en `Published` + `Publication Date` renseignée

Le `publishedAt` est déjà dans le frontmatter (généré par `set_publish_datetime` en début de script et utilisé en phase 2). On utilise cette valeur pour `setPublicationDate`.

- [ ] **Step 1 : Remplacer le bloc final de `pipeline/draft.sh` (lignes 439-469)**

Remplacer tout ce qui suit `# Commit final` jusqu'à la fin du fichier par :

```bash
# Passage en published (FR + EN)
log "Passage en published..."
FULL_PATH_FR="${REPO_ROOT}/${ARTICLE_PATH}"
BASE_SLUG_FINAL="${ARTICLE_SLUG%-fr}"
FULL_PATH_EN="${REPO_ROOT}/src/content/blog/${BASE_SLUG_FINAL}-en.md"

for md_file in "${FULL_PATH_FR}" "${FULL_PATH_EN}"; do
  if [[ -f "${md_file}" ]]; then
    sed -i 's/^status: *"*draft"*/status: published/' "${md_file}"
    log "  published : $(basename ${md_file})"
  fi
done

# Commit final
log "Commit final..."
cd "${REPO_ROOT}"
git add "${CONTENT_DIR}/" "public/assets/img/blog/${BASE_SLUG_FINAL}"* 2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "blog: '${TOPIC_TITLE:-article}' [${TOPIC_CATEGORY:-coaching}]

Type: ${TOPIC_CONTENT_TYPE:-guide}
LLM: ${LLM}
Pipeline: automatique
Log: pipeline/logs/draft-${TIMESTAMP}.log" 2>>"${LOG_FILE}"
  git_push_safe "commit final"
fi

# Mise à jour card GitHub Projects → Published
cd "${PIPELINE_DIR}"
PUB_DATE_ONLY="${PUBLISH_DATETIME:0:10}"
node -e "
import('./project.js').then(async m => {
  if (!process.env.ITEM_ID) return;
  await m.updateCardStatus(process.env.ITEM_ID, 'published');
  await m.setArticlePath(process.env.ITEM_ID, '${ARTICLE_PATH}');
  await m.setPublicationDate(process.env.ITEM_ID, process.env.PUB_DATE_ONLY);
}).catch(e => console.warn(e.message));
" 2>>"${LOG_FILE}" || true

cleanup

log ""
log "=== Pipeline terminé — article publié ==="
log "Article FR : ${ARTICLE_PATH}"
log "Publié le  : ${PUB_DATE_ONLY}"
log "Log : ${LOG_FILE}"
```

Note : `ITEM_ID` est déjà exporté en variable shell plus haut dans le script (ligne ~196). On le passe via `process.env.ITEM_ID` pour éviter l'injection dans le heredoc node.

- [ ] **Step 2 : Passer ITEM_ID et PUB_DATE_ONLY en variables d'environnement pour le bloc node**

Juste avant le bloc `node -e "..."`, ajouter l'export :

```bash
export ITEM_ID="${ITEM_ID:-}"
export PUB_DATE_ONLY="${PUB_DATE_ONLY}"
```

(Ces deux lignes s'insèrent juste avant `node -e "` dans le bloc "Mise à jour card GitHub Projects".)

- [ ] **Step 3 : Vérifier la syntaxe bash**

```bash
bash -n pipeline/draft.sh
```

Résultat attendu : aucune sortie (syntaxe OK)

- [ ] **Step 4 : Commit**

```bash
git add pipeline/draft.sh
git commit -m "feat(pipeline): draft.sh publie directement (status: published + card Projects)"
```

---

## Task 3 : `blog-draft.yml` — supprimer le cron interne

**Files:**
- Modify: `.github/workflows/blog-draft.yml:3-6`

Le workflow a son propre `schedule` (jours pairs 08h00 UTC) qui double le scheduling de `blog-schedule.yml`. On le supprime — `blog-draft.yml` ne se déclenche plus qu'en `workflow_dispatch`.

- [ ] **Step 1 : Supprimer le bloc schedule dans `.github/workflows/blog-draft.yml`**

Remplacer :

```yaml
on:
  schedule:
    - cron: '0 8 */2 * *'   # jours pairs, 08h00 UTC
  workflow_dispatch:
```

Par :

```yaml
on:
  workflow_dispatch:
```

- [ ] **Step 2 : Vérifier la syntaxe YAML**

```bash
node -e "require('fs').readFileSync('.github/workflows/blog-draft.yml','utf8'); console.log('OK')"
```

Résultat attendu : `OK`

- [ ] **Step 3 : Commit**

```bash
git add .github/workflows/blog-draft.yml
git commit -m "feat(pipeline): blog-draft.yml — supprimer le cron (géré par blog-schedule.yml)"
```

---

## Task 4 : `blog-schedule.yml` — simplifier en pur déclencheur

**Files:**
- Modify: `.github/workflows/blog-schedule.yml`

Actuellement `blog-schedule.yml` fait deux choses : chercher un draft à publier, OU déclencher un nouveau draft. La publication est maintenant dans `draft.sh` — on supprime toute la logique "find draft + publish". Le workflow devient : lun/jeu 08h00 UTC → déclencher `blog-draft.yml` (mode auto, sans inputs).

- [ ] **Step 1 : Remplacer le contenu complet de `.github/workflows/blog-schedule.yml`**

```yaml
name: Blog — Scheduling automatique

on:
  schedule:
    - cron: '0 8 * * 1'   # Lundi 08h00 UTC
    - cron: '0 8 * * 4'   # Jeudi 08h00 UTC
  workflow_dispatch: {}

jobs:
  schedule:
    runs-on: ubuntu-latest
    steps:
      - name: Déclencher un nouveau draft
        env:
          GH_TOKEN: ${{ secrets.GH_PAT }}
        run: |
          gh workflow run blog-draft.yml \
            --repo "${{ github.repository }}"
```

- [ ] **Step 2 : Vérifier la syntaxe YAML**

```bash
node -e "require('fs').readFileSync('.github/workflows/blog-schedule.yml','utf8'); console.log('OK')"
```

Résultat attendu : `OK`

- [ ] **Step 3 : Commit + push**

```bash
git add .github/workflows/blog-schedule.yml
git commit -m "feat(pipeline): blog-schedule.yml — pur déclencheur de drafts (publication dans draft.sh)"
git push origin master
```

---

## Task 5 : Mettre à jour PIPELINE.md

**Files:**
- Modify: `.claude/references/PIPELINE.md`

Mettre à jour la section "Vue d'ensemble" et "Cycle de vie" pour refléter le full-auto.

- [ ] **Step 1 : Mettre à jour le schéma ASCII dans `.claude/references/PIPELINE.md`**

Remplacer le bloc "BOUCLE AUTOMATIQUE" par :

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
```

Mettre à jour l'étape 3 "Rédaction" dans la section "Cycle de vie" : préciser que le script publie directement, plus de `status: draft`.

Supprimer l'étape "4. Relecture et planification" (plus applicable en full-auto) ou la reformuler comme cas optionnel pour idées manuelles uniquement.

Ajouter dans "Outils locaux" :

```bash
# Prioriser une card pour le prochain draft
# → Dans GitHub Projects, renseigner "Publication Date" sur la card Detected
# → pickNextTopic() la sélectionne en premier (avant les autres triées par score)
```

- [ ] **Step 2 : Commit**

```bash
git add .claude/references/PIPELINE.md
git commit -m "docs: PIPELINE.md — full-auto, suppression étape relecture"
```

---

## Vérification finale

Après les 5 tâches, vérifier l'état global :

```bash
# Syntaxe bash
bash -n pipeline/draft.sh

# Import JS
cd pipeline && node -e "import('./project.js').then(() => console.log('OK'))"

# Statut git
git log --oneline -5
git status
```

Résultats attendus : pas d'erreur bash, `OK` Node, working tree clean.
