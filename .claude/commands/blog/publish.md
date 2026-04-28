# /blog:publish [slug] — Publier un article

## Usage

```
/blog:publish 2026-04-28-ikigai-reconversion
```

Si le slug est fourni sans `-fr`/`-en`, publie les deux versions.

## Étapes

1. Trouve l'article FR :
   ```bash
   FILE="src/content/blog/${SLUG}-fr.md"
   ```

2. Valide le frontmatter :
   - `description` : 110–160 chars exactement
   - `image` : fichier présent dans `public/images/`
   - `category` : l'une de Reconversion / Sens & Ikigai / Burn-out / Coaching / Management
   - `summary` : exactement 4 bullets
   - Zéro tiret long `—` dans le corps

3. Change le statut :
   ```bash
   sed -i 's/^status: draft/status: published/' "$FILE"
   ```

4. Fait de même pour la version EN si elle existe.

5. Commit et push :
   ```bash
   git add src/content/blog/${SLUG}-fr.md src/content/blog/${SLUG}-en.md 2>/dev/null || true
   git commit -m "blog: publish '${SLUG}'"
   git push origin master
   ```

6. Affiche l'URL de l'article publié : `https://be-ikigai.fr/blog/${SLUG%-fr}`
