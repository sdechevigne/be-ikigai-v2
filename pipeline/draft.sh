#!/usr/bin/env bash
# draft.sh -- Pipeline de rédaction automatique d'articles de blog be-ikigai
# Adapté de MesChasses : 3 phases Gemini/Claude + validation Astro + commit Git
#
# Prérequis :
#   - GEMINI_API_KEY (rédaction + images)
#   - GH_TOKEN (GitHub CLI)
#   - gemini CLI (npm i -g @google/gemini-cli) OU claude CLI
#   - ImageMagick, Node.js, jq
#
# Usage : bash pipeline/draft.sh
# Reprise : RESUME_SLUG=2026-04-28-mon-article-fr bash pipeline/draft.sh
# LLM alternatif : LLM=claude bash pipeline/draft.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PIPELINE_DIR="${SCRIPT_DIR}"
CONTENT_DIR="${REPO_ROOT}/src/content/blog"
LOG_DIR="${REPO_ROOT}/pipeline/logs"
MCP_CONFIG="${PIPELINE_DIR}/mcp.json"
SKILLS_PROMPT="${PIPELINE_DIR}/skills-prompt.md"
CARD_BODY="${PIPELINE_DIR}/card-body.md"
RESEARCH_NOTES="${PIPELINE_DIR}/research-notes.md"

mkdir -p "${LOG_DIR}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/draft-${TIMESTAMP}.log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "${LOG_FILE}"; }
log_error() { echo "[$(date +%H:%M:%S)] ERREUR: $*" | tee -a "${LOG_FILE}" >&2; }

cleanup() {
  rm -f "${CARD_BODY}" "${RESEARCH_NOTES}" "${PIPELINE_DIR}/topic-json.tmp"
}

on_error() {
  local exit_code=$?
  local line_number=$1
  log_error "Echec ligne ${line_number} (code ${exit_code})"

  if [[ -n "${ITEM_ID:-}" ]]; then
    (cd "${PIPELINE_DIR}" && node -e "
      import('./project.js').then(m => m.updateCardStatus('${ITEM_ID}', 'detected')).catch(() => {});
    " 2>/dev/null || true)
  fi

  if command -v gh &>/dev/null && [[ -n "${GH_TOKEN:-}" ]]; then
    local log_excerpt
    log_excerpt=$(tail -50 "${LOG_FILE}" 2>/dev/null || echo "Log non disponible")
    gh issue create \
      --title "Pipeline blog : echec le ${TIMESTAMP}" \
      --body "$(printf "## Erreur pipeline\n\nLigne : %s\nCode : %s\n\n\`\`\`\n%s\n\`\`\`" "${line_number}" "${exit_code}" "${log_excerpt}")" \
      --label "bug" 2>/dev/null || true
  fi

  cleanup
  exit "${exit_code}"
}

trap 'on_error ${LINENO}' ERR

LLM="${LLM:-gemini}"
log "LLM cible : ${LLM}"

set_publish_datetime() {
  local hour min
  read -r hour min < <(python3 -c 'import random; print(random.randint(7,19), random.randint(0,59))')
  PUBLISH_DATETIME="$(date +%Y-%m-%d)T$(printf '%02d' "${hour}"):$(printf '%02d' "${min}"):00"
  log "Heure de publication : ${PUBLISH_DATETIME}"
  export PUBLISH_DATETIME
}

frontmatter_field() {
  local field="$1" file="$2"
  grep "^${field}:" "${file}" | head -1 | sed "s/^${field}: *//" | tr -d '"'
}

git_push_safe() {
  local label="${1:-push}"
  cd "${REPO_ROOT}"
  git pull --rebase --autostash origin master 2>>"${LOG_FILE}" || {
    log_error "git pull --rebase echoue avant ${label}"
    exit 1
  }
  git push origin master 2>>"${LOG_FILE}" || {
    log_error "git push echoue pour ${label} — relancer avec RESUME_SLUG pour reprendre"
    exit 1
  }
}

run_llm() {
  if [[ "${LLM}" == "gemini" ]]; then
    local gemini_args=()
    local system_prompt_file=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --system-prompt-file) system_prompt_file="$2"; shift 2 ;;
        --mcp-config) shift 2 ;;
        --allowedTools) shift 2 ;;
        --max-turns) shift 2 ;;
        --dangerously-skip-permissions) shift ;;
        *) gemini_args+=("$1"); shift ;;
      esac
    done
    GEMINI_API_KEY="${GEMINI_API_KEY}" \
    GEMINI_SYSTEM_MD="${system_prompt_file}" \
    GEMINI_CLI_HOME="${GEMINI_CLI_HOME:-/tmp/gemini-home}" \
    GEMINI_CLI_TRUST_WORKSPACE="true" \
      gemini --model gemini-3.1-pro-preview --approval-mode yolo "${gemini_args[@]}"
  else
    CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN:-}" claude "$@"
  fi
}

