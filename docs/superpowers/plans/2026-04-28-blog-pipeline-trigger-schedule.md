# Blog Pipeline — Trigger manuel + calendrier automatique

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de déclencher un draft depuis une idée libre via CLI, avec déduplication sémantique contre les articles existants, et publier automatiquement 2 articles/semaine avec fallback sur les tendances si le backlog est vide.

**Architecture:** Quatre modifications coordonnées — un script local `trigger-draft.sh` vérifie la similarité avec les articles existants puis appelle `gh workflow run`, `blog-draft.yml` expose un nouvel input `free_text`, `draft.sh` l'écrit dans `card-body.md` avant d'entrer en mode URL. Un nouveau workflow `blog-schedule.yml` tourne lundi et jeudi : il publie le prochain draft prêt, ou déclenche un nouveau draft si le backlog est vide.

**Tech Stack:** Bash, Python 3 (local + runner ubuntu), GitHub Actions (`workflow_dispatch`, `schedule`), `gh` CLI

---

## Structure des fichiers

| Fichier | Action | Responsabilité |
|---|---|---|
| `pipeline/check-duplicate.py` | Créer | Comparaison sémantique mots-clés entre `free_text` et articles existants |
| `pipeline/trigger-draft.sh` | Créer | Script local CLI — déduplication, confirmation, `gh workflow run` |
| `.github/workflows/blog-draft.yml` | Modifier | Ajouter input `free_text` + l'exposer en env var |
| `pipeline/draft.sh` | Modifier | Mode `FREE_TEXT` : écrire `card-body.md` + forcer `DRAFT_FROM_URL=true` |
| `.github/workflows/blog-schedule.yml` | Créer | Cron lundi/jeudi — publier draft ou déclencher nouveau draft |

---

## Task 1 : Ajouter l'input `free_text` dans `blog-draft.yml`

**Files:**
- Modify: `.github/workflows/blog-draft.yml`

Le workflow est dans le repo `sdechevigne/be-ikigai-v2`. Travailler depuis le repo local cloné ou via `gh api`.

- [ ] **Step 1 : Lire le fichier actuel**

```bash
cat .github/workflows/blog-draft.yml
```

Repérer le bloc `workflow_dispatch > inputs` (actuellement : `resume_slug` et `llm`).

- [ ] **Step 2 : Ajouter l'input `free_text`**

Dans `.github/workflows/blog-draft.yml`, dans la section `workflow_dispatch > inputs`, ajouter après l'input `llm` :

```yaml
      free_text:
        description: "Idée, titre ou extrait d'article (texte libre)"
        required: false
        default: ''
```

- [ ] **Step 3 : Exposer `FREE_TEXT` dans le step `Run draft pipeline`**

Dans le step `Run draft pipeline`, dans la section `env:`, ajouter :

```yaml
          FREE_TEXT: ${{ inputs.free_text || '' }}
```

- [ ] **Step 4 : Vérifier la syntaxe YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/blog-draft.yml'))" && echo "OK"
```

Attendu : `OK`

- [ ] **Step 5 : Commit**

```bash
git add .github/workflows/blog-draft.yml
git commit -m "feat(pipeline): ajouter input free_text dans blog-draft.yml"
```

---

## Task 2 : Ajouter le mode `FREE_TEXT` dans `draft.sh`

**Files:**
- Modify: `pipeline/draft.sh`

Le mode texte libre doit s'insérer **après** le bloc `RESUME_SLUG` (ligne ~156-187) et **avant** le bloc `DRAFT_FROM_URL` (ligne ~203). Priorité : RESUME_SLUG > FREE_TEXT > DRAFT_FROM_URL > auto.

- [ ] **Step 1 : Localiser le point d'insertion**

```bash
grep -n "RESUME_SLUG\|DRAFT_FROM_URL\|Mode URL" pipeline/draft.sh | head -20
```

Repérer la ligne du bloc `elif [[ "${DRAFT_FROM_URL:-}" == "true" ]]; then` — c'est juste avant ce bloc qu'on insère.

- [ ] **Step 2 : Ajouter le bloc FREE_TEXT**

Juste après la fin du bloc `if [[ -n "${RESUME_SLUG}" ]]; then ... fi` (qui se termine à la ligne du `fi` avant `ITEM_ID=""`), et avant `ITEM_ID=""`, insérer :

```bash
FREE_TEXT="${FREE_TEXT:-}"
if [[ -z "${RESUME_SLUG}" ]] && [[ -n "${FREE_TEXT}" ]]; then
  log "Mode texte libre : écriture du card-body.md depuis FREE_TEXT"
  printf '%s' "${FREE_TEXT}" > "${CARD_BODY}"
  DRAFT_FROM_URL=true
