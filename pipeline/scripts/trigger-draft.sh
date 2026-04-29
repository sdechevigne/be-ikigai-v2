#!/usr/bin/env bash
# trigger-draft.sh — Déclenche blog-draft.yml depuis une idée libre
#
# Usage :
#   bash pipeline/trigger-draft.sh "Mon idée d'article"
#   cat idee.txt | bash pipeline/trigger-draft.sh
#   bash pipeline/trigger-draft.sh                          # mode auto
#   RESUME_SLUG=2026-04-28-ikigai-fr bash pipeline/trigger-draft.sh
#   FORCE=1 bash pipeline/trigger-draft.sh "Mon idée"       # ignorer doublons

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPO="sdechevigne/be-ikigai-v2"
WORKFLOW="blog-draft.yml"
BLOG_DIR="${REPO_ROOT}/src/content/blog"

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

    if [[ -n "${FORCE:-}" ]]; then
      echo "FORCE=1 — déclenchement quand même."
      return 0
    fi

    # Sauvegarder l'idée en attente plutôt que de la perdre
    local pending_file="${REPO_ROOT}/pipeline/ideas-pending.md"
    local ts
    ts=$(date +%Y-%m-%d\ %H:%M)
    {
      echo ""
      echo "## ${ts}"
      echo ""
      echo "${free_text}"
      echo ""
      echo "<!-- similarités détectées — à revoir avant déclenchement -->"
      echo "<!-- relancer avec : FORCE=1 bash pipeline/trigger-draft.sh \"${free_text}\" -->"
    } >> "${pending_file}"

    echo "💾 Idée sauvegardée dans pipeline/ideas-pending.md"
    echo "   Pour forcer quand même : FORCE=1 bash pipeline/trigger-draft.sh \"${free_text}\""
    exit 0
  else
    echo "✓ Aucun article similaire trouvé."
  fi
}

create_idea_card() {
  local title="$1"
  local project_id="${PROJECT_ID:-}"
  local status_idea="${PROJECT_STATUS_IDEA:-}"

  if [[ -z "${project_id}" ]] || [[ -z "${status_idea}" ]]; then
    echo "  (PROJECT_ID ou PROJECT_STATUS_IDEA non défini — card non créée)"
    return 0
  fi

  # Créer la card DraftIssue dans GitHub Projects
  local item_id
  item_id=$(gh api graphql -f query="mutation {
    addProjectV2DraftIssue(input: {
      projectId: \"${project_id}\"
      title: \"${title}\"
    }) { projectItem { id } }
  }" --jq '.data.addProjectV2DraftIssue.projectItem.id' 2>/dev/null || true)

  if [[ -z "${item_id}" ]]; then
    echo "  (Impossible de créer la card GitHub Projects)"
    return 0
  fi

  # Passer au statut Idée
  gh api graphql -f query="mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: \"${project_id}\"
      itemId: \"${item_id}\"
      fieldId: \"${PROJECT_FIELD_STATUS_ID:-}\"
      value: { singleSelectOptionId: \"${status_idea}\" }
    }) { projectV2Item { id } }
  }" >/dev/null 2>&1 || true

  echo "  Card créée dans GitHub Projects (statut : Idée)"
}

trigger_and_show() {
  sleep 3
  echo ""
  echo "Run déclenché :"
  gh run list --repo "${REPO}" --workflow "${WORKFLOW}" --limit 1 \
    --json status,url,createdAt \
    --template '  Status : {{.status}}{{"\n"}}  URL    : {{.url}}{{"\n"}}  Créé   : {{.createdAt}}{{"\n"}}'
}

# Charger les variables d'environnement locales si présentes
if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env.local" 2>/dev/null || true
  set +o allexport
fi

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
  create_idea_card "${FREE_TEXT:0:120}"
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
  create_idea_card "${FREE_TEXT:0:120}"
  gh workflow run "${WORKFLOW}" --repo "${REPO}" \
    -f free_text="${FREE_TEXT}"
  trigger_and_show

# Mode auto — pas de vérification doublon (le pipeline gère)
else
  echo "Mode auto : prochain sujet GitHub Projects"
  gh workflow run "${WORKFLOW}" --repo "${REPO}"
  trigger_and_show
fi
