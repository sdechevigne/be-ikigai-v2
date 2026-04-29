#!/usr/bin/env bash
# regenerate-covers.sh — Rattrapage des images de couverture manquantes
#
# Usage :
#   bash pipeline/scripts/regenerate-covers.sh              # tous les articles sans image
#   bash pipeline/scripts/regenerate-covers.sh <slug>       # un slug précis (ex: 2026-04-29-bilan-fr)
#   FORCE=1 bash pipeline/scripts/regenerate-covers.sh      # regénérer même si l'image existe

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BLOG_DIR="${REPO_ROOT}/src/content/blog"
IMG_DIR="${REPO_ROOT}/public/assets/img/blog"

cd "${REPO_ROOT}"

# Charger les variables d'environnement locales si présentes
if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env.local" 2>/dev/null || true
  set +o allexport
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "Erreur : GEMINI_API_KEY non défini" >&2
  exit 1
fi

extract_field() {
  local file="$1" field="$2"
  grep -m1 "^${field}:" "${file}" | sed "s/^${field}:\s*//" | tr -d '"' | xargs
}

generate_for_slug() {
  local slug="$1"
  local md_file=""

  # Chercher le fichier markdown correspondant (priorité FR)
  for candidate in "${BLOG_DIR}/${slug}.md" "${BLOG_DIR}/${slug}-fr.md"; do
    if [[ -f "${candidate}" ]]; then
      md_file="${candidate}"
      break
    fi
  done

  if [[ -z "${md_file}" ]]; then
    # Chercher par glob
    local found
    found=$(ls "${BLOG_DIR}/${slug}"*.md 2>/dev/null | head -1 || true)
    if [[ -n "${found}" ]]; then
      md_file="${found}"
    else
      echo "Erreur : aucun fichier trouvé pour le slug '${slug}'" >&2
      return 1
    fi
  fi

  local title
  title=$(extract_field "${md_file}" "title")
  local category
  category=$(extract_field "${md_file}" "category")

  local prompt="Photographie lifestyle professionnelle. ${title}. Jeune professionnel 30 ans, bureau moderne ou espace naturel ouvert, lumière naturelle dorée. Ambiance sereine et inspirante, pas de texte en incrustation. Style photo éditoriale professionnelle. Format 16:9."

  # Le slug d'image est basé sur le nom du fichier sans extension, suffixe -fr
  local img_slug
  img_slug=$(basename "${md_file}" .md)
  # Pour les articles bilingues, utiliser le slug de base (sans -fr/-en) pour l'image partagée
  local base_slug="${img_slug%-fr}"
  base_slug="${base_slug%-en}"

  local img_path="${IMG_DIR}/${base_slug}-fr.webp"
  if [[ -f "${img_path}" ]] && [[ -z "${FORCE:-}" ]]; then
    echo "Image déjà présente : ${img_path} (FORCE=1 pour regénérer)"
    return 0
  fi

  echo "Génération image pour : ${base_slug}"
  echo "  Titre  : ${title}"
  echo "  Prompt : ${prompt:0:100}..."

  bash "${SCRIPT_DIR}/generate-cover.sh" "${base_slug}-fr" "${prompt}"
}

# Mode slug précis
if [[ $# -gt 0 ]]; then
  generate_for_slug "$1"
  exit 0
fi

# Mode auto — scanner tous les articles sans image
echo "Scan des articles sans image de couverture..."
missing=0

for md_file in "${BLOG_DIR}"/*.md; do
  [[ -f "${md_file}" ]] || continue

  # Ne traiter que les fichiers FR (ou sans suffixe de langue)
  basename_noext="$(basename "${md_file}" .md)"
  if [[ "${basename_noext}" == *-en ]]; then
    continue
  fi

  # Slug d'image = nom du fichier ou nom sans -fr
  img_slug="${basename_noext%-fr}"

  img_webp="${IMG_DIR}/${basename_noext}.webp"
  img_png="${IMG_DIR}/${basename_noext}.png"
  img_webp_alt="${IMG_DIR}/${img_slug}-fr.webp"
  img_png_alt="${IMG_DIR}/${img_slug}-fr.png"

  has_image=false
  for img in "${img_webp}" "${img_png}" "${img_webp_alt}" "${img_png_alt}"; do
    if [[ -f "${img}" ]]; then
      has_image=true
      break
    fi
  done

  if [[ "${has_image}" == false ]] || [[ -n "${FORCE:-}" ]]; then
    missing=$((missing + 1))
    echo ""
    echo "--- Article sans image : ${basename_noext} ---"
    generate_for_slug "${basename_noext}" || echo "  WARNING: génération échouée pour ${basename_noext}"
  fi
done

if [[ $missing -eq 0 ]]; then
  echo "Tous les articles ont une image de couverture."
else
  echo ""
  echo "Terminé — ${missing} image(s) traitée(s)."
fi