fi
```

- [ ] **Step 3 : Vérifier la syntaxe bash**

```bash
bash -n pipeline/draft.sh && echo "OK"
```

Attendu : `OK`

- [ ] **Step 4 : Test de fumée local (sans déclencher le LLM)**

```bash
FREE_TEXT="Test ikigai burnout" GEMINI_API_KEY=fake bash -c '
  source pipeline/draft.sh 2>&1 | head -5 || true
'
```

Le script doit afficher `Mode texte libre : écriture du card-body.md depuis FREE_TEXT` avant d'échouer sur les prérequis. Si ce message apparaît, le bloc est bien atteint.

- [ ] **Step 5 : Commit**

```bash
git add pipeline/draft.sh
git commit -m "feat(pipeline): mode FREE_TEXT dans draft.sh"
```

---

## Task 3 : Créer `pipeline/check-duplicate.py`

**Files:**
- Create: `pipeline/check-duplicate.py`

Script Python appelé par `trigger-draft.sh` avant tout déclenchement. Compare le `free_text` avec les titres et descriptions des articles existants par intersection de mots-clés normalisés. Retourne les articles similaires avec un score (0–100). Seuil de warning : 40. Pas de dépendances externes — stdlib Python uniquement.

- [ ] **Step 1 : Créer le script**

```bash
cat > pipeline/check-duplicate.py << 'EOF'
#!/usr/bin/env python3
"""
Vérifie si un sujet est trop proche d'articles existants.
Usage : python3 pipeline/check-duplicate.py "mon idée d'article" src/content/blog/
Sortie : liste JSON des articles similaires avec score (0-100).
Code de sortie : 0 = OK, 1 = similarités trouvées au-dessus du seuil.
"""
import sys
import re
import json
import os
from pathlib import Path

THRESHOLD = 40  # score >= THRESHOLD → warning
STOPWORDS = {
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'au', 'aux',
    'par', 'pour', 'sur', 'dans', 'avec', 'est', 'sont', 'que', 'qui', 'ou',
    'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'with', 'and', 'or', 'is',
    'how', 'why', 'what', 'your', 'you', 'at', 'it', 'its', 'from', 'by',
    'comment', 'pourquoi', 'quand', 'quoi', 'votre', 'notre', 'mon', 'ma',
    'ce', 'cet', 'cette', 'ces', 'se', 'sa', 'son', 'ses',
}

def tokenize(text: str) -> set[str]:
    """Normalise et tokenize — minuscules, sans accents basiques, sans stopwords."""
    text = text.lower()
    # Normalisation accents basiques
    for a, b in [('é','e'),('è','e'),('ê','e'),('ë','e'),('à','a'),('â','a'),
                 ('ù','u'),('û','u'),('ô','o'),('î','i'),('ï','i'),('ç','c')]:
        text = text.replace(a, b)
    tokens = set(re.findall(r'\b[a-z]{3,}\b', text))
    return tokens - STOPWORDS

def extract_frontmatter_field(content: str, field: str) -> str:
    """Extrait un champ du frontmatter YAML (entre les --- délimiteurs)."""
    m = re.search(rf'^{field}:\s*["\']?(.+?)["\']?\s*$', content, re.MULTILINE)
    return m.group(1).strip() if m else ''

def score_similarity(tokens_a: set[str], tokens_b: set[str]) -> int:
    """Jaccard * 100, arrondi."""
    if not tokens_a or not tokens_b:
        return 0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return round(len(intersection) / len(union) * 100)

def main():
    if len(sys.argv) < 3:
        print("Usage: check-duplicate.py <free_text> <blog_dir>", file=sys.stderr)
        sys.exit(2)

    free_text = sys.argv[1]
    blog_dir = Path(sys.argv[2])
    query_tokens = tokenize(free_text)

    results = []
    for md_file in sorted(blog_dir.glob('*-fr.md')):
        content = md_file.read_text(encoding='utf-8', errors='ignore')
        title = extract_frontmatter_field(content, 'title')
        description = extract_frontmatter_field(content, 'description')
        status = extract_frontmatter_field(content, 'status')

        article_text = f"{title} {description}"
        article_tokens = tokenize(article_text)
        score = score_similarity(query_tokens, article_tokens)

        if score >= THRESHOLD:
            results.append({
                'slug': md_file.stem,
                'title': title,
                'score': score,
                'status': status,
            })

    results.sort(key=lambda x: x['score'], reverse=True)
    print(json.dumps(results, ensure_ascii=False, indent=2))
    sys.exit(1 if results else 0)

if __name__ == '__main__':
    main()
