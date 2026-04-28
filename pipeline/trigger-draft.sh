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
    return 0
  fi
  if [[ ! -f "${SCRIPT_DIR}/check-duplicate.py" ]]; then
    return 0
  fi
  if [[ ! -d "${BLOG_DIR}" ]]; then
    return 0
  fi

  local result
  result=$(python3 "${SCRIPT_DIR}/check-duplicate.py" "${free_text}" "${BLOG_DIR}" 2>/dev/null || true)

  if [[ -n "${result}" ]] && [[ "${result}" != "[]" ]]; then
    echo ""
    echo "⚠️  Articles similaires détectés :"
    echo "${result}" | python3 -c "
import json, sys
items = json.load(sys.stdin)
for i in items[:5]:
    print(f\"  [{i['score']}%] {i['title']} ({i['status']})\")
" || true
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
