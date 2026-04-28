#!/usr/bin/env bash
# generate-cover.sh -- Génération d'image de couverture via Gemini API
# Usage : bash pipeline/generate-cover.sh <slug> "<prompt>" [model]

set -euo pipefail

SLUG="${1:?Slug requis}"
PROMPT="${2:?Prompt requis}"
MODEL="${3:-gemini-3.1-flash-image-preview}"
API_URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
OUT_DIR="public/assets/img/blog"
BLOG_SIZE="1424x752"
OG_SIZE="1200x630"

mkdir -p "${OUT_DIR}"

# Détecte ImageMagick v7 (magick) ou v6 (convert)
if command -v magick &>/dev/null; then
  CONVERT_CMD="magick"
else
  CONVERT_CMD="convert"
fi

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

  B64=$(echo "${RESPONSE}" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for part in data.get('candidates', [{}])[0].get('content', {}).get('parts', []):
    if 'inlineData' in part:
        print(part['inlineData']['data'])
        break
" 2>/dev/null || echo "")

  if [[ -z "${B64}" ]]; then
    echo "  Pas d'image dans la réponse (tentative ${attempt})"
    sleep 5
    continue
  fi

  TMP_FILE="/tmp/cover-${SLUG}.png"
  echo "${B64}" | base64 -d > "${TMP_FILE}"

  FILE_SIZE=$(stat -c%s "${TMP_FILE}" 2>/dev/null || stat -f%z "${TMP_FILE}" 2>/dev/null || echo 0)
  if [[ $FILE_SIZE -lt 10240 ]]; then
    echo "  Image trop petite (${FILE_SIZE} octets) — retry"
    sleep 5
    continue
  fi

  ${CONVERT_CMD} "${TMP_FILE}" -resize "${BLOG_SIZE}^" -gravity Center -extent "${BLOG_SIZE}" \
    "${OUT_DIR}/${SLUG}.png"
  ${CONVERT_CMD} "${TMP_FILE}" -resize "${OG_SIZE}^" -gravity Center -extent "${OG_SIZE}" \
    "${OUT_DIR}/${SLUG}-og.png"

  rm -f "${TMP_FILE}"
  echo "Images générées : ${OUT_DIR}/${SLUG}.png + ${OUT_DIR}/${SLUG}-og.png"
  exit 0
done

echo "ERREUR : génération image échouée après 3 tentatives" >&2
exit 1