EOF
```

- [ ] **Step 2 : Rendre exécutable**

```bash
chmod +x pipeline/check-duplicate.py
```

- [ ] **Step 3 : Vérifier la syntaxe**

```bash
python3 -m py_compile pipeline/check-duplicate.py && echo "OK"
```

Attendu : `OK`

- [ ] **Step 4 : Test avec un sujet proche d'un article existant**

```bash
# Tester avec un sujet générique (ikigai est dans presque tous les articles)
python3 pipeline/check-duplicate.py "ikigai et reconversion professionnelle" src/content/blog/
```

Attendu : JSON avec les articles proches (score ≥ 40) triés par score décroissant. Si le blog est vide, attendu : `[]` et code 0.

- [ ] **Step 5 : Test avec un sujet sans similitude**

```bash
python3 pipeline/check-duplicate.py "recettes de cuisine japonaise" src/content/blog/
echo "Exit code: $?"
```

Attendu : `[]` et `Exit code: 0`

- [ ] **Step 6 : Commit**

```bash
git add pipeline/check-duplicate.py
git commit -m "feat(pipeline): check-duplicate.py — déduplication sémantique articles"
```

---

## Task 4 : Créer `pipeline/trigger-draft.sh`

**Files:**
- Create: `pipeline/trigger-draft.sh`

Script local exécuté depuis la racine du repo. Nécessite `gh` CLI authentifié sur `sdechevigne/be-ikigai-v2`. Appelle `check-duplicate.py` avant tout déclenchement en mode texte libre.

- [ ] **Step 1 : Créer le script**

```bash
cat > pipeline/trigger-draft.sh << 'EOF'
#!/usr/bin/env bash
# trigger-draft.sh — Déclenche blog-draft.yml depuis une idée libre
#
# Usage :
#   bash pipeline/trigger-draft.sh "Mon idée d'article"
#   cat idee.txt | bash pipeline/trigger-draft.sh
#   bash pipeline/trigger-draft.sh                          # mode auto
#   RESUME_SLUG=2026-04-28-ikigai-fr bash pipeline/trigger-draft.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="sdechevigne/be-ikigai-v2"
WORKFLOW="blog-draft.yml"
BLOG_DIR="${SCRIPT_DIR}/../src/content/blog"

if ! command -v gh &>/dev/null; then
  echo "Erreur : gh CLI non installé (https://cli.github.com/)" >&2
  exit 1
fi

