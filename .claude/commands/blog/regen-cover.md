# /blog:regen-cover <slug> [prompt personnalisé] — Régénérer l'image de couverture

## Usage

```
/blog:regen-cover 2026-04-28-ikigai-reconversion-fr
/blog:regen-cover 2026-04-28-ikigai-reconversion-fr "Jeune femme méditative, bureau lumineux, plantes vertes"
```

## Étapes

1. Trouve l'article et extrait le titre :
   ```bash
   FILE="src/content/blog/${SLUG}.md"
   TITLE=$(grep '^title:' "$FILE" | head -1 | sed 's/^title: *//' | tr -d '"')
   ```

2. Si aucun prompt personnalisé, construit le prompt par défaut :
   ```
   Photographie lifestyle professionnelle. ${TITLE}. Jeune professionnel 25-35 ans, bureau moderne ou espace naturel, lumière naturelle dorée. Ambiance sereine et inspirante, pas de texte en incrustation. Style photo éditoriale. Format 16:9.
   ```

3. Lance la génération :
   ```bash
   bash pipeline/generate-cover.sh "${SLUG%-fr}" "${PROMPT}"
   ```

4. Vérifie les fichiers générés :
   ```bash
   ls -lh public/assets/img/blog/${SLUG%-fr}*.png
   ```

5. Commit :
   ```bash
   git add public/assets/img/blog/${SLUG%-fr}*.png
   git commit -m "blog: régénération couverture '${SLUG}'"
   git push origin master
   ```