# Prérequis
log "Vérification des prérequis..."
for cmd in node npm git python3; do
  if ! command -v "${cmd}" &>/dev/null; then
    log_error "Commande manquante : ${cmd}"
    exit 1
  fi
done

if [[ "${LLM}" == "gemini" ]]; then
  if ! command -v gemini &>/dev/null; then
    log_error "gemini CLI manquant — installer : npm i -g @google/gemini-cli"
    exit 1
  fi
  if [[ -z "${GEMINI_API_KEY:-}" ]]; then
    log_error "GEMINI_API_KEY non défini"
    exit 1
  fi
  export GEMINI_CLI_HOME="/tmp/gemini-home"
  mkdir -p "${GEMINI_CLI_HOME}/.gemini"
  echo '{"projects":{}}' > "${GEMINI_CLI_HOME}/.gemini/projects.json"
  # Trust the current workspace to allow --approval-mode yolo in headless environments
  WORKSPACE_PATH="$(pwd)"
  echo "{\"trustedDirectories\":[\"${WORKSPACE_PATH}\"]}" > "${GEMINI_CLI_HOME}/.gemini/settings.json"
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  log_error "GEMINI_API_KEY requis pour la génération d'images"
  exit 1
fi

# Mise à jour du repo
log "Mise à jour du repo..."
cd "${REPO_ROOT}"
git stash 2>>"${LOG_FILE}" || true
git pull --rebase origin master 2>>"${LOG_FILE}" || true
git stash pop 2>>"${LOG_FILE}" || true

# Mode reprise
RESUME_SLUG="${RESUME_SLUG:-}"
SKIP_PHASE1=false; SKIP_PHASE2=false; SKIP_PHASE3=false; SKIP_IMAGE=false
ARTICLE_PATH=""

if [[ -n "${RESUME_SLUG}" ]]; then
  log "Mode reprise : slug=${RESUME_SLUG}"
  ARTICLE_PATH="src/content/blog/${RESUME_SLUG}.md"
  if [[ ! -f "${REPO_ROOT}/${ARTICLE_PATH}" ]]; then
    log_error "Article introuvable : ${ARTICLE_PATH}"
    exit 1
  fi
  if git log --format=%s | grep -qF "wip(phase3): ${RESUME_SLUG}"; then
    SKIP_PHASE1=true; SKIP_PHASE2=true; SKIP_PHASE3=true
    log "  Phases 1, 2, 3 déjà commitées"
  elif git log --format=%s | grep -qF "wip(phase2): ${RESUME_SLUG}"; then
    SKIP_PHASE1=true; SKIP_PHASE2=true
    git show "HEAD:pipeline/research-notes.md" > "${RESEARCH_NOTES}" 2>/dev/null || true
    log "  Phases 1, 2 déjà commitées — reprise depuis Phase 3"
  elif git log --format=%s | grep -qF "wip(phase1): ${RESUME_SLUG}"; then
    SKIP_PHASE1=true
    PHASE1_HASH=$(git log --format="%H %s" | grep -F "wip(phase1): ${RESUME_SLUG}" | awk '{print $1}' | head -1)
    git show "${PHASE1_HASH}:pipeline/research-notes.md" > "${RESEARCH_NOTES}" 2>/dev/null || true
    log "  Phase 1 déjà commitée — reprise depuis Phase 2"
  fi
  if [[ -f "${REPO_ROOT}/public/assets/img/blog/${RESUME_SLUG}.png" ]]; then
    SKIP_IMAGE=true
    log "  Image déjà présente"
  fi
fi

ITEM_ID=""