check_duplicate() {
  local free_text="$1"
  if ! command -v python3 &>/dev/null; then
    return 0  # pas de python3 → skip silencieux
  fi
  if [[ ! -f "${SCRIPT_DIR}/check-duplicate.py" ]]; then
    return 0  # script absent → skip silencieux
  fi
  if [[ ! -d "${BLOG_DIR}" ]]; then
    return 0  # pas d'articles locaux → skip
  fi

  local result
  result=$(python3 "${SCRIPT_DIR}/check-duplicate.py" "${free_text}" "${BLOG_DIR}" 2>/dev/null || true)

  # Si résultat non vide (similarités trouvées)
  if [[ -n "${result}" ]] && [[ "${result}" != "[]" ]]; then
    echo ""
    echo "⚠️  Articles similaires détectés :"
    echo "${result}" | python3 -c "
import json, sys
items = json.load(sys.stdin)
for i in items[:5]:
    print(f\"  [{i['score']}%] {i['title']} ({i['status']})\")
"
    echo ""
    read -r -p "Continuer quand même ? [y/N] " confirm
    if [[ "${confirm}" != "y" ]] && [[ "${confirm}" != "Y" ]]; then
      echo "Annulé."
      exit 0
    fi
  else
    echo "✓ Aucun article similaire trouvé."
  fi
}

trigger_and_show() {
  sleep 3
  echo ""
  echo "Run déclenché :"
  gh run list --repo "${REPO}" --workflow "${WORKFLOW}" --limit 1 \
    --json status,url,createdAt \
    --template '  Status : {{.status}}{{"\n"}}  URL    : {{.url}}{{"\n"}}  Créé   : {{.createdAt}}{{"\n"}}'
}

# Mode reprise — pas de vérification doublon (article déjà créé)
if [[ -n "${RESUME_SLUG:-}" ]]; then
  echo "Mode reprise : slug=${RESUME_SLUG}"
  gh workflow run "${WORKFLOW}" --repo "${REPO}" \
    -f resume_slug="${RESUME_SLUG}"
  trigger_and_show

# Mode texte libre : argument positionnel
elif [[ $# -gt 0 ]]; then
  FREE_TEXT="$*"
  echo "Mode texte libre : ${FREE_TEXT:0:80}..."
  check_duplicate "${FREE_TEXT}"
  gh workflow run "${WORKFLOW}" --repo "${REPO}" \
    -f free_text="${FREE_TEXT}"
  trigger_and_show

# Mode texte libre : stdin (si non-interactif)
elif [[ ! -t 0 ]]; then
  FREE_TEXT="$(cat)"
  if [[ -z "${FREE_TEXT}" ]]; then
    echo "Erreur : stdin vide" >&2
    exit 1
  fi
  echo "Mode texte libre (stdin) : ${FREE_TEXT:0:80}..."
  check_duplicate "${FREE_TEXT}"
  gh workflow run "${WORKFLOW}" --repo "${REPO}" \
    -f free_text="${FREE_TEXT}"
  trigger_and_show

# Mode auto — pas de vérification doublon (le pipeline gère)
else
  echo "Mode auto : prochain sujet GitHub Projects"
  gh workflow run "${WORKFLOW}" --repo "${REPO}"
  trigger_and_show
fi
EOF
```

- [ ] **Step 2 : Rendre exécutable**

```bash
chmod +x pipeline/trigger-draft.sh
```

- [ ] **Step 3 : Vérifier la syntaxe**

```bash
bash -n pipeline/trigger-draft.sh && echo "OK"
```

Attendu : `OK`

- [ ] **Step 4 : Test à sec (dry-run)**

```bash
# Vérifier que gh est bien authentifié
gh auth status

# Vérifier que le workflow existe dans le repo
gh workflow list --repo sdechevigne/be-ikigai-v2 | grep blog-draft
```

Attendu : une ligne mentionnant `Blog — Draft automatique`.

- [ ] **Step 5 : Commit**

```bash
git add pipeline/trigger-draft.sh
git commit -m "feat(pipeline): script trigger-draft.sh — déclenchement CLI"
```

---

## Task 5 : Créer `blog-schedule.yml`

**Files:**
- Create: `.github/workflows/blog-schedule.yml`

Workflow cron lundi + jeudi 08h00 UTC. Logique : chercher le premier article `status: draft` avec `publishedAt <= aujourd'hui` → publier. Sinon → déclencher un draft auto.

- [ ] **Step 1 : Créer le workflow**

```bash
cat > .github/workflows/blog-schedule.yml << 'EOF'
name: Blog — Calendrier automatique

on:
  schedule:
    - cron: '0 8 * * 1'   # Lundi 08h00 UTC
    - cron: '0 8 * * 4'   # Jeudi 08h00 UTC
  workflow_dispatch: {}    # Déclenchement manuel pour test

jobs:
  schedule:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trouver le prochain article à publier
        id: find
        run: |
          TODAY=$(date -u +%Y-%m-%d)
          echo "Aujourd'hui : ${TODAY}"

          SLUG=""
          # Chercher parmi les articles FR en draft, triés par publishedAt croissant
          for f in $(ls src/content/blog/*-fr.md 2>/dev/null | sort); do
            STATUS=$(grep '^status:' "${f}" | head -1 | sed 's/status: *//' | tr -d '"' | tr -d "'" | xargs)
            if [[ "${STATUS}" != "draft" ]]; then
              continue
            fi
            PUBLISHED_AT=$(grep '^publishedAt:' "${f}" | head -1 | sed 's/publishedAt: *//' | tr -d '"' | tr -d "'" | cut -c1-10 | xargs)
            if [[ -z "${PUBLISHED_AT}" ]]; then
              continue
            fi
            if [[ "${PUBLISHED_AT}" <= "${TODAY}" ]]; then
              SLUG=$(basename "${f}" .md)
              echo "Article trouvé : ${SLUG} (publishedAt: ${PUBLISHED_AT})"
              break
            fi
          done

          echo "slug=${SLUG}" >> "${GITHUB_OUTPUT}"

      - name: Publier l'article
        if: steps.find.outputs.slug != ''
        env:
          GH_TOKEN: ${{ secrets.GH_PAT }}
        run: |
          SLUG="${{ steps.find.outputs.slug }}"
          echo "Publication de : ${SLUG}"
          gh workflow run blog-publish.yml \
            --repo "${{ github.repository }}" \
            -f slug="${SLUG}"

      - name: Déclencher un nouveau draft (backlog vide)
        if: steps.find.outputs.slug == ''
        env:
          GH_TOKEN: ${{ secrets.GH_PAT }}
        run: |
          echo "Aucun article en attente — déclenchement d'un nouveau draft (mode auto)"
          gh workflow run blog-draft.yml \
            --repo "${{ github.repository }}"
EOF
```

- [ ] **Step 2 : Vérifier la syntaxe YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/blog-schedule.yml'))" && echo "OK"
```

Attendu : `OK`

- [ ] **Step 3 : Test local de la logique de scan**

Créer un article de test temporaire, puis simuler le scan :

```bash
# Créer un article de test
mkdir -p src/content/blog
cat > /tmp/test-schedule-fr.md << 'MDEOF'
---
title: "Test schedule"
status: draft
publishedAt: 2026-01-01T08:00:00
---
MDEOF

TODAY=$(date -u +%Y-%m-%d)
SLUG=""
for f in $(ls src/content/blog/*-fr.md 2>/dev/null | sort); do
  STATUS=$(grep '^status:' "${f}" | head -1 | sed 's/status: *//' | tr -d '"' | tr -d "'" | xargs)
  [[ "${STATUS}" != "draft" ]] && continue
  PUBLISHED_AT=$(grep '^publishedAt:' "${f}" | head -1 | sed 's/publishedAt: *//' | tr -d '"' | tr -d "'" | cut -c1-10 | xargs)
  [[ -z "${PUBLISHED_AT}" ]] && continue
  if [[ "${PUBLISHED_AT}" <= "${TODAY}" ]]; then
    SLUG=$(basename "${f}" .md)
    echo "Trouvé : ${SLUG}"
    break
  fi
done
[[ -z "${SLUG}" ]] && echo "Aucun article — mode draft auto"
```

Si des articles `status: draft` avec `publishedAt` passée existent dans le repo, le scan doit en trouver un. Sinon afficher "Aucun article".

- [ ] **Step 4 : Commit**

```bash
git add .github/workflows/blog-schedule.yml
git commit -m "feat(pipeline): workflow blog-schedule.yml — calendrier 2x/semaine"
```

---

## Task 6 : Push et vérification end-to-end

- [ ] **Step 1 : Push**

```bash
git push origin master
```

- [ ] **Step 2 : Vérifier que les workflows apparaissent dans GitHub Actions**

```bash
gh workflow list --repo sdechevigne/be-ikigai-v2
```

Attendu : voir `Blog — Calendrier automatique` et `Blog — Draft automatique` dans la liste.

- [ ] **Step 3 : Test `trigger-draft.sh` en mode auto**

```bash
bash pipeline/trigger-draft.sh
```

Attendu : `Mode auto : prochain sujet GitHub Projects` puis URL du run affiché.

- [ ] **Step 4 : Test `trigger-draft.sh` avec texte libre**

```bash
bash pipeline/trigger-draft.sh "Ikigai et burn-out : retrouver son équilibre par la reconnexion à ses valeurs"
```

Attendu : `Mode texte libre : Ikigai et burn-out...` puis URL du run.

- [ ] **Step 5 : Test manuel `blog-schedule.yml`**

```bash
gh workflow run blog-schedule.yml --repo sdechevigne/be-ikigai-v2
sleep 5
gh run list --repo sdechevigne/be-ikigai-v2 --workflow blog-schedule.yml --limit 1
```

Attendu : run en cours ou terminé. Vérifier dans les logs Actions que le step "Trouver le prochain article" s'exécute correctement.

- [ ] **Step 6 : Vérifier le cron dans GitHub**

Aller sur `https://github.com/sdechevigne/be-ikigai-v2/actions/workflows/blog-schedule.yml` — le workflow doit apparaître avec les triggers cron configurés.

---

## Self-Review

**Couverture spec :**
- ✅ Input `free_text` dans `blog-draft.yml` — Task 1
- ✅ Mode `FREE_TEXT` dans `draft.sh` — Task 2
- ✅ Déduplication sémantique `check-duplicate.py` — Task 3
- ✅ `trigger-draft.sh` avec confirmation si similaire — Task 4
- ✅ `blog-schedule.yml` cron lundi/jeudi — Task 5
- ✅ Fallback draft auto si backlog vide — Task 5 step 1
- ✅ Priorité RESUME_SLUG > FREE_TEXT > auto — Task 2 + Task 4

**Placeholders :** aucun — tous les blocs de code sont complets.

**Cohérence des types :** `DRAFT_FROM_URL` est une variable shell string (`true`/unset) — cohérent avec l'usage existant dans `draft.sh`. `FREE_TEXT` transmis via env var dans le workflow et lu avec `${FREE_TEXT:-}` dans le script.

**Point d'attention :** `blog-schedule.yml` utilise `github.repository` pour déclencher les sous-workflows — cela suppose que le workflow tourne dans `sdechevigne/be-ikigai-v2`. C'est le cas puisque le fichier est dans ce repo.
