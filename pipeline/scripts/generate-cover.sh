#!/usr/bin/env bash
# generate-cover.sh -- Génération d'image de couverture via Gemini API
# Usage : bash pipeline/scripts/generate-cover.sh <slug> "<prompt>" [model]
# Doit être exécuté depuis la racine du repo.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PIPELINE_DIR="${SCRIPT_DIR}/.."

SLUG="${1:?Slug requis}"
PROMPT="${2:?Prompt requis}"
MODEL="${3:-gemini-3.1-flash-image-preview}"
API_URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
OUT_DIR="${REPO_ROOT}/public/assets/img/blog"

mkdir -p "${OUT_DIR}"

attempt=0
while [[ $attempt -lt 3 ]]; do
  attempt=$((attempt + 1))
  echo "Génération image (tentative ${attempt}/3)..."

  RESPONSE=$(curl -s -X POST "${API_URL}?key=${GEMINI_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"contents\": [{\"parts\": [{\"text\": \"${PROMPT}\"}]}],
      \"generationConfig\": {\"responseModalities\": [\"IMAGE\", \"TEXT\"]}
    }")

  # Extraire le base64 et redimensionner via sharp (resize-cover.mjs)
  B64=$(echo "${RESPONSE}" | node -e "
process.stdin.resume();
let buf='';
process.stdin.on('data',d=>buf+=d);
process.stdin.on('end',()=>{
  try {
    const data=JSON.parse(buf);
    const parts=(data.candidates||[{}])[0]?.content?.parts||[];
    const img=parts.find(p=>p.inlineData);
    process.stdout.write(img?img.inlineData.data:'');
  } catch(e){}
});
" 2>/dev/null || echo "")

  if [[ -z "${B64}" ]]; then
    echo "  Pas d'image dans la réponse (tentative ${attempt})"
    sleep 5
    continue
  fi

  RESULT=$(echo "${B64}" | node "${SCRIPT_DIR}/resize-cover.mjs" "${SLUG}" "${OUT_DIR}" 2>/dev/null || echo "ERROR")

  if [[ "${RESULT}" == "OK" ]]; then
    echo "Images générées : ${OUT_DIR}/${SLUG}.webp + ${OUT_DIR}/${SLUG}-og.webp"
    exit 0
  elif [[ "${RESULT}" == "TOO_SMALL" ]]; then
    echo "  Image trop petite — retry"
    sleep 5
  else
    echo "  Pas d'image dans la réponse (tentative ${attempt}) : ${RESULT}"
    sleep 5
  fi
done

echo "ERREUR : génération image échouée après 3 tentatives" >&2
exit 1