if [[ -n "${RESUME_SLUG}" ]]; then
  TOPIC_TITLE=$(frontmatter_field title "${REPO_ROOT}/${ARTICLE_PATH}")
  TOPIC_CATEGORY=$(frontmatter_field category "${REPO_ROOT}/${ARTICLE_PATH}")
  TOPIC_CONTENT_TYPE="resume"
  PUBLISH_DATETIME=$(frontmatter_field publishedAt "${REPO_ROOT}/${ARTICLE_PATH}")
  export PUBLISH_DATETIME
elif [[ "${DRAFT_FROM_URL:-}" == "true" ]]; then
  log "Mode URL : utilisation du card-body.md fourni"
  [[ ! -f "${CARD_BODY}" ]] && { log_error "card-body.md introuvable"; exit 1; }
  set_publish_datetime
else
  log "Sélection du prochain sujet..."
  cd "${PIPELINE_DIR}"
  npm install --silent 2>>"${LOG_FILE}"
  TOPIC_JSON=$(node index.js --pick 2>>"${LOG_FILE}" || true)
  if [[ -z "${TOPIC_JSON}" ]]; then
    log "Aucun sujet disponible."
    exit 0
  fi
  TOPIC_JSON_FILE="${PIPELINE_DIR}/topic-json.tmp"
  printf '%s' "${TOPIC_JSON}" > "${TOPIC_JSON_FILE}"
  IFS=$'\t' read -r ITEM_ID TOPIC_TITLE TOPIC_CATEGORY TOPIC_CONTENT_TYPE < <(python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
print(d["itemId"], d["title"], d["category"], d["contentType"], sep="\t")
' "${TOPIC_JSON_FILE}")
  python3 -c "import json, sys; d=json.load(open(sys.argv[1])); print(d.get('body',''),end='')" "${TOPIC_JSON_FILE}" > "${CARD_BODY}"
  rm -f "${TOPIC_JSON_FILE}"
  log "Sujet : ${TOPIC_TITLE} (${TOPIC_CATEGORY})"
  set_publish_datetime
  node -e "import('./project.js').then(m => m.updateCardStatus('${ITEM_ID}', 'researched')).catch(e => console.warn(e.message));" 2>>"${LOG_FILE}" || true
fi

# Phase 1 : Recherche
if [[ "${SKIP_PHASE1}" == "true" ]]; then
  log "Phase 1 : ignorée."
else
  log "Phase 1 : Recherche..."
  cd "${REPO_ROOT}"
  PHASE1_PROMPT="$(cat "${PIPELINE_DIR}/prompts/1-research.md")

## Sujet (contexte injecté)

$(cat "${CARD_BODY}")"
  RESEARCH_OUTPUT=$(run_llm \
    --mcp-config "${MCP_CONFIG}" \
    --system-prompt-file "${SKILLS_PROMPT}" \
    --allowedTools "WebSearch,WebFetch,Read,Write" \
    --max-turns 30 \
    --dangerously-skip-permissions \
    -p "${PHASE1_PROMPT}" \
    2> >(tee -a "${LOG_FILE}" >&2)) || true

  if ! echo "${RESEARCH_OUTPUT}" | grep -q "::research-done::"; then
    log_error "Phase 1 : marqueur ::research-done:: non trouvé"
    exit 1
  fi
  if [[ ! -f "${RESEARCH_NOTES}" ]]; then
    log_error "Phase 1 : research-notes.md non créé"
    exit 1
  fi

  PHASE1_REF="$(date +%Y-%m-%d)-$(md5sum "${CARD_BODY}" 2>/dev/null | cut -c1-6 || echo 'noref')"
  cd "${REPO_ROOT}"
  git add "${RESEARCH_NOTES}"
  git commit -m "wip(phase1): ${PHASE1_REF}

Pipeline: automatique — phase recherche terminée
Log: pipeline/logs/draft-${TIMESTAMP}.log" 2>>"${LOG_FILE}"
  git_push_safe "wip(phase1)"
fi

# Phase 2 : Rédaction
if [[ "${SKIP_PHASE2}" == "true" ]]; then
  log "Phase 2 : ignorée."
else
  log "Phase 2 : Rédaction (FR + EN)..."
  cd "${REPO_ROOT}"
  PHASE2_PROMPT="$(cat "${PIPELINE_DIR}/prompts/2-draft.md")

## Notes de recherche (injectées)

$(cat "${RESEARCH_NOTES}" 2>/dev/null || echo '(aucune note — utilise le sujet du contexte)')

## Contexte sujet

$(cat "${CARD_BODY}" 2>/dev/null || echo '')"
  DRAFT_OUTPUT=$(run_llm \
    --mcp-config "${MCP_CONFIG}" \
    --system-prompt-file "${SKILLS_PROMPT}" \
    --allowedTools "Read,Write,WebSearch" \
    --max-turns 20 \
    --dangerously-skip-permissions \
    -p "${PHASE2_PROMPT}" \
    2> >(tee -a "${LOG_FILE}" >&2))

  ARTICLE_PATH=$(echo "${DRAFT_OUTPUT}" | grep -oP '::draft-path:\K[^:]+' | head -1)

  # Fallback si Gemini écrit directement sur stdout
  if [[ -z "${ARTICLE_PATH}" ]] || [[ ! -f "${REPO_ROOT}/${ARTICLE_PATH}" ]]; then
    log "Fichier non créé par le LLM — récupération depuis stdout..."
    MARKDOWN_CONTENT=$(echo "${DRAFT_OUTPUT}" | sed -n '/^---$/,$ p')
    if [[ -n "${MARKDOWN_CONTENT}" ]]; then
      RAW_TITLE=$(echo "${MARKDOWN_CONTENT}" | grep -m1 '^title:' | sed 's/^title: *//' | tr -d '"' | tr '[:upper:]' '[:lower:]')
      DERIVED_SLUG=$(echo "${RAW_TITLE}" | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' | cut -c1-55)
      ARTICLE_PATH="src/content/blog/$(date +%Y-%m-%d)-${DERIVED_SLUG}-fr.md"
      mkdir -p "${CONTENT_DIR}"
      echo "${MARKDOWN_CONTENT}" > "${REPO_ROOT}/${ARTICLE_PATH}"
      FINAL_SLUG=$(basename "${ARTICLE_PATH}" .md)
      sed -i "s|^image:.*|image: /assets/img/blog/${FINAL_SLUG}.png|" "${REPO_ROOT}/${ARTICLE_PATH}"
      log "Article sauvegardé depuis stdout : ${ARTICLE_PATH}"
    else
      log_error "Phase 2 : ni fichier créé ni contenu markdown dans stdout"
      exit 1
    fi
  fi

  log "Article FR créé : ${ARTICLE_PATH}"
  ARTICLE_SLUG=$(basename "${ARTICLE_PATH}" .md)

  # Validation Astro
  log "Validation Astro..."
  cd "${REPO_ROOT}"
  ASTRO_ATTEMPTS=0
  while [[ $ASTRO_ATTEMPTS -lt 3 ]]; do
    ASTRO_ATTEMPTS=$((ASTRO_ATTEMPTS + 1))
    if npx astro sync 2>>"${LOG_FILE}"; then
      log "Validation Astro : OK"
      break
    fi
    if [[ $ASTRO_ATTEMPTS -ge 3 ]]; then
      log_error "Validation Astro échouée après 3 tentatives"
      exit 1
    fi
    ASTRO_ERROR=$(npx astro sync 2>&1 | tail -20 || true)
    run_llm \
      --allowedTools "Read,Edit" \
      --max-turns 5 \
      --dangerously-skip-permissions \
      -p "Corrige les erreurs de frontmatter dans ${ARTICLE_PATH}. Erreur Astro : ${ASTRO_ERROR}. description doit faire 110-160 chars. category doit être : Reconversion / Sens & Ikigai / Burn-out / Coaching / Management. publishedAt au format AAAA-MM-JJTHH:MM:SS." \
      2>>"${LOG_FILE}" || true
  done

  # Correction description longueur
  FULL_PATH="${REPO_ROOT}/${ARTICLE_PATH}"
  python3 - "${FULL_PATH}" <<'PYEOF'
import sys, re
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
match = re.search(r'^description:\s*"(.+?)"', content, re.MULTILINE)
if match:
    desc = match.group(1)
    if len(desc) > 160:
        short = desc[:157].rstrip() + '...'
        content = content.replace(f'description: "{desc}"', f'description: "{short}"')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Description tronquée : {len(desc)} -> {len(short)} chars")
    elif len(desc) < 110:
        print(f"  WARNING: Description trop courte : {len(desc)} chars")
PYEOF

  # Nettoyage tirets longs
  if grep -q "—" "${FULL_PATH}" 2>/dev/null; then
    sed -i 's/ — /, /g; s/— /: /g; s/ —/,/g' "${FULL_PATH}"
    log "  Tirets longs remplacés"
  fi

  cd "${REPO_ROOT}"
  git add "${CONTENT_DIR}/"
  git commit -m "wip(phase2): ${ARTICLE_SLUG}

Pipeline: automatique — phase rédaction terminée (FR+EN)
Log: pipeline/logs/draft-${TIMESTAMP}.log" 2>>"${LOG_FILE}"
  git_push_safe "wip(phase2)"
fi

[[ -z "${ARTICLE_PATH}" ]] && { log_error "ARTICLE_PATH non défini"; exit 1; }
ARTICLE_SLUG=$(basename "${ARTICLE_PATH}" .md)

# Phase 3 : Humanisation
if [[ "${SKIP_PHASE3}" == "true" ]]; then
  log "Phase 3 : ignorée."
else
  log "Phase 3 : Humanisation..."
  cd "${REPO_ROOT}"
  HUMANIZE_OUTPUT=$(run_llm \
    --system-prompt-file "${SKILLS_PROMPT}" \
    --allowedTools "Read,Edit" \
    --max-turns 15 \
    --dangerously-skip-permissions \
    -p "$(cat "${PIPELINE_DIR}/prompts/3-humanize.md")

Article à humaniser : ${ARTICLE_PATH}" \
    2> >(tee -a "${LOG_FILE}" >&2))

  echo "${HUMANIZE_OUTPUT}" | grep -q "::done::" || log "WARNING: marqueur ::done:: non trouvé"

  cd "${REPO_ROOT}"
  git add "${CONTENT_DIR}/"
  git commit -m "wip(phase3): ${ARTICLE_SLUG}

Pipeline: automatique — phase humanisation terminée
Log: pipeline/logs/draft-${TIMESTAMP}.log" 2>>"${LOG_FILE}"
  git_push_safe "wip(phase3)"
fi

# Génération image (base slug sans -fr)
BASE_SLUG="${ARTICLE_SLUG%-fr}"
if [[ "${SKIP_IMAGE}" == "true" ]]; then
  log "Image : ignorée."
else
  log "Génération image de couverture..."
  TOPIC_TITLE_SAFE="${TOPIC_TITLE:-coaching carrière ikigai}"
  COVER_PROMPT="Photographie lifestyle professionnelle. ${TOPIC_TITLE_SAFE}. Jeune professionnel 30 ans, bureau moderne ou espace naturel ouvert, lumière naturelle dorée. Ambiance sereine et inspirante, pas de texte en incrustation. Style photo éditoriale professionnelle. Format 16:9."
  bash "${PIPELINE_DIR}/generate-cover.sh" "${BASE_SLUG}-fr" "${COVER_PROMPT}" 2>>"${LOG_FILE}" || \
    log "WARNING: génération image échouée — article créé sans image"
fi

# Commit final
log "Commit final..."
cd "${REPO_ROOT}"
git add "${CONTENT_DIR}/" "public/assets/img/blog/${BASE_SLUG}"* 2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "blog: draft '${TOPIC_TITLE:-article}' [${TOPIC_CATEGORY:-coaching}]

Type: ${TOPIC_CONTENT_TYPE:-guide}
LLM: ${LLM}
Pipeline: automatique
Log: pipeline/logs/draft-${TIMESTAMP}.log" 2>>"${LOG_FILE}"
  git_push_safe "commit final"
fi

# Mise à jour statut GitHub Projects
cd "${PIPELINE_DIR}"
node -e "
import('./project.js').then(async m => {
  await m.updateCardStatus('${ITEM_ID}', 'drafting');
  await m.setArticlePath('${ITEM_ID}', '${ARTICLE_PATH}');
}).catch(e => console.warn(e.message));
" 2>>"${LOG_FILE}" || true

cleanup

log ""
log "=== Pipeline terminé avec succès ==="
log "Article FR : ${ARTICLE_PATH}"
log "Log : ${LOG_FILE}"
